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
```
