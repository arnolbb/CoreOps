# Data Privacy and Retention

## Scope

This document defines product-level data handling expectations. Legal documents must later be reviewed for the jurisdictions where the product operates.

## Data Categories

### Account Data

- Name
- Email
- Authentication identifiers
- Avatar

### Organization Data

- Company name
- Address
- Contact details
- Settings

### Customer Data

- Name
- Phone
- Email
- Address
- Notes
- Transaction history
- Service history

### Operational Data

- Products
- Inventory
- Sales
- Payments
- Work orders
- Attachments
- Audit logs

## Principles

- Collect only needed data
- Restrict access by role
- Keep tenant data isolated
- Do not sell customer data
- Provide deletion and export processes later
- Retain audit and financial records according to operational and legal needs
- Avoid storing highly sensitive data without a clear requirement

## Retention Draft

- Active organization data: while account is active
- Archived operational records: retained for history
- Audit logs: minimum period to be defined
- Invitations: expire and may be purged after retention window
- Deleted account data: removal or anonymization workflow to be defined
- Temporary exports: automatically expire
- Logs: short operational retention with secure access

## User Requests

Future workflows:

- Export organization data
- Correct account information
- Delete account
- Delete organization
- Remove customer data when legally permitted
- Preserve records that must remain for legitimate operational reasons

## Attachments

- Organization-scoped
- Not publicly indexable
- Retention follows parent entity and legal need
- Orphan cleanup job required later
