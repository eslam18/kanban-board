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
