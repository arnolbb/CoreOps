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
- GitHub Actions CI for pull requests and pushes to `main`, using Node.js 24, reproducible npm installs, code-quality gates, production build validation, and local Supabase migration checks.
- Two-reset local database validation with an explicit check for migration `20260718210437` and unconditional non-blocking Supabase cleanup.
- ADR-0003 recording CI security, caching, local Supabase, and dependency-audit handling decisions.
- Organization and membership schema with UUID primary keys, timestamps, constraints, lookup indexes, active-membership RLS, atomic organization creation, and last-Owner protection.
- Deterministic database test runner and TASK-ORG-001 tenant-isolation SQL tests.
- ADR-0004 recording the minimal organization membership schema and deferral of full RBAC tables.
- Supabase SSR authentication foundation with register, sign-in, sign-out, password reset, protected dashboard placeholder, cookie-backed sessions, and safe auth errors.
- Next.js 16 Proxy session refresh and early auth redirects via `src/proxy.ts`.
- Vitest unit/integration test setup and Playwright live authentication flow against local Supabase Auth and Mailpit/Inbucket.
- ADR-0005 recording Supabase SSR auth, `getClaims()` identity checks, and deferred production rate limiting/CAPTCHA.
- Organization onboarding for authenticated users without active membership, backed by the atomic `create_organization` RPC and safe duplicate-slug handling.
- Organization member invitations with hashed one-time tokens, Owner/Admin authorization, tenant-scoped RLS, preview/accept/revoke RPCs, minimal audit logs, a `/team` page, `/invitations/accept` flow, and a local Mailpit/Inbucket SMTP sender abstraction.
- Resend of a pending invitation rotates the token hash without duplicating rows; disabled memberships are reactivated on acceptance.
- Customer data schema, tenant-scoped RLS, cross-tenant composite foreign keys, and audited `archive_customer` RPC (`TASK-CUS-001`).
- Customer list page at `/dashboard/customers` with search, status filter, pagination, and responsive table/card layout (`TASK-CUS-002`).
- Customer create and edit modal workflow with primary address support, server-side non-blocking duplicate warning, and Edit row actions for active customers (`TASK-CUS-003`).
- Product and category schema, case-insensitive tenant-scoped SKU/category uniqueness, RLS, and audited `archive_product` RPC (`TASK-PRO-001`).
- Warehouse, inventory balance, and append-only inventory transaction ledger schema and RLS (`TASK-INV-001`).
- Atomic `perform_stock_adjustment` RPC and `adjustStockAction` server action with idempotency, permission checks, and safe error mapping (`TASK-INV-002`).
- Sales orders, sales order items, and payments schema and RLS with fixed-precision numeric totals (`TASK-SAL-001`).

### Changed

- CI now runs deterministic database tests after local Supabase resets.
- CI now enforces unit tests, integration tests, production build, and the live authentication and organization onboarding Playwright flows.
- `scripts/run-db-tests.mjs` now executes all 7 database RLS and RPC test suites (`organization_memberships_rls`, `member_invitations`, `customers_rls`, `products_rls`, `inventory_rls`, `stock_adjustment_rpc`, `sales_rls`), and CI verifies all migrations through `20260803120000`.

### Fixed

- Fixed PL/pgSQL column-reference ambiguity (`organization_id`, `warehouse_id`, `product_id`), blank idempotency-key handling, and inactive-warehouse checks in `perform_stock_adjustment` via migration `20260803120000_fix_stock_adjustment_rpc.sql`.
- Removed direct browser Supabase queries from `CustomerFormDialog` in favor of server-resolved `checkCustomerDuplicateAction` and `getCustomerForEditAction`, replaced unsafe PostgREST `.or()` interpolation in duplicate checks, added UUID and zero-row checks plus address error reporting in `customer-actions.ts`, and wired Edit buttons into `CustomerList`.
- Added explicit server-side permission checks and safe error mapping to `adjustStockAction` so raw database errors are never returned to callers.

### Security

- Defined mandatory multi-tenant isolation and authorization standards.
- Added RLS policies proving active membership access, non-member denial, disabled membership denial, cross-tenant read denial, cross-tenant write denial, duplicate membership rejection, and last-Owner protection.
- Invitation tokens are stored only as SHA-256 hashes; raw tokens appear solely in the acceptance email and the HttpOnly, SameSite=Lax, Secure-in-production invitation cookie. The cookie is cleared after acceptance, expiry, revocation, or a confirmed invalid state.
- The accept RPC rejects a caller whose authenticated email does not match the invited email; preview and accept expose no raw token or internal identifiers.
