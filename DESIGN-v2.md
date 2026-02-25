# DESIGN-v2.md — Kanban Board: Multi-Project Support

## Goal
Add a project layer to the kanban board so each build project gets its own board, with a sidebar to switch between projects.

## Non-Goals
- No drag-and-drop (future enhancement)
- No user auth
- No real-time sync (polling or manual refresh is fine)

## Tech Stack
Same as existing: React + Vite + Express + SQLite + Tailwind (dark theme). This is an enhancement, not a rebuild.

## Data Model Changes

### New table: projects
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | Auto-increment |
| name | TEXT | e.g. "Kanban Board Build" |
| description | TEXT | One-line summary |
| status | TEXT | active / completed / archived |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### Modified table: boards
| Field | Type | Notes |
|-------|------|-------|
| project_id | INTEGER FK | Links board to a project. Nullable for backward compat. |

Each project gets one board (auto-created). Future: multiple boards per project.

## API Surface

### New endpoints:
```
GET    /api/projects              → list all projects (with board id)
POST   /api/projects              → create project (auto-creates board with 4 default columns)
PATCH  /api/projects/:id          → update project (name, description, status)
DELETE /api/projects/:id          → delete project + cascade board
GET    /api/projects/:id          → get project with board details
```

### Existing endpoints (unchanged):
All `/api/boards/*` and `/api/cards/*` endpoints remain the same.

## File Structure (changes only)

```
src/
├── server/
│   ├── db.js                    # Add projects table + CRUD
│   ├── routes/
│   │   └── projects.js          # NEW: project routes
│   └── seed.js                  # Seed creates a default project + board
├── client/
│   ├── App.jsx                  # Add sidebar, project switching
│   ├── components/
│   │   ├── Sidebar.jsx          # NEW: project list sidebar
│   │   ├── ProjectHeader.jsx    # NEW: project name + status + description
│   │   └── CreateProjectModal.jsx # NEW: create project form
```

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
- Expected response: HTML page with a sidebar showing projects on the left, board on the right
- Key API endpoints to verify:
  - GET /api/projects → returns array of projects
  - POST /api/projects with `{"name":"Test"}` → creates project with board
  - GET /api/projects/1 → returns project with nested board data

## Step Plan

### Step 1: Database + API for Projects
- **Deliverables:**
  1. Add `projects` table to db.js schema (with migration: add `project_id` column to boards)
  2. Add CRUD functions: createProject, getProject, listProjects, updateProject, deleteProject
  3. Update seed.js: create a default project, link the default board to it
  4. Create src/server/routes/projects.js with all endpoints
  5. Mount routes in index.js
- **Acceptance criteria:** All project CRUD endpoints work, existing board/card endpoints still work
- **Tests:** Add tests for all project endpoints + verify existing tests still pass

### Step 2: Sidebar + Project Switching UI
- **Deliverables:**
  1. Create Sidebar.jsx — list of projects with name + status badge, click to switch
  2. Create CreateProjectModal.jsx — form with name + description, calls POST /api/projects
  3. Update App.jsx — add sidebar on the left, board on the right, track selected project
  4. Create ProjectHeader.jsx — shows project name, description, status above the board
  5. Update layout: sidebar (fixed 250px) + main content area
- **Acceptance criteria:** Can see all projects in sidebar, click to switch boards, create new projects
- **Tests:** Frontend builds without errors, all existing tests pass

### Step 3: Polish + Integration
- **Deliverables:**
  1. Add project status badges in sidebar (active=green, completed=blue, archived=gray)
  2. Add ability to update project status from ProjectHeader
  3. Migrate existing "Default Board" to be under a "Default Project"
  4. Update README.md with new features
  5. Production build: ensure Express serves built assets correctly
- **Acceptance criteria:** Full flow works: create project → see board → add cards → switch projects. Production build serves correctly.
- **Tests:** All tests pass, production build succeeds, smoke test passes
