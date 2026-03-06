import { Router } from 'express';
import { verifyPassword } from '../auth/password.js';
import { signAuthToken } from '../auth/jwt.js';
import { createAuthMiddleware } from '../middleware/auth.js';

function toSafeUser(user) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export function createAuthRouter(dbApi) {
  const router = Router();
  const authMiddleware = createAuthMiddleware(dbApi);
  const selectUserForLogin = dbApi.db.prepare(`
    SELECT id, email, password_hash, display_name, role, status, created_at, updated_at
    FROM users
    WHERE email = ?
    LIMIT 1
  `);

  router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    const normalizedEmail = typeof email === 'string' ? email.trim() : '';
    const normalizedPassword = typeof password === 'string' ? password : '';

    if (!normalizedEmail) {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    if (!normalizedPassword || normalizedPassword.trim() === '') {
      res.status(400).json({ error: 'password is required' });
      return;
    }

    const user = selectUserForLogin.get(normalizedEmail);
    if (!user) {
      res.status(401).json({ error: 'invalid credentials' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const passwordMatches = await verifyPassword(password, user.password_hash);
    if (!passwordMatches) {
      res.status(401).json({ error: 'invalid credentials' });
      return;
    }

    const token = signAuthToken({ sub: user.id, role: user.role });
    res.json({
      token,
      user: toSafeUser(user),
    });
  });

  router.get('/auth/me', authMiddleware, (req, res) => {
    res.json(toSafeUser(req.user));
  });

  return router;
}
