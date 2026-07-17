# System Architecture

## Architecture Style

Use a modular monolith.

```text
Browser
→ Next.js application
   → Server Components
   → Route Handlers or Server Actions
   → Domain services
   → Supabase PostgreSQL
   → Supabase Auth
   → Supabase Storage
```

## Why a Modular Monolith

- Easier for one maintainer
- Easier for AI agents to understand
- One deployment unit
- Shared transactions
- Lower operational cost
- Clear future extraction points
- Avoids premature distributed-system complexity

## Logical Layers

### Presentation Layer

- React components
- Forms
- Tables
- Dialogs
- Responsive layouts
- Client interaction only when required

### Application Layer

- Use cases
- Permission checks
- Input validation
- Transaction coordination
- Domain error mapping

### Domain Layer

- Business rules
- State transitions
- Calculations
- Permission-independent invariants

### Data Layer

- Queries
- Repositories or data access functions
- Database transactions
- Storage access
- RLS policies

## Recommended Repository Structure

```text
src/
├── app/
│   ├── (auth)/
│   ├── (onboarding)/
│   ├── (dashboard)/
│   ├── api/
│   ├── layout.tsx
│   └── error.tsx
├── features/
│   ├── auth/
│   ├── organizations/
│   ├── customers/
│   ├── products/
│   ├── inventory/
│   ├── sales/
│   ├── payments/
│   ├── work-orders/
│   ├── dashboard/
│   └── audit/
├── components/
│   ├── ui/
│   └── shared/
├── lib/
│   ├── auth/
│   ├── database/
│   ├── permissions/
│   ├── validation/
│   ├── logging/
│   ├── errors/
│   └── utilities/
├── types/
└── tests/
```

## Request Flow

```text
User action
→ Parse request
→ Authenticate user
→ Resolve active organization
→ Verify membership
→ Check permission
→ Validate input
→ Execute domain service
→ Execute database transaction
→ Write audit event
→ Return typed response
```

## Rendering Strategy

Prefer:

- Server Components for authenticated data pages
- Client Components only for interactive state
- Server-side pagination and filtering
- Progressive enhancement for forms where practical
- Explicit cache behavior for organization-scoped data

Do not cache tenant-sensitive data globally.

## Authentication Boundary

Authentication proves user identity.

Membership proves organization access.

Permission proves allowed action.

All three may be required.

## File Storage

Private tenant files must:

- Use organization-scoped paths
- Validate membership before upload
- Validate membership before access
- Use signed URLs or protected download routes
- Restrict file type and size
- Avoid public buckets for sensitive files

Example path:

```text
organizations/<organization_id>/work-orders/<work_order_id>/<file_id>
```

## Transactions

Use a database transaction for:

- Organization creation with Owner membership
- Sales confirmation and inventory movement
- Inventory transfer
- Payment and payment-status recalculation
- Work order completion and inventory usage
- Reversal or cancellation

## Concurrency

Critical inventory and payment flows must handle concurrent requests.

Possible strategies:

- Row-level locking
- Atomic stored procedures
- Unique idempotency keys
- Optimistic concurrency with version checks

The selected method must be recorded in an ADR before implementation.

## Background Work

MVP should avoid unnecessary background infrastructure.

Potential asynchronous tasks:

- Invitation email
- Invoice email
- Export generation
- Large report generation
- Scheduled reminders

Start with synchronous or provider-managed approaches where safe. Introduce a queue only when a documented need exists.

## Dependency Policy

Each new dependency must answer:

- What problem does it solve?
- Why existing tools are insufficient?
- Security and maintenance impact?
- Bundle or server impact?
- Is it actively maintained?
- Can the project remove it later?
