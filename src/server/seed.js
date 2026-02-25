import { createDatabase } from './db.js';

function findUnassignedBoard(dbApi) {
  return dbApi.db
    .prepare(
      `
        SELECT id, name
        FROM boards
        WHERE project_id IS NULL
        ORDER BY CASE WHEN name = 'Default Board' THEN 0 ELSE 1 END, id ASC
        LIMIT 1
      `,
    )
    .get();
}

export function seedDefaultBoard(dbApi = createDatabase(process.env.DB_PATH)) {
  const existingDefaultProject = dbApi.db
    .prepare(`SELECT id FROM projects WHERE name = ? ORDER BY id ASC LIMIT 1`)
    .get('Default Project');

  if (existingDefaultProject) {
    const linkedBoard = dbApi.db
      .prepare(`SELECT id FROM boards WHERE project_id = ? LIMIT 1`)
      .get(existingDefaultProject.id);

    if (!linkedBoard) {
      const orphanBoard = findUnassignedBoard(dbApi);
      if (orphanBoard) {
        dbApi.db
          .prepare(`UPDATE boards SET project_id = ? WHERE id = ?`)
          .run(existingDefaultProject.id, orphanBoard.id);
      }
    }

    return dbApi.getProject(existingDefaultProject.id);
  }

  const orphanBoard = findUnassignedBoard(dbApi);
  if (!orphanBoard) {
    return dbApi.createProject('Default Project', 'Auto-created default project');
  }

  const insertResult = dbApi.db
    .prepare(
      `
        INSERT INTO projects (name, description, status)
        VALUES (?, ?, ?)
      `,
    )
    .run('Default Project', 'Auto-created default project', 'active');

  const projectId = insertResult.lastInsertRowid;
  dbApi.db
    .prepare(`UPDATE boards SET project_id = ? WHERE id = ?`)
    .run(projectId, orphanBoard.id);

  return dbApi.getProject(projectId);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const project = seedDefaultBoard();
  // Keep CLI output minimal and deterministic for quick manual runs.
  console.log(`Seeded project ${project.id}: ${project.name} (board ${project.board_id})`);
}
