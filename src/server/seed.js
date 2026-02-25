import { createProject } from './db.js';

export function seedDefaultBoard() {
  const project = createProject('Default Project', 'Auto-created default project');
  return project;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const project = seedDefaultBoard();
  // Keep CLI output minimal and deterministic for quick manual runs.
  console.log(`Seeded project ${project.id}: ${project.name} (board ${project.board_id})`);
}
