# ADR 005: Pomodoro Timer is Client-Side Only

**Status:** Accepted

## Context

The Pomodoro feature needs to track work/break sessions, daily completed-session counts, and user preferences (durations, auto-start behavior, ambient sound type and volume). These are needed to render the timer UI and persist settings across page reloads.

## Decision

All Pomodoro state is managed client-side: a Zustand store (`apps/web/src/store/pomodoro.ts`) with the `persist` middleware writing to `localStorage` under the key `zenfocus-pomodoro`. No API endpoints, no Prisma model, no database table.

The countdown is driven by a single `usePomodoroTimer` hook (`apps/web/src/hooks/usePomodoroTimer.ts`) that calls `_tick()` via `setInterval` while status is `running`. Browser notifications fire on phase transitions via `notifySessionComplete`.

Only settings, daily count, and daily count date are persisted; runtime state (status, phase, secondsLeft, sessionsDoneThisSet) resets on page load.

## Rationale

- Timer state is ephemeral and device-local by design; cross-device sync is not a goal for this phase.
- Reduces backend complexity — no new Prisma model, no migration, no REST endpoints.
- `localStorage` is sufficient for single-user preferences and daily session counts.
- Aligns with the existing frontend pattern: Zustand for ephemeral client-only state, server state through React Query/SWR.

## Consequences

- Session history does not persist across browsers or devices.
- No server-side record of focus sessions exists yet; this feeds into the Phase 3 analytics decision (see ADR 004).
- If cross-device sync is ever needed, a `focus_sessions` table can be added in Phase 3 alongside the analytics work.
