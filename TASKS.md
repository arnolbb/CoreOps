# Task Board

This file is the lightweight repository task board. It may later be replaced by GitHub Projects, Linear, or another tracker.

## Status Values

- `BACKLOG`
- `READY`
- `IN_PROGRESS`
- `BLOCKED`
- `REVIEW`
- `DONE`

## Priority Values

- `P0` Critical
- `P1` High
- `P2` Normal
- `P3` Low

## Task Format

```text
ID:
Title:
Status:
Priority:
Owner:
Depends on:
Specification:
Acceptance criteria:
Tests:
Notes:
```

---

## EPIC FOUNDATION

### TASK-FND-001

- **Title:** Initialize Next.js TypeScript project
- **Status:** DONE
- **Priority:** P1
- **Depends on:** None
- **Specification:** `docs/05-system-architecture.md`
- **Acceptance criteria:**
  - Next.js App Router initialized
  - TypeScript strict mode enabled
  - Linting and formatting configured
  - Base directory structure created
  - Production build succeeds
- **Tests:** Build and smoke test

### TASK-FND-002

- **Title:** Configure local Supabase development
- **Status:** DONE
- **Priority:** P1
- **Depends on:** TASK-FND-001
- **Specification:** `docs/06-database-design.md`, `docs/23-demo-and-seed-data.md`
- **Acceptance criteria:**
  - Local project configuration exists
  - Migration folder exists
  - Seed workflow documented
  - Local reset is reproducible
- **Notes:** Supabase CLI pinned at `2.34.0`; local project, migration, seed, and npm workflows documented in `README.md` and ADR-0002. Migration `20260718210437_foundation_setup.sql` enables `pgcrypto`/`citext` and creates `public.set_updated_at()`; no business tables. Validation on Node `24.18.0` and Docker `29.6.1`: two consecutive resets each applied the foundation migration and executed `supabase/seed.sql`; local migration history matched, PostgreSQL objects were verified directly, and `format:check`, `lint`, `typecheck`, and `build` passed.

### TASK-FND-003

- **Title:** Configure CI checks
- **Status:** DONE
- **Priority:** P1
- **Depends on:** TASK-FND-001, TASK-FND-002
- **Specification:** `docs/14-ci-cd.md`
- **Acceptance criteria:**
  - GitHub Actions runs on pull requests and pushes to `main`
  - Node.js 24 and `npm ci` provide reproducible dependency installation
  - Formatting, linting, typechecking, and production build pass
  - Local Supabase starts without remote credentials or project linkage
  - Two consecutive database resets succeed
  - Local migration history contains `20260718210437`
  - Supabase cleanup runs after success or failure without hiding the primary result
- **Notes:** Implementation and local validation complete on Node `24.18.0`: `npm ci`, formatting, linting, typechecking, production build, local Supabase startup, two consecutive resets, migration-list verification for `20260718210437`, and cleanup passed. Hosted GitHub Actions run passed. CI and dependency-audit decisions are recorded in ADR-0003.

---

## EPIC AUTHENTICATION AND ORGANIZATIONS

### TASK-AUTH-001

- **Title:** Configure Supabase authentication and server session access
- **Status:** DONE
- **Priority:** P1
- **Depends on:** TASK-FND-001, TASK-FND-002
- **Specification:** `docs/02-product-requirements.md`, `docs/05-system-architecture.md`, `docs/07-authorization-and-permissions.md`, `docs/10-security.md`, `docs/12-testing-strategy.md`, `docs/adr/0005-supabase-ssr-authentication.md`
- **Acceptance criteria:**
  - Required Supabase Next.js client dependencies are installed
  - Browser and server Supabase clients are configured
  - Secure cookie-based sessions are supported
  - Registration, sign-in, sign-out, and password reset foundations exist
  - Authenticated-user and server-session helpers exist
  - Authenticated routes are protected
  - Unauthenticated users are redirected safely
  - Authentication inputs are validated
  - Authentication errors are mapped to safe user-facing messages
  - Organization onboarding is not implemented
  - Invitations are not implemented
  - Customer, product, sales, inventory, and work-order features are not implemented
- **Tests:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, two `npm run supabase:reset` runs, `npm run db:test`, `node scripts/run-with-local-supabase-env.mjs npm run build`, and `npm run test:e2e` passed locally.
- **Notes:** Implementation uses Supabase SSR PKCE email links with `exchangeCodeForSession()`, `src/proxy.ts` for Next.js 16 Proxy behavior, and `getClaims()` for trusted server-side identity checks. Local authentication tests, Playwright E2E, and hosted GitHub Actions passed. Production rate limiting and CAPTCHA are deferred follow-up security work; no service-role key is used by this task.

