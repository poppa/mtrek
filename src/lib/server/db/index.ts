import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { env } from '$env/dynamic/private';

import * as schema from './schema';

const localDatabaseUrl = 'postgres://postgres:postgres@localhost:5432/mtrek';
const databaseUrl = getDatabaseUrl();

export const pool = new Pool({
	connectionString: databaseUrl,
	max: getPoolMax()
});

export const db = drizzle(pool, { schema });

function getDatabaseUrl() {
	if (env.DATABASE_URL) {
		return env.DATABASE_URL;
	}

	if (isVercelRuntime()) {
		throw new Error('DATABASE_URL is required when deploying MTrek to Vercel.');
	}

	return localDatabaseUrl;
}

function getPoolMax() {
	const value = env.DATABASE_POOL_MAX;

	if (!value) {
		return isVercelRuntime() ? 1 : 10;
	}

	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error('DATABASE_POOL_MAX must be a positive whole number.');
	}

	return parsed;
}

function isVercelRuntime() {
	return env.VERCEL === '1' || env.VERCEL === 'true';
}
