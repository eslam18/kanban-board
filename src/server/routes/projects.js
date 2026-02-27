import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

function parsePositiveInt(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }
  return n;
}

export function createProjectsRouter(dbApi) {
  const router = Router();

  router.get('/projects', (_req, res) => {
    const projects = dbApi.listProjects();
    res.json(projects);
  });

  router.post('/projects', (req, res) => {
    const { name, description = '' } = req.body ?? {};

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    if (description !== undefined && typeof description !== 'string') {
      res.status(400).json({ error: 'description must be a string' });
      return;
    }

    const project = dbApi.createProject(name.trim(), description ?? '');
    res.status(201).json(project);
  });

  router.get('/projects/:id', (req, res) => {
    const projectId = parsePositiveInt(req.params.id);
    if (!projectId) {
      res.status(400).json({ error: 'invalid project id' });
      return;
    }

    const project = dbApi.getProject(projectId);
    if (!project) {
      res.status(404).json({ error: 'project not found' });
      return;
    }

    const board = project.board_id ? dbApi.getBoardWithDetails(project.board_id) : null;

    let repoUrl = null;
    let pipeline = null;

    if (project.project_dir) {
      const projectDir = project.project_dir;

      // Repo URL
      try {
        const raw = execSync(`git -C "${projectDir}" remote get-url origin`, { stdio: ['ignore', 'pipe', 'ignore'] })
          .toString('utf8')
          .trim();
        if (raw) {
          if (raw.startsWith('git@github.com:')) {
            repoUrl = 'https://github.com/' + raw.replace('git@github.com:', '').replace(/\.git$/, '');
          } else if (raw.includes('github.com')) {
            repoUrl = raw.replace(/^https:\/\/[^@]+@github\.com\//, 'https://github.com/').replace(/\.git$/, '');
          } else {
            repoUrl = raw;
          }
        }
      } catch {
        repoUrl = null;
      }

      // Pipeline status
      try {
        const lockPath = path.join(projectDir, '.pipeline.lock');
        let pid = null;
        let running = false;
        let staleLock = false;

        if (fs.existsSync(lockPath)) {
          const txt = fs.readFileSync(lockPath, 'utf8').trim();
          const n = Number(txt);
          if (Number.isInteger(n) && n > 0) {
            pid = n;
            try {
              process.kill(pid, 0);
              running = true;
            } catch {
              staleLock = true;
            }
          } else {
            staleLock = true;
          }
        }

        const statePath = path.join(projectDir, 'build-state.json');
        let state = null;
        if (fs.existsSync(statePath)) {
          state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        }

        pipeline = {
          running,
          pid,
          staleLock,
          status: state?.status ?? null,
          escalated: state?.escalated ?? false,
          phase: state?.phase ?? null,
          currentStep: state?.currentStep ?? null,
          lastError: state?.lastError ?? null,
          updatedAt: state?.updatedAt ?? null,
        };
      } catch {
        pipeline = null;
      }
    }

    res.json({
      ...project,
      board,
      repoUrl,
      pipeline,
    });
  });

  router.patch('/projects/:id', (req, res) => {
    const projectId = parsePositiveInt(req.params.id);
    if (!projectId) {
      res.status(400).json({ error: 'invalid project id' });
      return;
    }

    const { name, description, status, project_dir } = req.body ?? {};
    const updates = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ error: 'name must be a non-empty string' });
        return;
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        res.status(400).json({ error: 'description must be a string' });
        return;
      }
      updates.description = description;
    }

    if (project_dir !== undefined) {
      if (typeof project_dir !== 'string') {
        res.status(400).json({ error: 'project_dir must be a string' });
        return;
      }
      updates.project_dir = project_dir;
    }

    if (status !== undefined) {
      const validStatuses = new Set(['active', 'completed', 'archived']);
      if (typeof status !== 'string' || !validStatuses.has(status)) {
        res.status(400).json({ error: 'status must be one of: active, completed, archived' });
        return;
      }
      updates.status = status;
    }

    const updated = dbApi.updateProject(projectId, updates);
    if (!updated) {
      res.status(404).json({ error: 'project not found' });
      return;
    }

    res.json(updated);
  });

  router.delete('/projects/:id', (req, res) => {
    const projectId = parsePositiveInt(req.params.id);
    if (!projectId) {
      res.status(400).json({ error: 'invalid project id' });
      return;
    }

    const deleted = dbApi.deleteProject(projectId);
    if (!deleted) {
      res.status(404).json({ error: 'project not found' });
      return;
    }

    res.status(204).send();
  });

  return router;
}
