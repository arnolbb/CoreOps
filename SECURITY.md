# Security Policy

## Reporting a Vulnerability

Do not open a public issue for a suspected vulnerability.

Until a dedicated security email exists, report vulnerabilities privately to the repository owner.

Include:

- Affected feature
- Reproduction steps
- Expected impact
- Whether cross-tenant access is possible
- Whether credentials or personal data are exposed
- Suggested mitigation, if known

## Security Priorities

The highest-risk areas are:

1. Cross-tenant data access
2. Broken authorization
3. Inventory and payment tampering
4. File upload abuse
5. Secret leakage
6. Privilege escalation
7. Insecure direct object references
8. Missing auditability

## Response Expectations

For critical vulnerabilities:

- Disable or restrict the affected feature
- Preserve relevant logs
- Rotate affected secrets
- Assess tenant impact
- Prepare a patch
- Add a regression test
- Document the incident
