# Roadmap

## Phase 0 — Documentation and Decisions

- Product vision
- MVP PRD
- Architecture
- Database design
- Permission matrix
- Security requirements
- Test strategy
- CI/CD plan

Exit criteria:

- Core documents reviewed
- No unresolved critical scope conflict

## Phase 1 — Foundation

- Next.js project
- TypeScript strict
- Supabase local development
- Design-system base
- Logging
- Testing setup
- CI
- Error handling

Exit criteria:

- Production build works
- CI works
- Local database reset is reproducible

## Phase 2 — Authentication and Multi-Tenancy

- Register
- Sign in
- Organization creation
- Memberships
- Invitations
- Organization switching
- Roles and permissions
- Tenant RLS tests

Exit criteria:

- Cross-tenant suite passes
- Last Owner protected

## Phase 3 — Customers

- Customer CRUD
- Addresses
- Tags
- Search and filters
- Customer detail timeline

## Phase 4 — Products and Inventory

- Products
- Categories
- Warehouses
- Opening stock
- Adjustments
- Inventory ledger
- Low-stock view

## Phase 5 — Sales and Payments

- Draft order
- Order items
- Calculation
- Confirmation
- Stock movement
- Payment
- Invoice view

## Phase 6 — Work Orders

- Work order lifecycle
- Assignment
- Schedule
- Attachments
- Used items
- Mobile workflow

## Phase 7 — Dashboard and Reports

- Operational dashboard
- Sales summary
- Outstanding payment summary
- Inventory summary
- Work order summary

## Phase 8 — Production Hardening

- Error tracking
- Uptime monitoring
- Backup
- Restore rehearsal
- Security review
- Accessibility review
- Performance review
- Privacy documents

## Phase 9 — Segar Alami Pilot

Configure, do not hard-code:

- Relevant product categories
- Warehouse
- Customer tags
- Installation work order type
- Service work order type
- Staff roles
- Demo data migration

## Phase 10 — Post-MVP

Candidate features:

- Custom roles
- Custom fields
- Business templates
- Purchase orders
- Supplier management
- Quotes
- Recurring service schedules
- WhatsApp integration
- Subscription billing
- Customer portal
- Advanced reports
- Accounting integration
