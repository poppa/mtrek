import { parseCuratedAlbums, type AlbumInput } from '$lib/curated-albums';
export type { AlbumInput } from '$lib/curated-albums';
import { rankByScore } from '$lib/ranking';
import type { SimpleAlbum } from '$lib/dbtypes';
import { db } from '$lib/server/db';
import {
	albumSelections,
	curatedAlbums,
	ratings,
	trekParticipants,
	trekRounds,
	treks,
	users,
	type RoundStatus
} from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import {
	and,
	asc,
	count,
	desc,
	eq,
	inArray,
	isNotNull,
	ne,
	sql
} from 'drizzle-orm';

type Trek = typeof treks.$inferSelect;
type TrekRound = typeof trekRounds.$inferSelect;

export function getLastConcludedYear(referenceDate = new Date()) {
	return referenceDate.getFullYear() - 1;
}

export function parseBoundedYear(
	value: FormDataEntryValue | null,
	fieldName: string
) {
	const parsed = Number(value);

	if (!Number.isInteger(parsed)) {
		throw new Error(`${fieldName} must be a whole year.`);
	}

	return parsed;
}

export function parseScoreTenth(value: FormDataEntryValue | null) {
	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5) {
		throw new Error('Rating must be between 0 and 5.');
	}

	const scoreTenth = Math.round(parsed * 10);

	if (Math.abs(scoreTenth / 10 - parsed) > 0.001) {
		throw new Error('Rating can use at most one decimal place.');
	}

	return scoreTenth;
}

export function formatScore(scoreTenth: number | null | undefined) {
	if (scoreTenth === null || scoreTenth === undefined) return null;

	return (scoreTenth / 10).toFixed(scoreTenth % 10 === 0 ? 0 : 1);
}

export function validateTrekYears(startYear: number, endYear: number) {
	const lastConcludedYear = getLastConcludedYear();

	if (startYear < 1900) {
		throw new Error('Start year must be 1900 or later.');
	}

	if (endYear > lastConcludedYear) {
		throw new Error(`End year must be ${lastConcludedYear} or earlier.`);
	}

	if (startYear > endYear) {
		throw new Error('Start year must be before or equal to end year.');
	}
}

export function validateAlbumInput(input: AlbumInput) {
	if (!input.albumName.trim()) {
		throw new Error('Album name is required.');
	}

	if (!input.artistName.trim()) {
		throw new Error('Artist name is required.');
	}
}

export function getProviderName(user: {
	name: string | null;
	email: string | null;
}) {
	return user.name ?? user.email ?? 'Unknown listener';
}

export async function listTreksForUser(userId: string) {
	const rows = await db
		.select({
			trek: treks,
			role: trekParticipants.role
		})
		.from(trekParticipants)
		.innerJoin(treks, eq(trekParticipants.trekId, treks.id))
		.where(eq(trekParticipants.userId, userId))
		.orderBy(desc(treks.createdAt));

	return Promise.all(
		rows.map(async ({ trek, role }) => {
			const [rounds, participantCount] = await Promise.all([
				getRounds(trek.id),
				getParticipantCount(trek.id)
			]);
			const activeRound =
				rounds.find((round) => round.status !== 'completed') ?? null;
			const completedYears = rounds.filter(
				(round) => round.status === 'completed'
			).length;
			const totalYears =
				trek.type === 'curated'
					? (await getCuratedAlbums(trek.id)).length
					: getYearRange(trek).length;

			return {
				...trek,
				role,
				participantCount,
				activeYear: activeRound?.year ?? null,
				completedYears,
				totalYears
			};
		})
	);
}

export async function createTrek(
	input: {
		name: string;
		userId: string;
	} & (
		| { type?: 'years'; startYear: number; endYear: number }
		| { type: 'curated'; albums: unknown }
	)
) {
	const name = input.name.trim();
	if (!name) throw new Error('Trek name is required.');
	const albums =
		input.type === 'curated' ? parseCuratedAlbums(input.albums) : [];
	if (input.type !== 'curated')
		validateTrekYears(input.startYear, input.endYear);
	const trekId = crypto.randomUUID();
	await db.transaction(async (tx) => {
		const [trek] = await tx
			.insert(treks)
			.values({
				id: trekId,
				name,
				type: input.type ?? 'years',
				startYear: input.type === 'curated' ? null : input.startYear,
				endYear: input.type === 'curated' ? null : input.endYear,
				inviteCode: generateInviteCode(),
				createdBy: input.userId
			})
			.returning();
		await tx
			.insert(trekParticipants)
			.values({ trekId, userId: input.userId, role: 'owner' });
		if (input.type === 'curated') {
			await tx.insert(curatedAlbums).values(
				albums.map((album, index) => ({
					...album,
					trekId,
					position: index + 1
				}))
			);
			await advanceCuratedRound(tx, trek);
		}
	});
	if (input.type !== 'curated') await startNextRound(trekId);
	return trekId;
}

export async function getTrekByInviteCode(inviteCode: string) {
	const rows = await db
		.select()
		.from(treks)
		.where(eq(treks.inviteCode, inviteCode))
		.limit(1);

	return rows[0] ?? null;
}

