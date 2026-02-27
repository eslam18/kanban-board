# BRIEF — Kanban Board Mobile Layout Revamp

## Context
We have an existing Kanban board web app (React + Vite + Express + SQLite + Tailwind dark theme) used to track builds.
Desktop layout is good after v3 UI revamp, but **mobile layout is unusable** (sidebar overlaps board, columns/cards unreadable).

## Goal
Make the Kanban board **mobile-first usable** on iPhone-sized screens (e.g., 390×844) while preserving the desktop experience.

## Requirements (P0)
1. **No overlap/clipping on mobile**: sidebar must not render inline next to the board.
2. **Mobile navigation**
   - Sidebar becomes a **drawer** (hamburger button opens/closes)
   - Drawer has backdrop + can be dismissed (tap backdrop / close button)
3. **Board on mobile**
   - Columns must be readable on mobile.
   - Acceptable solutions:
     - horizontal scroll with snap (one column per “page”), OR
     - tabbed columns (Backlog/In Progress/Review/Done)
   - Either way, user must easily switch columns.
4. **Cards**
   - Card content must not overflow/overlap.
   - Badges/pills must wrap/ellipsis cleanly.
5. **Activity log**
   - Works on mobile (bottom sheet or full-screen overlay).

## Requirements (P1)
- Add a compact **mobile header** (project name + status + activity log button).
- Improve touch targets (buttons >= 44px height).

## Constraints
- No DB schema changes.
- No breaking desktop layout.
- Keep dark theme.
- Keep all existing tests passing.

## Definition of Done
- Desktop still looks like v3.
- Mobile view (390×844) is usable: drawer sidebar + readable board + readable cards.
- QA includes mobile smoke test steps (manual or Playwright screenshot).
