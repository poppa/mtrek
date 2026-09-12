import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { register } from 'node:module';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

// A new database is created and dropped. No existing database tables are changed.
const baseUrl = process.env.TEST_DATABASE_URL;
if (!baseUrl)
	throw new Error(
		'Set TEST_DATABASE_URL to a disposable PostgreSQL server with CREATE DATABASE permission.'
	);
const databaseName = `mtrek_test_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Pool({ connectionString: baseUrl });
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;
let pool;
let service;
let parseCuratedAlbums;
let databaseCreated = false;

before(async () => {
	await admin.query(`CREATE DATABASE "${databaseName}"`);
	databaseCreated = true;
	register('./typescript-loader.mjs', import.meta.url, {
		data: { databaseUrl: testUrl.href }
	});
	({ pool } = await import('../src/lib/server/db/index.ts'));
	await pool.query(
		await readFile(
			new URL('../drizzle/0000_rapid_lady_bullseye.sql', import.meta.url),
			'utf8'
		)
	);
	await pool.query(`INSERT INTO "user" (id, name) VALUES ('legacy-owner', 'Legacy');
		INSERT INTO trek (id, name, "startYear", "endYear", "inviteCode", "createdBy") VALUES ('legacy-trek', 'Legacy years', 1990, 1999, 'legacy-invite', 'legacy-owner');`);
	await pool.query(
		await readFile(
			new URL('../drizzle/0001_curated_treks.sql', import.meta.url),
			'utf8'
		)
	);
	service = await import('../src/lib/server/trek-service.ts');
	({ parseCuratedAlbums } = await import('../src/lib/curated-albums.ts'));
});

after(async () => {
	await pool?.end();
	if (databaseCreated) await admin.query(`DROP DATABASE "${databaseName}"`);
	await admin.end();
});

async function user() {
	const id = randomUUID();
	await pool.query('INSERT INTO "user" (id, name) VALUES ($1, $2)', [
		id,
		`Listener ${id}`
	]);
	return id;
}

async function curated(size = 3) {
	const owner = await user();
	const albums = Array.from({ length: size }, (_, n) => ({
		albumName: `Album ${n}`,
		artistName: 'Artist',
		releaseDate: '2000',
		spotifyAlbumId: n === 0 ? 'spotify-album' : null
	}));
	const id = await service.createTrek({
		name: 'Curated test',
		type: 'curated',
		userId: owner,
		albums
	});
	const detail = await service.getTrekDetail(id, owner);
	return { id, owner, albums, invite: detail.trek.inviteCode, detail };
}

async function rate(id, userId, selectionId, scoreTenth = 40) {
	await service.rateSelection({ trekId: id, userId, selectionId, scoreTenth });
}

test('migration preserves existing year-based Treks', async () => {
	const {
		rows: [trek]
	} = await pool.query('SELECT * FROM trek WHERE id = $1', ['legacy-trek']);
	assert.equal(trek.type, 'years');
	assert.equal(trek.startYear, 1990);
	assert.equal(trek.endYear, 1999);
});

test('curated list validation rejects empty, malformed and duplicate albums', () => {
	for (const value of [
		null,
		[],
		[{}],
		[{ albumName: 1, artistName: 'Artist' }]
	])
		assert.throws(() => parseCuratedAlbums(value));
	const album = {
		albumName: ' Album ',
		artistName: 'Artist',
		spotifyAlbumId: 'id'
	};
	assert.equal(parseCuratedAlbums([album])[0].albumName, 'Album');
	assert.throws(() =>
		parseCuratedAlbums([album, { ...album, albumName: 'Other' }])
	);
	assert.throws(() =>
		parseCuratedAlbums([album, { albumName: 'album', artistName: 'artist' }])
	);
	assert.throws(() =>
		parseCuratedAlbums([{ ...album, externalUrl: 'javascript:alert(1)' }])
	);
});

test('creation starts one album, all participants must rate, final ratings advance exactly once', async () => {
	const { id, owner, invite, detail } = await curated();
	const friend = await user();
	await service.joinTrek(invite, friend);
	assert.equal(detail.trek.type, 'curated');
	assert.equal(detail.trek.startYear, null);
	assert.equal(detail.currentRound.year, null);
	assert.equal(detail.currentRound.status, 'rating');
	assert.equal(detail.selections.length, 1);
	assert.equal(detail.curatedAlbums.length, 3);
	const selectionId = detail.selections[0].id;
	await rate(id, owner, selectionId);
	let current = await service.getTrekDetail(id, friend);
	assert.equal(current.currentRound.id, detail.currentRound.id);
	assert.equal(current.progress.ratingCount, 1);
	assert.equal(current.progress.requiredRatingCount, 2);
	await rate(id, friend, selectionId);
	current = await service.getTrekDetail(id, owner);
	assert.equal(current.rounds.length, 2);
	assert.equal(current.progress.completedYears, 1);
	assert.notEqual(
		current.currentRound.curatedAlbumId,
		detail.currentRound.curatedAlbumId
	);
	// Concurrent ratings and requests to advance must not skip or duplicate albums.
	await Promise.all([
		rate(id, owner, current.selections[0].id),
		rate(id, friend, current.selections[0].id),
		service.advanceTrek(id, owner)
	]);
	current = await service.getTrekDetail(id, owner);
	assert.equal(current.rounds.length, 3);
	assert.equal(
		new Set(current.rounds.map((round) => round.curatedAlbumId)).size,
		3
	);
	await Promise.all([
		rate(id, owner, current.selections[0].id),
		rate(id, friend, current.selections[0].id)
	]);
	current = await service.getTrekDetail(id, owner);
	assert.equal(current.trek.status, 'completed');
	assert.equal(current.currentRound, null);
	assert.equal(current.progress.completedYears, 3);
	assert.equal(current.rankedAlbums.length, 3);
	assert.deepEqual(
		current.rankedAlbums.map((album) => album.rank),
		[1, 1, 1]
	);
	assert.equal(current.rankedYears.length, 0);
	assert.equal(current.rankedYearsCount, 0);
	assert.equal(
		(
			await service.getRankedConcludedYearsForTrek(
				undefined,
				{ limit: 0, offset: 0 },
				owner
			)
		).length,
		0
	);
	assert.equal((await service.getRankedAlbumsForUser(owner)).length, 3);
	assert.equal(
		(
			await service.getConcludedAlbumRoundDetail({
				trekId: id,
				userId: owner,
				roundId: detail.currentRound.id
			})
		).summary.ratingCount,
		2
	);
	await assert.rejects(service.joinTrek(invite, await user()));
});

test('late joiners rate earlier albums without losing existing ratings', async () => {
	const { id, owner, invite, detail } = await curated(2);
	await rate(id, owner, detail.selections[0].id);
	const late = await user();
	await service.joinTrek(invite, late);
	let current = await service.getTrekDetail(id, late);
	assert.equal(current.currentRound.id, detail.currentRound.id);
	assert.equal(current.selections[0].ratingCount, 1);
	assert.equal(current.selections[0].myRating, null);
	assert.equal(current.progress.completedYears, 0);
	assert.equal(current.rounds.length, 2);
	await rate(id, late, current.selections[0].id);
	current = await service.getTrekDetail(id, owner);
	assert.equal(current.progress.completedYears, 1);
	await rate(id, owner, current.selections[0].id);
	await rate(id, late, current.selections[0].id);
	assert.equal(
		(await service.getTrekDetail(id, owner)).trek.status,
		'completed'
	);
});

test('removing a participant recomputes completion and ignores their ratings in progress', async () => {
	const { id, owner, invite, detail } = await curated(2);
	const friend = await user();
	const removed = await user();
	await service.joinTrek(invite, friend);
	await service.joinTrek(invite, removed);
	await rate(id, removed, detail.selections[0].id);
	await service.removeParticipant({
		trekId: id,
		ownerId: owner,
		participantId: removed
	});
	let current = await service.getTrekDetail(id, owner);
	assert.equal(current.progress.ratingCount, 0);
	assert.equal(current.progress.requiredRatingCount, 2);
	await rate(id, owner, current.selections[0].id);
	await service.removeParticipant({
		trekId: id,
		ownerId: owner,
		participantId: friend
	});
	current = await service.getTrekDetail(id, owner);
	assert.equal(current.progress.completedYears, 1);
	assert.equal(current.rounds.length, 2);
});

test('curated picks are immutable and membership and round ownership are enforced', async () => {
	const { id, owner, detail } = await curated(1);
	await assert.rejects(
		service.selectAlbum(id, owner, { albumName: 'Other', artistName: 'Artist' })
	);
	await assert.rejects(
		service.deleteOwnSelection({ trekId: id, userId: owner })
	);
	await assert.rejects(rate(id, await user(), detail.selections[0].id));
	await assert.rejects(rate(id, owner, detail.selections[0].id, NaN));
	const other = await curated(1);
	await assert.rejects(rate(id, owner, other.detail.selections[0].id));
	await assert.rejects(
		service.getConcludedAlbumRoundDetail({
			trekId: id,
			userId: owner,
			roundId: detail.currentRound.id
		})
	);
	await rate(id, owner, detail.selections[0].id);
	await assert.rejects(rate(id, owner, detail.selections[0].id));
	await service.deleteTrek({ trekId: id, userId: owner });
	assert.equal(
		(await pool.query('SELECT * FROM curated_album WHERE "trekId" = $1', [id]))
			.rowCount,
		0
	);
});

test('year-based Treks still select one album per participant and advance manually', async () => {
	const owner = await user();
	const friend = await user();
	const id = await service.createTrek({
		name: 'Year regression',
		userId: owner,
		startYear: 1990,
		endYear: 1991
	});
	let current = await service.getTrekDetail(id, owner);
	assert.equal(current.trek.type, 'years');
	assert.equal(current.currentRound.status, 'selecting');
	await service.joinTrek(current.trek.inviteCode, friend);
	for (const userId of [owner, friend])
		await service.selectAlbum(id, userId, {
			albumName: userId,
			artistName: 'Artist'
		});
	current = await service.getTrekDetail(id, owner);
	assert.equal(current.currentRound.status, 'rating');
	for (const selection of current.selections)
		for (const userId of [owner, friend]) await rate(id, userId, selection.id);
	current = await service.getTrekDetail(id, owner);
	assert.equal(current.currentRound, null);
	assert.equal(current.progress.canAdvance, true);
	assert.equal(current.rounds.length, 1);
	assert.equal(current.rankedYears.length, 1);
	assert.equal(current.rankedAlbums.length, 2);
	await service.advanceTrek(id, owner);
	assert.equal(
		(await service.getTrekDetail(id, owner)).currentRound.status,
		'selecting'
	);
});

test('a returning participant reuses earlier ratings and does not leave completed rounds open', async () => {
	const { id, owner, invite, detail } = await curated(3);
	const friend = await user();
	await service.joinTrek(invite, friend);
	await rate(id, owner, detail.selections[0].id);
	await rate(id, friend, detail.selections[0].id);
	await service.removeParticipant({
		trekId: id,
		ownerId: owner,
		participantId: friend
	});
	await service.joinTrek(invite, friend);
	const current = await service.getTrekDetail(id, friend);
	assert.equal(current.progress.completedYears, 1);
	assert.equal(current.currentRound.position, 2);
	assert.equal(current.rounds.length, 2);
});
