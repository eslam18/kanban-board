# DESIGN-v3.md — Kanban Board: UI/UX Revamp

## Goal
Fix broken Tailwind setup and revamp all components to have a clean, modern dark-theme UI.

## Non-Goals
- No new features. Same functionality, better UI.
- No drag-and-drop yet.

## Tech Stack
Same: React + Vite + Express + SQLite + Tailwind CSS v4 (via @tailwindcss/vite plugin)

## Root Cause
Tailwind v4 uses `@import "tailwindcss"` not `@tailwind base/components/utilities`. The CSS file has v3 syntax so no utility classes are applied. Also `tailwind.config.js` is v3 format — Tailwind v4 uses CSS-based config.

## Run Instructions
### Development
Terminal 1: `node src/server/index.js`
Terminal 2: `npx vite --config vite.config.js`

### Production
```bash
npx vite build && NODE_ENV=production node src/server/index.js
```

### Verification
- Root URL: `http://localhost:3000/`
- Expected: Dark themed kanban board with:
  - Left sidebar (260px) with project list, each project has colored status dot
  - Project header with name, description, status dropdown
  - 4 columns (Backlog, In Progress, Review, Done) evenly spaced across the board
  - Cards with rounded corners, subtle border, status pill badge
  - Create Project modal centered with backdrop blur
  - Activity log slide-in panel from right
- Key visual checks:
  - Tailwind classes actually apply (rounded corners, shadows, spacing visible)
  - Columns stretch to fill available width equally
  - No dashed borders, no unstyled raw HTML

## Step Plan

### Step 1: Fix Tailwind v4 Setup + Revamp Core Layout
- **Deliverables:**
  1. Replace `src/client/styles/index.css` content with Tailwind v4 syntax: `@import "tailwindcss";` plus custom dark theme variables
  2. Delete `tailwind.config.js` (not needed for Tailwind v4 with vite plugin)
  3. Update `App.jsx` layout: proper flexbox with sidebar (w-64 fixed) + main area (flex-1, overflow-auto)
  4. Revamp `Sidebar.jsx`: dark bg-gray-950, proper padding, project items with hover states, status dots (green/blue/gray), "New Project" button styled as ghost button
  5. Revamp `CreateProjectModal.jsx`: centered modal with backdrop blur/dim, proper input styling, rounded buttons
- **Acceptance criteria:** Tailwind classes apply. Sidebar looks clean. Modal is centered and styled. Layout doesn't break.
- **Tests:** All 19 existing tests pass. `npx vite build` succeeds.

### Step 2: Revamp Board + Cards + Activity Log
- **Deliverables:**
  1. Revamp `ProjectHeader.jsx`: clean typography, status dropdown styled, subtle bottom border
  2. Revamp `Board.jsx`: columns in flex row, each column flex-1 with equal width, gap-4 between columns
  3. Revamp `Column.jsx`: rounded-lg container, bg-gray-800/50, column header with card count badge, proper padding
  4. Revamp `Card.jsx`: bg-gray-800, rounded-lg, border border-gray-700, hover:border-gray-600, status pill (colored bg + white text, small rounded), retry count badge if > 0, proper spacing
  5. Revamp `ActivityLog.jsx`: slide-in from right with backdrop, proper width (400px), entries with timestamp + colored type indicator, close button
- **Acceptance criteria:** Board columns fill available space equally. Cards look polished. Activity log slides in cleanly. Everything dark themed.
- **Tests:** All 19 existing tests pass. `npx vite build` succeeds.
