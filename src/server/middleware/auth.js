import { verifyAuthToken } from '../auth/jwt.js';

function parseBearerToken(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const match = value.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    return null;
  }

  return match[1];
}

function parsePositiveUserId(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

export function createAuthMiddleware(dbApi) {
  const selectUser = dbApi.db.prepare(`
    SELECT id, email, display_name, role, status, created_at, updated_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `);

  return (req, res, next) => {
    const token = parseBearerToken(req.header('authorization'));
    if (!token) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    let payload;
    try {
      payload = verifyAuthToken(token);
    } catch {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const userId = parsePositiveUserId(payload?.sub);
    if (!userId) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const user = selectUser.get(userId);
    if (!user) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    req.user = user;
    next();
  };
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    next();
  };
}
