import Database from 'better-sqlite3';

function initSchema(db) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      column_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      position INTEGER NOT NULL,
      retries INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER,
      board_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE SET NULL,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );
  `);
}

function createDbApi(db) {
  const insertBoard = db.prepare(`
    INSERT INTO boards (name) VALUES (?)
  `);
  const selectBoard = db.prepare(`
    SELECT id, name, created_at FROM boards WHERE id = ?
  `);
  const selectColumnsForBoard = db.prepare(`
    SELECT id, board_id, name, position
    FROM columns
    WHERE board_id = ?
    ORDER BY position ASC, id ASC
  `);
  const insertColumn = db.prepare(`
    INSERT INTO columns (board_id, name, position)
    VALUES (?, ?, ?)
  `);
  const selectColumn = db.prepare(`
    SELECT id, board_id, name, position FROM columns WHERE id = ?
  `);
  const insertCard = db.prepare(`
    INSERT INTO cards (column_id, title, description, status, position, retries)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const selectCard = db.prepare(`
    SELECT id, column_id, title, description, status, position, retries, created_at, updated_at
    FROM cards
    WHERE id = ?
  `);
  const selectCardsForColumn = db.prepare(`
    SELECT id, column_id, title, description, status, position, retries, created_at, updated_at
    FROM cards
    WHERE column_id = ?
    ORDER BY position ASC, id ASC
  `);
  const deleteCardStmt = db.prepare(`
    DELETE FROM cards WHERE id = ?
  `);
  const insertLog = db.prepare(`
    INSERT INTO activity_log (card_id, board_id, message, type)
    VALUES (?, ?, ?, ?)
  `);
  const selectLog = db.prepare(`
    SELECT id, card_id, board_id, message, type, created_at
    FROM activity_log
    WHERE board_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `);

  function createBoard(name) {
    const result = insertBoard.run(name);
    return selectBoard.get(result.lastInsertRowid) || null;
  }

  function getBoard(id) {
    return selectBoard.get(id) || null;
  }

  function getBoardWithDetails(boardId) {
    const board = getBoard(boardId);
    if (!board) {
      return null;
    }

    const columns = selectColumnsForBoard.all(boardId);
    const detailedColumns = columns.map((column) => ({
      ...column,
      cards: selectCardsForColumn.all(column.id),
    }));

    return {
      ...board,
      columns: detailedColumns,
    };
  }

  function createColumn(boardId, name, position) {
    const result = insertColumn.run(boardId, name, position);
    return selectColumn.get(result.lastInsertRowid) || null;
  }

  function createCard({
    column_id,
    title,
    description = '',
    status = 'pending',
    position = 0,
    retries = 0,
  }) {
    const result = insertCard.run(column_id, title, description, status, position, retries);
    return selectCard.get(result.lastInsertRowid) || null;
  }

  function updateCard(cardId, updates) {
    const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
    if (entries.length === 0) {
      return selectCard.get(cardId) || null;
    }

    const allowedFields = new Set([
      'column_id',
      'title',
      'description',
      'status',
      'position',
      'retries',
    ]);
    const validEntries = entries.filter(([field]) => allowedFields.has(field));

    if (validEntries.length === 0) {
      return selectCard.get(cardId) || null;
    }

    const setClause = validEntries.map(([field]) => `${field} = ?`).join(', ');
    const values = validEntries.map(([, value]) => value);
    const stmt = db.prepare(`
      UPDATE cards
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(...values, cardId);
    return selectCard.get(cardId) || null;
  }

  function moveCard(cardId, columnId, position) {
    const hasPosition = position !== undefined && position !== null;
    const sql = hasPosition
      ? `
        UPDATE cards
        SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      : `
        UPDATE cards
        SET column_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

    const stmt = db.prepare(sql);
    if (hasPosition) {
      stmt.run(columnId, position, cardId);
    } else {
      stmt.run(columnId, cardId);
    }

    return selectCard.get(cardId) || null;
  }

  function deleteCard(cardId) {
    const result = deleteCardStmt.run(cardId);
    return result.changes > 0;
  }

  function addLogEntry({ board_id, card_id = null, message, type = 'info' }) {
    const result = insertLog.run(card_id, board_id, message, type);
    return db
      .prepare(`
        SELECT id, card_id, board_id, message, type, created_at
        FROM activity_log
        WHERE id = ?
      `)
      .get(result.lastInsertRowid);
  }

  function getLog(boardId, limit = 100) {
    return selectLog.all(boardId, limit);
  }

  return {
    db,
    createBoard,
    getBoard,
    getBoardWithDetails,
    createColumn,
    createCard,
    updateCard,
    moveCard,
    deleteCard,
    addLogEntry,
    getLog,
    close: () => db.close(),
  };
}

export function createDatabase(dbPath = process.env.DB_PATH || './kanban.db') {
  const db = new Database(dbPath);
  initSchema(db);
  return createDbApi(db);
}

let defaultApi;

function getDefaultApi() {
  if (!defaultApi) {
    defaultApi = createDatabase();
  }
  return defaultApi;
}

export function createBoard(name) {
  return getDefaultApi().createBoard(name);
}

export function getBoard(id) {
  return getDefaultApi().getBoard(id);
}

export function getBoardWithDetails(boardId) {
  return getDefaultApi().getBoardWithDetails(boardId);
}

export function createColumn(boardId, name, position) {
  return getDefaultApi().createColumn(boardId, name, position);
}

export function createCard(payload) {
  return getDefaultApi().createCard(payload);
}

export function updateCard(cardId, updates) {
  return getDefaultApi().updateCard(cardId, updates);
}

export function moveCard(cardId, columnId, position) {
  return getDefaultApi().moveCard(cardId, columnId, position);
}

export function deleteCard(cardId) {
  return getDefaultApi().deleteCard(cardId);
}

export function addLogEntry(payload) {
  return getDefaultApi().addLogEntry(payload);
}

export function getLog(boardId, limit) {
  return getDefaultApi().getLog(boardId, limit);
}

