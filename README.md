# Kanban Board

A self-hosted Kanban board app with an Express + SQLite backend and a React + Vite frontend.

## Prerequisites

- Node.js 18+

## Install

```bash
npm install
```

## Development

Run backend in one terminal:

```bash
node src/server/index.js
```

Run frontend in another terminal:

```bash
npx vite --config vite.config.js
```

## Production Build

```bash
npx vite build && node src/server/index.js
```

## API Documentation

- `GET /api/boards` — list boards
- `POST /api/boards` — create board
- `GET /api/boards/:id` — get board with columns and cards
- `POST /api/boards/:id/columns` — add column to board
- `POST /api/boards/:id/cards` — add card to board
- `PATCH /api/cards/:id` — update card (status, move column, retries, etc.)
- `DELETE /api/cards/:id` — delete card
- `GET /api/boards/:id/log` — list board activity log
- `POST /api/boards/:id/log` — add board activity log entry
