# ADR 003: WebSocket Authentication

**Status:** Accepted
**Date:** 2026-03-24

## Context

Socket.io connections must be authenticated. Two options were considered:

1. Token in handshake query string (`?token=<jwt>`)
2. Cookie (`httpOnly access_token`) sent automatically on upgrade

## Decision

Use the **httpOnly cookie** (`access_token`) that is already set by the auth flow.

The NestJS `BoardGateway` reads the cookie in `handleConnection`, verifies it with `JwtService`, and disconnects unauthenticated clients immediately.

## Rationale

- The browser sends cookies automatically on the WebSocket upgrade request — no client-side token handling needed.
- Consistent with the existing auth pattern (cookie set at login/refresh).
- Token never appears in URLs, browser history, or server logs.
- Works with Socket.io's built-in cookie parsing (`socket.handshake.headers.cookie`).

## Consequences

- The gateway must parse raw `Cookie` header string to extract `access_token`.
- CORS on the gateway must allow `credentials: true` with the explicit frontend origin (no wildcard).
- If the access token expires mid-session the client must reconnect after a refresh cycle.
