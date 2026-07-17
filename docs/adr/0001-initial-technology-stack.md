# ADR-0001: Initial Technology Stack and Version Pins

- Status: Accepted
- Date: 2026-07-18
- Decision owners: CoreOps maintainers
- Related tasks: TASK-FND-001

## Context

TASK-FND-001 initializes the Next.js project. `README.md` states that exact dependency versions must be selected during implementation and recorded in an ADR. `AGENTS.md` §3 fixes the architectural choices (modular monolith, Next.js App Router, TypeScript strict mode, feature-based organization) and §3/Dependency Policy requires every dependency to justify its place.

This ADR records the foundational versions selected during scaffolding so that later tasks build on a stable, reproducible base. It does not introduce Supabase, shadcn/ui, Zod, React Hook Form, Vitest, or Playwright — those belong to later tasks (TASK-FND-002, TASK-FND-003, and the relevant feature tasks).

## Decision

Pin the following versions for the initial scaffold:

| Dependency           | Version  | Role                               |
| -------------------- | -------- | ---------------------------------- |
| next                 | 16.2.10  | Application framework (App Router) |
| react                | 19.2.4   | UI runtime                         |
| react-dom            | 19.2.4   | React DOM renderer                 |
| tailwindcss          | 4.3.3    | Styling (utility-first CSS)        |
| @tailwindcss/postcss | 4.3.3    | Tailwind v4 PostCSS integration    |
| typescript           | 5.9.3    | Type system (strict mode)          |
| eslint               | 9.39.5   | Linter (flat config)               |
| eslint-config-next   | 16.2.10  | Next.js ESLint rules               |
| @types/node          | 20.19.43 | Node type definitions              |
| @types/react         | 19.2.17  | React type definitions             |
| @types/react-dom     | 19.2.3   | React DOM type definitions         |
| prettier             | 3.6.2    | Code formatter                     |

Project configuration:

- Package manager: **npm** (ships with Node, Vercel-native, no extra install).
- Node version: **Node 24 LTS** recorded in `.nvmrc`. Local development may use a newer release; CI (TASK-FND-003) must target the pinned LTS.
- TypeScript `strict: true` enabled.
- Path alias `@/*` resolves to `./src/*`.
- ESLint flat config with `eslint-config-next` (core-web-vitals + typescript).
- Prettier configured separately from ESLint (no ESLint formatting rules).
- Source code lives under `src/` per `docs/05-system-architecture.md`.

Versions are pinned exactly (no `^` ranges) for runtime dependencies and the most stability-critical dev dependencies, to make builds reproducible and to keep later ADRs free of accidental drift.

## Alternatives Considered

### Alternative A: pnpm instead of npm

pnpm is faster and more disk-efficient and is attractive for a project expected to grow many feature modules. Rejected for the initial scaffold because npm is guaranteed available with Node, requires no extra setup, and lockfile churn across all future tasks makes a late switch costly. Revisit if the dependency graph becomes large enough that install time or disk usage is a real problem.

### Alternative B: yarn instead of npm

Less common for fresh Next.js projects in 2026. Rejected for the same reasons as pnpm, with weaker ecosystem fit.

### Alternative C: Defer Tailwind CSS to the first UI task

Rejected. Tailwind is a foundational styling layer that touches the root layout, globals, and every component. Retrofitting it later means rewriting boilerplate and risking inconsistent early markup. Installing it during scaffolding is cheap (one PostCSS plugin) and matches the documented technology direction.

### Alternative D: Use `^` ranges for all dependencies

Rejected for the initial pin. Caret ranges allow patch/minor drift between installs, which undermines reproducible builds and complicates debugging for AI agents. Exact pins are used; upgrades will be deliberate and recorded.

## Consequences

### Positive

- Reproducible installs and builds.
- Clear, documented foundation for every downstream task.
- Tailwind available from the first UI component.
- No accidental version drift during early development.

### Negative

- Exact pins require intentional upgrades and maintenance.
- Security patches must be applied deliberately rather than arriving via caret ranges.
- Adding Tailwind now means the root layout and globals assume Tailwind conventions.

## Security Impact

No secrets or runtime data are involved. Pinned versions are current at the time of scaffolding; security advisories must be monitored and applied via deliberate upgrades recorded in a follow-up ADR or changelog entry. Dependency advisory monitoring is the responsibility of TASK-FND-003 (CI) and TASK-PRD-001 (observability).

## Migration Impact

None. This is the initial scaffolding decision; there is no prior state to migrate from.

## Operational Impact

- Node 24 LTS is the supported runtime for local and CI execution.
- `npm install`, `npm run build`, and `npm start` are the standard commands.
- Production deployment target (Vercel) is recorded in `docs/15-deployment-and-environments.md` and is not changed by this ADR.

## Review Date

Review when the first dependency upgrade is required, or when TASK-FND-002 (Supabase) adds the next foundational dependency.
