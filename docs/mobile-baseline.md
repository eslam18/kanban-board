# Mobile Baseline (Step 1/8: Repo discovery + baseline snapshots)
Generated: 2026-02-27T18:01:56Z

## Entrypoints
- Client entry: src/client/main.jsx
- App shell: src/client/App.jsx
- Server entry: src/server/index.js

## Key layout owners (current)
- Sidebar: src/client/components/Sidebar.jsx
- Board: src/client/components/Board.jsx
- Column: src/client/components/Column.jsx
- Card: src/client/components/Card.jsx
- Activity log: src/client/components/ActivityLog.jsx
- Logs panel: src/client/components/LogsPanel.jsx
- Docs panel: src/client/components/DocsPanel.jsx

## Breakpoints / responsive usage
Search results for Tailwind responsive prefixes (sm:/md:/lg:):


## Mobile failure evidence (390px) — why it breaks
- App currently renders sidebar + main content in the same row with fixed sidebar width; on mobile this causes overlap / unreadable columns.
- Board columns are rendered in a flex row without horizontal scroll/snap on small screens, so columns get squished and headers/cards overlap.
- Cards contain pills/badges without explicit wrap/truncation rules for narrow widths.

## Commands (CI-friendly)
### Install
npm install

### Tests
npm test

### Build (Vite)
npx vite build

### Run (production server)
NODE_ENV=production node src/server/index.js

## Notes
- Screenshots are optional; they can be added later in QA.
