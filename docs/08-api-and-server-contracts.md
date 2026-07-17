# API and Server Contracts

## General Principle

The project may use Server Actions, Route Handlers, or both. Regardless of transport, contracts must be explicit, typed, validated, and tested.

## Standard Success Shape

```ts
type Success<T> = {
  ok: true;
  data: T;
  requestId: string;
};
```

## Standard Error Shape

```ts
type Failure = {
  ok: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
  requestId: string;
};
```

## Error Codes

### Authentication

- `AUTH_REQUIRED`
- `AUTH_INVALID`
- `SESSION_EXPIRED`

### Organization

- `ORGANIZATION_REQUIRED`
- `MEMBERSHIP_REQUIRED`
- `MEMBERSHIP_DISABLED`
- `PERMISSION_DENIED`

### Validation

- `VALIDATION_ERROR`
- `INVALID_STATE_TRANSITION`
- `DUPLICATE_VALUE`

### Resource

- `NOT_FOUND`
- `CONFLICT`
- `RESOURCE_ARCHIVED`

### Inventory

- `INSUFFICIENT_STOCK`
- `INVALID_STOCK_ADJUSTMENT`
- `INVENTORY_CONFLICT`

### Sales and Payments

- `ORDER_NOT_EDITABLE`
- `PAYMENT_EXCEEDS_BALANCE`
- `PAYMENT_ALREADY_VOIDED`

### System

- `RATE_LIMITED`
- `INTERNAL_ERROR`
- `SERVICE_UNAVAILABLE`

## Mutation Contract

Every mutation performs:

```text
Authenticate
→ Resolve membership
→ Check permission
→ Parse input
→ Load related resources
→ Verify same organization
→ Validate business rules
→ Execute transaction
→ Audit sensitive action
→ Return safe result
```

## Idempotency

Use idempotency keys for operations vulnerable to duplicate submission:

- Payment creation
- Order confirmation
- Inventory transfer
- Work order completion
- External webhook handling

## Pagination

Use cursor pagination for large or frequently changing datasets where practical.

Example request:

```text
cursor
limit
search
status
sort
```

Example response:

```ts
{
  items: T[];
  nextCursor: string | null;
}
```

## Filtering

Filters must be allowlisted. Do not directly turn arbitrary client input into SQL ordering or filters.

## Server Logging Context

Every server request or action should produce:

- Request ID
- Authenticated user ID when available
- Organization ID when available
- Action or route name
- Result category
- Duration
- Safe error metadata

## Contract Documentation

Each feature specification must document:

- Input schema
- Output schema
- Required permission
- State transitions
- Audit effect
- Database transaction behavior
- Expected error codes
