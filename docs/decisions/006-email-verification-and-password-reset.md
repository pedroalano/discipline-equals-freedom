# ADR 006 — Email Verification & Password Reset

**Status:** Accepted
**Date:** 2026-04-21

## Context

The auth system lacked email verification (users could register with any email and get immediate full access) and password reset (users who forgot their password had no self-service recovery). These are baseline requirements for a production auth system.

## Decision

### Email Provider: Resend

Resend chosen for transactional emails. Simple REST API, generous free tier, good deliverability. Integrated via the `resend` npm package in a global `EmailModule`.

### Token Strategy: crypto.randomBytes + SHA-256 in Redis

Verification and reset tokens are `crypto.randomBytes(32)` (64 hex chars). Stored as SHA-256 hashes in Redis with TTL:

- Verification: 24h TTL
- Password reset: 1h TTL
- Both have 60s resend cooldowns

**Why SHA-256 instead of bcrypt?** These tokens are 256-bit random — computationally infeasible to brute-force. SHA-256 is instant; bcrypt would add latency with no security gain on high-entropy tokens.

**Why Redis instead of Postgres?** Tokens are ephemeral and single-use. Redis TTL handles expiration automatically. Consistent with the existing refresh token storage pattern.

### Email Verification Guard

`emailVerified` is included in the JWT access token payload to avoid a DB query on every request. Tradeoff: up to 15-minute stale window after verification (until token refresh). Acceptable for this use case.

A global `EmailVerifiedGuard` blocks unverified users from most routes. Whitelisted: verify-email, resend-verification, logout, refresh, GET /users/me.

### Auto-Login After Registration

Registration now returns `AuthResponse` (access + refresh tokens). Users land on `/verify-email` with limited access until they verify. Better UX than requiring email verification before any access.

### Password Reset: No Email Enumeration

`POST /auth/forgot-password` always returns the same response regardless of whether the email exists, preventing attackers from discovering valid accounts.

### Account Lockout

5 failed login attempts per email triggers a 15-minute lockout. Counter stored in Redis with TTL, auto-expires. Cleared on successful login.

### Existing Users

Migration grandfathers all existing users as `emailVerified = true`.

## Consequences

- New users must verify email before accessing features beyond profile and verification pages
- Password reset flow invalidates all sessions (purges refresh tokens)
- Stronger password requirements: 8+ chars, uppercase, lowercase, digit
- Three new env vars required: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL`