export async function joinTrek(inviteCode: string, userId: string) {
	const trek = await getTrekByInviteCode(inviteCode);

	if (!trek) {
		throw error(404, 'Invite not found.');
	}

	if (trek.type === 'curated') {
		return db.transaction(async (tx) => {
			const locked = await lockCuratedTrek(tx, trek.id);
			const [member] = await tx
				.select()
				.from(trekParticipants)
				.where(
					and(
						eq(trekParticipants.trekId, trek.id),
						eq(trekParticipants.userId, userId)
					)
				);
			if (member) return trek.id;
			if (locked.status === 'completed')
				throw error(409, 'This trek has already completed.');
			await tx
				.insert(trekParticipants)
				.values({ trekId: trek.id, userId, role: 'participant' });
			// Every participant must rate every drawn album, including earlier rounds.
			await tx
				.update(trekRounds)
				.set({ status: 'rating', completedAt: null })
				.where(eq(trekRounds.trekId, trek.id));
			await refreshCuratedRounds(tx, locked);
			return trek.id;
		});
	}

	const existingMembership = await getMembership(trek.id, userId);

	if (existingMembership) {
		return trek.id;
	}

	if (trek.status === 'completed') {
		throw error(409, 'This trek has already completed.');
	}

	const activeRound = await getActiveRound(trek.id);

	if (activeRound && activeRound.status !== 'selecting') {
		throw error(409, 'New participants can join after the current year wraps.');
	}

	await db
		.insert(trekParticipants)
		.values({
			trekId: trek.id,
			userId,
			role: 'participant'
		})
		.onConflictDoNothing();

	return trek.id;
}

export async function getSimpleTrekDetail(trekId: string, userId: string) {
	const trek = await getTrek(trekId);

	if (!trek) {
		throw error(404, 'Trek not found.');
	}

	const membership = await getMembership(trekId, userId);

	if (!membership) {
		throw error(403, 'You need to join this trek first.');
	}

	return trek;
}

export async function getTrekDetail(trekId: string, userId: string) {
	const trek = await getTrek(trekId);

	if (!trek) {
		throw error(404, 'Trek not found.');
	}

	const membership = await getMembership(trekId, userId);

	if (!membership) {
		throw error(403, 'You need to join this trek first.');
	}

	const participants = (
		await db
			.select({
				userId: users.id,
				name: users.name,
				email: users.email,
				image: users.image,
				role: trekParticipants.role,
				joinedAt: trekParticipants.joinedAt
			})
			.from(trekParticipants)
			.innerJoin(users, eq(trekParticipants.userId, users.id))
			.where(eq(trekParticipants.trekId, trekId))
			.orderBy(asc(trekParticipants.joinedAt))
	).map((participant) => ({
		...participant,
		displayName: getProviderName(participant)
	}));

	const rounds = await getRounds(trekId);
	const currentRound =
		rounds.find((round) => round.status !== 'completed') ?? null;
	const selections = currentRound
		? await getSelectionsForRound(
				currentRound.id,
				userId,
				trek.type === 'curated'
					? participants.map((participant) => participant.userId)
					: undefined
			)
		: [];
	const completedYears = rounds.filter(
		(round) => round.status === 'completed'
	).length;
	const curatedList =
		trek.type === 'curated' ? await getCuratedAlbums(trekId) : [];
	const remainingYears = getRemainingYears(trek, rounds);
	const rankedYears =
		completedYears > 0 ? await getRankedConcludedYearsForTrek(trekId) : [];
	const rankedAlbums =
		completedYears > 0 ? await getRankedAlbumsForTrek(trekId) : [];
	const rankedYearsCount = await getRankedConcludedYearsCountForTrek(trekId);
	const rankedAlbumsCount = await getAlbumCountForTrek(trekId);

	return {
		trek,
		membership,
		participants,
		curatedAlbums: curatedList,
		rounds: trek.type === 'curated' ? rounds : sortRoundsByYear(rounds),
		rankedYears,
		rankedYearsCount,
		rankedAlbums,
		rankedAlbumsCount,
		currentRound,
		selections,
		mySelection:
			selections.find((selection) => selection.userId === userId) ?? null,
		progress: {
			participantCount: participants.length,
			selectionCount: selections.length,
			completedYears,
			totalYears:
				trek.type === 'curated'
					? curatedList.length
					: getYearRange(trek).length,
			remainingYears:
				trek.type === 'curated'
					? curatedList.length - completedYears
					: remainingYears.length,
			requiredRatingCount: currentRound
				? participants.length * selections.length
				: 0,
			ratingCount: selections.reduce(
				(sum, selection) => sum + selection.ratingCount,
				0
			),
			canAdvance: !currentRound && trek.status === 'active'
		}
	};
}

export async function getConcludedYearDetail(input: {
	trekId: string;
	userId: string;
	year: number;
}) {
	const trek = await getTrek(input.trekId);

	if (!trek || trek.type !== 'years') {
		throw error(404, 'Trek not found.');
	}

	await assertMember(input.trekId, input.userId);

	const round =
		(
			await db
				.select()
				.from(trekRounds)
				.where(
					and(
						eq(trekRounds.trekId, input.trekId),
						eq(trekRounds.year, input.year),
						eq(trekRounds.status, 'completed')
					)
				)
				.limit(1)
		)[0] ?? null;

	if (!round) {
		throw error(404, 'Concluded year not found.');
	}

	const selections = await getSelectionsForConcludedRound(round.id);
	const scoreValues = selections.flatMap((selection) =>
		selection.ratings.map((rating) => rating.scoreTenth)
	);
	const scoreTotal = scoreValues.reduce((sum, score) => sum + score, 0);

	return {
		trek,
		round,
		selections,
		summary: {
			albumCount: selections.length,
			ratingCount: scoreValues.length,
			averageScore:
				scoreValues.length > 0
					? formatScore(scoreTotal / scoreValues.length)
					: null
		}
	};
}

