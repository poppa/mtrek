import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: '.env.dev', quiet: true });
config({ path: '.env.local', quiet: true, override: true });
config({ path: '.env', quiet: true });

const localDatabaseUrl = 'postgres://postgres:postgres@localhost:5432/mtrek';
const roundStatuses = new Set(['selecting', 'rating', 'completed']);

async function main() {
	const options = parseArgs(process.argv.slice(2));

	if (options.help) {
		printHelp();
		return;
	}

	if (!options.listParticipants && !options.filePath) {
		throw new Error('Provide a backfill JSON file, or use --help.');
	}

	const pool = new Pool({
		...getPoolConnectionConfig(getDatabaseUrl()),
		max: 1
	});
	const client = await pool.connect();

	try {
		if (options.listParticipants) {
			await listParticipants(client, options.listParticipants);
			return;
		}

		const input = await readBackfillFile(options.filePath);
		const trekId = options.trekId ?? getRequiredString(input, 'trekId');

		await client.query('begin');

		try {
			const summary = await backfillTrek(client, {
				input,
				trekId,
				allowOutOfRange: options.allowOutOfRange
			});

			if (options.dryRun) {
				await client.query('rollback');
			} else {
				await client.query('commit');
			}

			printSummary(summary, options.dryRun);
		} catch (error) {
			await client.query('rollback');
			throw error;
		}
	} finally {
		client.release();
		await pool.end();
	}
}

function parseArgs(args) {
	const options = {
		allowOutOfRange: false,
		dryRun: false,
		filePath: null,
		help: false,
		listParticipants: null,
		trekId: null
	};

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--help' || arg === '-h') {
			options.help = true;
		} else if (arg === '--dry-run') {
			options.dryRun = true;
		} else if (arg === '--allow-out-of-range') {
			options.allowOutOfRange = true;
		} else if (arg === '--participants') {
			options.listParticipants = readNextArg(args, (index += 1), arg);
		} else if (arg === '--trek') {
			options.trekId = readNextArg(args, (index += 1), arg);
		} else if (arg.startsWith('--')) {
			throw new Error(`Unknown option: ${arg}`);
		} else if (!options.filePath) {
			options.filePath = arg;
		} else {
			throw new Error(`Unexpected argument: ${arg}`);
		}
	}

	return options;
}

function readNextArg(args, index, option) {
	const value = args[index];

	if (!value || value.startsWith('--')) {
		throw new Error(`${option} requires a value.`);
	}

	return value;
}

function printHelp() {
	console.log(`Backfill MTrek years, album selections, and ratings.

Usage:
  npm run trek:backfill -- scripts/backfill-trek.example.json
  npm run trek:backfill -- --dry-run scripts/backfill-trek.example.json
  npm run trek:backfill -- --participants <trek-id>

Options:
  --dry-run              Validate and write inside a transaction, then roll it back.
  --participants <id>    List registered participants for a trek.
  --trek <id>            Override the trekId in the JSON file.
  --allow-out-of-range   Allow years outside the trek start/end range.
  -h, --help             Show this help.

Every user referenced by a selection or rating must already be registered as a participant in the trek.`);
}

async function readBackfillFile(filePath) {
	let raw;

	try {
		raw = await readFile(filePath, 'utf8');
	} catch (error) {
		throw new Error(`Could not read ${filePath}: ${error.message}`, {
			cause: error
		});
	}

	try {
		const parsed = JSON.parse(raw);
		assertPlainObject(parsed, 'backfill file');
		return parsed;
	} catch (error) {
		throw new Error(`Could not parse ${filePath}: ${error.message}`, {
			cause: error
		});
	}
}

async function listParticipants(client, trekId) {
	const trek = await getTrek(client, trekId);
	const participants = await getTrekParticipants(client, trekId);

	console.log(
		`${trek.name} (${trek.type === 'curated' ? 'Curated albums' : `${trek.startYear}-${trek.endYear}`})`
	);
	console.table(
		participants.map((participant) => ({
			aliasCandidate: participant.email ?? participant.userId,
			email: participant.email,
			name: participant.name,
			role: participant.role,
			userId: participant.userId
		}))
	);
}

