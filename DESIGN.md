# DESIGN.md — Qanat: Kanban Board Auth & Multi-Tenancy
APPROVAL: APPROVED

## Product Tier
Small

## Goal
Add authentication, role-based access control, user invites, and admin management to the existing Kanban board. Users log in, see only their boards, and admins manage users/invites.

## Non-Goals
- OAuth/SSO (email+password only for now)
- Per-board permissions (all boards visible to all org members)
- Public/shared boards
- Password reset via email (admin resets for now)

## Constraints
- Must not break existing board functionality (columns, cards, drag-drop, activity log, mobile layout)
- SQLite remains the database
- No external auth services — self-contained JWT auth
- Existing API endpoints gain auth middleware but keep their contracts

## Assumptions
- Single-tenant deployment (one org per instance)
- Admin seeds on first run; all other users arrive via invite
- JWT tokens stored in localStorage (acceptable for internal tool)

## Tech Stack
- Frontend: React + Vite, TypeScript, Tailwind CSS (dark theme)
- Backend: Express (Node.js), SQLite, bcrypt, jsonwebtoken
- Tests: Vitest

## Scope Cutline
### MUST
- Login/logout with email+password
- JWT auth middleware on all existing endpoints
- Admin can invite users via email token
- Invited users can register (set password)
- Change password (self-service)
- Admin user management (list, change role, disable)
- Seed default admin on fresh DB

### SHOULD
- Remember me / token refresh
- Invite expiry enforcement

### LATER
- OAuth/SSO providers
- Password reset via email
- Per-board access control
- Audit log for auth events

## Feature Checklist
- [x] Database schema (users, invites, sessions tables)
- [x] Auth middleware (JWT verify + role check)
- [x] Login API + UI
- [x] Register via invite API + UI
- [x] Change password API + UI
- [x] Admin user management API + UI
- [x] Admin invite management API + UI
- [x] Default admin seed

## User Flows
### Login
1. User navigates to app → sees login page
2. Enters email + password → POST /api/auth/login
3. Gets JWT → stored in localStorage → redirected to board

### Invite + Register
1. Admin creates invite (email + role) → POST /api/invites
2. System generates token/link
3. Invited user opens link → register page
4. Sets password + display name → POST /api/auth/register
5. Account created → redirected to login

### Change Password
1. User clicks profile/settings → change password modal
2. Enters old + new password → POST /api/auth/change-password
3. Success feedback → stays logged in

### Admin User Management
1. Admin clicks "Users" in sidebar → user management page
2. Sees user table (email, role, status, joined)
3. Can change role (admin/member), disable/enable users
4. Can create new invites

## Responsive / Mobile Layout
- Login page: centered card, works on mobile naturally
- Register page: same as login
- Admin users page: responsive table (stacks on mobile)
- Change password modal: standard modal, mobile-friendly
- All new UI follows existing dark theme + Tailwind patterns
- No changes to existing board mobile layout

## UI / UX Quality Bar
- Login/register forms follow existing dark theme styling
- Error messages inline below fields
- Loading states on auth actions
- Toast/notification on success (change password, invite created)
- Admin pages accessible only to admin role (hidden from members)
- All interactive elements ≥ 44px touch targets on mobile

## Data Model

### New Tables
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin','member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','invited','disabled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  invited_by INTEGER REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member',
  expires_at DATETIME NOT NULL,
  accepted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Surface

### New Endpoints
- `POST /api/auth/login` — email+password → JWT token
- `POST /api/auth/register` — accept invite token + set password
- `POST /api/auth/change-password` — authenticated, old+new password
- `GET /api/users` — admin only, list users
- `PATCH /api/users/:id` — admin only, update role/status
- `DELETE /api/users/:id` — admin only, disable user
- `POST /api/invites` — admin only, create invite
- `GET /api/invites` — admin only, list pending invites
- `DELETE /api/invites/:id` — admin only, revoke invite
- `GET /api/auth/me` — get current user profile

### Modified Endpoints
All existing `/api/*` endpoints get auth middleware (JWT in Authorization header). Returns 401 if missing/invalid.

## Roles
- **admin**: full access + user management + invites
- **member**: CRUD on boards/cards/projects, no user management

## Step Plan

### Step 1: Database Schema & Auth Utilities
Deliverables:
- Add users, invites, sessions tables to db.js migration
- Add bcrypt password hashing utility
- Add JWT sign/verify utility
- Seed a default admin user (admin@qanat.local / changeme)

Acceptance criteria:
- Tables created on app start
- `npm run build` passes
- Default admin seeded when DB is fresh

### Step 2: Auth Middleware & Login API
Deliverables:
- JWT auth middleware that extracts user from Authorization header
- Role-check middleware (requireRole('admin'))
- POST /api/auth/login endpoint
- GET /api/auth/me endpoint
- Apply auth middleware to all existing routes

Acceptance criteria:
- Unauthenticated requests to /api/boards return 401
- Login with admin@qanat.local returns valid JWT
- /api/auth/me returns user profile
- /api/health remains public (no auth required)

### Step 3: Invite System API
Deliverables:
- POST /api/invites — admin creates invite (generates token, stores in DB)
- GET /api/invites — admin lists pending invites
- DELETE /api/invites/:id — admin revokes invite
- POST /api/auth/register — accept invite token + set email/password/name

Acceptance criteria:
- Admin can create invite, gets back token/link
- Non-admin gets 403 on invite endpoints
- Register with valid token creates user, marks invite accepted
- Register with expired/used token returns 400

### Step 4: Change Password Flow
Deliverables:
- POST /api/auth/change-password (requires old password + new password)
- ChangePasswordModal.tsx component
- Wire into user menu/settings area

Acceptance criteria:
- Authenticated user can change password
- Wrong old password returns 400
- After change, old JWT still works (session not invalidated)
- UI shows success/error feedback

### Step 5: Login UI & Auth Context
Deliverables:
- AuthContext.tsx — stores JWT, user info, login/logout functions
- LoginPage.tsx — email + password form, error handling
- RegisterPage.tsx — invite acceptance form
- ProtectedRoute.tsx — redirects to login if not authenticated
- Wrap existing app routes in ProtectedRoute
- Add logout button to sidebar/header

Acceptance criteria:
- Unauthenticated users see login page
- After login, redirected to board
- After logout, redirected to login
- Register page accessible via invite link
- Mobile layout still works correctly

### Step 6: Admin User Management UI
Deliverables:
- AdminUsersPage.tsx — table of users with role/status
- Ability to change user role (admin/member)
- Ability to disable/enable users
- Invite creation form (email + role)
- Link to admin page in sidebar (admin only)
- Seed script updates: ensure admin user exists on fresh DB

Acceptance criteria:
- Admin sees user management in sidebar
- Members don't see admin link
- Admin can invite, change roles, disable users
- All actions reflected immediately in UI
- Existing board/card/project functionality unbroken

## Smoke Test

### Build + unit tests
- `npm install`
- `npm run build`
- `npx vitest run`

### API smoke
- Start: `node src/server/index.js`
- Health (public): `curl -s http://localhost:3000/api/health`
- Login: `curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@qanat.local","password":"changeme"}'`
- Authenticated: `curl -s http://localhost:3000/api/boards -H 'Authorization: Bearer <token>'`
- Unauthenticated: `curl -s http://localhost:3000/api/boards` → 401

## Environment Variables (.env.local.example)
- `PORT=3000`
- `JWT_SECRET=<random-secret>`
- `ADMIN_EMAIL=admin@qanat.local`
- `ADMIN_PASSWORD=changeme`