### TASK-ORG-001

- **Title:** Create organization and membership schema
- **Status:** DONE
- **Priority:** P1
- **Depends on:** TASK-FND-002
- **Specification:** `docs/02-product-requirements.md`, `docs/06-database-design.md`
- **Acceptance criteria:**
  - Organizations table exists
  - Organization memberships table exists
  - Owner membership is created atomically
  - RLS policies isolate organizations
  - Cross-tenant tests pass
- **Tests:** `npm run db:test`
- **Notes:** Migration `20260718230000_create_organizations_and_memberships.sql` adds organizations, memberships, tenant-isolation RLS policies, atomic organization creation, and last-Owner protection. Local database tests and hosted GitHub Actions passed.

### TASK-ORG-002

- **Title:** Build create-organization onboarding
- **Status:** DONE
- **Priority:** P1
- **Depends on:** TASK-ORG-001, TASK-AUTH-001
- **Specification:** `docs/02-product-requirements.md`, `docs/04-business-workflows.md`, `docs/05-system-architecture.md`, `docs/06-database-design.md`, `docs/07-authorization-and-permissions.md`, `docs/09-ui-ux-guidelines.md`, `docs/10-security.md`, `docs/12-testing-strategy.md`, `docs/adr/0004-organization-membership-schema.md`, `docs/adr/0005-supabase-ssr-authentication.md`
- **Acceptance criteria:**
  - Authenticated user without active organization is redirected to organization onboarding
  - Organization onboarding form creates an organization using the existing atomic database RPC
  - Creator becomes active Owner through database function behavior
  - Duplicate slugs show a safe user-facing error
  - Membership query failures show a safe error and do not trigger duplicate organization creation
  - Existing single active membership can access dashboard
  - Multiple active memberships show a safe temporary state and do not implicitly select a tenant
  - Organization onboarding does not implement invitations, organization switching, customers, products, sales, inventory, or work orders
- **Tests:** Local unit tests, integration tests, database tests, Playwright E2E, and hosted GitHub Actions passed.
- **Notes:** Implementation uses the cookie-backed authenticated Supabase server client, never trusts browser-supplied `user_id` or organization ownership, avoids service-role key usage, and is complete for TASK-ORG-002.

### TASK-ORG-003

- **Title:** Implement member invitations
- **Status:** DONE
- **Priority:** P1
- **Depends on:** TASK-ORG-001
- **Specification:** `docs/02-product-requirements.md`, `docs/04-business-workflows.md`, `docs/05-system-architecture.md`, `docs/06-database-design.md`, `docs/07-authorization-and-permissions.md`, `docs/09-ui-ux-guidelines.md`, `docs/10-security.md`, `docs/12-testing-strategy.md`, `docs/adr/0004-organization-membership-schema.md`, `docs/adr/0005-supabase-ssr-authentication.md`
- **Acceptance criteria:**
  - Owner and Admin can send email invitations to add members
  - Owner can invite Admin or Staff; Admin can invite Staff only; Staff cannot invite
  - Invitation tokens are hashed; only the hash is stored in the database
  - Invitation cookie is HttpOnly, SameSite=Lax, Secure in production, and cleared after acceptance, expiry, revocation, or a confirmed invalid state
  - A signed-in user with the wrong email cannot accept an invitation
  - Expired, revoked, and already-accepted invitations show safe states
  - Pending invitations can be revoked by an authorized member
  - Resending a pending invitation rotates the token hash without duplicate rows
  - Cross-tenant invitation, preview, accept, and revoke attempts are denied
  - `/team`, invite form, member list, pending invitation list, and revoke controls exist
  - `/invitations/accept` and the token-link redirect set and clear the invitation cookie correctly
  - Customer, product, inventory, sales, and work-order features are not implemented
