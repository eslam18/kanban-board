import { Router } from 'express';

function parsePositiveInt(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }
  return n;
}

export function createLogRouter(dbApi) {
  const router = Router();

  router.get('/boards/:boardId/log', (req, res) => {
    const boardId = parsePositiveInt(req.params.boardId);
    if (!boardId) {
      res.status(400).json({ error: 'invalid board id' });
      return;
    }

    const board = dbApi.getBoard(boardId);
    if (!board) {
      res.status(404).json({ error: 'board not found' });
      return;
    }

    const log = dbApi.getLog(boardId);
    res.json(log);
  });

  router.post('/boards/:boardId/log', (req, res) => {
    const boardId = parsePositiveInt(req.params.boardId);
    if (!boardId) {
      res.status(400).json({ error: 'invalid board id' });
      return;
    }

    const board = dbApi.getBoard(boardId);
    if (!board) {
      res.status(404).json({ error: 'board not found' });
      return;
    }

    const { message, type = 'info', cardId } = req.body ?? {};

    if (!message || typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const entry = dbApi.addLogEntry({
      board_id: boardId,
      card_id: cardId ?? null,
      message: message.trim(),
      type,
    });

    res.status(201).json(entry);
  });

  return router;
}
