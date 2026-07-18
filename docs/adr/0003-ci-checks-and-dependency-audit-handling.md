# ADR-0003: CI Checks and Dependency Audit Handling

- Status: Accepted
- Date: 2026-07-18
- Decision owners: CoreOps maintainers
- Related tasks: TASK-FND-003

## Context

TASK-FND-003 requires reproducible code-quality, build, and migration checks before feature work expands the application. ADR-0001 selects Node.js 24 and npm. ADR-0002 establishes the pinned Supabase CLI and Docker-backed local stack.

CI must validate that stack without production secrets or a remote Supabase project. Dependency advisory handling also needs an explicit decision: automated remediation can rewrite the dependency graph and introduce breaking or unreviewed changes.

## Decision

Use one GitHub Actions job on normal `pull_request` events and pushes to `main`.

- Run on `ubuntu-latest` with a 30-minute job timeout.
- Grant only `contents: read`.
- Pin `actions/checkout` and `actions/setup-node` to full commit SHAs with release comments.
- Disable checkout credential persistence because CI never pushes.
- Use Node.js 24 and `npm ci`.
- Cache npm's download cache through `actions/setup-node`, keyed from `package-lock.json`. Do not cache `node_modules`, build output, Docker images, or Supabase state.
- Run `format:check`, `lint`, `typecheck`, and the production build.
- Start local Supabase through the project-pinned CLI, reset the local database twice, print local migration history, and require migration `20260718210437`.
- Stop Supabase under `if: ${{ always() }}` with `continue-on-error: true`, preserving the primary failure.
- Supply no production secrets, Supabase access token, project reference, or remote database credentials. Never run `supabase link` or a remote migration command.

### Dependency audit handling

Do not run `npm audit fix` or `npm audit fix --force` in CI or as part of TASK-FND-003. Do not automatically modify dependencies in response to an advisory.

Dependency advisories require human triage for applicability, exploitability, available fixes, and compatibility. Any upgrade must update the lockfile through normal npm tooling, pass all required checks, and receive review. A future task may add a non-mutating advisory report after defining severity policy and handling for false positives or unavailable fixes.

## Alternatives Considered

### Separate quality and database jobs

Rejected for the foundation task. Separate jobs could improve parallelism but would duplicate checkout and installation while the current suite is small. Revisit when test duration warrants it.

### Cache `node_modules` or Supabase Docker state

Rejected. `npm ci` must construct dependencies from the lockfile, while cached Docker or database state could hide migration reproducibility failures.

### Connect CI to a hosted Supabase project

Rejected. Local Docker validation is isolated, disposable, and requires no production or shared credentials. Remote reset would create data-loss and environment-contamination risk.

### Make `npm audit` a blocking gate now

Rejected until advisory severity and exception policies exist. A raw blocking audit can fail on non-exploitable transitive advisories or fixes requiring breaking upgrades. Automated remediation is explicitly prohibited.

## Consequences

### Positive

- Every pull request and `main` push uses the pinned runtime and lockfile.
- Migration replay is checked twice against a disposable local stack.
- Workflow tokens and checkout credentials have minimal access.
- No production Supabase secret or remote project is required.
- Cleanup failure cannot mask the original CI failure.

### Negative

- Full local Supabase startup increases CI time and depends on GitHub-hosted Docker availability.
- A single job is sequential and does not maximize parallelism.
- Dependency advisories are not yet an automated blocking gate.

## Security Impact

The workflow uses read-only repository permission and does not persist Git credentials. Third-party actions are commit-SHA pinned. Local Supabase may print ephemeral local credentials, but the workflow injects no production secrets and performs no remote link or operation. Normal `pull_request`, not `pull_request_target`, prevents privileged execution of untrusted pull-request code.

## Migration Impact

No migration is added or changed. CI replays existing local migrations twice and verifies `20260718210437` in local migration history.

## Operational Impact

TASK-FND-003 remains in review until local-equivalent checks pass and a committed, pushed GitHub Actions run is green. Workflow implementation alone does not prove hosted execution.

## Review Date

Review when unit/integration/Playwright suites are introduced, CI duration warrants job separation, GitHub Actions major versions change, Supabase CLI is upgraded, or dependency advisory policy is defined.