export async function updateTrekTitle(input: {
	trekId: string;
	userId: string;
	name: string;
}) {
	await assertOwner(input.trekId, input.userId);

	const name = input.name.trim();

	if (!name) {
		throw new Error('Trek title is required.');
	}

	await db.update(treks).set({ name }).where(eq(treks.id, input.trekId));
}

export async function removeParticipant(input: {
	trekId: string;
	ownerId: string;
	participantId: string;
}) {
	await assertOwner(input.trekId, input.ownerId);

	if (input.ownerId === input.participantId) {
		throw new Error('The owner cannot be removed from the trek.');
	}

	const participant = await getMembership(input.trekId, input.participantId);

	if (!participant) {
		throw error(404, 'Participant not found.');
	}

	if (participant.role === 'owner') {
		throw new Error('The owner cannot be removed from the trek.');
	}

	const trek = await getTrek(input.trekId);
	if (trek?.type === 'curated') {
		await db.transaction(async (tx) => {
			await lockCuratedTrek(tx, trek.id);
			await tx
				.delete(trekParticipants)
				.where(
					and(
						eq(trekParticipants.trekId, trek.id),
						eq(trekParticipants.userId, input.participantId)
					)
				);
			await refreshCuratedRounds(tx, trek);
		});
		return;
	}

	const activeRound = await getActiveRound(input.trekId);

	if (activeRound && (await getRatingCountForRound(activeRound.id)) > 0) {
		throw new Error(
			'Participants can be removed after the current year wraps.'
		);
	}

	await db.transaction(async (tx) => {
		if (activeRound) {
			await tx
				.delete(albumSelections)
				.where(
					and(
						eq(albumSelections.roundId, activeRound.id),
						eq(albumSelections.userId, input.participantId)
					)
				);
		}

		await tx
			.delete(trekParticipants)
			.where(
				and(
					eq(trekParticipants.trekId, input.trekId),
					eq(trekParticipants.userId, input.participantId)
				)
			);
	});

	if (activeRound) {
		await refreshRoundState(input.trekId, activeRound.id);
	}
}

export async function deleteTrek(input: { trekId: string; userId: string }) {
	await assertOwner(input.trekId, input.userId);

	if ((await getParticipantCount(input.trekId)) > 1) {
		throw new Error(
			'A trek can only be deleted before other participants join.'
		);
	}

	await db.delete(treks).where(eq(treks.id, input.trekId));
}

export async function selectAlbum(
	trekId: string,
	userId: string,
	input: AlbumInput
) {
	await assertMember(trekId, userId);
	if ((await getTrek(trekId))?.type === 'curated')
		throw error(409, 'Curated albums are fixed when the trek is created.');
	validateAlbumInput(input);

	const round = await getActiveRound(trekId);

	if (!round) {
		throw error(409, 'Randomize the next year before selecting an album.');
	}

	if (round.status !== 'selecting') {
		throw error(409, 'Album selections are locked once rating starts.');
	}

	await db
		.insert(albumSelections)
		.values({
			roundId: round.id,
			userId,
			spotifyAlbumId: cleanOptional(input.spotifyAlbumId),
			albumName: input.albumName.trim(),
			artistName: input.artistName.trim(),
			releaseDate: cleanOptional(input.releaseDate),
			imageUrl: cleanOptional(input.imageUrl),
			externalUrl: cleanOptional(input.externalUrl)
		})
		.onConflictDoUpdate({
			target: [albumSelections.roundId, albumSelections.userId],
			set: {
				spotifyAlbumId: cleanOptional(input.spotifyAlbumId),
				albumName: input.albumName.trim(),
				artistName: input.artistName.trim(),
				releaseDate: cleanOptional(input.releaseDate),
				imageUrl: cleanOptional(input.imageUrl),
				externalUrl: cleanOptional(input.externalUrl)
			}
		});

	await refreshRoundState(trekId, round.id);
}

export async function deleteOwnSelection(input: {
	trekId: string;
	userId: string;
}) {
	await assertMember(input.trekId, input.userId);

	if ((await getTrek(input.trekId))?.type === 'curated')
		throw error(409, 'Curated albums cannot be deleted.');

	const round = await getActiveRound(input.trekId);

	if (!round) {
		throw error(409, 'There is no active year selection to delete.');
	}

	if ((await getRatingCountForRound(round.id)) > 0) {
		throw new Error('Album selections are locked after ratings begin.');
	}

	const deletedRows = await db
		.delete(albumSelections)
		.where(
			and(
				eq(albumSelections.roundId, round.id),
				eq(albumSelections.userId, input.userId)
			)
		)
		.returning({ id: albumSelections.id });

	if (deletedRows.length === 0) {
		throw error(404, 'Album selection not found.');
	}

	await refreshRoundState(input.trekId, round.id);
}