async function backfillTrek(client, options) {
	const trek = await getTrek(client, options.trekId);
	if (trek.type === 'curated')
		throw new Error('Year backfill is only supported for year-based treks.');
	const participants = await getTrekParticipants(client, trek.id);

	if (participants.length === 0) {
		throw new Error(`Trek ${trek.id} has no registered participants.`);
	}

	const participantIndex = indexParticipants(participants);
	const aliases = buildParticipantAliases(
		options.input.participants,
		participantIndex
	);
	const years = getBackfillYears(options.input);
	const summary = {
		participantCount: participants.length,
		ratingsUpserted: 0,
		roundsCreated: 0,
		roundsUpdated: 0,
		selectionsUpserted: 0,
		trek,
		trekCompleted: false,
		yearsProcessed: 0
	};

	for (const [yearIndex, yearInput] of years.entries()) {
		const path = `years[${yearIndex}]`;
		const yearPlan = normalizeYearInput(yearInput, path, trek, {
			allowOutOfRange: options.allowOutOfRange
		});
		const round = await upsertRound(client, trek.id, yearPlan);

		if (round.created) {
			summary.roundsCreated += 1;
		} else {
			summary.roundsUpdated += 1;
		}

		for (const [
			selectionIndex,
			selectionInput
		] of yearPlan.selections.entries()) {
			const selectionPath = `${path}.selections[${selectionIndex}]`;
			const selectionPlan = normalizeSelectionInput(
				selectionInput,
				selectionPath,
				participantIndex,
				aliases
			);
			const selectionId = await upsertSelection(
				client,
				round.id,
				selectionPlan
			);

			summary.selectionsUpserted += 1;

			for (const [
				ratingIndex,
				ratingInput
			] of selectionPlan.ratings.entries()) {
				const ratingPath = `${selectionPath}.ratings[${ratingIndex}]`;
				const ratingPlan = normalizeRatingInput(
					ratingInput,
					ratingPath,
					participantIndex,
					aliases
				);

				await upsertRating(client, selectionId, ratingPlan);
				summary.ratingsUpserted += 1;
			}
		}

		summary.yearsProcessed += 1;
	}

	summary.trekCompleted = await completeTrekIfReady(client, trek);

	return summary;
}

async function getTrek(client, trekId) {
	const result = await client.query(
		`
			select
				id,
				name,
				type,
				"startYear",
				"endYear",
				status,
				"completedAt"
			from trek
			where id = $1
			limit 1
		`,
		[trekId]
	);
	const trek = result.rows[0];

	if (!trek) {
		throw new Error(`Trek not found: ${trekId}`);
	}

	return trek;
}

async function getTrekParticipants(client, trekId) {
	const result = await client.query(
		`
			select
				tp."userId",
				tp.role,
				u.email,
				u.name
			from trek_participant tp
			inner join "user" u on u.id = tp."userId"
			where tp."trekId" = $1
			order by tp."joinedAt", u.email, u.name
		`,
		[trekId]
	);

	return result.rows;
}

function indexParticipants(participants) {
	const byEmail = new Map();
	const byUserId = new Map();

	for (const participant of participants) {
		byUserId.set(participant.userId, participant);

		if (participant.email) {
			byEmail.set(participant.email.toLowerCase(), participant);
		}
	}

	return { byEmail, byUserId, participants };
}

function buildParticipantAliases(rawAliases, participantIndex) {
	const aliases = new Map();

	if (rawAliases === undefined) {
		return aliases;
	}

	assertPlainObject(rawAliases, 'participants');

	for (const [alias, rawReference] of Object.entries(rawAliases)) {
		if (!alias.trim()) {
			throw new Error('Participant alias names cannot be empty.');
		}

		const participant = resolveParticipant(
			rawReference,
			participantIndex,
			aliases,
			`participants.${alias}`
		);
		aliases.set(alias, participant);
	}

	return aliases;
}

function getBackfillYears(input) {
	if (!Array.isArray(input.years) || input.years.length === 0) {
		throw new Error('Backfill file must contain a non-empty years array.');
	}

	return input.years;
}

