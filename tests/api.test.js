import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/server/db.js';
import { createApp } from '../src/server/index.js';

describe('api routes', () => {
  let dbApi;
  let app;

  beforeEach(() => {
    dbApi = createDatabase(':memory:');
    ({ app } = createApp(dbApi));
  });

  afterEach(() => {
    dbApi.close();
  });

  it('returns health check status', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toEqual({ ok: true });
  });

  it('creates project and auto-creates board with default columns', async () => {
    const created = await request(app)
      .post('/api/projects')
      .send({ name: 'Kanban Board v2', description: 'Multi-project support' })
      .expect(201);

    expect(created.body.id).toBeTypeOf('number');
    expect(created.body.name).toBe('Kanban Board v2');
    expect(created.body.description).toBe('Multi-project support');
    expect(created.body.status).toBe('active');
    expect(created.body.board_id).toBeTypeOf('number');

    const board = await request(app).get(`/api/boards/${created.body.board_id}`).expect(200);
    expect(board.body.columns.map((column) => column.name)).toEqual([
      'Backlog',
      'In Progress',
      'Review',
      'Done',
    ]);
  });

  it('lists projects', async () => {
    await request(app).post('/api/projects').send({ name: 'Project A' }).expect(201);
    await request(app).post('/api/projects').send({ name: 'Project B' }).expect(201);

    const response = await request(app).get('/api/projects').expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0].name).toBe('Project A');
    expect(response.body[1].name).toBe('Project B');
    expect(response.body[0].board_id).toBeTypeOf('number');
  });

  it('gets project with full board details', async () => {
    const created = await request(app).post('/api/projects').send({ name: 'Project Details' }).expect(201);

    const board = dbApi.getBoardWithDetails(created.body.board_id);
    const backlog = board.columns.find((column) => column.name === 'Backlog');
    dbApi.createCard({
      column_id: backlog.id,
      title: 'Step 1',
      description: 'Build DB layer',
      status: 'pending',
      position: 0,
    });

    const response = await request(app).get(`/api/projects/${created.body.id}`).expect(200);

    expect(response.body.id).toBe(created.body.id);
    expect(response.body.board.id).toBe(created.body.board_id);
    expect(response.body.board.columns).toHaveLength(4);
    expect(response.body.board.columns[0].cards).toHaveLength(1);
    expect(response.body.board.columns[0].cards[0].title).toBe('Step 1');
  });

  it('updates project status', async () => {
    const created = await request(app).post('/api/projects').send({ name: 'Project Status' }).expect(201);

    const response = await request(app)
      .patch(`/api/projects/${created.body.id}`)
      .send({ status: 'completed' })
      .expect(200);

    expect(response.body.status).toBe('completed');
  });

  it('deletes a project and cascades board/column/card deletion', async () => {
    const created = await request(app).post('/api/projects').send({ name: 'Project Delete' }).expect(201);

    const board = dbApi.getBoardWithDetails(created.body.board_id);
    const backlog = board.columns.find((column) => column.name === 'Backlog');
    const card = dbApi.createCard({
      column_id: backlog.id,
      title: 'To be deleted',
      description: '',
      status: 'pending',
      position: 0,
    });

    await request(app).delete(`/api/projects/${created.body.id}`).expect(204);

    await request(app).get(`/api/projects/${created.body.id}`).expect(404);
    await request(app).get(`/api/boards/${created.body.board_id}`).expect(404);

    const remainingColumns = dbApi.db
      .prepare('SELECT COUNT(*) AS count FROM columns WHERE board_id = ?')
      .get(created.body.board_id);
    const remainingCard = dbApi.db.prepare('SELECT id FROM cards WHERE id = ?').get(card.id);

    expect(remainingColumns.count).toBe(0);
    expect(remainingCard).toBeUndefined();
  });

  it('creates and lists boards', async () => {
    const created = await request(app)
      .post('/api/boards')
      .send({ name: 'Kanban Board Build' })
      .expect(201);

    expect(created.body.id).toBeTypeOf('number');
    expect(created.body.name).toBe('Kanban Board Build');

    const list = await request(app).get('/api/boards').expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(created.body.id);
  });

  it('gets board details with columns and cards', async () => {
    const board = dbApi.createBoard('Default Board');
    const backlog = dbApi.createColumn(board.id, 'Backlog', 0);
    dbApi.createCard({
      column_id: backlog.id,
      title: 'Step 1',
      description: 'Build DB layer',
      status: 'pending',
      position: 0,
    });

    const response = await request(app).get(`/api/boards/${board.id}`).expect(200);

    expect(response.body.id).toBe(board.id);
    expect(response.body.columns).toHaveLength(1);
    expect(response.body.columns[0].cards).toHaveLength(1);
    expect(response.body.columns[0].cards[0].title).toBe('Step 1');
  });

  it('creates a card on a board', async () => {
    const board = dbApi.createBoard('Default Board');
    const backlog = dbApi.createColumn(board.id, 'Backlog', 0);

    const response = await request(app)
      .post(`/api/boards/${board.id}/cards`)
      .send({
        columnId: backlog.id,
        title: 'Step 2: Build API',
        description: 'Implement Express endpoints',
      })
      .expect(201);

    expect(response.body.column_id).toBe(backlog.id);
    expect(response.body.title).toBe('Step 2: Build API');
    expect(response.body.description).toBe('Implement Express endpoints');
    expect(response.body.status).toBe('pending');
  });

  it('updates card fields', async () => {
    const board = dbApi.createBoard('Default Board');
    const backlog = dbApi.createColumn(board.id, 'Backlog', 0);
    const card = dbApi.createCard({
      column_id: backlog.id,
      title: 'Build API',
      description: '',
      status: 'pending',
      position: 0,
      retries: 0,
    });

    const response = await request(app)
      .patch(`/api/cards/${card.id}`)
      .send({ status: 'building', retries: 1, description: 'In progress now' })
      .expect(200);

    expect(response.body.status).toBe('building');
    expect(response.body.retries).toBe(1);
    expect(response.body.description).toBe('In progress now');
  });

  it('moves card to a different column', async () => {
    const board = dbApi.createBoard('Default Board');
    const backlog = dbApi.createColumn(board.id, 'Backlog', 0);
    const done = dbApi.createColumn(board.id, 'Done', 1);
    const card = dbApi.createCard({
      column_id: backlog.id,
      title: 'Ship MVP',
      description: '',
      status: 'pending',
      position: 0,
      retries: 0,
    });

    const response = await request(app)
      .patch(`/api/cards/${card.id}`)
      .send({ columnId: done.id, position: 3, status: 'done' })
      .expect(200);

    expect(response.body.column_id).toBe(done.id);
    expect(response.body.position).toBe(3);

    const boardDetails = await request(app).get(`/api/boards/${board.id}`).expect(200);
    const backlogCards = boardDetails.body.columns.find((c) => c.id === backlog.id).cards;
    const doneCards = boardDetails.body.columns.find((c) => c.id === done.id).cards;

    expect(backlogCards).toHaveLength(0);
    expect(doneCards).toHaveLength(1);
    expect(doneCards[0].id).toBe(card.id);
  });

  it('deletes a card', async () => {
    const board = dbApi.createBoard('Default Board');
    const backlog = dbApi.createColumn(board.id, 'Backlog', 0);
    const card = dbApi.createCard({
      column_id: backlog.id,
      title: 'Delete me',
      description: '',
      status: 'pending',
      position: 0,
      retries: 0,
    });

    await request(app).delete(`/api/cards/${card.id}`).expect(204);

    const boardDetails = await request(app).get(`/api/boards/${board.id}`).expect(200);
    expect(boardDetails.body.columns[0].cards).toHaveLength(0);
  });

  it('creates and reads board activity log entries', async () => {
    const board = dbApi.createBoard('Default Board');
    const backlog = dbApi.createColumn(board.id, 'Backlog', 0);
    const card = dbApi.createCard({
      column_id: backlog.id,
      title: 'Track updates',
      description: '',
      status: 'pending',
      position: 0,
      retries: 0,
    });

    const created = await request(app)
      .post(`/api/boards/${board.id}/log`)
      .send({ message: 'Card created', type: 'info', cardId: card.id })
      .expect(201);

    expect(created.body.board_id).toBe(board.id);
    expect(created.body.card_id).toBe(card.id);
    expect(created.body.message).toBe('Card created');

    await request(app)
      .post(`/api/boards/${board.id}/log`)
      .send({ message: 'Board healthy', type: 'success' })
      .expect(201);

    const log = await request(app).get(`/api/boards/${board.id}/log`).expect(200);
    expect(log.body).toHaveLength(2);
    expect(log.body[0].message).toBe('Board healthy');
    expect(log.body[1].message).toBe('Card created');
  });
});