export async function rateSelection(input: {
	trekId: string;
	userId: string;
	selectionId: string;
	scoreTenth: number;
	note?: string | null;
}) {
	await assertMember(input.trekId, input.userId);

	if (
		!Number.isInteger(input.scoreTenth) ||
		input.scoreTenth < 0 ||
		input.scoreTenth > 50
	) {
		throw new Error('Rating must be between 0 and 5.');
	}

	if ((await getTrek(input.trekId))?.type === 'curated') {
		await db.transaction(async (tx) => {
			const trek = await lockCuratedTrek(tx, input.trekId);
			const [member] = await tx
				.select()
				.from(trekParticipants)
				.where(
					and(
						eq(trekParticipants.trekId, trek.id),
						eq(trekParticipants.userId, input.userId)
					)
				);
			if (!member) throw error(403, 'You are not a participant in this trek.');
			const [selection] = await tx
				.select({ id: albumSelections.id, status: trekRounds.status })
				.from(albumSelections)
				.innerJoin(trekRounds, eq(albumSelections.roundId, trekRounds.id))
				.where(
					and(
						eq(albumSelections.id, input.selectionId),
						eq(trekRounds.trekId, trek.id)
					)
				);
			if (!selection) throw error(404, 'Album selection not found.');
			if (selection.status !== 'rating')
				throw error(409, 'This album round is already completed.');
			const values = {
				scoreTenth: input.scoreTenth,
				note: cleanOptional(input.note),
				updatedAt: new Date()
			};
			await tx
				.insert(ratings)
				.values({
					...values,
					selectionId: input.selectionId,
					userId: input.userId
				})
				.onConflictDoUpdate({
					target: [ratings.selectionId, ratings.userId],
					set: values
				});
			await refreshCuratedRounds(tx, trek);
		});
		return;
	}

	const selection = (
		await db
			.select({
				selectionId: albumSelections.id,
				roundId: albumSelections.roundId,
				roundStatus: trekRounds.status
			})
			.from(albumSelections)
			.innerJoin(trekRounds, eq(albumSelections.roundId, trekRounds.id))
			.where(
				and(
					eq(albumSelections.id, input.selectionId),
					eq(trekRounds.trekId, input.trekId)
				)
			)
			.limit(1)
	)[0];

	if (!selection) {
		throw error(404, 'Album selection not found.');
	}

	if (selection.roundStatus !== 'rating') {
		throw error(
			409,
			'Ratings open after every participant has selected an album.'
		);
	}

	const now = new Date();

	await db
		.insert(ratings)
		.values({
			selectionId: input.selectionId,
			userId: input.userId,
			scoreTenth: input.scoreTenth,
			note: cleanOptional(input.note),
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: [ratings.selectionId, ratings.userId],
			set: {
				scoreTenth: input.scoreTenth,
				note: cleanOptional(input.note),
				updatedAt: now
			}
		});

	await refreshRoundState(input.trekId, selection.roundId);
}

export async function advanceTrek(trekId: string, userId: string) {
	await assertMember(trekId, userId);

	return startNextRound(trekId);
}

export async function startNextRound(trekId: string) {
	const trek = await getTrek(trekId);

	if (!trek) {
		throw error(404, 'Trek not found.');
	}

	if (trek.type === 'curated') {
		return db.transaction(async (tx) =>
			advanceCuratedRound(tx, await lockCuratedTrek(tx, trekId))
		);
	}

	const activeRound = await getActiveRound(trekId);

	if (activeRound) {
		return activeRound;
	}

	const rounds = await getRounds(trekId);
	const remainingYears = getRemainingYears(trek, rounds);

	if (remainingYears.length === 0) {
		await completeTrek(trekId);
		return null;
	}

	const year =
		remainingYears[Math.floor(Math.random() * remainingYears.length)];

	const insertedRounds = await db
		.insert(trekRounds)
		.values({
			trekId,
			position: rounds.length + 1,
			year,
			status: 'selecting'
		})
		.returning();

	return insertedRounds[0] ?? null;
}

export async function getUser(userId: string) {
	const user = (await db.select().from(users).where(eq(users.id, userId))).at(
		0
	);
	if (!user) {
		throw error(404, 'User not found.');
	}

	return user;
}

export async function getTrekMemberships(userId: string) {
	const rows = await db
		.select()
		.from(trekParticipants)
		.where(eq(trekParticipants.userId, userId));

	return rows;
}

async function assertMember(trekId: string, userId: string) {
	const membership = await getMembership(trekId, userId);

	if (!membership) {
		throw error(403, 'You are not a participant in this trek.');
	}

	return membership;
}

async function assertOwner(trekId: string, userId: string) {
	const membership = await assertMember(trekId, userId);

	if (membership.role !== 'owner') {
		throw error(403, 'Only the trek owner can do that.');
	}

	return membership;
}

async function getTrek(trekId: string) {
	const rows = await db
		.select()
		.from(treks)
		.where(eq(treks.id, trekId))
		.limit(1);

	return rows[0] ?? null;
}

async function getMembership(trekId: string, userId: string) {
	const rows = await db
		.select()
		.from(trekParticipants)
		.where(
			and(
				eq(trekParticipants.trekId, trekId),
				eq(trekParticipants.userId, userId)
			)
		)
		.limit(1);

	return rows[0] ?? null;
}

async function getParticipantCount(trekId: string) {
	const rows = await db
		.select({ value: count() })
		.from(trekParticipants)
		.where(eq(trekParticipants.trekId, trekId))
		.limit(1);

	return rows[0]?.value ?? 0;
}

async function getRounds(trekId: string) {
	return db
		.select()
		.from(trekRounds)
		.where(eq(trekRounds.trekId, trekId))
		.orderBy(asc(trekRounds.position));
}

async function getActiveRound(trekId: string) {
	const rows = await db
		.select()
		.from(trekRounds)
		.where(
			and(eq(trekRounds.trekId, trekId), ne(trekRounds.status, 'completed'))
		)
		.orderBy(asc(trekRounds.position))
		.limit(1);

	return rows[0] ?? null;
}

