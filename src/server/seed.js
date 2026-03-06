import { createDatabase } from './db.js';
import { hashPasswordSync } from './auth/password.js';

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@qanat.local';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const DEFAULT_ADMIN_DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME || 'Qanat Admin';

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

function findUserByEmail(dbApi, email) {
  return dbApi.db
    .prepare(
      `
        SELECT id, email, display_name, role, status, created_at, updated_at
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
    )
    .get(email);
}

export function seedDefaultAdmin(dbApi = createDatabase(process.env.DB_PATH)) {
  const existingAdmin = findUserByEmail(dbApi, DEFAULT_ADMIN_EMAIL);
  if (existingAdmin) {
    return existingAdmin;
  }

  const userCount = dbApi.db.prepare(`SELECT COUNT(*) AS count FROM users`).get();
  if (userCount.count > 0) {
    return null;
  }

  const result = dbApi.db
    .prepare(
      `
        INSERT INTO users (email, password_hash, display_name, role, status)
        VALUES (?, ?, ?, ?, ?)
      `,
    )
    .run(
      DEFAULT_ADMIN_EMAIL,
      hashPasswordSync(DEFAULT_ADMIN_PASSWORD),
      DEFAULT_ADMIN_DISPLAY_NAME,
      'admin',
      'active',
    );

  return dbApi.db
    .prepare(
      `
        SELECT id, email, display_name, role, status, created_at, updated_at
        FROM users
        WHERE id = ?
      `,
    )
    .get(result.lastInsertRowid);
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
  const admin = seedDefaultAdmin();
  const project = seedDefaultBoard();
  // Keep CLI output minimal and deterministic for quick manual runs.
  const adminLabel = admin ? `${admin.email} (${admin.role})` : `${DEFAULT_ADMIN_EMAIL} (existing users)`;
  console.log(
    `Seeded project ${project.id}: ${project.name} (board ${project.board_id}) | admin ${adminLabel}`,
  );
}
