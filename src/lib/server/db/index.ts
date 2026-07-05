import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { env } from '$env/dynamic/private';

import * as schema from './schema';

const localDatabaseUrl = 'postgres://postgres:postgres@localhost:5432/mtrek';
const databaseConfig = getDatabaseConfig();

export const pool = new Pool({
	...databaseConfig,
	max: getPoolMax()
});

export const db = drizzle(pool, { schema });

function getDatabaseConfig() {
	const configuredUrl = firstConfiguredUrl([
		env.DATABASE_URL,
		env.POSTGRES_URL,
		env.POSTGRES_PRISMA_URL,
		env.POSTGRES_URL_NON_POOLING
	]);

	if (configuredUrl) {
		return getPoolConnectionConfig(configuredUrl);
	}

	if (isVercelRuntime()) {
		throw new Error(
			'DATABASE_URL, POSTGRES_URL, or POSTGRES_URL_NON_POOLING is required when deploying MTrek to Vercel.'
		);
	}

	return getPoolConnectionConfig(localDatabaseUrl);
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

function getPoolConnectionConfig(connectionString: string) {
	const sslMode = getSslMode(connectionString);
	const sslCa = firstConfiguredUrl([
		env.DATABASE_SSL_CA,
		env.DATABASE_SSL_ROOT_CERT
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

function getSslMode(connectionString: string) {
	return env.DATABASE_SSL_MODE?.trim() || getSslModeFromUrl(connectionString);
}

function getSslModeFromUrl(connectionString: string) {
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

function removeSslSearchParams(connectionString: string) {
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

function normalizePem(value: string | undefined) {
	return value?.replaceAll('\\n', '\n');
}
