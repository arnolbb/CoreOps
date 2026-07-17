# UI and UX Guidelines

## Product Feel

CoreOps should feel:

- Clean
- Calm
- Trustworthy
- Efficient
- Professional
- Understandable by non-technical staff

Avoid overly futuristic visual design that reduces clarity.

## Layout

### Desktop

```text
Sidebar
Top bar
Page header
Primary content
Optional right-side detail panel
```

### Mobile

- Collapsible navigation
- Large touch targets
- Sticky primary actions when useful
- Tables adapt into cards or horizontally scroll safely
- Work order flow optimized for one-handed use

## Core Navigation

- Dashboard
- Customers
- Products
- Inventory
- Sales
- Work Orders
- Reports
- Team
- Settings

Only show modules the user can access.

## Page Header

Each page should include:

- Clear title
- One-sentence description when useful
- Primary action
- Secondary actions
- Contextual breadcrumbs when depth is greater than one level

## Forms

- Group related fields
- Mark required fields clearly
- Validate after interaction or submit
- Show field-level errors
- Preserve entered data on validation failure
- Disable duplicate submission
- Confirm destructive actions
- Use sensible defaults
- Avoid very long single-page forms

## Tables

Required behavior:

- Search
- Relevant filters
- Sort when valuable
- Pagination
- Empty state
- Loading state
- Row actions
- Responsive behavior
- Clear status badges

## Status Language

Use consistent status terms across the application.

Example work order labels:

- Draft
- Scheduled
- In Progress
- Completed
- Cancelled

Do not use multiple words for the same state in different pages.

## Feedback

### Success

Use concise confirmation:

```text
Customer created.
Payment recorded.
Work order completed.
```

### Validation Error

Explain the fix:

```text
Enter a valid email address.
Quantity must be greater than zero.
```

### Authorization Error

Do not expose internal permission details:

```text
You do not have access to perform this action.
```

### Unexpected Error

```text
Something went wrong. Try again. Reference: <request-id>
```

## Empty States

Empty states should explain:

- What this section contains
- Why it is useful
- What action to take next

Example:

```text
No customers yet.
Add your first customer to create sales and work orders.
[Add customer]
```

## Accessibility

- Semantic HTML
- Keyboard accessible controls
- Visible focus state
- Labels for inputs
- Accessible dialogs
- Sufficient contrast
- Do not rely only on color
- Error summaries for large forms
- Respect reduced motion preferences

## Design Tokens

Use named tokens rather than hard-coded arbitrary values:

- Background
- Surface
- Border
- Text primary
- Text secondary
- Success
- Warning
- Danger
- Info

Exact branding is deferred until a product identity is selected.

## Loading

Prefer:

- Skeletons for page content
- Button progress for mutations
- Disable repeated submit
- Avoid full-screen blocking when only one component updates