async function getRatingCountForRound(roundId: string) {
	const selectionIds = (
		await db
			.select({ id: albumSelections.id })
			.from(albumSelections)
			.where(eq(albumSelections.roundId, roundId))
	).map((selection) => selection.id);

	if (selectionIds.length === 0) {
		return 0;
	}

	const rows = await db
		.select({ value: count() })
		.from(ratings)
		.where(inArray(ratings.selectionId, selectionIds))
		.limit(1);

	return rows[0]?.value ?? 0;
}

async function getSelectionsForRound(
	roundId: string,
	userId: string,
	participantIds?: string[]
) {
	const selections = await db
		.select({
			id: albumSelections.id,
			roundId: albumSelections.roundId,
			userId: albumSelections.userId,
			spotifyAlbumId: albumSelections.spotifyAlbumId,
			albumName: albumSelections.albumName,
			artistName: albumSelections.artistName,
			releaseDate: albumSelections.releaseDate,
			imageUrl: albumSelections.imageUrl,
			externalUrl: albumSelections.externalUrl,
			createdAt: albumSelections.createdAt,
			userName: users.name,
			userEmail: users.email,
			userImage: users.image
		})
		.from(albumSelections)
		.innerJoin(users, eq(albumSelections.userId, users.id))
		.where(eq(albumSelections.roundId, roundId))
		.orderBy(asc(albumSelections.createdAt));

	const selectionIds = selections.map((selection) => selection.id);
	const ratingRows =
		selectionIds.length > 0
			? await db
					.select({
						selectionId: ratings.selectionId,
						userId: ratings.userId,
						scoreTenth: ratings.scoreTenth,
						note: ratings.note
					})
					.from(ratings)
					.where(
						and(
							inArray(ratings.selectionId, selectionIds),
							participantIds
								? inArray(ratings.userId, participantIds)
								: undefined
						)
					)
			: [];

	return selections.map((selection) => {
		const selectionRatings = ratingRows.filter(
			(rating) => rating.selectionId === selection.id
		);
		const scoreTotal = selectionRatings.reduce(
			(sum, rating) => sum + rating.scoreTenth,
			0
		);
		const myRating =
			selectionRatings.find((rating) => rating.userId === userId) ?? null;

		return {
			...selection,
			submittedBy: getProviderName({
				name: selection.userName,
				email: selection.userEmail
			}),
			ratingCount: selectionRatings.length,
			averageScore:
				selectionRatings.length > 0
					? formatScore(scoreTotal / selectionRatings.length)
					: null,
			myRating: myRating
				? {
						...myRating,
						displayScore: formatScore(myRating.scoreTenth)
					}
				: null
		};
	});
}

async function getSelectionsForConcludedRound(roundId: string) {
	const selections = await db
		.select({
			id: albumSelections.id,
			roundId: albumSelections.roundId,
			userId: albumSelections.userId,
			spotifyAlbumId: albumSelections.spotifyAlbumId,
			albumName: albumSelections.albumName,
			artistName: albumSelections.artistName,
			releaseDate: albumSelections.releaseDate,
			imageUrl: albumSelections.imageUrl,
			externalUrl: albumSelections.externalUrl,
			createdAt: albumSelections.createdAt,
			userName: users.name,
			userEmail: users.email,
			userImage: users.image
		})
		.from(albumSelections)
		.innerJoin(users, eq(albumSelections.userId, users.id))
		.where(eq(albumSelections.roundId, roundId))
		.orderBy(asc(albumSelections.createdAt));

	const selectionIds = selections.map((selection) => selection.id);
	const ratingRows =
		selectionIds.length > 0
			? await db
					.select({
						selectionId: ratings.selectionId,
						userId: ratings.userId,
						scoreTenth: ratings.scoreTenth,
						note: ratings.note,
						userName: users.name,
						userEmail: users.email,
						userImage: users.image
					})
					.from(ratings)
					.innerJoin(users, eq(ratings.userId, users.id))
					.where(inArray(ratings.selectionId, selectionIds))
					.orderBy(asc(users.name), asc(users.email))
			: [];

	return selections.map((selection) => {
		const selectionRatings = ratingRows.filter(
			(rating) => rating.selectionId === selection.id
		);
		const scoreTotal = selectionRatings.reduce(
			(sum, rating) => sum + rating.scoreTenth,
			0
		);

		return {
			...selection,
			submittedBy: getProviderName({
				name: selection.userName,
				email: selection.userEmail
			}),
			ratingCount: selectionRatings.length,
			averageScore:
				selectionRatings.length > 0
					? formatScore(scoreTotal / selectionRatings.length)
					: null,
			ratings: selectionRatings.map((rating) => ({
				...rating,
				displayName: getProviderName({
					name: rating.userName,
					email: rating.userEmail
				}),
				displayScore: formatScore(rating.scoreTenth)
			}))
		};
	});
}

type AlbumSelection = {
	id: string;
	roundId: string;
	userId: string;
	spotifyAlbumId: string | null;
	albumName: string;
	artistName: string;
	releaseDate: string | null;
	imageUrl: string | null;
	externalUrl: string | null;
	createdAt: Date;
	year: number | null;
	roundPosition: number;
	userName: string | null;
	userEmail: string | null;
};

