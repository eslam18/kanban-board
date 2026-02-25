import { Router } from 'express';

export function createBoardsRouter(dbApi) {
  const router = Router();

  router.get('/boards', (_req, res) => {
    const boards = dbApi.db
      .prepare('SELECT id, name, created_at FROM boards ORDER BY created_at ASC, id ASC')
      .all();
    res.json(boards);
  });

  router.post('/boards', (req, res) => {
    const { name } = req.body ?? {};
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const board = dbApi.createBoard(name.trim());
    res.status(201).json(board);
  });

  router.get('/boards/:id', (req, res) => {
    const boardId = Number(req.params.id);
    if (!Number.isInteger(boardId) || boardId <= 0) {
      res.status(400).json({ error: 'invalid board id' });
      return;
    }

    const board = dbApi.getBoardWithDetails(boardId);
    if (!board) {
      res.status(404).json({ error: 'board not found' });
      return;
    }

    res.json(board);
  });

  return router;
}
