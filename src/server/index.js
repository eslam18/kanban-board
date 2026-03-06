import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { createDatabase } from './db.js';
import { seedDefaultAdmin, seedDefaultBoard } from './seed.js';
import { createBoardsRouter } from './routes/boards.js';
import { createCardsRouter } from './routes/cards.js';
import { createLogRouter } from './routes/log.js';
import { createProjectsRouter } from './routes/projects.js';
import { createLogsRouter } from './routes/logs.js';
import { createDocsRouter } from './routes/docs.js';
import { createHealthRouter } from './routes/health.js';
import { createAuthRouter } from './routes/auth.js';
import { createInvitesRouter } from './routes/invites.js';
import { createAuthMiddleware } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureSeeded(dbApi) {
  seedDefaultAdmin(dbApi);

  const row = dbApi.db.prepare('SELECT COUNT(*) AS count FROM projects').get();
  if (row.count === 0) {
    seedDefaultBoard(dbApi);
  }
}

export function createApp(dbApi = createDatabase()) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api', createHealthRouter());
  app.use('/api', createAuthRouter(dbApi));
  app.use('/api', createAuthMiddleware(dbApi));
  app.use('/api', createInvitesRouter(dbApi));

  app.use('/api', createProjectsRouter(dbApi));
  app.use('/api', createBoardsRouter(dbApi));
  app.use('/api', createCardsRouter(dbApi));
  app.use('/api', createLogRouter(dbApi));
  app.use('/api', createLogsRouter(dbApi));
  app.use('/api', createDocsRouter(dbApi));

  // Serve the built SPA if present (works in both dev + prod)
  const clientDistPath = path.join(__dirname, '../../dist');
  try {
    // If dist/index.html exists, serve it.
    // This prevents "Cannot GET /" when running the server directly.
    if (fs.existsSync(path.join(clientDistPath, 'index.html'))) {
      app.use(express.static(clientDistPath));
      app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(clientDistPath, 'index.html'));
      });
    }
  } catch {
    // ignore
  }

  return { app, dbApi };
}

export function startServer() {
  const dbApi = createDatabase(process.env.DB_PATH);
  ensureSeeded(dbApi);

  const { app } = createApp(dbApi);
  const port = Number(process.env.PORT) || 3000;

  const server = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });

  return { server, dbApi };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