export async function getRankedAlbumsForUser(
	userId: string,
	{ limit, offset } = { limit: 10, offset: 0 }
) {
	try {
		const selections = await db
			.select({
				id: albumSelections.id,
				roundId: albumSelections.roundId,
				userId: albumSelections.userId,
				spotifyAlbumId: albumSelections.spotifyAlbumId,
				albumName: albumSelections.albumName,
				artistName: albumSelections.artistName,
				releaseDate: albumSelections.releaseDate,
				imageUrl: albumSelections.imageUrl,
				externalUrl: albumSelections.externalUrl,
				createdAt: albumSelections.createdAt,
				year: trekRounds.year,
				trekId: trekRounds.trekId,
				trekName: treks.name,
				roundPosition: trekRounds.position,
				userName: users.name,
				userEmail: users.email,
				rating: ratings.scoreTenth,
				rank: sql<number>`rank() over (order by ${ratings.scoreTenth} desc)`.mapWith(
					Number
				),
				ratingNote: ratings.note,
				roundStatus: trekRounds.status
			})
			.from(ratings)
			.innerJoin(albumSelections, eq(albumSelections.id, ratings.selectionId))
			.innerJoin(users, eq(albumSelections.userId, users.id))
			.innerJoin(trekRounds, eq(albumSelections.roundId, trekRounds.id))
			.innerJoin(treks, eq(trekRounds.trekId, treks.id))
			.where(eq(ratings.userId, userId))
			.orderBy(
				desc(ratings.scoreTenth),
				asc(albumSelections.createdAt),
				asc(albumSelections.id)
			)
			.limit(limit)
			.offset(offset);

		return selections;
	} catch (err: unknown) {
		console.error('Error:', err);
		throw err;
	}
}

export async function getAlbumCountForUser(userId: string) {
	const rows = await db
		.select({ count: count() })
		.from(ratings)
		.where(eq(ratings.userId, userId));
	return rows[0]?.count ?? 0;
}

export async function getAlbumCountForTrek(trekId: string) {
	const selection = await db
		.select({ count: count() })
		.from(albumSelections)
		.innerJoin(trekRounds, eq(albumSelections.roundId, trekRounds.id))
		.where(
			and(eq(trekRounds.trekId, trekId), eq(trekRounds.status, 'completed'))
		);

	return selection.at(0)?.count ?? 0;
}

export async function getRankedAlbumsForTrek(
	trekId: string,
	{ limit, offset } = { limit: 10, offset: 0 }
) {
	const selections = await db
		.select({
			id: albumSelections.id,
			roundId: albumSelections.roundId,
			userId: albumSelections.userId,
			spotifyAlbumId: albumSelections.spotifyAlbumId,
			albumName: albumSelections.albumName,
			artistName: albumSelections.artistName,
			releaseDate: albumSelections.releaseDate,
			imageUrl: albumSelections.imageUrl,
			externalUrl: albumSelections.externalUrl,
			createdAt: albumSelections.createdAt,
			year: trekRounds.year,
			roundPosition: trekRounds.position,
			userName: users.name,
			userEmail: users.email
		})
		.from(albumSelections)
		.innerJoin(trekRounds, eq(albumSelections.roundId, trekRounds.id))
		.innerJoin(users, eq(albumSelections.userId, users.id))
		.where(
			and(eq(trekRounds.trekId, trekId), eq(trekRounds.status, 'completed'))
		)
		.orderBy(asc(trekRounds.year), asc(albumSelections.createdAt));

	const resolvedRanked = resolveRanking(selections);

	if (!limit) {
		return resolvedRanked;
	}

	return (await resolvedRanked).slice(offset, offset + limit);
}

async function resolveRanking(selections: AlbumSelection[]) {
	const selectionIds = selections.map((selection) => selection.id);
	const query = db
		.select({
			selectionId: ratings.selectionId,
			scoreTenth: ratings.scoreTenth
		})
		.from(ratings)
		.where(inArray(ratings.selectionId, selectionIds));

	const ratingRows = selectionIds.length > 0 ? await query : [];
	const ratingsBySelection = new Map<string, number[]>();

	for (const rating of ratingRows) {
		const values = ratingsBySelection.get(rating.selectionId) ?? [];
		values.push(rating.scoreTenth);
		ratingsBySelection.set(rating.selectionId, values);
	}

	const sorted = selections
		.map((selection) => {
			const scoreValues = ratingsBySelection.get(selection.id) ?? [];
			const scoreTotal = scoreValues.reduce((sum, score) => sum + score, 0);
			const averageScoreTenth =
				scoreValues.length > 0 ? scoreTotal / scoreValues.length : null;

			return {
				...selection,
				submittedBy: getProviderName({
					name: selection.userName,
					email: selection.userEmail
				}),
				ratingCount: scoreValues.length,
				averageScoreTenth,
				averageScore: formatScore(averageScoreTenth)
			};
		})
		.sort((left, right) => {
			if (left.averageScoreTenth === null && right.averageScoreTenth === null) {
				return (
					(left.year ?? 0) - (right.year ?? 0) ||
					left.albumName.localeCompare(right.albumName) ||
					left.artistName.localeCompare(right.artistName)
				);
			}

			if (left.averageScoreTenth === null) return 1;
			if (right.averageScoreTenth === null) return -1;

			return (
				right.averageScoreTenth - left.averageScoreTenth ||
				right.ratingCount - left.ratingCount ||
				(left.year ?? 0) - (right.year ?? 0) ||
				left.albumName.localeCompare(right.albumName) ||
				left.artistName.localeCompare(right.artistName)
			);
		});
	return rankByScore(sorted, (album) => album.averageScoreTenth);
}

export async function getRankedConcludedYearsCountForTrek(trekId: string) {
	const selection = await db
		.select({ count: count() })
		.from(trekRounds)
		.where(
			and(
				eq(trekRounds.trekId, trekId),
				eq(trekRounds.status, 'completed'),
				isNotNull(trekRounds.year)
			)
		);

	return selection.at(0)?.count ?? 0;
}

