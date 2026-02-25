import { Router } from 'express';

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

    res.json({
      ...project,
      board,
    });
  });

  router.patch('/projects/:id', (req, res) => {
    const projectId = parsePositiveInt(req.params.id);
    if (!projectId) {
      res.status(400).json({ error: 'invalid project id' });
      return;
    }

    const { name, description, status } = req.body ?? {};
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