function normalizeYearInput(input, path, trek, options) {
	assertPlainObject(input, path);

	const year = getWholeNumber(input, 'year', path);

	if (
		!options.allowOutOfRange &&
		(year < trek.startYear || year > trek.endYear)
	) {
		throw new Error(
			`${path}.year ${year} is outside trek range ${trek.startYear}-${trek.endYear}. Use --allow-out-of-range to override.`
		);
	}

	const status = input.status === undefined ? 'completed' : input.status;

	if (!roundStatuses.has(status)) {
		throw new Error(
			`${path}.status must be one of selecting, rating, or completed.`
		);
	}

	const completedAt =
		status === 'completed'
			? (parseTimestamp(input.completedAt, `${path}.completedAt`) ?? new Date())
			: null;

	if (!Array.isArray(input.selections)) {
		throw new Error(`${path}.selections must be an array.`);
	}

	return {
		completedAt,
		selections: input.selections,
		status,
		year
	};
}

async function upsertRound(client, trekId, input) {
	const existing = await client.query(
		`
			select id
			from trek_round
			where "trekId" = $1 and year = $2
			limit 1
		`,
		[trekId, input.year]
	);
	const existingRound = existing.rows[0];

	if (existingRound) {
		await client.query(
			`
				update trek_round
				set status = $3, "completedAt" = $4
				where "trekId" = $1 and year = $2
			`,
			[trekId, input.year, input.status, input.completedAt]
		);

		return { created: false, id: existingRound.id };
	}

	const positionResult = await client.query(
		`
			select coalesce(max(position), 0) + 1 as position
			from trek_round
			where "trekId" = $1
		`,
		[trekId]
	);
	const position = Number(positionResult.rows[0].position);
	const id = randomUUID();

	await client.query(
		`
			insert into trek_round (
				id,
				"trekId",
				position,
				year,
				status,
				"completedAt"
			)
			values ($1, $2, $3, $4, $5, $6)
		`,
		[id, trekId, position, input.year, input.status, input.completedAt]
	);

	return { created: true, id };
}

function normalizeSelectionInput(input, path, participantIndex, aliases) {
	assertPlainObject(input, path);

	const participant = resolveParticipant(
		getParticipantReference(input, path),
		participantIndex,
		aliases,
		`${path}.participant`
	);
	const ratings = normalizeRatings(input.ratings, `${path}.ratings`);

	return {
		albumName: getRequiredString(input, 'albumName', path),
		artistName: getRequiredString(input, 'artistName', path),
		externalUrl: cleanOptionalString(input.externalUrl, `${path}.externalUrl`),
		imageUrl: cleanOptionalString(input.imageUrl, `${path}.imageUrl`),
		participant,
		ratings,
		releaseDate: cleanOptionalString(input.releaseDate, `${path}.releaseDate`),
		spotifyAlbumId: cleanOptionalString(
			input.spotifyAlbumId,
			`${path}.spotifyAlbumId`
		)
	};
}

async function upsertSelection(client, roundId, input) {
	const result = await client.query(
		`
			insert into album_selection (
				id,
				"roundId",
				"userId",
				"spotifyAlbumId",
				"albumName",
				"artistName",
				"releaseDate",
				"imageUrl",
				"externalUrl"
			)
			values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			on conflict ("roundId", "userId")
			do update set
				"spotifyAlbumId" = excluded."spotifyAlbumId",
				"albumName" = excluded."albumName",
				"artistName" = excluded."artistName",
				"releaseDate" = excluded."releaseDate",
				"imageUrl" = excluded."imageUrl",
				"externalUrl" = excluded."externalUrl"
			returning id
		`,
		[
			randomUUID(),
			roundId,
			input.participant.userId,
			input.spotifyAlbumId,
			input.albumName,
			input.artistName,
			input.releaseDate,
			input.imageUrl,
			input.externalUrl
		]
	);

	return result.rows[0].id;
}

function normalizeRatings(rawRatings, path) {
	if (rawRatings === undefined) {
		return [];
	}

	if (Array.isArray(rawRatings)) {
		return rawRatings;
	}

	assertPlainObject(rawRatings, path);

	return Object.entries(rawRatings).map(([participant, value]) => {
		if (isPlainObject(value)) {
			return { participant, ...value };
		}

		return { participant, score: value };
	});
}

function normalizeRatingInput(input, path, participantIndex, aliases) {
	assertPlainObject(input, path);

	const participant = resolveParticipant(
		getParticipantReference(input, path),
		participantIndex,
		aliases,
		`${path}.participant`
	);

	return {
		note: cleanOptionalString(input.note, `${path}.note`),
		participant,
		scoreTenth: parseScoreTenth(input, path)
	};
}

