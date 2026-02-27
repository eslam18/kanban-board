# DESIGN.md — Kanban Board Mobile Layout Revamp
APPROVAL: APPROVED

## Goal
Make the existing Kanban board mobile-first usable on iPhone-sized screens (390×844) while preserving the current v3 desktop layout, dark theme, and test suite.

## Non-Goals
- Migrating the app to Next.js or changing the overall architecture.
- Changing DB schema, data migrations, or altering persisted data shapes.
- Major desktop UI redesign beyond non-breaking layout safeguards.

## Constraints
- No DB schema changes.
- No breaking desktop layout (desktop must remain visually consistent with v3).
- Keep dark theme.
- Keep all existing tests passing (and extend coverage where appropriate).

## Tech Stack
- Frontend: React + Vite, TypeScript, Tailwind CSS (dark theme)
- Backend: Express (Node.js), SQLite
- Tests: Vitest (and existing frontend testing stack in-repo, if present)
- Optional for QA automation (only if acceptable to add): Playwright for mobile screenshot smoke

## Data Model
No changes. Existing SQLite schema and entities remain as-is (projects/boards, columns, cards, activity log, etc.). Any new server endpoints must be read-only or derived from existing data.

## API Surface
No breaking changes to existing endpoints.

Additive (recommended to enable deterministic smoke tests):
- GET `/api/health` → `{ ok: true }` (no auth; safe for local/CI)
- If an activity log endpoint already exists, keep as-is; otherwise avoid introducing new data contracts and keep activity log UI driven by existing API(s).

## File Structure
Expected/targeted areas (adjust to actual repo layout during Step 1 discovery):
- Frontend shell/layout
  - `src/components/AppShell.tsx` (or similar): header + sidebar + content region orchestration
  - `src/components/Sidebar.tsx`: desktop sidebar + mobile drawer variant
  - `src/components/MobileHeader.tsx`: compact mobile header (project name/status/actions)
- Board layout
  - `src/components/Board/BoardView.tsx`: column container responsive behavior
  - `src/components/Board/Column.tsx`: column sizing and header
  - `src/components/Board/Card.tsx`: card overflow/wrapping rules
- Activity log UI
  - `src/components/ActivityLog/ActivityLogPanel.tsx`: desktop panel + mobile sheet/overlay
- Backend (optional additive endpoint)
  - `server/src/routes/health.ts` or `server/src/index.ts` (Express route registration)

## Responsive / Mobile Layout
### Breakpoint assumptions
- Mobile: `< 640px` (Tailwind `sm`), with primary target 390×844.
- Tablet: `640–1023px` (Tailwind `sm` to `<lg`) treated as “mobile behaviors allowed” where it improves usability.
- Desktop: `≥ 1024px` (Tailwind `lg`) must match current v3.

### Navigation behavior on small screens
- Sidebar becomes a drawer on `<lg` (or at least on `<sm` if repo already uses `md/lg` patterns).
- Mobile header is visible on small screens and contains:
  - Hamburger button (opens drawer)
  - Project name + status (compact)
  - Activity log button (opens bottom sheet / full-screen overlay)
- Drawer requirements:
  - Backdrop shown when open; tapping backdrop closes
  - Close button inside drawer closes
  - ESC closes (keyboard)
  - Body scroll locked while drawer is open

### Layout rules to avoid overlap/clipping
- Never render sidebar inline next to board on mobile; drawer must be `position: fixed` and layered above content.
- Content region must be `min-w-0` to allow flex children to shrink without overflow.
- Board container on mobile must handle horizontal navigation without clipping:
  - Use `overflow-x-auto` with scroll snapping OR tabs (this plan uses scroll snapping).
- Cards must enforce safe wrapping:
  - No uncontrolled overflow; long text uses wrap/ellipsis rules.
  - Badges/pills wrap within card width (or truncate with max-width) without pushing layout wider.

## Step Plan
### Step 1: Repo discovery + baseline snapshots
Deliverables
- Document actual frontend/backend entrypoints, routing, and existing layout component(s).
- Identify current breakpoints and the components responsible for sidebar, board, and activity log.
- Capture baseline screenshots (desktop + mobile viewport) for comparison.

Acceptance criteria
- Clear map of the files to change and how to run tests/build locally in CI-friendly ways.
- Baseline mobile viewport demonstrates current overlap/clipping issue for verification.

### Step 2: Introduce an AppShell layout contract
Deliverables
- A single “shell” component that owns responsive orchestration: header, sidebar/drawer, main content.
- Ensure main content region has `min-w-0` and safe overflow defaults.

Acceptance criteria
- Desktop layout remains unchanged.
- Mobile does not render sidebar inline beside the board (no overlap by structure, not just z-index hacks).

