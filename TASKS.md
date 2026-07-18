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

### TASK-ORG-001

- **Title:** Create organization and membership schema
- **Status:** REVIEW
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
- **Notes:** Migration `20260718230000_create_organizations_and_memberships.sql` adds organizations, memberships, tenant-isolation RLS policies, atomic organization creation, and last-Owner protection. Keep in `REVIEW` until branch is pushed and hosted GitHub Actions passes.

### TASK-ORG-002

- **Title:** Build create-organization onboarding
- **Status:** BACKLOG
- **Priority:** P1
- **Depends on:** TASK-ORG-001

### TASK-ORG-003

- **Title:** Implement member invitations
- **Status:** BACKLOG
- **Priority:** P1
- **Depends on:** TASK-ORG-001

---

## EPIC CUSTOMERS

### TASK-CUS-001

- **Title:** Create customer schema and RLS
- **Status:** BACKLOG
- **Priority:** P1
- **Depends on:** TASK-ORG-001

### TASK-CUS-002

- **Title:** Implement customer list and search
- **Status:** BACKLOG
- **Priority:** P1
- **Depends on:** TASK-CUS-001

### TASK-CUS-003

- **Title:** Implement customer create and edit
- **Status:** BACKLOG
- **Priority:** P1
- **Depends on:** TASK-CUS-001

---

## EPIC PRODUCTS AND INVENTORY

### TASK-PRO-001

- **Title:** Create product and category schema
- **Status:** BACKLOG
- **Priority:** P1
- **Depends on:** TASK-ORG-001

### TASK-INV-001

- **Title:** Create warehouse and inventory ledger schema
- **Status:** BACKLOG
- **Priority:** P1
- **Depends on:** TASK-PRO-001

### TASK-INV-002

- **Title:** Implement stock adjustment transaction
- **Status:** BACKLOG
- **Priority:** P1
- **Depends on:** TASK-INV-001

---

## EPIC SALES

### TASK-SAL-001

- **Title:** Create sales order schema
- **Status:** BACKLOG
- **Priority:** P1
- **Depends on:** TASK-CUS-001, TASK-PRO-001

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
