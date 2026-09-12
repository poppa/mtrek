# MTrek

MTrek is a SvelteKit music exploration app. Participants create a trek over a concluded year range, randomize one unexplored year at a time, select albums from that year, rate every selected album from 0-5, and finish when every year in the trek has been explored.

## Tech

- SvelteKit, Svelte 5, TypeScript
- Auth.js for Google and Spotify OAuth sign-in
- Drizzle ORM with PostgreSQL
- Spotify Web API album search through client credentials
- ESLint and Prettier

## Setup

```sh
npm install
cp .env.example .env.dev
npm run db:push
npm run dev
```

`DATABASE_URL` defaults to `postgres://postgres:postgres@localhost:5432/mtrek`. `AUTH_SECRET` must be at least 32 random characters for real use.

Create the local database before pushing the schema:

```sh
createdb -h localhost -p 5432 -U postgres mtrek
npm run db:push
```

For Vercel or another hosted environment, set `DATABASE_URL` to a managed PostgreSQL database connection string. If you use the Vercel/Supabase integration, MTrek also accepts `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, and `POSTGRES_URL_NON_POOLING` when `DATABASE_URL` is not set.

`DATABASE_POOL_MAX` can be used to cap the connection pool; it defaults to `10` locally and `1` on Vercel. For Drizzle schema commands against Supabase, set `DRIZZLE_DATABASE_URL` to the non-pooling connection string if it differs from the runtime URL.

Before the deployed app can sign users in, push the Drizzle schema to the Supabase database:

```sh
DRIZZLE_DATABASE_URL="$POSTGRES_URL_NON_POOLING" npm run db:push
```

If `POSTGRES_URL_NON_POOLING` is present in `.env.local`, `drizzle-kit` will use it before `DATABASE_URL`.

For Supabase SSL, MTrek honors `sslmode` in the database URL. Supabase/Vercel URLs commonly use `sslmode=require`; MTrek maps that to standard libpq semantics, meaning the connection is encrypted but the certificate is not verified. To force a mode explicitly, set `DATABASE_SSL_MODE` to `require`, `no-verify`, `verify-full`, or `disable`. For `verify-full`, provide the Supabase CA certificate through `DATABASE_SSL_CA` or `DATABASE_SSL_ROOT_CERT`.

Supabase's `@supabase/supabase-js` client is useful for Supabase APIs such as Storage, Realtime, and PostgREST access. MTrek's server database access intentionally uses Drizzle with a PostgreSQL connection string because Auth.js' Drizzle adapter and the trek service need a SQL database driver, transactions, and migrations.

To run the development server over HTTPS, set `MTREK_CERT` to a combined PEM file containing both the private key and certificate:

```sh
MTREK_CERT=/path/to/cert.pem npm run dev
```

If you access Vite through a reverse proxy or custom hostname, configure the browser-visible HMR websocket endpoint:

```sh
MTREK_HMR_HOST=your.local.host
MTREK_HMR_PORT=5174
MTREK_HMR_PROTOCOL=ws
```

Use `MTREK_HMR_PROTOCOL=wss` when the browser connects to the dev server over HTTPS. Set `MTREK_HMR_CLIENT_PORT` only when the browser-visible websocket port differs from the local Vite port.

Configure at least one OAuth provider:

```sh
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_SPOTIFY_ID=
AUTH_SPOTIFY_SECRET=
```

For Spotify album search, set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`. If those are omitted, MTrek falls back to the Spotify OAuth client values. Manual album entry works without Spotify search credentials.

OAuth callback URLs:

```text
http://localhost:5173/auth/callback/google
http://localhost:5173/auth/callback/spotify
https://localhost:5173/auth/callback/google
https://localhost:5173/auth/callback/spotify
```

## Commands

```sh
npm run dev
npm run check
npm run lint
npm run build
npm run db:generate
npm run db:push
npm run db:studio
npm run trek:backfill
```

## Backfill Trek Data

Use the standalone backfill script to add concluded years, album selections, and ratings for participants that have already joined a trek.

First list the trek participants so you can use registered emails, user IDs, or short aliases in the JSON file:

```sh
npm run trek:backfill -- --participants <trek-id>
```

Create a JSON file using `scripts/backfill-trek.example.json` as a template, then validate it with a dry run:

```sh
npm run trek:backfill -- --dry-run path/to/backfill.json
```

Apply it after the dry run looks right:

```sh
npm run trek:backfill -- path/to/backfill.json
```

The script loads `.env.dev`, `.env.local`, and `.env`, using the same PostgreSQL URL precedence as the Drizzle commands: `DRIZZLE_DATABASE_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_URL`, `POSTGRES_URL`, then `POSTGRES_PRISMA_URL`. It runs every write in one transaction; `--dry-run` rolls that transaction back.

Every referenced selection or rating user must already be a trek participant. Ratings can use `score` from `0` to `5` with at most one decimal, or `scoreTenth` from `0` to `50`. Re-running the same backfill updates the existing year, participant album selection, and participant rating rows instead of creating duplicates.

## Curated album Treks

Choose **Curated albums** in the creation form, then build a list using Spotify search or manual entry. There is no fixed album-count limit; at least one album is required. Duplicate albums are rejected, and the list is fixed once the Trek is created.

Each round draws one previously undrawn album and opens ratings immediately. Once every current participant has rated it, the next album is drawn automatically. Late joiners must also rate earlier albums; existing ratings are preserved. The Trek completes once every participant has rated the entire list. As with year-based Treks, completed Treks no longer accept new participants.

Curated albums appear in Trek and user album rankings. Completed album rounds have their own history pages; year rankings remain specific to year-based Treks.

Apply `drizzle/0001_curated_treks.sql` to an existing database before running this version (or use the existing `npm run db:push` workflow). The migration adds the album list and Trek type, keeps existing Treks as `years`, and allows year fields to be empty for curated Treks. The year-backfill script rejects curated Treks.

### Integration tests

The integration suite creates a fresh database, applies migrations, exercises both Trek types, and drops that database afterward. Set `TEST_DATABASE_URL` to a local PostgreSQL server where the test user can create databases:

```sh
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:integration
```

It covers migration compatibility, album validation, concurrent final ratings, automatic progression, late joins, participant removal, access checks, and the existing year-based flow. It does not load application `.env` files or modify existing database tables.
