import { error } from '@sveltejs/kit';
import { and, asc, count, desc, eq, inArray, ne } from 'drizzle-orm';

import { db } from '$lib/server/db';
import {
	albumSelections,
	ratings,
	trekParticipants,
	trekRounds,
	treks,
	users,
	type RoundStatus
} from '$lib/server/db/schema';

type Trek = typeof treks.$inferSelect;
type TrekRound = typeof trekRounds.$inferSelect;

export type AlbumInput = {
	spotifyAlbumId?: string | null;
	albumName: string;
	artistName: string;
	releaseDate?: string | null;
	imageUrl?: string | null;
	externalUrl?: string | null;
};

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

export function listTreksForUser(userId: string) {
	const rows = db
		.select({
			trek: treks,
			role: trekParticipants.role
		})
		.from(trekParticipants)
		.innerJoin(treks, eq(trekParticipants.trekId, treks.id))
		.where(eq(trekParticipants.userId, userId))
		.orderBy(desc(treks.createdAt))
		.all();

	return rows.map(({ trek, role }) => {
		const rounds = getRounds(trek.id);
		const participantCount = getParticipantCount(trek.id);
		const activeRound =
			rounds.find((round) => round.status !== 'completed') ?? null;
		const completedYears = rounds.filter(
			(round) => round.status === 'completed'
		).length;
		const totalYears = getYearRange(trek).length;

		return {
			...trek,
			role,
			participantCount,
			activeYear: activeRound?.year ?? null,
			completedYears,
			totalYears
		};
	});
}

export function createTrek(input: {
	name: string;
	startYear: number;
	endYear: number;
	userId: string;
}) {
	const name = input.name.trim();

	if (!name) {
		throw new Error('Trek name is required.');
	}

	validateTrekYears(input.startYear, input.endYear);

	const trekId = crypto.randomUUID();

	db.transaction((tx) => {
		tx.insert(treks)
			.values({
				id: trekId,
				name,
				startYear: input.startYear,
				endYear: input.endYear,
				inviteCode: generateInviteCode(),
				createdBy: input.userId
			})
			.run();

		tx.insert(trekParticipants)
			.values({
				trekId,
				userId: input.userId,
				role: 'owner'
			})
			.run();
	});

	startNextRound(trekId);

	return trekId;
}

export function getTrekByInviteCode(inviteCode: string) {
	return (
		db.select().from(treks).where(eq(treks.inviteCode, inviteCode)).get() ??
		null
	);
}

export function joinTrek(inviteCode: string, userId: string) {
	const trek = getTrekByInviteCode(inviteCode);

	if (!trek) {
		throw error(404, 'Invite not found.');
	}

	const existingMembership = getMembership(trek.id, userId);

	if (existingMembership) {
		return trek.id;
	}

	if (trek.status === 'completed') {
		throw error(409, 'This trek has already completed.');
	}

	const activeRound = getActiveRound(trek.id);

	if (activeRound && activeRound.status !== 'selecting') {
		throw error(409, 'New participants can join after the current year wraps.');
	}

	db.insert(trekParticipants)
		.values({
			trekId: trek.id,
			userId,
			role: 'participant'
		})
		.onConflictDoNothing()
		.run();

	return trek.id;
}

