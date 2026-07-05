import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.env.dev', quiet: true });
config({ path: '.env', quiet: true });

const localDatabaseUrl = 'postgres://postgres:postgres@localhost:5432/mtrek';
const databaseUrl = getDatabaseUrl();

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: databaseUrl
	}
});

function getDatabaseUrl() {
	return normalizeDatabaseUrl(
		firstConfiguredUrl([
			process.env.DRIZZLE_DATABASE_URL,
			process.env.DATABASE_URL,
			process.env.POSTGRES_URL_NON_POOLING,
			process.env.POSTGRES_URL,
			process.env.POSTGRES_PRISMA_URL
		]) ?? localDatabaseUrl
	);
}

function firstConfiguredUrl(values: Array<string | undefined>) {
	return values.find((value) => value?.trim());
}

function normalizeDatabaseUrl(databaseUrl: string) {
	const sslMode =
		process.env.DRIZZLE_DATABASE_SSL_MODE?.trim() ||
		process.env.DATABASE_SSL_MODE?.trim() ||
		getSslModeFromUrl(databaseUrl);

	if (!sslMode) {
		return databaseUrl;
	}

	if (
		!['disable', 'verify-full', 'require', 'no-verify', 'prefer'].includes(
			sslMode
		)
	) {
		throw new Error(
			`DATABASE_SSL_MODE must be one of disable, require, no-verify, or verify-full. Received: ${sslMode}`
		);
	}

	try {
		const url = new URL(databaseUrl);

		if (sslMode === 'disable') {
			url.searchParams.set('sslmode', 'disable');
		} else if (sslMode === 'verify-full') {
			url.searchParams.set('sslmode', 'verify-full');
		} else if (
			sslMode === 'require' ||
			sslMode === 'no-verify' ||
			sslMode === 'prefer'
		) {
			url.searchParams.set('sslmode', 'no-verify');
		}

		url.searchParams.delete('uselibpqcompat');

		return url.toString();
	} catch {
		return databaseUrl;
	}
}

function getSslModeFromUrl(databaseUrl: string) {
	try {
		return new URL(databaseUrl).searchParams.get('sslmode')?.trim();
	} catch {
		return undefined;
	}
}
