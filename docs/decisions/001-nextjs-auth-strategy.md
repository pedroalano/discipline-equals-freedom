# ADR 001: Next.js Auth Strategy — Custom JWT Cookie

**Date:** 2026-03-23
**Status:** Accepted

## Context

Phase 1 requires authenticated routes in a Next.js App Router frontend backed by a stateless NestJS API. Two options were evaluated:

1. **next-auth v5** — the standard NextAuth library with built-in providers, sessions, and adapters
2. **Custom JWT cookie** — Next.js Route Handlers proxy auth calls to NestJS and set `httpOnly` cookies

## Decision

**Custom JWT cookie**, implemented as follows:

- NestJS issues a short-lived access token (15m JWT) and a long-lived refresh token (7d JWT)
- Refresh token hashes are stored in Redis keyed by `refreshToken:<userId>:<tokenId>`; tokens rotate on every refresh
- Next.js Route Handlers at `/api/auth/*` proxy to NestJS and set `httpOnly; SameSite=lax` cookies
- Next.js middleware decodes the access token (without verifying) to check expiry; if expired it attempts a silent refresh before the request reaches the page

## Rationale

| Criterion                       | next-auth v5                 | Custom JWT cookie |
| ------------------------------- | ---------------------------- | ----------------- |
| NestJS ownership of auth logic  | No (NextAuth owns sessions)  | Yes               |
| Revocation via Redis            | Requires adapter work        | Native            |
| No extra DB schema for sessions | No                           | Yes               |
| Complexity for Phase 1 scope    | Higher (adapters, providers) | Lower             |
| Vendor coupling                 | NextAuth API                 | None              |

The NestJS API is the canonical auth authority. next-auth v5 would duplicate auth logic or require a credentials provider that re-implements the same logic with an extra hop. The custom approach keeps all token validation in NestJS where security-sensitive code belongs, while Next.js Route Handlers act as a thin cookie-setting proxy.

## Consequences

- **Cookie security:** `httpOnly` cookies prevent XSS token theft. `SameSite=lax` is used in development; `secure` flag is enabled in production.
- **Token rotation:** Every refresh call rotates the refresh token (old key deleted from Redis, new key written). This enables single-use refresh tokens and revocation on logout.
- **Edge middleware:** `jose` (Edge-compatible) is used for expiry decode in middleware — no signature verification, so a tampered token passes middleware but fails at the NestJS API level.
- **Future:** If social login is needed in Phase 3+, adding next-auth v5 alongside is still possible; it can be scoped to social providers while JWT cookie flow handles email/password.