export function getTrekDetail(trekId: string, userId: string) {
	const trek = getTrek(trekId);

	if (!trek) {
		throw error(404, 'Trek not found.');
	}

	const membership = getMembership(trekId, userId);

	if (!membership) {
		throw error(403, 'You need to join this trek first.');
	}

	const participants = db
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
		.all()
		.map((participant) => ({
			...participant,
			displayName: getProviderName(participant)
		}));

	const rounds = getRounds(trekId);
	const currentRound =
		rounds.find((round) => round.status !== 'completed') ?? null;
	const selections = currentRound
		? getSelectionsForRound(currentRound.id, userId)
		: [];
	const completedYears = rounds.filter(
		(round) => round.status === 'completed'
	).length;
	const remainingYears = getRemainingYears(trek, rounds);

	return {
		trek,
		membership,
		participants,
		rounds,
		currentRound,
		selections,
		mySelection:
			selections.find((selection) => selection.userId === userId) ?? null,
		progress: {
			participantCount: participants.length,
			selectionCount: selections.length,
			completedYears,
			totalYears: getYearRange(trek).length,
			remainingYears: remainingYears.length,
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

export function getConcludedYearDetail(input: {
	trekId: string;
	userId: string;
	year: number;
}) {
	const trek = getTrek(input.trekId);

	if (!trek) {
		throw error(404, 'Trek not found.');
	}

	assertMember(input.trekId, input.userId);

	const round =
		db
			.select()
			.from(trekRounds)
			.where(
				and(
					eq(trekRounds.trekId, input.trekId),
					eq(trekRounds.year, input.year),
					eq(trekRounds.status, 'completed')
				)
			)
			.get() ?? null;

	if (!round) {
		throw error(404, 'Concluded year not found.');
	}

	const selections = getSelectionsForConcludedRound(round.id);
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

export function updateTrekTitle(input: {
	trekId: string;
	userId: string;
	name: string;
}) {
	assertOwner(input.trekId, input.userId);

	const name = input.name.trim();

	if (!name) {
		throw new Error('Trek title is required.');
	}

	db.update(treks).set({ name }).where(eq(treks.id, input.trekId)).run();
}

export function removeParticipant(input: {
	trekId: string;
	ownerId: string;
	participantId: string;
}) {
	assertOwner(input.trekId, input.ownerId);

	if (input.ownerId === input.participantId) {
		throw new Error('The owner cannot be removed from the trek.');
	}

	const participant = getMembership(input.trekId, input.participantId);

	if (!participant) {
		throw error(404, 'Participant not found.');
	}

	if (participant.role === 'owner') {
		throw new Error('The owner cannot be removed from the trek.');
	}

	const activeRound = getActiveRound(input.trekId);

	if (activeRound && getRatingCountForRound(activeRound.id) > 0) {
		throw new Error(
			'Participants can be removed after the current year wraps.'
		);
	}

	db.transaction((tx) => {
		if (activeRound) {
			tx.delete(albumSelections)
				.where(
					and(
						eq(albumSelections.roundId, activeRound.id),
						eq(albumSelections.userId, input.participantId)
					)
				)
				.run();
		}

		tx.delete(trekParticipants)
			.where(
				and(
					eq(trekParticipants.trekId, input.trekId),
					eq(trekParticipants.userId, input.participantId)
				)
			)
			.run();
	});

	if (activeRound) {
		refreshRoundState(input.trekId, activeRound.id);
	}
}

export function deleteTrek(input: { trekId: string; userId: string }) {
	assertOwner(input.trekId, input.userId);

	if (getParticipantCount(input.trekId) > 1) {
		throw new Error(
			'A trek can only be deleted before other participants join.'
		);
	}

	db.delete(treks).where(eq(treks.id, input.trekId)).run();
}

export function selectAlbum(trekId: string, userId: string, input: AlbumInput) {
	assertMember(trekId, userId);
	validateAlbumInput(input);

	const round = getActiveRound(trekId);

	if (!round) {
		throw error(409, 'Randomize the next year before selecting an album.');
	}

	if (round.status !== 'selecting') {
		throw error(409, 'Album selections are locked once rating starts.');
	}

	db.insert(albumSelections)
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
		})
		.run();

	refreshRoundState(trekId, round.id);
}

export function deleteOwnSelection(input: { trekId: string; userId: string }) {
	assertMember(input.trekId, input.userId);

	const round = getActiveRound(input.trekId);

	if (!round) {
		throw error(409, 'There is no active year selection to delete.');
	}

	if (getRatingCountForRound(round.id) > 0) {
		throw new Error('Album selections are locked after ratings begin.');
	}

	const result = db
		.delete(albumSelections)
		.where(
			and(
				eq(albumSelections.roundId, round.id),
				eq(albumSelections.userId, input.userId)
			)
		)
		.run();

	if (result.changes === 0) {
		throw error(404, 'Album selection not found.');
	}

	refreshRoundState(input.trekId, round.id);
}

export function rateSelection(input: {
	trekId: string;
	userId: string;
	selectionId: string;
	scoreTenth: number;
	note?: string | null;
}) {
	assertMember(input.trekId, input.userId);

	if (input.scoreTenth < 0 || input.scoreTenth > 50) {
		throw new Error('Rating must be between 0 and 5.');
	}

	const selection = db
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
		.get();

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

	db.insert(ratings)
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
		})
		.run();

	refreshRoundState(input.trekId, selection.roundId);
}

export function advanceTrek(trekId: string, userId: string) {
	assertMember(trekId, userId);

	return startNextRound(trekId);
}

export function startNextRound(trekId: string) {
	const trek = getTrek(trekId);

	if (!trek) {
		throw error(404, 'Trek not found.');
	}

	const activeRound = getActiveRound(trekId);

	if (activeRound) {
		return activeRound;
	}

	const rounds = getRounds(trekId);
	const remainingYears = getRemainingYears(trek, rounds);

	if (remainingYears.length === 0) {
		completeTrek(trekId);
		return null;
	}

	const year =
		remainingYears[Math.floor(Math.random() * remainingYears.length)];

	return db
		.insert(trekRounds)
		.values({
			trekId,
			position: rounds.length + 1,
			year,
			status: 'selecting'
		})
		.returning()
		.get();
}

