import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { env } from '$env/dynamic/private';

import * as schema from './schema';

const databaseUrl = env.DATABASE_URL ?? './data/mtrek.db';
const databasePath = databaseUrl.startsWith('file:')
	? databaseUrl.slice(5)
	: databaseUrl;
const resolvedDatabasePath = resolve(databasePath);

mkdirSync(dirname(resolvedDatabasePath), { recursive: true });

const sqlite = new Database(resolvedDatabasePath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
