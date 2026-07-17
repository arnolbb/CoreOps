# Security Requirements

## Security Objectives

1. Prevent cross-tenant access
2. Prevent unauthorized actions
3. Protect credentials and sessions
4. Preserve integrity of inventory and payment records
5. Restrict private file access
6. Keep an audit trail
7. Recover from mistakes and incidents

## Threat Model

### Assets

- Customer data
- Product and pricing data
- Cost prices
- Inventory records
- Sales and payments
- Work order attachments
- Organization membership
- Authentication sessions
- Secrets
- Audit logs

### Likely Threats

- User guesses another tenant's resource ID
- Staff elevates privileges
- Client changes organization ID
- Duplicate payment submission
- Concurrent order creates negative stock
- Public file URL leaks customer documents
- Secret committed to Git
- Malicious file upload
- Missing validation changes financial total
- Admin removes last Owner
- Logs expose tokens or personal data

## Authentication

- Use secure provider-supported sessions
- Require verified authentication for protected flows
- Secure cookie attributes
- Password reset uses short-lived token
- Authentication endpoints are rate-limited
- Sensitive ownership actions may require re-authentication later
- MFA is recommended for Owner after MVP

## Authorization

- Deny by default
- Check server-side
- Enforce tenant RLS
- Test cross-tenant access
- Do not trust hidden fields
- Do not derive permissions from UI state
- Protect all exports
- Protect direct file access
- Protect server actions independently of page visibility

## Input Validation

- Zod for external input
- Server-side validation mandatory
- Length limits
- Numeric ranges
- Enumerated statuses
- Date validation
- Email validation
- Safe sort and filter allowlists
- Safe file names
- Reject unsupported content

## File Uploads

- Allowlist MIME types
- Verify actual file signature where practical
- Restrict size
- Generate internal storage names
- Do not trust original file name
- Store outside public path
- Scan or isolate higher-risk file types
- Prevent HTML or script execution
- Remove files when parent deletion policy requires it
- Log uploads and removals

## Secrets

- Stored only in approved environment configuration
- Never committed
- Never sent to client
- Never included in logs
- Never pasted into agent prompts
- Rotated after suspected exposure
- Separate local, preview, and production secrets

## Inventory Integrity

- Use atomic transactions
- Prevent or explicitly configure negative stock
- Use append-only ledger
- Protect adjustment permission
- Require adjustment reason
- Record before and after balance
- Add idempotency for duplicate operations
- Handle concurrency

## Payment Integrity

- Fixed-precision values
- Server-calculated balances
- Posted payment is not hard-deleted
- Void or reverse with audit trail
- Restrict permission
- Use idempotency
- Reject cross-order and cross-tenant references
- Do not trust client totals

## Logging

Log:

- Authentication failures
- Authorization failures
- Membership changes
- Role changes
- Inventory adjustments
- Payment changes
- Order cancellation
- Work order completion and reopen
- Unexpected server errors
- Rate limiting
- Sensitive exports

Do not log:

- Password
- Access token
- Refresh token
- Invitation token plaintext
- Full payment credentials
- Secret keys
- Entire uploaded file contents

## Rate Limiting Targets

- Sign in
- Registration
- Password reset
- Invitation acceptance
- File upload
- Export generation
- Search endpoints vulnerable to abuse
- Any public form added later

## Security Verification

Before production:

- Dependency audit
- Tenant isolation test suite
- Authorization review
- RLS review
- File access review
- Secret scan
- Backup and restore test
- Error leakage review
- Session configuration review
- Manual IDOR testing
