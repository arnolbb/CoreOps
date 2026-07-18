# ADR-0004: Organization and Membership Schema

- Status: Accepted
- Date: 2026-07-18
- Decision owners: CoreOps maintainers
- Related tasks: TASK-ORG-001

## Context

TASK-ORG-001 creates the first tenant boundary for CoreOps. Product requirements require users to create organizations, become Owner atomically, belong to multiple organizations, and only access data for organizations where they have active membership. Security and authorization requirements require deny-by-default behavior, tenant RLS, cross-tenant denial tests, disabled-membership denial, and protection against removing the last Owner.

`docs/06-database-design.md` sketches separate `roles`, `permissions`, and `role_permissions` tables, but also says the final system-role model requires an ADR. TASK-ORG-001 is intentionally limited to organization and membership schema. Invitation emails, onboarding UI, custom roles UI, customer/product/sales/work-order tables, remote Supabase linkage, and production deployment changes are out of scope.

## Decision

Create a minimal organization and membership schema through a Supabase migration only.

- Add `public.organizations` with UUID primary key, name, unique slug, business type, timezone, currency code, status, JSON settings object, and UTC timestamps.
- Add `public.organization_memberships` with UUID primary key, `organization_id`, `user_id`, constrained role code, status, joined timestamp, UTC timestamps, and `unique (organization_id, user_id)`.
- Use direct text role codes constrained to the default role names (`owner`, `admin`, `manager`, `staff`, `technician`, `viewer`) for this task.
- Defer full RBAC tables (`roles`, `permissions`, `role_permissions`) and exact default permission seed data to a later authorization task.
- Enable RLS on both tables.
- Use SECURITY DEFINER helper functions that evaluate `auth.uid()` against active membership rows. This avoids recursive RLS checks on `organization_memberships` policies.
- Allow organization reads for active members only and organization updates for active Owners only.
- Deny direct organization inserts; authenticated users create organizations through `public.create_organization(...)`, which inserts the organization and initial active Owner membership in one database transaction.
- Allow membership reads for active members and membership writes only for active Owners of that organization.
- Add a trigger that prevents deletion, demotion, disabling, or organization reassignment from leaving an organization without at least one active Owner.
- Add deterministic SQL database tests for active membership access, non-member denial, disabled membership denial, cross-tenant read denial, cross-tenant write denial, duplicate membership rejection, RLS policy presence, last-Owner protection, and atomic organization creation.

## Alternatives Considered

### Alternative A: Implement full roles, permissions, and role_permissions now

Rejected for TASK-ORG-001. Full RBAC is required later, but this task explicitly asks for organization and membership schema only. Implementing full RBAC would broaden scope into permission seeding and authorization helpers not yet requested.

### Alternative B: Let direct table inserts create organizations

Rejected. Product requirements require organization creation and Owner membership to be atomic. A direct insert into `organizations` could create an organization with no Owner if the second write fails.

### Alternative C: Enforce tenant isolation only in application code

Rejected. Project instructions require isolation in both application logic and database policies. RLS is mandatory for tenant tables and cross-tenant denial must be tested.

### Alternative D: Use only application logic for last-Owner protection

Rejected. Owner retention is an invariant and must survive crafted requests. A database trigger prevents direct table mutations from leaving an organization ownerless.

## Consequences

### Positive

- Establishes the first tenant boundary before customer, product, inventory, sales, or work-order tables.
- RLS denies non-members and disabled members at the database layer.
- Organization creation cannot leave an organization without an Owner.
- Duplicate memberships are rejected by a database unique constraint.
- Tests prove the core cross-tenant access requirements before later tenant-owned tables depend on them.

### Negative

- Full permission checks are not complete yet. RLS enforces tenant isolation and Owner-only organization/membership writes, while module-level permissions remain future work.
- Role codes are constrained text values now. A later RBAC migration must map these values into the final role model without changing tenant semantics.
- `settings` is a JSON object on organizations because product requirements call for organization settings, but filterable settings should move to relational columns or tables when they become queryable business data.

## Security Impact

- Cross-tenant access is denied by RLS policies keyed to active membership.
- Disabled memberships have no database visibility into organization or membership rows.
- Direct organization insertion is unavailable to API roles; `create_organization(...)` is the only authenticated creation path and uses `auth.uid()` rather than trusting a browser-supplied user ID.
- Last active Owner protection is enforced by trigger for update and delete paths.
- No production secrets, remote Supabase connection, or production deployment changes are introduced.

## Migration Impact

- Adds migration `20260718230000_create_organizations_and_memberships.sql` after the foundation migration.
- The migration is additive: it creates new tables, functions, triggers, indexes, grants, and policies.
- No existing business data exists to rewrite or destroy.

## Operational Impact

- CI runs deterministic database tests after local Supabase resets.
- Developers validate with `npm run supabase:start`, two `npm run supabase:reset` runs, `npm run db:test`, and `npx supabase migration list --local`.
- TASK-ORG-001 remains in `REVIEW` until the branch is pushed and hosted GitHub Actions passes.

## Review Date

Review when TASK-ORG-002 implements onboarding, TASK-ORG-003 implements invitations, or a dedicated authorization task introduces full RBAC tables and permission seed data.