function assertMember(trekId: string, userId: string) {
	const membership = getMembership(trekId, userId);

	if (!membership) {
		throw error(403, 'You are not a participant in this trek.');
	}

	return membership;
}

function assertOwner(trekId: string, userId: string) {
	const membership = assertMember(trekId, userId);

	if (membership.role !== 'owner') {
		throw error(403, 'Only the trek owner can do that.');
	}

	return membership;
}

function getTrek(trekId: string) {
	return db.select().from(treks).where(eq(treks.id, trekId)).get() ?? null;
}

function getMembership(trekId: string, userId: string) {
	return (
		db
			.select()
			.from(trekParticipants)
			.where(
				and(
					eq(trekParticipants.trekId, trekId),
					eq(trekParticipants.userId, userId)
				)
			)
			.get() ?? null
	);
}

function getParticipantCount(trekId: string) {
	return (
		db
			.select({ value: count() })
			.from(trekParticipants)
			.where(eq(trekParticipants.trekId, trekId))
			.get()?.value ?? 0
	);
}

function getRounds(trekId: string) {
	return db
		.select()
		.from(trekRounds)
		.where(eq(trekRounds.trekId, trekId))
		.orderBy(asc(trekRounds.position))
		.all();
}

function getActiveRound(trekId: string) {
	return (
		db
			.select()
			.from(trekRounds)
			.where(
				and(eq(trekRounds.trekId, trekId), ne(trekRounds.status, 'completed'))
			)
			.orderBy(asc(trekRounds.position))
			.get() ?? null
	);
}

function getRatingCountForRound(roundId: string) {
	const selectionIds = db
		.select({ id: albumSelections.id })
		.from(albumSelections)
		.where(eq(albumSelections.roundId, roundId))
		.all()
		.map((selection) => selection.id);

	if (selectionIds.length === 0) {
		return 0;
	}

	return (
		db
			.select({ value: count() })
			.from(ratings)
			.where(inArray(ratings.selectionId, selectionIds))
			.get()?.value ?? 0
	);
}

function getSelectionsForRound(roundId: string, userId: string) {
	const selections = db
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
		.orderBy(asc(albumSelections.createdAt))
		.all();

	const selectionIds = selections.map((selection) => selection.id);
	const ratingRows =
		selectionIds.length > 0
			? db
					.select({
						selectionId: ratings.selectionId,
						userId: ratings.userId,
						scoreTenth: ratings.scoreTenth,
						note: ratings.note
					})
					.from(ratings)
					.where(inArray(ratings.selectionId, selectionIds))
					.all()
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

function getSelectionsForConcludedRound(roundId: string) {
	const selections = db
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
		.orderBy(asc(albumSelections.createdAt))
		.all();

	const selectionIds = selections.map((selection) => selection.id);
	const ratingRows =
		selectionIds.length > 0
			? db
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
					.all()
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

function refreshRoundState(trekId: string, roundId: string) {
	const participantCount = getParticipantCount(trekId);
	const selectionIds = db
		.select({ id: albumSelections.id })
		.from(albumSelections)
		.where(eq(albumSelections.roundId, roundId))
		.all()
		.map((selection) => selection.id);

	let nextStatus: RoundStatus = 'selecting';

	if (participantCount > 0 && selectionIds.length >= participantCount) {
		const ratingCount =
			selectionIds.length > 0
				? (db
						.select({ value: count() })
						.from(ratings)
						.where(inArray(ratings.selectionId, selectionIds))
						.get()?.value ?? 0)
				: 0;

		nextStatus =
			ratingCount >= participantCount * selectionIds.length
				? 'completed'
				: 'rating';
	}

	const now = new Date();

	db.update(trekRounds)
		.set({
			status: nextStatus,
			completedAt: nextStatus === 'completed' ? now : null
		})
		.where(eq(trekRounds.id, roundId))
		.run();

	if (nextStatus === 'completed') {
		const trek = getTrek(trekId);
		const rounds = getRounds(trekId);

		if (trek && getRemainingYears(trek, rounds).length === 0) {
			completeTrek(trekId);
		}
	}
}

function completeTrek(trekId: string) {
	db.update(treks)
		.set({
			status: 'completed',
			completedAt: new Date()
		})
		.where(eq(treks.id, trekId))
		.run();
}

function getYearRange(trek: Pick<Trek, 'startYear' | 'endYear'>) {
	const years: number[] = [];

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

function generateInviteCode() {
	return crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
}

function cleanOptional(value: string | null | undefined) {
	const cleaned = value?.trim();

	return cleaned ? cleaned : null;
}
