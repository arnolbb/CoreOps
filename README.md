# CoreOps

> Working title: **CoreOps**  
> Product type: Multi-tenant SaaS for small and medium businesses  
> Primary use cases: customer management, products, inventory, sales, payments, and work orders

CoreOps is a modular business operations platform designed to support product-based, service-based, installation, maintenance, and distribution businesses.

The first real-world implementation can be used by Segar Alami, but the product must remain general enough to support many organizations.

## Current Status

This repository begins with an agent-ready documentation package. Development must follow the specifications in `/docs` and the permanent instructions in `AGENTS.md`.

## MVP Modules

1. Authentication
2. Organizations and memberships
3. Role-based access control
4. Customers
5. Products and categories
6. Warehouses and inventory ledger
7. Sales orders
8. Payments and invoices
9. Work orders
10. Dashboard and reports
11. Audit logs

## Technology Direction

- Next.js App Router
- TypeScript strict mode
- PostgreSQL through Supabase
- Supabase Auth
- Supabase Storage
- Tailwind CSS
- shadcn/ui
- Zod
- React Hook Form
- Vitest
- Playwright
- GitHub Actions
- Vercel

Exact dependency versions must be selected during implementation and recorded in an ADR.

## Development

Prerequisites: Node.js LTS (see `.nvmrc`), npm.

```bash
npm install      # install dependencies
npm run dev     # start the dev server at http://localhost:3000
npm run lint     # run ESLint
npm run typecheck # run the TypeScript compiler
npm run format   # format with Prettier
npm run build    # production build
npm start        # run the production build
```

Environment variables are documented in `.env.example`. Never commit `.env` files.

## Local Supabase

The project uses Supabase (PostgreSQL, Auth, Storage) per `docs/05-system-architecture.md`.
Local development runs Supabase in Docker via the Supabase CLI (`supabase`, pinned as a devDependency).

Prerequisites: [Docker](https://docs.docker.com/get-docker/) running.

```bash
npm run supabase:start   # start local Supabase stack (API, DB, Auth, Studio, ...)
npm run supabase:status  # show running services and local connection details
npm run supabase:stop    # stop the stack (keeps data)
npm run supabase:reset   # reset DB from migrations + seed (destroys local data)
```

After `supabase:start`, copy the printed local keys into `.env.local` (never committed):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from `supabase status`>
SUPABASE_SERVICE_ROLE_KEY=<service role key from `supabase status`>  # server-only, never expose to client
```

Studio (local admin UI): http://127.0.0.1:54323
Local Postgres: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

### Migrations

Migrations live in `supabase/migrations/` and are applied in filename order.
Create a new migration:

```bash
npm run supabase:migration:new -- <name>   # e.g. npm run supabase:migration:new -- create_organizations
```

Apply pending migrations to a running stack without resetting data:

```bash
npm run supabase:db:push
```

The initial migration `20260718210437_foundation_setup.sql` enables the `pgcrypto` and `citext` extensions
and a shared `set_updated_at()` trigger helper. No business tables exist yet — they arrive in
later feature tasks (`TASK-ORG-001`, `TASK-CUS-001`, `TASK-PRO-001`, ...).

### Seed

`supabase/seed.sql` runs automatically after migrations on every `supabase db reset`.
It is deterministic and development-only (clearly fake data per `docs/23-demo-and-seed-data.md`).
It currently performs no inserts because no business tables exist yet.

### Reset reproducibility

`npm run supabase:reset` drops and recreates the local `public` schema, replays all migrations,
then runs `seed.sql`. It is safe to run repeatedly. Run it more than once to confirm the
workflow is reproducible.

### Do not

- Do not connect to or modify any production Supabase project from local commands.
- Do not commit `.env.local` or any keys printed by `supabase status`.
- Do not put real or production-like data in `seed.sql`.

## Continuous Integration

GitHub Actions runs `.github/workflows/ci.yml` for pull requests and pushes to `main`. The job uses Node.js 24 and `npm ci`, then checks formatting, linting, types, the production build, and local migration reproducibility.

Database validation starts the Docker-backed local Supabase stack, resets the database twice, prints `supabase migration list --local`, and fails unless migration `20260718210437` appears. Cleanup runs even after a failed step. CI does not use production secrets, a Supabase access token, or a linked remote project.

Run equivalent checks locally:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run build
npm run supabase:start
npm run supabase:reset
npm run supabase:reset
npx supabase migration list --local
npm run supabase:stop
```

Confirm the migration-list output contains `20260718210437`. Always stop the local stack after validation, including when a prior command fails.

### CI troubleshooting

- **Docker daemon unavailable:** Start Docker Desktop and confirm `docker info` succeeds before running Supabase commands.
- **Supabase startup timeout or port conflict:** Stop another CoreOps stack with `npm run supabase:stop`, check ports `54320`-`54324` and `54327`, then retry.
- **Migration missing:** Confirm `supabase/migrations/20260718210437_foundation_setup.sql` exists, then run both resets again and inspect `npx supabase migration list --local`.
- **`npm ci` lockfile error:** Update dependencies through a reviewed `npm install`, commit the resulting `package-lock.json`, and rerun `npm ci`. Do not edit the lockfile manually.
- **Cleanup warning after another failure:** Treat the earlier failed step as the primary failure. Cleanup is non-blocking so a stop error cannot hide it; manually run `npm run supabase:stop` if needed.

Dependency advisories require review and deliberate upgrades. CI does not run automated audit remediation. Never run `npm audit fix` or `npm audit fix --force` as part of this workflow.

## Documentation Map

Start with:

- `AGENTS.md`
- `docs/00-documentation-index.md`
- `docs/01-product-vision.md`
- `docs/02-product-requirements.md`
- `docs/05-system-architecture.md`
- `docs/06-database-design.md`
- `docs/07-authorization-and-permissions.md`
- `docs/11-development-workflow.md`
- `docs/20-agent-prompt-playbook.md`

## Development Principle

Build one complete vertical slice at a time:

```text
Specification
→ Database migration
→ Authorization
→ Backend logic
→ UI
→ Automated tests
→ Documentation
→ Review
```

A feature is not complete merely because the page works visually. It must satisfy security, tenant isolation, validation, testing, and documentation requirements.

## Recommended First Milestone

```text
Register
→ Create organization
→ Invite member
→ Add customer
→ Add product
→ Add inventory
→ Create sales order
→ Record payment
→ Create work order
→ Complete work order
```

## License

Not selected yet. Do not assume the project is open source until an explicit license is added.
