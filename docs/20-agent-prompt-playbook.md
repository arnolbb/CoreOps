# Agent Prompt Playbook

## Purpose

Use consistent prompts so coding agents produce focused, reviewable work.

## General Task Prompt

```text
Implement <TASK-ID>: <TITLE>.

Read first:
- AGENTS.md
- <relevant product specification>
- <relevant architecture document>
- <relevant database document>
- <relevant permission document>
- <relevant test document>

Scope:
- <exact work>
- <exact work>

Out of scope:
- <explicit exclusions>

Requirements:
- Preserve multi-tenant isolation.
- Do not trust organization_id from the client.
- Add server-side permission checks.
- Add or update RLS where relevant.
- Validate all input with Zod.
- Add automated tests.
- Do not modify unrelated modules.
- Update documentation.

Before coding:
1. Summarize the intended implementation.
2. List affected files.
3. Identify migration, authorization, and tenant risks.

After coding:
1. Run formatting, lint, typecheck, tests, and build.
2. Report changed files.
3. Report database changes.
4. Report authorization impact.
5. Report known limitations.
```

## Database Migration Prompt

```text
Create the migration for <feature>.

Use:
- docs/06-database-design.md
- docs/07-authorization-and-permissions.md
- docs/10-security.md
- AGENTS.md

Requirements:
- UUID primary keys.
- organization_id for tenant-owned tables.
- Foreign keys and constraints.
- Indexes for tenant and common filters.
- RLS enabled.
- Policies for active membership.
- Cross-tenant references prevented.
- Migration must work on a fresh database.
- Add migration tests or verification.
- Do not edit production manually.
```

## Feature Review Prompt

```text
Review the implementation for <TASK-ID>.

Do not modify code yet.

Check:
- Requirement compliance
- Tenant isolation
- Server-side authorization
- RLS
- Cross-tenant references
- Input validation
- Transaction safety
- Concurrency
- Error leakage
- Audit logging
- Test completeness
- Accessibility
- Performance concerns

Return findings ordered by severity:
Critical
High
Medium
Low

For each finding include:
- File and location
- Problem
- Impact
- Reproduction or failure scenario
- Recommended fix
- Missing regression test
```

## Security Review Prompt

```text
Perform a security review of <feature>.

Assume the attacker:
- Is authenticated
- Belongs to Organization A
- Knows or guesses IDs from Organization B
- Can modify browser requests
- Can submit duplicate requests
- Can upload malicious files
- Has a low-privilege role

Focus on:
- IDOR
- Broken access control
- Privilege escalation
- Cross-tenant writes
- Unsafe file access
- Duplicate financial operations
- Inventory race conditions
- Secret exposure
- Sensitive log leakage

Do not make code changes. Produce a remediation checklist.
```

## Bug Fix Prompt

```text
Fix <BUG-ID>: <summary>.

Reproduction:
<steps>

Expected:
<expected>

Actual:
<actual>

Requirements:
- Identify the root cause.
- Add a failing regression test first.
- Apply the smallest safe fix.
- Review similar code paths.
- Do not weaken validation or authorization.
- Run all required checks.
- Update changelog if user-visible.
```

## UI Prompt

```text
Implement the UI for <feature> using the existing server contract.

Required states:
- Loading
- Empty
- Success
- Validation error
- Authorization error
- Unexpected error
- Mobile layout

Requirements:
- Reuse design-system components.
- Do not duplicate business logic in the client.
- Preserve form values after validation failure.
- Prevent duplicate submission.
- Meet accessibility basics.
- Add component or E2E tests as appropriate.
```

## Documentation Update Prompt

```text
Update the repository documentation for <change>.

Inspect all potentially affected documents.
Do not rewrite unrelated sections.

At minimum evaluate:
- Product requirements
- Business workflow
- Database design
- Permission matrix
- API contract
- Security
- Testing
- Runbook
- Changelog
- ADR log

Report which documents changed and why.
```

## Agent Context Refresh Prompt

Use when a long session may have lost context:

```text
Before continuing, re-read:
- AGENTS.md
- TASKS.md
- Current task specification
- Relevant ADRs
- Files changed in this task

Summarize:
- Current goal
- Completed work
- Remaining work
- Known risks
- Tests still required

Do not modify code in this step.
```
