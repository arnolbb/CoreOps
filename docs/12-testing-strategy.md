# Testing Strategy

## Goals

- Catch business-rule regressions
- Prove tenant isolation
- Prove authorization
- Protect inventory and payment integrity
- Validate critical user workflows
- Support safe AI-generated changes

## Test Pyramid

### Unit Tests

Test pure logic:

- Money calculations
- Discount calculation
- Tax calculation
- Outstanding amount
- Payment status
- Work order state transitions
- Inventory quantity rules
- Permission helper behavior
- Date boundary utilities

### Integration Tests

Test:

- Database queries
- RLS behavior
- Server actions
- Route handlers
- Transactions
- Constraints
- Cross-tenant references
- Idempotency
- Concurrent stock changes

### End-to-End Tests

Critical flows:

#### Onboarding

```text
Register
→ Create organization
→ Reach dashboard
```

#### Customer and Product

```text
Create customer
→ Create product
→ Add stock
```

#### Sale

```text
Create sales order
→ Confirm
→ Verify inventory movement
→ Record payment
→ Verify payment status
```

#### Work Order

```text
Create work order
→ Assign
→ Start
→ Add used item
→ Upload attachment
→ Complete
→ Verify stock movement
```

#### Tenant Isolation

```text
User A signs in
→ Attempts direct URL for Organization B resource
→ Access denied
```

## Required Test Cases per Feature

- Happy path
- Required field missing
- Invalid enum
- Boundary value
- Duplicate submission
- Unauthorized role
- Disabled membership
- Cross-tenant ID
- Archived resource
- Unexpected database failure
- Empty list
- Pagination edge
- Mobile critical path when relevant

## Test Data

Use factories:

- User
- Organization
- Membership
- Customer
- Product
- Warehouse
- Inventory balance
- Sales order
- Payment
- Work order

Factories must allow explicit organization ownership to make tenant tests clear.

## Database Test Isolation

Each test must:

- Use isolated data
- Avoid depending on run order
- Clean up or use transaction rollback
- Generate unique identifiers
- Never point to production

## Security Regression Tests

Every discovered authorization or tenant bug must add a permanent regression test before the fix is considered complete.

## CI Test Levels

### Pull Request

- Lint
- Typecheck
- Unit tests
- Integration tests
- Build

### Protected Branch or Release

- All above
- Critical Playwright suite
- Migration validation
- Optional dependency scan

## Manual Acceptance

Before beta release:

- Owner workflow
- Admin workflow
- Staff workflow
- Technician mobile workflow
- Cross-tenant manual checks
- File upload checks
- Backup restore check
