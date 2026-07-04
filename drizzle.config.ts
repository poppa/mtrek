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
	return (
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