export async function getRankedConcludedYearsForTrek(
	trekId: string | undefined,
	{ limit, offset } = { limit: 10, offset: 0 },
	userId?: string
) {
	const concludedRounds = await db
		.select({
			roundId: trekRounds.id,
			year: trekRounds.year,
			position: trekRounds.position,
			trekId: trekRounds.trekId,
			trekName: treks.name
		})
		.from(trekRounds)
		.innerJoin(treks, eq(trekRounds.trekId, treks.id))
		.where(
			and(
				trekId ? eq(trekRounds.trekId, trekId) : undefined,
				eq(trekRounds.status, 'completed'),
				isNotNull(trekRounds.year),
				userId
					? inArray(
							trekRounds.id,
							db
								.select({ roundId: albumSelections.roundId })
								.from(ratings)
								.innerJoin(
									albumSelections,
									eq(ratings.selectionId, albumSelections.id)
								)
								.where(eq(ratings.userId, userId))
						)
					: undefined
			)
		)
		.orderBy(asc(trekRounds.year));

	const roundIds = concludedRounds.map((round) => round.roundId);
	const selections =
		roundIds.length > 0
			? await db
					.select({
						id: albumSelections.id,
						roundId: albumSelections.roundId,
						albumName: albumSelections.albumName,
						artistName: albumSelections.artistName,
						imageUrl: albumSelections.imageUrl,
						releaseDate: albumSelections.releaseDate
					})
					.from(albumSelections)
					.where(inArray(albumSelections.roundId, roundIds))
			: [];
	const selectionRoundIds = new Map(
		selections.map((selection) => [selection.id, selection.roundId])
	);

	type Stats = {
		albumCount: number;
		ratingCount: number;
		scoreTotal: number;
		albums: SimpleAlbum[];
	};

	const statsByRound = new Map(
		concludedRounds.map((round) => [
			round.roundId,
			{
				albumCount: 0,
				ratingCount: 0,
				scoreTotal: 0,
				albums: []
			} as Stats
		])
	);

	const selectionIds: string[] = [];

	for (const selection of selections) {
		selectionIds.push(selection.id);
		const stats = statsByRound.get(selection.roundId);
		if (stats) {
			stats.albumCount += 1;
			stats.albums.push(selection as SimpleAlbum);
		}
	}

	const ratingRows =
		selectionIds.length > 0
			? await db
					.select({
						selectionId: ratings.selectionId,
						scoreTenth: ratings.scoreTenth
					})
					.from(ratings)
					.where(
						and(
							inArray(ratings.selectionId, selectionIds),
							userId ? eq(ratings.userId, userId) : undefined
						)
					)
			: [];

	for (const rating of ratingRows) {
		const roundId = selectionRoundIds.get(rating.selectionId);
		const stats = roundId ? statsByRound.get(roundId) : null;

		if (stats) {
			stats.ratingCount += 1;
			stats.scoreTotal += rating.scoreTenth;
		}
	}

	const allRows = concludedRounds
		.map((round) => {
			const stats = statsByRound.get(round.roundId);
			const ratingCount = stats?.ratingCount ?? 0;
			const averageScoreTenth =
				stats && ratingCount > 0 ? stats.scoreTotal / ratingCount : null;

			return {
				...round,
				year: round.year!,
				albumCount: stats?.albumCount ?? 0,
				ratingCount,
				averageScoreTenth,
				averageScore: formatScore(averageScoreTenth),
				albums: stats?.albums ?? null
			};
		})
		.filter((round) => !userId || round.ratingCount > 0)
		.sort((left, right) => {
			if (left.averageScoreTenth === null && right.averageScoreTenth === null) {
				return (left.year ?? 0) - (right.year ?? 0);
			}

			if (left.averageScoreTenth === null) return 1;
			if (right.averageScoreTenth === null) return -1;

			return (
				right.averageScoreTenth - left.averageScoreTenth ||
				right.ratingCount - left.ratingCount ||
				right.albumCount - left.albumCount ||
				(left.year ?? 0) - (right.year ?? 0) ||
				left.roundId.localeCompare(right.roundId)
			);
		});

	const rankedRows = rankByScore(allRows, (year) => year.averageScoreTenth);

	if (!limit) {
		return rankedRows;
	}

	return rankedRows.slice(offset, offset + limit);
}

async function refreshRoundState(trekId: string, roundId: string) {
	const participantCount = await getParticipantCount(trekId);
	const selectionIds = (
		await db
			.select({ id: albumSelections.id })
			.from(albumSelections)
			.where(eq(albumSelections.roundId, roundId))
	).map((selection) => selection.id);

	let nextStatus: RoundStatus = 'selecting';

	if (participantCount > 0 && selectionIds.length >= participantCount) {
		const ratingCount =
			selectionIds.length > 0
				? ((
						await db
							.select({ value: count() })
							.from(ratings)
							.where(inArray(ratings.selectionId, selectionIds))
							.limit(1)
					)[0]?.value ?? 0)
				: 0;

		nextStatus =
			ratingCount >= participantCount * selectionIds.length
				? 'completed'
				: 'rating';
	}

	const now = new Date();

	await db
		.update(trekRounds)
		.set({
			status: nextStatus,
			completedAt: nextStatus === 'completed' ? now : null
		})
		.where(eq(trekRounds.id, roundId));

	if (nextStatus === 'completed') {
		const [trek, rounds] = await Promise.all([
			getTrek(trekId),
			getRounds(trekId)
		]);

		if (trek && getRemainingYears(trek, rounds).length === 0) {
			await completeTrek(trekId);
		}
	}
}

