# DESIGN.md — Kanban Board

## Goal
A self-hosted Kanban board for tracking Jarvis build projects. Serves as the live dashboard during autonomous builds — Jarvis updates it programmatically, Eslam views it in the browser.

## Non-Goals
- No user auth (single-user, local + tunnel access)
- No team/collaboration features
- No drag-and-drop (nice-to-have later, not MVP)

## Tech Stack
- **Frontend:** React + Vite (fast, simple)
- **Backend:** Express.js (REST API)
- **Database:** SQLite via better-sqlite3 (zero config, file-based, survives restarts)
- **Styling:** Tailwind CSS (dark theme matching status page aesthetic)

## Data Model

### Board
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | Auto-increment |
| name | TEXT | e.g. "Kanban Board Build" |
| created_at | DATETIME | |

### Column
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | |
| board_id | INTEGER FK | |
| name | TEXT | e.g. "Backlog", "In Progress", "Review", "Done" |
| position | INTEGER | Sort order |

### Card
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | |
| column_id | INTEGER FK | |
| title | TEXT | Step name |
| description | TEXT | Details, acceptance criteria |
| status | TEXT | pending / building / reviewing / retrying / done / failed |
| position | INTEGER | Sort order within column |
| retries | INTEGER | Default 0 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### ActivityLog
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | |
| card_id | INTEGER FK | Nullable (board-level events) |
| board_id | INTEGER FK | |
| message | TEXT | What happened |
| type | TEXT | info / success / warning / error |
| created_at | DATETIME | |

## API Surface

```
GET    /api/boards                  → list boards
POST   /api/boards                  → create board
GET    /api/boards/:id              → board with columns + cards
POST   /api/boards/:id/columns      → add column
POST   /api/boards/:id/cards        → add card
PATCH  /api/cards/:id               → update card (move, status change, etc.)
DELETE /api/cards/:id               → remove card
GET    /api/boards/:id/log          → activity log
POST   /api/boards/:id/log          → add log entry
```

## File Structure

```
kanban-board/
├── DESIGN.md
├── tasks.md
├── package.json
├── README.md
├── src/
│   ├── server/
│   │   ├── index.js          # Express app entry
│   │   ├── db.js             # SQLite setup + migrations
│   │   ├── routes/
│   │   │   ├── boards.js
│   │   │   ├── cards.js
│   │   │   └── log.js
│   │   └── seed.js           # Default board with 4 columns
│   └── client/
│       ├── index.html
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/
│       │   ├── Board.jsx      # Main board view
│       │   ├── Column.jsx     # Single column
│       │   ├── Card.jsx       # Single card
│       │   └── ActivityLog.jsx
│       └── styles/
│           └── index.css      # Tailwind imports
├── vite.config.js
├── tailwind.config.js
└── tests/
    ├── api.test.js            # API endpoint tests
    └── db.test.js             # DB layer tests
```

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  📋 Board Name                          [Activity ▼] │
├────────────┬────────────┬────────────┬──────────────┤
│  Backlog   │ In Progress│  Review    │    Done      │
│            │            │            │              │
│ ┌────────┐ │ ┌────────┐ │            │ ┌────────┐   │
│ │ Card 3 │ │ │ Card 2 │ │            │ │ Card 1 │   │
│ │ pending│ │ │building│ │            │ │  done  │   │
│ └────────┘ │ └────────┘ │            │ └────────┘   │
│            │            │            │              │
└────────────┴────────────┴────────────┴──────────────┘
```

Dark theme. Cards show status badge + retry count if > 0. Activity log slides in from the right.

## Step Plan

### Step 1: Project Setup + Database Layer
- Init Node project, install deps (express, better-sqlite3, cors)
- Build `db.js` with schema creation + CRUD functions
- Build `seed.js` for default board
- Tests: `db.test.js` — create board, add columns, add/move/update cards

### Step 2: REST API
- Express server with all routes from API surface above
- Wire routes to DB layer
- Tests: `api.test.js` — hit every endpoint, verify responses

### Step 3: Frontend Shell + Board View
- Vite + React + Tailwind setup
- `Board.jsx`, `Column.jsx`, `Card.jsx` components
- Fetch board data from API, render columns and cards
- Proxy API requests in dev via Vite config

### Step 4: Activity Log + Polish
- `ActivityLog.jsx` — slide-in panel showing recent activity
- Auto-log card moves and status changes on the backend
- Add card status badges (color-coded)
- Production build: Express serves Vite's built assets
- README with install + run instructions

## Risks
- SQLite concurrent writes: not an issue for single-user
- No auth: acceptable for local + tunnel access
