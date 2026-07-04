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
	const configuredUrl = firstConfiguredUrl([
		env.DATABASE_URL,
		env.POSTGRES_URL,
		env.POSTGRES_PRISMA_URL,
		env.POSTGRES_URL_NON_POOLING
	]);

	if (configuredUrl) {
		return configuredUrl;
	}

	if (isVercelRuntime()) {
		throw new Error(
			'DATABASE_URL, POSTGRES_URL, or POSTGRES_URL_NON_POOLING is required when deploying MTrek to Vercel.'
		);
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

function firstConfiguredUrl(values: Array<string | undefined>) {
	return values.find((value) => value?.trim());
}
