# Product Requirements Document

## 1. Scope

This document defines the MVP requirements for CoreOps.

## 2. Actors

- Visitor
- Authenticated User
- Owner
- Admin
- Manager
- Staff
- Technician
- Viewer
- System

Only Owner, Admin, and Staff are required for the earliest implementation. Other roles may be added after the permission system is stable.

## 3. Authentication

### Requirements

- User can register with email and password
- User can sign in
- User can sign out
- User can request password reset
- User session persists securely
- User without an organization is directed to onboarding
- Disabled membership cannot access organization data

### Acceptance Criteria

- Invalid credentials return a safe error
- Authentication errors do not reveal whether an account exists when that would create abuse risk
- Authenticated pages reject unauthenticated requests
- Session state is verified server-side for protected operations

## 4. Organizations

### Requirements

- User can create an organization
- Creator becomes Owner
- Organization has name, slug, business type, timezone, currency, and status
- User may belong to more than one organization
- User can switch active organization
- Organization data is isolated

### Acceptance Criteria

- Organization creation and Owner membership are atomic
- Duplicate slug handling is deterministic
- A user cannot select an organization without active membership
- Organization A cannot access Organization B resources

## 5. Invitations and Memberships

### Requirements

- Owner and authorized Admin can invite a member by email
- Invitation includes organization and role
- Invitation has expiration
- Existing user can accept invitation
- New user can register and accept invitation
- Owner can disable or remove a membership
- Organization must always retain at least one Owner

### Acceptance Criteria

- Duplicate pending invitation is prevented or updated safely
- Expired invitation cannot be accepted
- Unauthorized user cannot invite members
- Admin cannot assign Owner unless product policy explicitly allows it
- Last Owner cannot remove or demote themselves

## 6. Customers

### Data

- Type: individual or business
- Display name
- Company name
- Phone
- Email
- Status
- Tags
- Notes
- Addresses
- Created by
- Created at
- Updated at

### Requirements

- Authorized user can create, view, edit, archive, search, and filter customers
- Customer detail displays related sales and work orders
- Customer may have multiple addresses
- Search supports name, phone, email, and company

### Rules

- Customer display name is required
- Email is optional and validated when present
- Phone is optional and normalized when possible
- Archived customers remain available in historical transactions
- Duplicate detection may warn but must not block valid edge cases without strong evidence

## 7. Products

### Data

- Type: physical product, service, spare part, bundle
- Name
- SKU
- Category
- Unit
- Description
- Cost price
- Selling price
- Tax behavior
- Track inventory
- Active status
- Image

### Rules

- SKU must be unique within an organization when present
- Service items do not require stock
- Monetary values cannot be negative
- Inactive products remain visible in historical records
- Cost price visibility is permission-controlled

## 8. Warehouses and Inventory

### Requirements

- Organization can create warehouses
- User can view stock by warehouse
- Authorized user can adjust stock with a reason
- Every stock change creates an inventory transaction
- System can show low-stock items
- Stock history is immutable except through explicit correction workflow

### Transaction Types

- Opening balance
- Purchase receipt
- Sale
- Sales return
- Work order usage
- Work order return
- Transfer out
- Transfer in
- Adjustment increase
- Adjustment decrease
- Damaged
- Expired

### Rules

- Stock cannot become negative unless organization setting explicitly permits it
- Transfer creates linked outgoing and incoming records
- Inventory mutation must use a database transaction
- Manual adjustment requires a reason
- Historical transactions are not hard-deleted

## 9. Sales Orders

### Data

- Order number
- Customer
- Status
- Payment status
- Currency
- Items
- Quantity
- Unit price
- Discount
- Tax
- Notes
- Created by
- Assigned sales user
- Dates

### Status

```text
draft
confirmed
completed
cancelled
```

### Payment Status

```text
unpaid
partially_paid
paid
refunded
```

### Requirements

- User can create a draft
- User can add multiple items
- System calculates subtotal, discount, tax, and total
- Confirming order may reserve or reduce stock according to selected architecture decision
- User can record payments
- User can cancel according to allowed state transitions
- Completed order becomes read-only except controlled correction operations

### Rules

- Totals are calculated server-side
- Client totals are never trusted
- Product names and prices must be snapshotted in order items
- Cancellation cannot silently delete inventory or payment history
- Payment total cannot exceed permitted amount without explicit refund or credit handling

## 10. Payments and Invoices

### Requirements

- Record payment date, amount, method, reference, and notes
- Show outstanding amount
- Generate simple invoice view
- Export or print invoice
- Restrict payment modification to authorized roles

### Rules

- Payment amount must be positive
- Payment belongs to the same organization as the order
- Payment changes create audit events
- Financial values use fixed precision
- Deleting a posted payment is prohibited; use reversal or void workflow

## 11. Work Orders

### Use Cases

- Installation
- Repair
- Service
- Maintenance
- Inspection
- Delivery support
- General operational task

### Data

- Work order number
- Customer
- Address
- Type
- Priority
- Status
- Scheduled start and end
- Assigned user
- Description
- Completion notes
- Attachments
- Used items
- Created by
- Timestamps

### Status

```text
draft
scheduled
in_progress
completed
cancelled
```

### Rules

- Status transitions are validated
- Completion requires permission
- Used stock items create inventory transactions
- Used items must come from a valid warehouse
- Attachment access is tenant-protected
- Completed work order is locked except controlled reopen flow
- Reopening creates an audit event

## 12. Dashboard

### Required Widgets

- Total customers
- Sales this month
- Outstanding payments
- Low-stock products
- Active work orders
- Recent activity

### Rules

- Data is organization-scoped
- Date boundaries respect organization timezone
- Sensitive totals respect permissions
- Empty organizations show onboarding guidance

## 13. Audit Log

### Required Events

- Organization settings changed
- Membership invited, changed, disabled, removed
- Role or permission changed
- Customer archived
- Product price changed
- Inventory adjusted
- Sales order confirmed, cancelled, corrected
- Payment recorded, voided, reversed
- Work order completed or reopened
- Sensitive export performed

### Audit Entry

- Organization
- Actor
- Action
- Entity type
- Entity ID
- Before summary
- After summary
- Timestamp
- Request ID
- IP or client metadata when legally and operationally appropriate

## 14. Global Requirements

- Pagination for growing lists
- Search and filters
- Responsive layout
- Accessible forms
- Safe error handling
- Empty states
- Activity timestamps
- Timezone-aware display
- Server-side authorization
- Tenant isolation
- Automated tests
