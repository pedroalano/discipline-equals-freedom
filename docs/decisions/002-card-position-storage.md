# ADR 002: Card Position Storage

**Status:** Accepted
**Date:** 2026-03-24

## Context

Cards within a list and lists within a board need an ordered position that supports drag-and-drop reordering without rewriting every sibling's position.

## Decision

Use **fractional indexing** with a `Float` (`DOUBLE PRECISION`) column named `position` on both `List` and `Card` models.

- **Append:** `position = lastPosition + 1.0`
- **Insert between a and b:** `position = (a + b) / 2`
- **First item:** `position = 1.0`
- **Rebalance trigger:** when `b - a < 1e-9`, reassign integer positions (`1, 2, 3, …`) to all items in the list

## Rationale

- The schema already encodes this choice (`position DOUBLE PRECISION`) — no migration needed.
- Simple midpoint math requires no external library.
- Only the moved card's row is updated on a typical drag; siblings are untouched.
- Rebalancing is a rare edge case (needs ~50 repeated inserts at the same gap to trigger) and can be deferred.

## Consequences

- Position values gradually lose precision after many repeated inserts at the same gap; rebalancing fixes this.
- Queries must `ORDER BY position ASC` (not `createdAt`) for list/card ordering.