async function completeTrek(trekId: string) {
	await db
		.update(treks)
		.set({
			status: 'completed',
			completedAt: new Date()
		})
		.where(eq(treks.id, trekId));
}

function getYearRange(trek: Pick<Trek, 'startYear' | 'endYear'>) {
	const years: number[] = [];
	if (trek.startYear === null || trek.endYear === null) return years;

	for (let year = trek.startYear; year <= trek.endYear; year += 1) {
		years.push(year);
	}

	return years;
}

function getRemainingYears(
	trek: Pick<Trek, 'startYear' | 'endYear'>,
	rounds: TrekRound[]
) {
	const generatedYears = new Set(rounds.map((round) => round.year));

	return getYearRange(trek).filter((year) => !generatedYears.has(year));
}

function sortRoundsByYear(rounds: TrekRound[]) {
	return [...rounds].sort((left, right) => {
		const yearOrder = (left.year ?? 0) - (right.year ?? 0);

		return yearOrder === 0 ? left.position - right.position : yearOrder;
	});
}

function generateInviteCode() {
	return crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
}

function cleanOptional(value: string | null | undefined) {
	const cleaned = value?.trim();

	return cleaned ? cleaned : null;
}

type TrekTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function lockCuratedTrek(tx: TrekTransaction, trekId: string) {
	const [trek] = await tx
		.select()
		.from(treks)
		.where(eq(treks.id, trekId))
		.for('update');
	if (!trek || trek.type !== 'curated')
		throw error(404, 'Curated trek not found.');
	return trek;
}

async function getCuratedAlbums(trekId: string) {
	return db
		.select()
		.from(curatedAlbums)
		.where(eq(curatedAlbums.trekId, trekId))
		.orderBy(asc(curatedAlbums.position));
}

/** Caller holds the trek lock, so simultaneous final ratings cannot draw twice. */
async function advanceCuratedRound(tx: TrekTransaction, trek: Trek) {
	const rounds = await tx
		.select()
		.from(trekRounds)
		.where(eq(trekRounds.trekId, trek.id))
		.orderBy(asc(trekRounds.position));
	const active = rounds.find((round) => round.status !== 'completed');
	if (active) return active;
	const albums = await tx
		.select()
		.from(curatedAlbums)
		.where(eq(curatedAlbums.trekId, trek.id));
	const drawn = new Set(rounds.map((round) => round.curatedAlbumId));
	const remaining = albums.filter((album) => !drawn.has(album.id));
	if (!remaining.length) {
		await tx
			.update(treks)
			.set({ status: 'completed', completedAt: new Date() })
			.where(eq(treks.id, trek.id));
		return null;
	}
	const album = remaining[Math.floor(Math.random() * remaining.length)];
	const [round] = await tx
		.insert(trekRounds)
		.values({
			trekId: trek.id,
			position: rounds.length + 1,
			curatedAlbumId: album.id,
			status: 'rating'
		})
		.returning();
	await tx.insert(albumSelections).values({
		roundId: round.id,
		userId: trek.createdBy,
		spotifyAlbumId: album.spotifyAlbumId,
		albumName: album.albumName,
		artistName: album.artistName,
		releaseDate: album.releaseDate,
		imageUrl: album.imageUrl,
		externalUrl: album.externalUrl
	});
	return round;
}

async function refreshCuratedRounds(tx: TrekTransaction, trek: Trek) {
	const participants = await tx
		.select({ userId: trekParticipants.userId })
		.from(trekParticipants)
		.where(eq(trekParticipants.trekId, trek.id));
	const rounds = await tx
		.select()
		.from(trekRounds)
		.where(eq(trekRounds.trekId, trek.id));
	const scores = await tx
		.select({ roundId: albumSelections.roundId, userId: ratings.userId })
		.from(ratings)
		.innerJoin(albumSelections, eq(ratings.selectionId, albumSelections.id))
		.innerJoin(trekRounds, eq(albumSelections.roundId, trekRounds.id))
		.where(eq(trekRounds.trekId, trek.id));
	for (const round of rounds) {
		const rated = new Set(
			scores
				.filter((score) => score.roundId === round.id)
				.map((score) => score.userId)
		);
		const completed =
			participants.length > 0 &&
			participants.every((participant) => rated.has(participant.userId));
		if (completed && round.status !== 'completed') {
			await tx
				.update(trekRounds)
				.set({ status: 'completed', completedAt: new Date() })
				.where(eq(trekRounds.id, round.id));
		}
	}
	await advanceCuratedRound(tx, trek);
}

export async function getConcludedAlbumRoundDetail(input: {
	trekId: string;
	userId: string;
	roundId: string;
}) {
	const trek = await getSimpleTrekDetail(input.trekId, input.userId);
	const [round] = await db
		.select()
		.from(trekRounds)
		.where(
			and(
				eq(trekRounds.id, input.roundId),
				eq(trekRounds.trekId, trek.id),
				eq(trekRounds.status, 'completed')
			)
		);
	if (trek.type !== 'curated' || !round)
		throw error(404, 'Concluded album round not found.');
	const selections = await getSelectionsForConcludedRound(round.id);
	const scores = selections.flatMap((selection) =>
		selection.ratings.map((rating) => rating.scoreTenth)
	);
	return {
		trek,
		round,
		selections,
		summary: {
			albumCount: selections.length,
			ratingCount: scores.length,
			averageScore: scores.length
				? formatScore(
						scores.reduce((sum, score) => sum + score, 0) / scores.length
					)
				: null
		}
	};
}
