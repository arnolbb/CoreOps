# ADR-0005: Supabase SSR Authentication Foundation

- Status: Accepted
- Date: 2026-07-19
- Decision owners: CoreOps maintainers
- Related tasks: TASK-AUTH-001

## Context

TASK-AUTH-001 establishes authentication for the Next.js 16.2 application before organization onboarding. Product requirements require registration, sign-in, sign-out, password reset, secure persisted sessions, safe auth errors, and server-side verification for protected pages. Security requirements require secure provider-supported sessions, no token logging, safe redirects, and server-side authorization checks.

Next.js 16.2 uses `src/proxy.ts` for request Proxy behavior; the old `middleware.ts` convention is deprecated. Supabase SSR supports cookie-backed sessions and PKCE email flows.

## Decision

- Use `@supabase/ssr` and `@supabase/supabase-js` for browser, server, and Proxy clients.
- Use Zod for authentication input validation.
- Use `src/proxy.ts` and `src/lib/supabase/proxy.ts`; do not create `middleware.ts`.
- Use cookie-backed Supabase SSR clients with the existing public environment variables:
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Do not use `SUPABASE_SERVICE_ROLE_KEY` in TASK-AUTH-001.
- Use `supabase.auth.getClaims()` for trusted server-side identity checks.
- Use `getUser()` only when a fresh user record is explicitly required by a later task.
- Do not use `getSession()` as a route-protection or authorization check.
- Let Proxy refresh cookies and perform early user-experience redirects, but require protected pages and Server Actions to call server-side authenticated-user helpers independently.
- Use one documented email flow for confirmation and recovery: Supabase SSR PKCE with `code` and `exchangeCodeForSession()`.
- Configure local Supabase email confirmations and callback redirect allow-list for local Mailpit/Inbucket validation.
- Add Vitest as the minimal unit/integration test runner and Playwright for live auth flow validation.
- Record production rate limiting and CAPTCHA/Turnstile as a follow-up security task instead of adding a fake in-memory production limiter.

## Consequences

### Positive

- Protected pages validate user identity on the server before rendering.
- Server Actions can share the same authenticated-user helper.
- Browser code never receives the service-role key.
- Email confirmation and password recovery are tested against actual local Supabase emails.
- CI enforces unit tests, integration tests, production build, database tests, and live authentication E2E.

### Negative

- Production-grade rate limiting and CAPTCHA are deferred until infrastructure is selected.
- Organization onboarding remains separate and must use the authentication helper added here.
- Local E2E requires Docker-backed Supabase and browser binaries.

## Security Impact

- Session identity checks use `getClaims()`, which validates the JWT or falls back to trusted Supabase Auth validation when needed.
- `getSession()` is not used as an authorization or route-protection check.
- Authentication errors are mapped to safe messages.
- Password reset responses do not reveal whether an account exists.
- Redirect targets are constrained to local relative paths.
- Passwords, access tokens, refresh tokens, and service-role keys are not logged.

## Follow-up

- Add production-grade rate limiting for registration, sign-in, and password reset.
- Add CAPTCHA/Turnstile if abuse risk requires it.
- Implement TASK-ORG-002 organization onboarding using `requireAuthenticatedUser()`.
