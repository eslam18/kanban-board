import { Router } from 'express';

function parsePositiveInt(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }
  return n;
}

function statusFromColumn(columnName) {
  const map = {
    backlog: 'pending',
    'in progress': 'in_progress',
    review: 'review',
    done: 'done',
  };
  return map[(columnName || '').toLowerCase()] || 'pending';
}

export function createCardsRouter(dbApi) {
  const router = Router();

  router.post('/boards/:boardId/cards', (req, res) => {
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

    const { columnId, title, description = '' } = req.body ?? {};
    const parsedColumnId = parsePositiveInt(columnId);
    if (!parsedColumnId) {
      res.status(400).json({ error: 'columnId is required' });
      return;
    }

    if (!title || typeof title !== 'string' || title.trim() === '') {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const column = dbApi.db
      .prepare('SELECT id, board_id, name, position FROM columns WHERE id = ?')
      .get(parsedColumnId);
    if (!column || column.board_id !== boardId) {
      res.status(400).json({ error: 'column does not belong to board' });
      return;
    }

    const positionRow = dbApi.db
      .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM cards WHERE column_id = ?')
      .get(parsedColumnId);

    const card = dbApi.createCard({
      column_id: parsedColumnId,
      title: title.trim(),
      description: typeof description === 'string' ? description : '',
      status: statusFromColumn(column.name),
      position: positionRow.next_position,
      retries: 0,
    });

    dbApi.addLogEntry({
      board_id: boardId,
      card_id: card.id,
      message: `Card created: "${card.title}" in ${column.name}`,
      type: 'success',
    });

    res.status(201).json(card);
  });

  router.patch('/cards/:id', (req, res) => {
    const cardId = parsePositiveInt(req.params.id);
    if (!cardId) {
      res.status(400).json({ error: 'invalid card id' });
      return;
    }

    const existing = dbApi.db
      .prepare(
        `
          SELECT c.*, col.board_id, col.name AS column_name
          FROM cards c
          JOIN columns col ON c.column_id = col.id
          WHERE c.id = ?
        `,
      )
      .get(cardId);
    if (!existing) {
      res.status(404).json({ error: 'card not found' });
      return;
    }

    const { title, description, status, columnId, position, retries } = req.body ?? {};
    const updates = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (position !== undefined) updates.position = position;
    if (retries !== undefined) updates.retries = retries;
    if (columnId !== undefined) updates.column_id = columnId;

    if (Object.keys(updates).length === 0) {
      const unchanged = dbApi.db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
      res.json(unchanged);
      return;
    }

    const previousColumnName = existing.column_name;
    let nextColumnName = existing.column_name;
    let nextColumnId = existing.column_id;
    if (updates.column_id !== undefined && updates.column_id !== existing.column_id) {
      const destination = dbApi.db
        .prepare('SELECT id, board_id, name FROM columns WHERE id = ?')
        .get(updates.column_id);

      if (!destination) {
        res.status(400).json({ error: 'column not found' });
        return;
      }

      if (destination.board_id !== existing.board_id) {
        res.status(400).json({ error: 'column does not belong to board' });
        return;
      }

      nextColumnId = destination.id;
      nextColumnName = destination.name;

      // Auto-sync status to match destination column unless explicitly overridden
      if (updates.status === undefined) {
        updates.status = statusFromColumn(destination.name);
      }
    }

    const updated = dbApi.updateCard(cardId, updates);
    if (!updated) {
      res.status(404).json({ error: 'card not found' });
      return;
    }

    const moved = nextColumnId !== existing.column_id;
    if (moved) {
      dbApi.addLogEntry({
        board_id: existing.board_id,
        card_id: updated.id,
        message: `Card moved: "${updated.title}" from ${previousColumnName} to ${nextColumnName}`,
        type: 'info',
      });
    }

    const updatedFields = Object.keys(updates).filter((field) => field !== 'column_id');
    if (updatedFields.length > 0) {
      dbApi.addLogEntry({
        board_id: existing.board_id,
        card_id: updated.id,
        message: `Card updated: "${updated.title}" (${updatedFields.join(', ')})`,
        type: 'info',
      });
    }

    res.json(updated);
  });

  router.delete('/cards/:id', (req, res) => {
    const cardId = parsePositiveInt(req.params.id);
    if (!cardId) {
      res.status(400).json({ error: 'invalid card id' });
      return;
    }

    const existing = dbApi.db
      .prepare(
        `
          SELECT c.id, c.title, col.board_id
          FROM cards c
          JOIN columns col ON c.column_id = col.id
          WHERE c.id = ?
        `,
      )
      .get(cardId);
    if (!existing) {
      res.status(404).json({ error: 'card not found' });
      return;
    }

    const deleted = dbApi.deleteCard(cardId);
    if (!deleted) {
      res.status(404).json({ error: 'card not found' });
      return;
    }

    dbApi.addLogEntry({
      board_id: existing.board_id,
      message: `Card deleted: "${existing.title}"`,
      type: 'warning',
    });

    res.status(204).send();
  });

  return router;
}
