# AGENTS.md

This file contains permanent instructions for every AI coding agent working in this repository.

## 1. Product Context

CoreOps is a multi-tenant business operations SaaS.

The application must support many organizations. Each organization has isolated users, customers, products, inventory, sales, payments, work orders, reports, and settings.

Segar Alami may become the first real-world user, but no core database field, module, or user interface may be hard-coded specifically for water purifier businesses.

## 2. Source of Truth

Read these files before changing code:

1. `docs/01-product-vision.md`
2. `docs/02-product-requirements.md`
3. `docs/04-business-workflows.md`
4. `docs/05-system-architecture.md`
5. `docs/06-database-design.md`
6. `docs/07-authorization-and-permissions.md`
7. `docs/08-api-and-server-contracts.md`
8. `docs/09-ui-ux-guidelines.md`
9. `docs/10-security.md`
10. `docs/12-testing-strategy.md`

If documents conflict, use this precedence:

```text
Security requirements
→ Product requirements
→ Architecture decisions
→ Database design
→ UI guidelines
→ Existing implementation
```

Do not silently resolve significant conflicts. Record the decision in an ADR.

## 3. Architecture Rules

- Use a modular monolith.
- Use Next.js App Router.
- Use TypeScript strict mode.
- Organize code by business feature.
- Keep shared code genuinely shared.
- Prefer server-side data access.
- Do not introduce microservices.
- Do not introduce a second backend framework without an approved ADR.
- Do not add dependencies without a clear need.
- Avoid unnecessary abstractions.
- Keep business logic out of React components.
- Keep database access out of presentation components.

Recommended feature structure:

```text
src/features/<feature>/
├── actions/
├── components/
├── queries/
├── schemas/
├── services/
├── types/
└── tests/
```

## 4. Multi-Tenancy Rules

These rules are mandatory:

- Every tenant-owned business record must have `organization_id`.
- Never trust `organization_id` received from the browser.
- Resolve the active organization from an authenticated membership on the server.
- Verify membership before every tenant-scoped operation.
- Enforce tenant isolation in both application logic and database policies.
- All tenant tables must use Row Level Security.
- Add automated cross-tenant denial tests for every new tenant table.
- Never use client-side filtering as a security mechanism.
- Never expose sequential identifiers if they make object enumeration easy.
- Prefer UUIDs for externally referenced entities.

Every feature must prove:

```text
Organization A cannot read, update, delete, or reference Organization B data.
```

## 5. Authorization Rules

- Deny by default.
- Check authorization on the server.
- Hiding a button is not authorization.
- Use permission helpers rather than scattered role string comparisons.
- Every mutation must define the required permission.
- Sensitive actions must generate audit logs.
- Owner-only actions must remain owner-only even if an Admin crafts a request manually.

## 6. Database Rules

- Every schema change must use a migration.
- Never make undocumented production schema changes.
- Add foreign keys and meaningful constraints.
- Add indexes for `organization_id` and common filters.
- Use database transactions for operations that must succeed atomically.
- Inventory must use a ledger.
- Financial totals must be calculated using fixed-precision numeric types, not floating-point values.
- Store timestamps in UTC.
- Use soft deletion only when required by product or audit needs.
- Do not use JSON for data that requires filtering, constraints, or relations unless an ADR justifies it.
- Seed data must be deterministic and safe for development.

## 7. Validation and Error Handling

- Validate every external input using Zod.
- Validate on the server even when the client validates.
- Never return raw database errors to users.
- Use typed domain errors.
- Use stable error codes for expected failures.
- Provide actionable but safe user-facing messages.
- Log unexpected errors with a request or correlation identifier.
- Do not log credentials, tokens, password values, or sensitive file contents.

## 8. UI Rules

Every data page must handle:

- Loading
- Empty state
- Success
- Validation error
- Authorization error
- Unexpected error
- Mobile layout
- Keyboard navigation where applicable

Use shared components for:

- Page headers
- Data tables
- Filters
- Forms
- Dialogs
- Confirmations
- Status badges
- Empty states
- Pagination
- Toasts

Do not create visually inconsistent custom controls when an existing design-system component is suitable.

## 9. Testing Rules

For every feature:

- Unit test business calculations and state transitions.
- Integration test server logic and database behavior.
- Test permissions.
- Test tenant isolation.
- Add Playwright coverage for critical user flows.
- Test expected errors.
- Test empty states.
- Test destructive action confirmations.

Do not mark a task complete unless these commands pass:

```text
lint
typecheck
unit tests
integration tests
production build
```

Critical flows must also pass end-to-end tests.

## 10. Security Rules

- Never expose server secrets to the client.
- Never commit `.env` files.
- Never paste production secrets into AI prompts.
- Restrict file size and file type.
- Use signed or protected file access when files are tenant-private.
- Apply rate limiting to authentication and abuse-prone endpoints.
- Protect mutations against unauthorized cross-site requests according to the chosen authentication architecture.
- Use secure cookie settings.
- Record security-sensitive actions.
- Follow `docs/10-security.md`.

## 11. Change Discipline

Before implementation:

1. Identify the exact task.
2. Read relevant documentation.
3. Inspect existing patterns.
4. List affected files.
5. Identify authorization and tenant risks.
6. Identify migration impact.
7. Identify tests required.

During implementation:

- Keep changes focused.
- Do not refactor unrelated code.
- Do not rename public contracts casually.
- Do not remove tests to make the build pass.
- Do not weaken types to silence errors.
- Do not use `any` without documented justification.

After implementation:

1. Run all required checks.
2. Review the diff.
3. Update relevant documentation.
4. Update `CHANGELOG.md` when user-visible behavior changes.
5. Report assumptions, changed files, tests run, and remaining risks.

## 12. Task Completion Report

Every agent completion message must include:

```text
Summary
Files changed
Database changes
Authorization impact
Tests added
Commands run
Known limitations
Follow-up tasks
```

## 13. Stop Conditions

Stop and report instead of guessing when:

- A requirement changes financial behavior.
- A migration may destroy or rewrite production data.
- Role permissions conflict.
- A security requirement is unclear.
- The requested work exceeds the approved task scope.
- A dependency requires a major architecture change.
- An existing ADR conflicts with the requested implementation.

## 14. Definition of Done

Follow `docs/18-definition-of-done.md`. A visual implementation alone is never done.