async function upsertRating(client, selectionId, input) {
	const now = new Date();

	await client.query(
		`
			insert into rating (
				id,
				"selectionId",
				"userId",
				"scoreTenth",
				note,
				"updatedAt"
			)
			values ($1, $2, $3, $4, $5, $6)
			on conflict ("selectionId", "userId")
			do update set
				"scoreTenth" = excluded."scoreTenth",
				note = excluded.note,
				"updatedAt" = excluded."updatedAt"
		`,
		[
			randomUUID(),
			selectionId,
			input.participant.userId,
			input.scoreTenth,
			input.note,
			now
		]
	);
}

async function completeTrekIfReady(client, trek) {
	const totalYears = trek.endYear - trek.startYear + 1;
	const completedResult = await client.query(
		`
			select count(*)::int as count
			from trek_round
			where "trekId" = $1
				and status = 'completed'
				and year between $2 and $3
		`,
		[trek.id, trek.startYear, trek.endYear]
	);
	const completedYears = Number(completedResult.rows[0].count);

	if (completedYears < totalYears) {
		return false;
	}

	await client.query(
		`
			update trek
			set status = 'completed',
				"completedAt" = coalesce("completedAt", $2)
			where id = $1
		`,
		[trek.id, new Date()]
	);

	return trek.status !== 'completed';
}

function getParticipantReference(input, path) {
	if (Object.hasOwn(input, 'participant')) {
		return input.participant;
	}

	if (Object.hasOwn(input, 'user')) {
		return input.user;
	}

	if (Object.hasOwn(input, 'userId')) {
		return { userId: input.userId };
	}

	if (Object.hasOwn(input, 'email')) {
		return { email: input.email };
	}

	throw new Error(
		`${path} must include participant, user, userId, or email to identify the registered participant.`
	);
}

function resolveParticipant(rawReference, participantIndex, aliases, path) {
	if (typeof rawReference === 'string') {
		const trimmed = rawReference.trim();

		if (!trimmed) {
			throw new Error(`${path} cannot be empty.`);
		}

		const alias = aliases.get(trimmed);

		if (alias) {
			return alias;
		}

		const byUserId = participantIndex.byUserId.get(trimmed);

		if (byUserId) {
			return byUserId;
		}

		const byEmail = participantIndex.byEmail.get(trimmed.toLowerCase());

		if (byEmail) {
			return byEmail;
		}

		throw new Error(
			`${path} references "${trimmed}", which is not a participant alias, user id, or email for this trek.`
		);
	}

	assertPlainObject(rawReference, path);

	if (Object.hasOwn(rawReference, 'userId')) {
		const userId = getRequiredString(rawReference, 'userId', path);
		const participant = participantIndex.byUserId.get(userId);

		if (!participant) {
			throw new Error(`${path}.userId is not a participant in this trek.`);
		}

		return participant;
	}

	if (Object.hasOwn(rawReference, 'email')) {
		const email = getRequiredString(rawReference, 'email', path);
		const participant = participantIndex.byEmail.get(email.toLowerCase());

		if (!participant) {
			throw new Error(`${path}.email is not a participant in this trek.`);
		}

		return participant;
	}

	throw new Error(
		`${path} must be a string, { "userId": "..." }, or { "email": "..." }.`
	);
}

function parseScoreTenth(input, path) {
	if (Object.hasOwn(input, 'scoreTenth')) {
		const scoreTenth = getWholeNumber(input, 'scoreTenth', path);

		if (scoreTenth < 0 || scoreTenth > 50) {
			throw new Error(`${path}.scoreTenth must be between 0 and 50.`);
		}

		return scoreTenth;
	}

	if (!Object.hasOwn(input, 'score')) {
		throw new Error(`${path}.score is required.`);
	}

	const parsed = Number(input.score);

	if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5) {
		throw new Error(`${path}.score must be between 0 and 5.`);
	}

	const scoreTenth = Math.round(parsed * 10);

	if (Math.abs(scoreTenth / 10 - parsed) > 0.001) {
		throw new Error(`${path}.score can use at most one decimal place.`);
	}

	return scoreTenth;
}