- **Tests:** Local database tests, unit tests, integration tests, Playwright E2E, production build, and hosted GitHub Actions passed.
- **Notes:** Implementation uses the cookie-backed authenticated Supabase server client, resolves the active organization from an authenticated membership on the server, never trusts a browser-supplied organization id, avoids service-role key usage, and keeps audit logs minimal. SMTP is configurable via `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `INVITATION_EMAIL_FROM` without hardcoding a provider; local development defaults to Mailpit/Inbucket on port 54325.

---

## EPIC CUSTOMERS

### TASK-CUS-001

- **Title:** Create customer schema and RLS
- **Status:** DONE
- **Priority:** P1
- **Depends on:** TASK-ORG-001
- **Specification:** `docs/02-product-requirements.md`, `docs/04-business-workflows.md`, `docs/05-system-architecture.md`, `docs/06-database-design.md`, `docs/07-authorization-and-permissions.md`, `docs/09-ui-ux-guidelines.md`, `docs/10-security.md`, `docs/12-testing-strategy.md`
- **Acceptance criteria:**
  - Customer, customer address, tag, and customer-tag relationship tables exist
  - Every customer-owned table includes `organization_id`
  - Customer identity duplicates are allowed for `display_name`, `email`, and `phone`
  - Tags are unique per organization case-insensitively
  - RLS isolates customer data by active organization membership
  - Owner, Admin, and Staff can read, create, and update active customers
  - Viewer can read customers only
  - Technician has no broad customer access yet
  - Disabled members, non-members, and cross-tenant users cannot access customer data
  - Cross-tenant customer address and customer-tag references are rejected by composite foreign keys
  - Customer hard delete is denied
  - Customer archive is available only through the database RPC
  - Customer UI, customer Server Actions, product, inventory, sales, and work-order features are not implemented
- **Tests:** Local database tests, generated Supabase types, production build, and hosted GitHub Actions passed.
- **Notes:** Migration `20260725120000_create_customer_schema_and_rls.sql` adds customer foundation tables, cross-tenant composite foreign keys, case-insensitive organization-scoped tag uniqueness, customer RLS helper functions, and the database-only `archive_customer(uuid)` RPC. No customer UI, Server Actions, product, inventory, sales, or work-order features are implemented.

### TASK-CUS-002

- **Title:** Implement customer list and search
- **Status:** DONE
- **Priority:** P1
- **Depends on:** TASK-CUS-001
- **Specification:** `docs/02-product-requirements.md`, `docs/04-business-workflows.md`, `docs/05-system-architecture.md`, `docs/06-database-design.md`, `docs/07-authorization-and-permissions.md`, `docs/09-ui-ux-guidelines.md`, `docs/10-security.md`, `docs/12-testing-strategy.md`
- **Acceptance criteria:**
  - `/dashboard/customers` lists customer records for the active organization
  - Customer search supports `display_name`, `company_name`, `email`, and `phone`
  - Status filter supports active, archived, and all customers
  - Pagination exists for customer results
  - Customer page handles loading, empty, success, authorization error, and unexpected error states
  - Responsive table/card layout exists
  - Customer list is read-only
  - Owner, Admin, Staff, and Viewer can read customers
  - Technician has no broad customer access yet
  - Disabled members, non-members, and cross-tenant users cannot access customer data
  - Customer create, edit, archive UI/actions, detail page, tags/address management UI, duplicate warnings, products, inventory, sales, and work orders are not implemented
- **Tests:** Unit, integration, database RLS, Playwright E2E, and production build passed.
- **Notes:** TASK-CUS-002 merged via PR #12. Adds customer listing, search, status filter, and pagination at `/dashboard/customers`.

### TASK-CUS-003

- **Title:** Implement customer create and edit
- **Status:** DONE
- **Priority:** P1
- **Depends on:** TASK-CUS-001
- **Specification:** `docs/02-product-requirements.md`, `docs/04-business-workflows.md`, `docs/05-system-architecture.md`, `docs/06-database-design.md`, `docs/07-authorization-and-permissions.md`, `docs/09-ui-ux-guidelines.md`, `docs/10-security.md`, `docs/12-testing-strategy.md`
- **Acceptance criteria:**
  - `canManageCustomers` helper grants create/edit permissions to Owner, Admin, and Staff, and denies Viewer and Technician.
  - Customer form schema validates input with Zod (`customerFormSchema`).
  - `createCustomerAction` and `updateCustomerAction` enforce multi-tenancy and permission authorization server-side.
  - Primary address insertion/upsert supported on create and edit.
  - Non-blocking duplicate detection warning for existing email and phone.
  - UI modal form dialog (`CustomerFormDialog`) and Header actions integrated at `/dashboard/customers`.
- **Tests:** Unit tests, integration tests, lint, and typecheck passed locally. Live local Supabase DB tests (`db:test`) and E2E pending Docker verification.
- **Notes:** TASK-CUS-003 completed and hardened. Adds customer create and edit UI (including row/card Edit action), server-resolved duplicate check and edit-detail actions, primary address error handling, and UUID/active-row checks.

---

## EPIC PRODUCTS AND INVENTORY

### TASK-PRO-001

- **Title:** Create product and category schema
- **Status:** DONE
- **Priority:** P1
- **Depends on:** TASK-ORG-001
- **Specification:** `docs/02-product-requirements.md`, `docs/04-business-workflows.md`, `docs/05-system-architecture.md`, `docs/06-database-design.md`, `docs/07-authorization-and-permissions.md`, `docs/10-security.md`, `docs/12-testing-strategy.md`
- **Acceptance criteria:**
  - `product_categories` and `products` tables created with RLS enabled.
  - Multi-tenant isolation enforced via `organization_id` and composite foreign keys.
  - SKU uniqueness enforced case-insensitively per tenant.
  - Category name uniqueness enforced case-insensitively per tenant.
  - Immutability triggers protecting `id`, `organization_id`, `created_at`, `created_by`.
  - Database-only RPC `archive_product(target_product_id)` with audit logging.
- **Tests:** Local Supabase migration reset, database RLS tests, unit tests, integration tests, lint, typecheck, and production build passed.
- **Notes:** TASK-PRO-001 completed via migration `20260730120000_create_product_schema_and_rls.sql`.

### TASK-PRO-002

- **Title:** Implement product and category catalog UI and actions
- **Status:** DONE
- **Priority:** P1
- **Depends on:** TASK-PRO-001
- **Specification:** `docs/02-product-requirements.md`, `docs/04-business-workflows.md`, `docs/05-system-architecture.md`, `docs/06-database-design.md`, `docs/07-authorization-and-permissions.md`, `docs/09-ui-ux-guidelines.md`, `docs/10-security.md`, `docs/12-testing-strategy.md`
- **Acceptance criteria:**
  - `/dashboard/products` lists products for the active organization with search (name/SKU), status, product type, category filter, and pagination
  - Owners, Admins, Staff, Viewers, and Technicians can read products; only Owners, Admins, and Staff can create/edit products and manage categories; only Owners and Admins can archive products (`archive_product` RPC) and view/edit `cost_price`
  - Service items automatically enforce `track_inventory = false` and `minimum_stock = null`
  - Category dialog supports listing, creating, and deleting unused categories with inline confirmation and safe FK error mapping
  - Archive action requires confirmation dialog and calls `archive_product` RPC cleanly
  - Products link added to dashboard navigation
- **Tests:** Unit tests, integration tests, database RLS tests, Playwright E2E (`tests/e2e/products.spec.ts`), lint, typecheck, and production build passed.
- **Notes:** Implements vertical slice for `src/features/products/` and `/dashboard/products`.

### TASK-INV-001

- **Title:** Create warehouse and inventory ledger schema
- **Status:** DONE
- **Priority:** P1
- **Depends on:** TASK-PRO-001
- **Specification:** `docs/02-product-requirements.md`, `docs/04-business-workflows.md`, `docs/05-system-architecture.md`, `docs/06-database-design.md`, `docs/07-authorization-and-permissions.md`, `docs/10-security.md`, `docs/12-testing-strategy.md`
- **Acceptance criteria:**
  - `warehouses`, `inventory_balances`, and `inventory_transactions` tables created with RLS enabled.
  - Multi-tenant isolation enforced via `organization_id` and composite foreign keys.
  - Warehouse code uniqueness enforced case-insensitively per tenant.
  - Idempotency key uniqueness enforced per tenant for transactions.
  - Inventory transactions enforced as append-only via immutability trigger.
- **Tests:** Local Supabase migration reset, database RLS tests, unit tests, integration tests, lint, typecheck, and production build passed.
- **Notes:** TASK-INV-001 completed via migration `20260731120000_create_inventory_schema_and_rls.sql`.

### TASK-INV-002

- **Title:** Implement stock adjustment transaction
- **Status:** DONE
- **Priority:** P1
- **Depends on:** TASK-INV-001
- **Specification:** `docs/02-product-requirements.md`, `docs/04-business-workflows.md`, `docs/05-system-architecture.md`, `docs/06-database-design.md`, `docs/07-authorization-and-permissions.md`, `docs/10-security.md`, `docs/12-testing-strategy.md`
- **Acceptance criteria:**
  - `perform_stock_adjustment` RPC guarantees atomic balance updates and transaction log appends.
  - Non-negative balance constraint enforced for stock decreases (`adjustment_out`).
  - Idempotency key handling prevents double deductions.
  - Server Action `adjustStockAction` validates Zod schema and enforces server-side authentication & permission checks.
- **Tests:** Local Supabase migration reset, database SQL RPC tests, unit tests, integration tests, lint, typecheck, and production build passed.
- **Notes:** TASK-INV-002 completed via migrations `20260801120000_create_stock_adjustment_rpc.sql` and `20260803120000_fix_stock_adjustment_rpc.sql` (fixes PL/pgSQL column ambiguity, blank idempotency keys, and inactive warehouse check), plus explicit permission checks and safe error mapping in `adjustStockAction`.

### TASK-INV-003

- **Title:** Implement warehouse management, stock balances, and inventory ledger UI
- **Status:** DONE
- **Priority:** P1
- **Depends on:** TASK-INV-002, TASK-PRO-002
- **Specification:** `docs/02-product-requirements.md`, `docs/04-business-workflows.md`, `docs/05-system-architecture.md`, `docs/06-database-design.md`, `docs/07-authorization-and-permissions.md`, `docs/09-ui-ux-guidelines.md`, `docs/10-security.md`, `docs/12-testing-strategy.md`
- **Acceptance criteria:**
  - `/dashboard/inventory` displays summary metrics, warehouse/search/low-stock filters, paginated stock balances, and the append-only recent inventory ledger
  - Warehouse management dialog supports creating, editing, deactivating (with inline confirmation), and reactivating warehouses via server-validated Server Actions
  - Stock adjustment dialog supports `opening_stock`, `adjustment_in`, and `adjustment_out` with generated idempotency keys, required reasons for manual adjustments, and safe RPC error surfacing
  - Owners, Admins, Staff, Viewers, and Technicians can read inventory; only Owners, Admins, and Staff can manage warehouses and adjust stock
  - Inventory link added to dashboard navigation
- **Tests:** Unit tests, integration tests, database SQL tests, Playwright E2E (`tests/e2e/inventory.spec.ts`), lint, typecheck, and production build passed.
- **Notes:** Implements vertical slice for `src/features/inventory/` and `/dashboard/inventory`.

---

## EPIC SALES

### TASK-SAL-001

- **Title:** Create sales order schema
- **Status:** DONE
- **Priority:** P1
- **Depends on:** TASK-CUS-001, TASK-PRO-001
- **Specification:** `docs/02-product-requirements.md`, `docs/04-business-workflows.md`, `docs/05-system-architecture.md`, `docs/06-database-design.md`, `docs/07-authorization-and-permissions.md`, `docs/10-security.md`, `docs/12-testing-strategy.md`
- **Acceptance criteria:**
  - `sales_orders`, `sales_order_items`, and `payments` tables created with RLS enabled.
  - Multi-tenant isolation enforced via `organization_id` and composite foreign keys to customers, products, and sales orders.
  - Order number uniqueness enforced case-insensitively per tenant.
  - Fixed-precision numeric types (`numeric(18,2)` / `numeric(18,3)`) for financial totals and quantities.
- **Tests:** Local Supabase migration reset, database RLS tests, unit tests, integration tests, lint, typecheck, and production build passed.
- **Notes:** TASK-SAL-001 completed via migration `20260802120000_create_sales_schema_and_rls.sql`.

### TASK-SAL-002

- **Title:** Implement transactional sales order creation
- **Status:** BACKLOG
- **Priority:** P1
- **Depends on:** TASK-SAL-001, TASK-INV-001

---

## EPIC WORK ORDERS

### TASK-WOR-001

- **Title:** Create work order schema
- **Status:** BACKLOG
- **Priority:** P1
- **Depends on:** TASK-CUS-001

### TASK-WOR-002

- **Title:** Implement work order lifecycle
- **Status:** BACKLOG
- **Priority:** P1
- **Depends on:** TASK-WOR-001

---

## EPIC PRODUCTION READINESS

### TASK-PRD-001

- **Title:** Add observability and error tracking
- **Status:** BACKLOG
- **Priority:** P1

### TASK-PRD-002

- **Title:** Verify backup and restore procedure
- **Status:** BACKLOG
- **Priority:** P0

### TASK-PRD-003

- **Title:** Complete production readiness review
- **Status:** BACKLOG
- **Priority:** P0
