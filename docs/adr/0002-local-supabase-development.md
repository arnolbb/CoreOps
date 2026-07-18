# ADR-0002: Local Supabase Development Setup

- Status: Accepted
- Date: 2026-07-18
- Decision owners: CoreOps maintainers
- Related tasks: TASK-FND-002

## Context

`docs/05-system-architecture.md` selects Supabase (PostgreSQL, Auth, Storage) as the data and auth layer. TASK-FND-002 requires a reproducible local development setup before any business module is built. Every later schema task (`TASK-ORG-001`, `TASK-CUS-001`, `TASK-PRO-001`, ...) depends on a working migration and seed workflow.

The first real-world user may be Segar Alami, but per `AGENTS.md` §1 no core field, migration, or seed may be hard-coded for water purifier businesses. This task therefore configures only the local toolchain and a non-business initial migration.

## Decision

Use the official Supabase CLI to run the full Supabase stack locally in Docker, managed as a project devDependency.

- Install Supabase CLI as a devDependency pinned at `supabase@2.34.0` (exact pin, matching ADR-0001's reproducibility policy).
- Standard Supabase project directory at repo root `supabase/`:
  - `config.toml` — local stack configuration (`project_id = "CoreOps"`, Postgres 17, migrations enabled, seed enabled pointing at `./seed.sql`).
  - `migrations/` — ordered SQL migration files applied on reset/push.
  - `seed.sql` — deterministic development seed run after migrations on every reset.
  - `.gitignore` (generated) — ignores `.branches`, `.temp`, and `.env*` inside `supabase/`.
- Initial migration `20260718210437_foundation_setup.sql`:
  - Enables `pgcrypto` (for `gen_random_uuid()`) and `citext` (case-insensitive emails).
  - Adds a shared `public.set_updated_at()` trigger function that future tenant tables attach via `before update` triggers.
  - Creates NO business tables.
- Seed (`seed.sql`) is a deterministic no-op today (`select 1 as seed_ok;`) because no business tables exist. It exercises the migrations -> seed path so reset is reproducible from the start.
- npm scripts: `supabase:start`, `supabase:stop`, `supabase:status`, `supabase:reset`, `supabase:migration:new`, `supabase:db:push`, `supabase:types`.
- `README.md` documents start, stop, reset, migration, and seed commands plus the local connection details and the do-not-commit-keys rule.

## Alternatives Considered

### Alternative A: Run Postgres directly (no Supabase stack)

Rejected. Supabase Auth, Storage, and RLS are core to the architecture; a bare Postgres instance would not exercise them locally and would diverge from the production target.

### Alternative B: Use a shared cloud Supabase project for development

Rejected. `docs/15-deployment-and-environments.md` mandates local secrets only, safe-to-reset local data, and no production customer data. A shared remote project cannot be safely reset and risks cross-contamination.

### Alternative C: Defer the initial migration until the first business table

Rejected. Establishing the migration and seed workflow now (with a minimal non-business migration) proves `supabase db reset` is reproducible before schema tasks depend on it. The shared `set_updated_at()` helper and extensions are prerequisites every tenant table reuses.

## Consequences

### Positive

- Reproducible local database: `npm run supabase:reset` rebuilds from migrations + seed.
- Supabase Auth, Storage, RLS, and Studio are available locally for feature tasks.
- Migration workflow proven before business tables arrive.
- Shared `set_updated_at()` helper prevents duplicated trigger logic across tenant tables.

### Negative

- Local development requires Docker Desktop (or compatible) running. This is a one-time environment expectation, documented in `README.md`.
- Supabase CLI is pinned exactly; upgrades require a deliberate, recorded change.
- The no-op seed must be replaced with real deterministic seed data as business tables land; this is tracked as a follow-up.

## Security Impact

- No secrets are committed. `.gitignore` (root) ignores `.env*`; `supabase/.gitignore` ignores `supabase/.env*`, `.branches`, `.temp`.
- Local service-role keys printed by `supabase status` are for local development only and must never be committed or sent to the client. They are distinct from any production secrets.
- This setup does not connect to or modify any production Supabase project. No `supabase link` to a remote project is performed in the local workflow.
- No business tables, RLS policies, or auth flows are introduced; authorization design remains pending (per `docs/07-authorization-and-permissions.md`).

## Migration Impact

- Adds the initial migration `20260718210437_foundation_setup.sql` (extensions + shared trigger function). No prior schema exists, so this is a fresh start with no upgrade path to consider.
- No production schema is touched. All migrations are local-only at this stage.

## Operational Impact

- Developers run `npm run supabase:start` once, then `npm run supabase:reset` to rebuild schema deterministically.
- Local endpoints: API `http://127.0.0.1:54321`, Postgres `127.0.0.1:54322`, Studio `http://127.0.0.1:54323`.
- CI starts this same local stack, resets it twice, verifies local migration history, and stops it unconditionally per ADR-0003 and TASK-FND-003.

## Review Date

Review when the first business migration (`TASK-ORG-001`) lands and the seed must be populated, or when a Supabase CLI upgrade is required.
