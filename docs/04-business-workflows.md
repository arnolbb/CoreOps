# Business Workflows

## 1. Organization Onboarding

```mermaid
flowchart TD
    A[Register] --> B[Verify authentication]
    B --> C{Has active organization?}
    C -- No --> D[Create organization]
    D --> E[Create Owner membership]
    E --> F[Choose business template]
    F --> G[Open dashboard]
    C -- Yes --> G
```

## 2. Invite Member

```mermaid
flowchart TD
    A[Owner or authorized Admin] --> B[Enter email and role]
    B --> C[Validate permission]
    C --> D[Create invitation]
    D --> E[Send invitation email]
    E --> F[User opens invitation]
    F --> G{Authenticated?}
    G -- No --> H[Register or sign in]
    G -- Yes --> I[Accept invitation]
    H --> I
    I --> J[Create or reactivate membership]
```

## 3. Customer to Sale

```mermaid
flowchart TD
    A[Create or select customer] --> B[Create sales order draft]
    B --> C[Add products or services]
    C --> D[Server calculates totals]
    D --> E{Confirm order?}
    E -- No --> B
    E -- Yes --> F[Validate stock and permissions]
    F --> G[Confirm order]
    G --> H[Create inventory movement if required]
    H --> I[Record payment]
    I --> J{Fully paid?}
    J -- No --> K[Outstanding]
    J -- Yes --> L[Paid]
```

## 4. Inventory Adjustment

```mermaid
flowchart TD
    A[Open stock item] --> B[Choose adjustment]
    B --> C[Enter quantity and reason]
    C --> D[Validate permission]
    D --> E[Validate resulting stock]
    E --> F[Create immutable ledger entry]
    F --> G[Update balance atomically]
    G --> H[Write audit log]
```

## 5. Work Order Lifecycle

```mermaid
flowchart TD
    A[Create draft] --> B[Schedule]
    B --> C[Assign worker]
    C --> D[Start work]
    D --> E[Record notes, photos, and items]
    E --> F{Complete?}
    F -- No --> D
    F -- Yes --> G[Validate required fields]
    G --> H[Consume inventory]
    H --> I[Mark completed]
    I --> J[Write audit log]
```

## 6. Work Order Item Usage

```text
Select work order
→ Select warehouse
→ Select tracked item
→ Enter quantity
→ Validate available stock
→ Create work order item snapshot
→ Create inventory transaction
→ Update stock balance
→ Commit atomically
```

## 7. Payment Recording

```text
Open order
→ Enter payment details
→ Validate amount
→ Create payment record
→ Recalculate outstanding amount
→ Update payment status
→ Write audit log
```

## 8. Cancellation

Cancellation must never behave like deletion.

```text
Request cancellation
→ Check permission
→ Check current status
→ Determine inventory reversal
→ Determine payment impact
→ Require reason
→ Apply reversal transaction
→ Mark cancelled
→ Write audit log
```

## 9. Tenant Switching

```text
Authenticated user
→ Load active memberships
→ Select organization
→ Store active organization safely
→ Revalidate membership on each server request
→ Load organization-scoped data
```

The selected organization identifier is a user preference, not proof of authorization.
