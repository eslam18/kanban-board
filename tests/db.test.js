import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/server/db.js';
import { seedDefaultAdmin } from '../src/server/seed.js';
import { verifyPasswordSync } from '../src/server/auth/password.js';

describe('db layer', () => {
  let dbApi;

  beforeEach(() => {
    dbApi = createDatabase(':memory:');
  });

  afterEach(() => {
    dbApi.close();
  });

  it('creates auth tables in schema migration', () => {
    const tableNames = dbApi.db
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name IN ('users', 'invites', 'sessions')
          ORDER BY name ASC
        `,
      )
      .all()
      .map((row) => row.name);

    expect(tableNames).toEqual(['invites', 'sessions', 'users']);
  });

  it('seeds the default admin user on a fresh database', () => {
    const seededAdmin = seedDefaultAdmin(dbApi);

    expect(seededAdmin).toBeTruthy();
    expect(seededAdmin.email).toBe(process.env.ADMIN_EMAIL || 'admin@qanat.local');
    expect(seededAdmin.role).toBe('admin');
    expect(seededAdmin.status).toBe('active');

    const storedUser = dbApi.db
      .prepare(
        `
          SELECT id, email, password_hash, role, status
          FROM users
          WHERE email = ?
          LIMIT 1
        `,
      )
      .get(process.env.ADMIN_EMAIL || 'admin@qanat.local');

    expect(storedUser).toBeTruthy();
    expect(verifyPasswordSync(process.env.ADMIN_PASSWORD || 'changeme', storedUser.password_hash)).toBe(
      true,
    );
  });

  it('does not seed default admin when users already exist', () => {
    dbApi.db
      .prepare(
        `
          INSERT INTO users (email, password_hash, display_name, role, status)
          VALUES (?, ?, ?, ?, ?)
        `,
      )
      .run('member@qanat.local', 'placeholder-hash', 'Existing Member', 'member', 'active');

    const seededAdmin = seedDefaultAdmin(dbApi);
    const users = dbApi.db.prepare(`SELECT id, email FROM users ORDER BY id ASC`).all();

    expect(seededAdmin).toBe(null);
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('member@qanat.local');
  });

  it('creates a board', () => {
    const board = dbApi.createBoard('Kanban Board Build');

    expect(board).toBeTruthy();
    expect(board.id).toBeTypeOf('number');
    expect(board.name).toBe('Kanban Board Build');

    const fetched = dbApi.getBoard(board.id);
    expect(fetched?.id).toBe(board.id);
    expect(fetched?.name).toBe('Kanban Board Build');
  });

  it('adds columns to a board in position order', () => {
    const board = dbApi.createBoard('Default Board');
    dbApi.createColumn(board.id, 'Review', 2);
    dbApi.createColumn(board.id, 'Backlog', 0);
    dbApi.createColumn(board.id, 'In Progress', 1);

    const detailed = dbApi.getBoardWithDetails(board.id);
    expect(detailed).toBeTruthy();
    expect(detailed.columns.map((column) => column.name)).toEqual([
      'Backlog',
      'In Progress',
      'Review',
    ]);
  });

  it('adds a card to a column', () => {
    const board = dbApi.createBoard('Default Board');
    const backlog = dbApi.createColumn(board.id, 'Backlog', 0);

    const card = dbApi.createCard({
      column_id: backlog.id,
      title: 'Step 1: Build DB Layer',
      description: 'Create schema and CRUD functions',
      status: 'pending',
      position: 0,
    });

    expect(card).toBeTruthy();
    expect(card.column_id).toBe(backlog.id);
    expect(card.title).toBe('Step 1: Build DB Layer');
    expect(card.status).toBe('pending');

    const detailed = dbApi.getBoardWithDetails(board.id);
    expect(detailed.columns[0].cards).toHaveLength(1);
    expect(detailed.columns[0].cards[0].id).toBe(card.id);
  });

  it('updates card status', () => {
    const board = dbApi.createBoard('Default Board');
    const backlog = dbApi.createColumn(board.id, 'Backlog', 0);
    const card = dbApi.createCard({
      column_id: backlog.id,
      title: 'Build API',
      status: 'pending',
      position: 0,
    });

    const updated = dbApi.updateCard(card.id, { status: 'building', retries: 1 });

    expect(updated).toBeTruthy();
    expect(updated.status).toBe('building');
    expect(updated.retries).toBe(1);
  });

  it('moves a card between columns', () => {
    const board = dbApi.createBoard('Default Board');
    const backlog = dbApi.createColumn(board.id, 'Backlog', 0);
    const done = dbApi.createColumn(board.id, 'Done', 1);
    const card = dbApi.createCard({
      column_id: backlog.id,
      title: 'Ship MVP',
      status: 'pending',
      position: 0,
    });

    const moved = dbApi.moveCard(card.id, done.id, 3);
    expect(moved).toBeTruthy();
    expect(moved.column_id).toBe(done.id);
    expect(moved.position).toBe(3);

    const detailed = dbApi.getBoardWithDetails(board.id);
    const backlogCards = detailed.columns.find((column) => column.id === backlog.id)?.cards ?? [];
    const doneCards = detailed.columns.find((column) => column.id === done.id)?.cards ?? [];

    expect(backlogCards).toHaveLength(0);
    expect(doneCards).toHaveLength(1);
    expect(doneCards[0].id).toBe(card.id);
  });

  it('deletes a card', () => {
    const board = dbApi.createBoard('Default Board');
    const backlog = dbApi.createColumn(board.id, 'Backlog', 0);
    const card = dbApi.createCard({
      column_id: backlog.id,
      title: 'Delete me',
      status: 'pending',
      position: 0,
    });

    expect(dbApi.deleteCard(card.id)).toBe(true);
    expect(dbApi.deleteCard(card.id)).toBe(false);

    const detailed = dbApi.getBoardWithDetails(board.id);
    expect(detailed.columns[0].cards).toHaveLength(0);
  });

  it('writes and retrieves activity log entries', () => {
    const board = dbApi.createBoard('Default Board');
    const backlog = dbApi.createColumn(board.id, 'Backlog', 0);
    const card = dbApi.createCard({
      column_id: backlog.id,
      title: 'Track updates',
      status: 'pending',
      position: 0,
    });

    const entry1 = dbApi.addLogEntry({
      board_id: board.id,
      card_id: card.id,
      message: 'Card created',
      type: 'info',
    });
    const entry2 = dbApi.addLogEntry({
      board_id: board.id,
      message: 'Board seeded',
      type: 'success',
    });

    expect(entry1.id).toBeTypeOf('number');
    expect(entry2.id).toBeTypeOf('number');

    const log = dbApi.getLog(board.id);
    expect(log).toHaveLength(2);
    expect(log[0].message).toBe('Board seeded');
    expect(log[1].message).toBe('Card created');
    expect(log[1].card_id).toBe(card.id);
  });
});
