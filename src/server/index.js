import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { createDatabase } from './db.js';
import { seedDefaultBoard } from './seed.js';
import { createBoardsRouter } from './routes/boards.js';
import { createCardsRouter } from './routes/cards.js';
import { createLogRouter } from './routes/log.js';
import { createProjectsRouter } from './routes/projects.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureSeeded(dbApi) {
  const row = dbApi.db.prepare('SELECT COUNT(*) AS count FROM projects').get();
  if (row.count === 0) {
    seedDefaultBoard();
  }
}

export function createApp(dbApi = createDatabase()) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api', createProjectsRouter(dbApi));
  app.use('/api', createBoardsRouter(dbApi));
  app.use('/api', createCardsRouter(dbApi));
  app.use('/api', createLogRouter(dbApi));

  if (process.env.NODE_ENV === 'production') {
    const clientDistPath = path.join(__dirname, '../../dist');
    app.use(express.static(clientDistPath));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
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
