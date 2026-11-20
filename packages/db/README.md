# @platform/db

Drizzle on `bun:sqlite`. `createDatabase(path)` opens a database and applies every committed migration in `drizzle/`. The schema in `src/schema` is currently the generated Better Auth tables.

- Change the schema, then `bun x --bun drizzle-kit generate` and commit the SQL.
- `:memory:` gives a fresh database for tests.

The schema also holds the example domain: `books` (soft delete, state, etag) and `app_settings` (the singleton configuration). `DrizzleBookRepository` and `DrizzleSettingsRepository` implement the repository contracts from `@platform/types`. Saving a book with an expected ETag uses one conditional SQL update and returns whether a row changed; stale or missing rows are never overwritten. `bun run tooling/scripts/check-migrations.ts` fails when the schema has changes that no committed migration covers.