function getRequiredString(input, key, path = '') {
	const value = input[key];
	const label = path ? `${path}.${key}` : key;

	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`${label} must be a non-empty string.`);
	}

	return value.trim();
}

function getWholeNumber(input, key, path) {
	const label = `${path}.${key}`;
	const value = input[key];

	if (!Number.isInteger(value)) {
		throw new Error(`${label} must be a whole number.`);
	}

	return value;
}

function parseTimestamp(value, path) {
	if (value === undefined || value === null || value === '') {
		return null;
	}

	if (typeof value !== 'string') {
		throw new Error(`${path} must be an ISO timestamp string.`);
	}

	const parsed = new Date(value);

	if (Number.isNaN(parsed.getTime())) {
		throw new Error(`${path} must be a valid ISO timestamp string.`);
	}

	return parsed;
}

function cleanOptionalString(value, path) {
	if (value === undefined || value === null) {
		return null;
	}

	if (typeof value !== 'string') {
		throw new Error(`${path} must be a string or null.`);
	}

	const trimmed = value.trim();

	return trimmed ? trimmed : null;
}

function assertPlainObject(value, path) {
	if (!isPlainObject(value)) {
		throw new Error(`${path} must be an object.`);
	}
}

function isPlainObject(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function printSummary(summary, dryRun) {
	console.log(
		dryRun ? 'Dry run complete. No changes were saved.' : 'Backfill complete.'
	);
	console.table([
		{
			participants: summary.participantCount,
			ratingsUpserted: summary.ratingsUpserted,
			roundsCreated: summary.roundsCreated,
			roundsUpdated: summary.roundsUpdated,
			selectionsUpserted: summary.selectionsUpserted,
			trek: summary.trek.name,
			trekCompletedNow: summary.trekCompleted,
			yearsProcessed: summary.yearsProcessed
		}
	]);
}

function getDatabaseUrl() {
	return (
		firstConfiguredUrl([
			process.env.DRIZZLE_DATABASE_URL,
			process.env.POSTGRES_URL_NON_POOLING,
			process.env.DATABASE_URL,
			process.env.POSTGRES_URL,
			process.env.POSTGRES_PRISMA_URL
		]) ?? localDatabaseUrl
	);
}

function getPoolConnectionConfig(connectionString) {
	const sslMode = getSslMode(connectionString);
	const sslCa = firstConfiguredUrl([
		process.env.DATABASE_SSL_CA,
		process.env.DATABASE_SSL_ROOT_CERT
	]);

	if (!sslMode && !sslCa) {
		return { connectionString };
	}

	const normalizedConnectionString =
		removeSslSearchParams(connectionString) ?? connectionString;

	if (sslMode === 'disable') {
		return {
			connectionString: normalizedConnectionString,
			ssl: false
		};
	}

	if (sslMode === 'verify-full') {
		return {
			connectionString: normalizedConnectionString,
			ssl: {
				ca: normalizePem(sslCa),
				rejectUnauthorized: true
			}
		};
	}

	if (sslMode === 'require' || sslMode === 'no-verify') {
		return {
			connectionString: normalizedConnectionString,
			ssl: {
				rejectUnauthorized: false
			}
		};
	}

	throw new Error(
		`DATABASE_SSL_MODE must be one of disable, require, no-verify, or verify-full. Received: ${sslMode}`
	);
}

function getSslMode(connectionString) {
	return (
		process.env.DATABASE_SSL_MODE?.trim() || getSslModeFromUrl(connectionString)
	);
}

function getSslModeFromUrl(connectionString) {
	try {
		const url = new URL(connectionString);
		const sslMode = url.searchParams.get('sslmode')?.trim();

		if (sslMode === 'prefer') {
			return 'require';
		}

		return sslMode;
	} catch {
		return undefined;
	}
}

function removeSslSearchParams(connectionString) {
	try {
		const url = new URL(connectionString);
		url.searchParams.delete('sslmode');
		url.searchParams.delete('sslrootcert');
		url.searchParams.delete('uselibpqcompat');

		return url.toString();
	} catch {
		return undefined;
	}
}

function normalizePem(value) {
	return value?.replaceAll('\\n', '\n');
}

function firstConfiguredUrl(values) {
	return values.find((value) => value?.trim());
}

main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
