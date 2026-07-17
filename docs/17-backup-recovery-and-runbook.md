# Backup, Recovery, and Production Runbook

## Backup Objectives

Protect:

- PostgreSQL data
- Storage objects
- Environment configuration references
- Migration history
- Critical operational documentation

## Recovery Targets

Initial targets must be selected before production:

- RPO: maximum acceptable data loss
- RTO: maximum acceptable recovery time

For early beta, record realistic targets rather than claiming enterprise guarantees.

## Backup Requirements

- Automated database backup
- Separate storage-object backup strategy
- Migration files in Git
- Periodic restore test
- Backup access restricted
- Retention documented

## Restore Test

At least before beta and periodically afterward:

```text
Create isolated staging target
→ Restore database
→ Restore required storage objects
→ Configure staging secrets
→ Run migration verification
→ Run critical E2E
→ Document result
```

## Incident: Application Down

1. Confirm scope
2. Check latest deployment
3. Check provider status
4. Review error tracking
5. Roll back application if safe
6. Verify database compatibility
7. Run smoke tests
8. Communicate internally
9. Record incident

## Incident: Failed Migration

1. Stop further deployment
2. Preserve logs
3. Assess whether migration partially applied
4. Do not rerun blindly
5. Apply documented forward fix or restore
6. Verify data integrity
7. Add migration regression coverage
8. Record ADR or incident report if architecture changed

## Incident: Suspected Cross-Tenant Access

This is critical.

1. Restrict affected route or feature
2. Preserve logs
3. Identify affected organizations
4. Revoke exposed sessions if required
5. Fix policy and server checks
6. Add regression tests
7. Review similar resources
8. Rotate secrets if exposure included credentials
9. Follow legal and notification requirements appropriate to deployment jurisdiction

## Incident: Inventory Corruption

1. Stop affected mutation
2. Preserve ledger
3. Compare balances against transactions
4. Identify inconsistent records
5. Use controlled correction transaction
6. Never edit history silently
7. Add regression test

## Incident: Payment Record Error

1. Restrict modification
2. Preserve original record
3. Use void or reversal
4. Add corrected payment
5. Record actor and reason
6. Verify outstanding balance
7. Add regression test

## Incident Report

Use `templates/incident-report-template.md`.
