# AGENTS.md

## Project overview

MTrek is a SvelteKit music-exploration app. Users create year-based or curated-album Treks, select albums, rate them, and view rankings.

## Stack and layout

- Svelte 5 + SvelteKit + TypeScript
- Drizzle ORM with PostgreSQL; schema and migrations live in `src/lib/server/db/` and `drizzle/`
- Server-side Trek rules are centralized in `src/lib/server/trek-service.ts`
- Routes use SvelteKit conventions under `src/routes/`; shared UI is in `src/lib/components/`
- Auth is handled by Auth.js in `src/auth.ts` and server hooks

## Working conventions

- Preserve the existing TypeScript/Svelte style: tabs for indentation, single quotes, and minimal changes.
- Keep database access and credentials server-only. Do not expose secrets or database code to client-side modules.
- Add a Drizzle migration under `drizzle/` for schema changes; do not rewrite existing migrations.
- Keep business rules in the Trek service rather than duplicating them in route handlers or components.
- Use the `$lib` alias for imports from `src/lib`.

## Validation

Run the relevant checks before handing off changes:

```sh
npm run check
npm run lint
npm run build
```

The integration suite requires a disposable PostgreSQL server with `CREATE DATABASE` permission:

```sh
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:integration
```

## Local configuration

Copy `.env.example` to `.env.dev` for local development. Never commit `.env` files, OAuth credentials, database URLs, or other secrets.
