import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.env.dev', quiet: true });
config({ path: '.env', quiet: true });

const databaseUrl =
	process.env.DATABASE_URL ??
	'postgres://postgres:postgres@localhost:5432/mtrek';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: databaseUrl
	}
});
