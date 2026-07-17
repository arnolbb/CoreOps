# Observability

## Objectives

- Know when the application is failing
- Identify affected feature and tenant safely
- Diagnose errors without exposing sensitive data
- Detect performance degradation
- Understand deployment health

## Logs

Structured fields:

```text
timestamp
level
environment
request_id
user_id
organization_id
route_or_action
event
duration_ms
result
error_code
```

Sensitive values must be omitted or redacted.

## Error Tracking

Capture:

- Unhandled server errors
- Unhandled client errors
- Failed background operations
- Authentication provider failures
- Storage failures
- Database transaction failures

Attach:

- Release identifier
- Environment
- Request ID
- Safe user and organization identifiers
- Route
- Error category

## Metrics

Initial metrics:

- Request error rate
- Request duration
- Database latency
- Authentication failure count
- Authorization denial count
- Upload failure count
- Sales confirmation failure count
- Inventory conflict count
- Payment failure count
- Active organizations
- Storage usage
- Database usage

## Alerts

Alert on:

- Sustained error spike
- Application unavailable
- Authentication unavailable
- Database unavailable
- Storage nearing limit
- Backup failure
- High inventory transaction conflict rate
- Unusual authorization denial spike

## Audit vs Operational Logs

Audit logs answer:

```text
Who changed business data?
```

Operational logs answer:

```text
Why did the system fail?
```

They must remain separate.
