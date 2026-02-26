import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Logs browser API — reads log files from a project's logs/ directory.
 *
 * GET /api/projects/:id/logs          → list log files
 * GET /api/projects/:id/logs/:filename → read a specific log file
 */
export function createLogsRouter(dbApi) {
  const router = Router();

  // Helper: get project dir from DB or build-state.json
  function getProjectDir(projectId) {
    const project = dbApi.getProject(projectId);
    if (!project) return null;

    // First check if project_dir is set in DB
    if (project.project_dir) return project.project_dir;

    // Fallback: scan JarvisProjects for a matching build-state.json
    const baseDir = '/Users/jarivs/Documents/JarvisProjects';
    try {
      const dirs = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        const buildStatePath = path.join(baseDir, dir.name, 'build-state.json');
        try {
          const state = JSON.parse(fs.readFileSync(buildStatePath, 'utf8'));
          if (state.project === project.name) {
            // Cache it in DB for next time
            dbApi.db.prepare('UPDATE projects SET project_dir = ? WHERE id = ?')
              .run(path.join(baseDir, dir.name), projectId);
            return path.join(baseDir, dir.name);
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }

    return null;
  }

  // List log files
  router.get('/projects/:id/logs', (req, res) => {
    const projectId = Number(req.params.id);
    if (!projectId || projectId <= 0) {
      return res.status(400).json({ error: 'invalid project id' });
    }

    const projectDir = getProjectDir(projectId);
    if (!projectDir) {
      return res.status(404).json({ error: 'project directory not found' });
    }

    const logsDir = path.join(projectDir, 'logs');
    if (!fs.existsSync(logsDir)) {
      return res.json({ projectDir, logs: [] });
    }

    try {
      const files = fs.readdirSync(logsDir)
        .filter(f => f.endsWith('.log') || f.endsWith('.json'))
        .map(f => {
          const stat = fs.statSync(path.join(logsDir, f));
          return {
            name: f,
            size: stat.size,
            modified: stat.mtime.toISOString(),
          };
        })
        .sort((a, b) => b.modified.localeCompare(a.modified)); // newest first

      res.json({ projectDir, logs: files });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Read a specific log file
  router.get('/projects/:id/logs/:filename', (req, res) => {
    const projectId = Number(req.params.id);
    const filename = req.params.filename;

    if (!projectId || projectId <= 0) {
      return res.status(400).json({ error: 'invalid project id' });
    }

    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'invalid filename' });
    }

    const projectDir = getProjectDir(projectId);
    if (!projectDir) {
      return res.status(404).json({ error: 'project directory not found' });
    }

    const filePath = path.join(projectDir, 'logs', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'file not found' });
    }

    try {
      // For JSON files, parse and return as JSON
      if (filename.endsWith('.json')) {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return res.json(content);
      }

      // For log files, return last N lines (configurable via ?lines=N, default 200)
      const lines = Number(req.query.lines) || 200;
      const content = fs.readFileSync(filePath, 'utf8');
      const allLines = content.split('\n');
      const tail = req.query.full === 'true' ? allLines : allLines.slice(-lines);

      res.json({
        filename,
        totalLines: allLines.length,
        returnedLines: tail.length,
        content: tail.join('\n'),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
