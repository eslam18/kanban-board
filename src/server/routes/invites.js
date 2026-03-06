import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { requireRole } from '../middleware/auth.js';

const VALID_ROLES = new Set(['admin', 'member']);
const TOKEN_GENERATION_ATTEMPTS = 3;

function parsePositiveInt(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }

  return n;
}

function toInviteResponse(invite) {
  return {
    ...invite,
    link: `/register?token=${invite.token}`,
  };
}

function isInviteTokenCollisionError(error) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const message = String(error.message ?? '');
  return message.includes('UNIQUE constraint failed: invites.token');
}

export function createInvitesRouter(dbApi) {
  const router = Router();

  const insertInvite = dbApi.db.prepare(`
    INSERT INTO invites (email, token, invited_by, role, expires_at)
    VALUES (?, ?, ?, ?, datetime('now', '+7 days'))
  `);
  const selectInviteById = dbApi.db.prepare(`
    SELECT id, email, role, token, invited_by, expires_at, accepted_at, created_at
    FROM invites
    WHERE id = ?
    LIMIT 1
  `);
  const selectUserByEmail = dbApi.db.prepare(`
    SELECT id
    FROM users
    WHERE email = ?
    LIMIT 1
  `);
  const selectPendingInvites = dbApi.db.prepare(`
    SELECT id, email, role, token, invited_by, expires_at, accepted_at, created_at
    FROM invites
    WHERE accepted_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
    ORDER BY created_at DESC, id DESC
  `);
  const deleteInviteById = dbApi.db.prepare(`
    DELETE FROM invites
    WHERE id = ?
  `);

  router.post('/invites', requireRole('admin'), (req, res) => {
    const { email, role = 'member' } = req.body ?? {};
    const normalizedEmail = typeof email === 'string' ? email.trim() : '';
    const normalizedRole = typeof role === 'string' ? role.trim() : 'member';

    if (!normalizedEmail) {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    if (!VALID_ROLES.has(normalizedRole)) {
      res.status(400).json({ error: 'role must be one of: admin, member' });
      return;
    }

    const existingUser = selectUserByEmail.get(normalizedEmail);
    if (existingUser) {
      res.status(409).json({ error: 'user already exists' });
      return;
    }

    let invite = null;

    for (let attempt = 0; attempt < TOKEN_GENERATION_ATTEMPTS; attempt += 1) {
      const token = randomBytes(32).toString('hex');

      try {
        const result = insertInvite.run(normalizedEmail, token, req.user.id, normalizedRole);
        invite = selectInviteById.get(result.lastInsertRowid);
        break;
      } catch (error) {
        if (!isInviteTokenCollisionError(error)) {
          throw error;
        }
      }
    }

    if (!invite) {
      res.status(500).json({ error: 'failed to create invite' });
      return;
    }

    res.status(201).json(toInviteResponse(invite));
  });

  router.get('/invites', requireRole('admin'), (_req, res) => {
    const invites = selectPendingInvites.all().map(toInviteResponse);
    res.json(invites);
  });

  router.delete('/invites/:id', requireRole('admin'), (req, res) => {
    const inviteId = parsePositiveInt(req.params.id);
    if (!inviteId) {
      res.status(400).json({ error: 'invalid invite id' });
      return;
    }

    const result = deleteInviteById.run(inviteId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'invite not found' });
      return;
    }

    res.status(204).send();
  });

  return router;
}
