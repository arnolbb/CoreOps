# Changelog

All notable user-visible and operational changes must be documented here.

The format follows these sections:

- Added
- Changed
- Fixed
- Security
- Deprecated
- Removed

## Unreleased

### Added

- Initial agent-ready product and engineering documentation package.
- Next.js 16 App Router project scaffold with TypeScript strict mode, Tailwind CSS v4, ESLint flat config, and Prettier.
- Base source structure under `src/` (`app/`, `components/ui`, `components/shared`, `lib/`, `types/`) per the system architecture.
- Root layout, home page, error boundary, and loading state.
- npm scripts: `lint`, `typecheck`, `format`, `format:check`, `build`, `start`.
- `.nvmrc` pinning Node 24 LTS.
- ADR-0001 recording the initial technology stack and version pins.
- Local Supabase development configuration (`supabase/` with `config.toml`, `migrations/`, `seed.sql`) per TASK-FND-002.
- Supabase CLI pinned as a devDependency (`supabase@2.34.0`).
- Initial migration `20260718210437_foundation_setup.sql` enabling `pgcrypto` and `citext` extensions and a shared `set_updated_at()` trigger helper. No business tables yet.
- Deterministic development seed workflow (`supabase/seed.sql`, currently a no-op pending business tables).
- npm scripts: `supabase:start`, `supabase:stop`, `supabase:status`, `supabase:reset`, `supabase:migration:new`, `supabase:db:push`, `supabase:types`.
- README section documenting start, stop, reset, migration, and seed commands.
- ADR-0002 recording the local Supabase development decision.

### Changed

- None.

### Fixed

- None.

### Security

- Defined mandatory multi-tenant isolation and authorization standards.
