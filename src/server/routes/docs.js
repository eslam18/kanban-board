import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

function parsePositiveInt(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function safeDocName(name) {
  const allowed = new Set(['DESIGN.md', 'PLAN_SUMMARY.md', 'BRIEF.md']);
  if (!allowed.has(name)) return null;
  return name;
}

function readApprovalStatus(designContent) {
  const line = designContent.split('\n').find((l) => l.startsWith('APPROVAL:'));
  if (!line) return 'PENDING';
  return line.replace('APPROVAL:', '').trim().toUpperCase() || 'PENDING';
}

export function createDocsRouter(dbApi) {
  const router = Router();

  function getProjectDir(projectId) {
    const project = dbApi.getProject(projectId);
    if (!project) return null;

    if (project.project_dir) return project.project_dir;

    const baseDir = '/Users/jarivs/Documents/JarvisProjects';
    try {
      const dirs = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        const buildStatePath = path.join(baseDir, dir.name, 'build-state.json');
        try {
          const state = JSON.parse(fs.readFileSync(buildStatePath, 'utf8'));
          if (state.project === project.name) {
            dbApi.db.prepare('UPDATE projects SET project_dir = ? WHERE id = ?')
              .run(path.join(baseDir, dir.name), projectId);
            return path.join(baseDir, dir.name);
          }
        } catch {
          // skip
        }
      }
    } catch {
      // skip
    }

    return null;
  }

  // Summary of docs for a project
  router.get('/projects/:id/docs', (req, res) => {
    const projectId = parsePositiveInt(req.params.id);
    if (!projectId) return res.status(400).json({ error: 'invalid project id' });

    const projectDir = getProjectDir(projectId);
    if (!projectDir) return res.status(404).json({ error: 'project directory not found' });

    const designPath = path.join(projectDir, 'DESIGN.md');
    const summaryPath = path.join(projectDir, 'PLAN_SUMMARY.md');
    const briefPath = path.join(projectDir, 'BRIEF.md');

    const designExists = fs.existsSync(designPath);
    const summaryExists = fs.existsSync(summaryPath);
    const briefExists = fs.existsSync(briefPath);

    let approval = 'PENDING';
    if (designExists) {
      try {
        const content = fs.readFileSync(designPath, 'utf8');
        approval = readApprovalStatus(content);
      } catch {
        approval = 'PENDING';
      }
    }

    let repoUrl = null;
    try {
      const raw = execSync(`git -C "${projectDir}" remote get-url origin`, { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString('utf8')
        .trim();
      if (raw) {
        if (raw.startsWith('git@github.com:')) {
          repoUrl = 'https://github.com/' + raw.replace('git@github.com:', '').replace(/\.git$/, '');
        } else if (raw.includes('github.com')) {
          // Strip embedded tokens: https://<token>@github.com/user/repo.git
          repoUrl = raw.replace(/^https:\/\/[^@]+@github\.com\//, 'https://github.com/').replace(/\.git$/, '');
        } else {
          repoUrl = raw;
        }
      }
    } catch {
      repoUrl = null;
    }

    res.json({
      projectDir,
      repoUrl,
      docs: {
        'BRIEF.md': { exists: briefExists },
        'DESIGN.md': { exists: designExists, approval },
        'PLAN_SUMMARY.md': { exists: summaryExists },
      },
    });
  });

  // Read doc
  router.get('/projects/:id/docs/:name', (req, res) => {
    const projectId = parsePositiveInt(req.params.id);
    const docName = safeDocName(req.params.name);

    if (!projectId) return res.status(400).json({ error: 'invalid project id' });
    if (!docName) return res.status(400).json({ error: 'invalid doc name' });

    const projectDir = getProjectDir(projectId);
    if (!projectDir) return res.status(404).json({ error: 'project directory not found' });

    const docPath = path.join(projectDir, docName);
    if (!fs.existsSync(docPath)) return res.status(404).json({ error: 'doc not found' });

    try {
      const content = fs.readFileSync(docPath, 'utf8');
      res.json({ name: docName, content });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Save doc
  router.put('/projects/:id/docs/:name', (req, res) => {
    const projectId = parsePositiveInt(req.params.id);
    const docName = safeDocName(req.params.name);

    if (!projectId) return res.status(400).json({ error: 'invalid project id' });
    if (!docName) return res.status(400).json({ error: 'invalid doc name' });

    const { content } = req.body ?? {};
    if (typeof content !== 'string') return res.status(400).json({ error: 'content must be a string' });

    const projectDir = getProjectDir(projectId);
    if (!projectDir) return res.status(404).json({ error: 'project directory not found' });

    const docPath = path.join(projectDir, docName);

    try {
      fs.writeFileSync(docPath, content, 'utf8');
      let approval = undefined;
      if (docName === 'DESIGN.md') {
        approval = readApprovalStatus(content);
      }
      res.json({ ok: true, name: docName, approval });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Approve (patch DESIGN.md line)
  router.post('/projects/:id/docs/approve', (req, res) => {
    const projectId = parsePositiveInt(req.params.id);
    if (!projectId) return res.status(400).json({ error: 'invalid project id' });

    const projectDir = getProjectDir(projectId);
    if (!projectDir) return res.status(404).json({ error: 'project directory not found' });

    const designPath = path.join(projectDir, 'DESIGN.md');
    if (!fs.existsSync(designPath)) return res.status(404).json({ error: 'DESIGN.md not found' });

    try {
      const content = fs.readFileSync(designPath, 'utf8');
      const lines = content.split('\n');
      let replaced = false;
      const next = lines.map((l) => {
        if (l.startsWith('APPROVAL:')) {
          replaced = true;
          return 'APPROVAL: APPROVED';
        }
        return l;
      });
      if (!replaced) {
        // Insert after first heading if present
        const idx = next.findIndex((l) => l.startsWith('# '));
        if (idx >= 0) next.splice(idx + 1, 0, 'APPROVAL: APPROVED');
        else next.unshift('APPROVAL: APPROVED');
      }
      const updated = next.join('\n');
      fs.writeFileSync(designPath, updated, 'utf8');
      res.json({ ok: true, approval: 'APPROVED' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
