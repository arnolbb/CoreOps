# Deployment and Environments

## Environments

### Local

Purpose:

- Development
- Automated testing
- Schema reset
- Dummy data

Rules:

- No production customer data
- Safe to reset
- Local secrets only

### Preview

Purpose:

- Pull request review
- UI testing
- Feature acceptance

Rules:

- Separate from production
- Use dummy or sanitized data
- Never share production service-role secrets

### Staging

Purpose:

- Release candidate validation
- Migration rehearsal
- End-to-end testing
- Restore testing

Staging may initially share operational patterns with Preview but should become persistent before beta grows.

### Production

Purpose:

- Real organizations
- Real business data

Rules:

- Protected branch only
- Restricted secrets
- Backup active
- Monitoring active
- Direct manual schema edits prohibited

## Domain Plan

Suggested:

```text
app.example.com
staging.example.com
```

## Environment Variables

Variables must be explicitly assigned to environments. Avoid fallback behavior that accidentally connects Preview to Production.

## Deployment Checklist

- CI passes
- Migration reviewed
- Environment variables set
- Database backup verified
- Application deployed
- Authentication tested
- Critical smoke test completed
- Monitoring checked
- Changelog updated

## Smoke Tests

- Sign in
- Load dashboard
- Switch organization
- Open customer list
- Create and remove a test draft when safe
- Verify storage access
- Verify audit logging
