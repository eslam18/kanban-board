import { createBoard, createColumn } from './db.js';

export function seedDefaultBoard() {
  const board = createBoard('Default Board');

  createColumn(board.id, 'Backlog', 0);
  createColumn(board.id, 'In Progress', 1);
  createColumn(board.id, 'Review', 2);
  createColumn(board.id, 'Done', 3);

  return board;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const board = seedDefaultBoard();
  // Keep CLI output minimal and deterministic for quick manual runs.
  console.log(`Seeded board ${board.id}: ${board.name}`);
}