### Step 3: Implement mobile header (P1)
Deliverables
- Mobile header shown on mobile breakpoints containing:
  - Hamburger (≥ 44px touch target)
  - Project name + status (compact, readable)
  - Activity log button (≥ 44px)

Acceptance criteria
- On 390×844, header fits without clipping; buttons are comfortably tappable.
- Desktop header/layout remains unchanged (or header is hidden on desktop if not needed).

### Step 4: Sidebar → Drawer with backdrop + dismiss (P0)
Deliverables
- Drawer component behavior:
  - Open/close state (hamburger toggles)
  - Backdrop click closes
  - Close button closes
  - ESC closes
  - Body scroll lock while open
- Drawer uses fixed positioning and transform transitions (dark theme consistent).

Acceptance criteria
- On 390×844, drawer never overlaps content in a way that blocks closing; backdrop always clickable.
- No content behind the drawer scrolls while open.
- Desktop sidebar remains in its current position and styling.

### Step 5: Mobile board layout with horizontal scroll + snap (P0)
Deliverables
- Board columns on mobile become horizontally scrollable with snap:
  - One column per “page” (column width ≈ viewport width minus padding)
  - Snap points aligned to each column
- Add a compact column switcher affordance on mobile:
  - Either a tab strip that scrolls to the column, or visible column headers that indicate position.

Acceptance criteria
- On 390×844, each column is readable without zooming; user can switch columns reliably.
- No horizontal overflow caused by cards/badges; the scroll area is intentional and smooth.
- Desktop continues showing multiple columns as in v3.

### Step 6: Card overflow and badge wrapping rules (P0)
Deliverables
- Update card layout to prevent overflow:
  - Long titles/descriptions wrap or truncate predictably.
  - Pills/badges wrap to new lines or truncate with max width.
  - Ensure internal flex rows use `min-w-0` where necessary.

Acceptance criteria
- On 390×844, no text overlaps other UI; no card content renders outside card boundaries.
- Touch targets inside cards remain ≥ 44px where interactive.

### Step 7: Activity log mobile experience (P0)
Deliverables
- Activity log becomes:
  - Bottom sheet on mobile (preferred), or full-screen overlay if simpler with existing layout
- Includes backdrop + dismiss behaviors consistent with drawer.
- Preserves desktop activity log behavior.

Acceptance criteria
- On 390×844, activity log is readable and scrollable without overlapping critical navigation.
- Can be opened from mobile header and dismissed via backdrop/close/ESC.

### Step 8: Tests, QA hooks, and regression safeguards
Deliverables
- Update/extend Vitest tests for:
  - Drawer open/close behavior (state + dismiss paths)
  - Mobile board layout mode selection logic (if conditional)
- Add `/api/health` endpoint for deterministic smoke testing (optional but recommended).
- Add a minimal mobile screenshot smoke (manual steps required; Playwright optional).

Acceptance criteria
- All existing tests pass.
- New tests pass and cover critical mobile behaviors.
- Desktop layout regressions are not introduced (validated via targeted snapshot/DOM tests and manual checks).

## Smoke Test
### Build + unit tests
- Install deps: `pnpm install` (or `npm install` / `yarn` depending on repo)
- Run tests: `pnpm test`
- Build frontend: `pnpm build`

### API smoke (recommended with additive health endpoint)
- Start backend (CI/local): `pnpm --filter server start` (or repo-specific start command)
- Verify health: `curl -sS http://localhost:3000/api/health`

### UI smoke (non-interactive where possible)
- Serve built frontend in preview mode: `pnpm preview --host 127.0.0.1 --port 4173`
- Verify page loads: `curl -I http://127.0.0.1:4173`

### Mobile Smoke Test (manual)
On a 390×844 viewport (Chrome DevTools device emulation is acceptable):
- Verify hamburger opens drawer; backdrop tap closes; close button closes; ESC closes.
- Verify sidebar is not inline next to board (no overlap/clipping).
- Verify board columns are readable; swipe/scroll switches columns; snap feels correct.
- Verify cards: long text does not overflow; badges/pills wrap or truncate cleanly.
- Verify activity log opens as bottom sheet/full-screen overlay; is scrollable; dismiss works.

### Mobile Smoke Test (Playwright, optional)
- Run: `pnpm playwright test --project=chromium`
- Validate: one test captures a 390×844 screenshot with drawer open and one with activity log open (artifact comparison in CI).

## Environment Variables (.env.local.example)
Frontend (if applicable):
- `VITE_API_BASE_URL` (e.g., `http://localhost:3000`)

Backend:
- `PORT` (e.g., `3000`)
- `SQLITE_DB_PATH` (path to existing SQLite file; must match current repo expectations)
- `NODE_ENV` (`development` | `test` | `production`)

Optional (only if already present in repo):
- `LOG_LEVEL`
- `CORS_ORIGIN`

---
