import { Router } from 'express';
import { hashPassword, verifyPassword } from '../auth/password.js';
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

function currentSqlTimestamp() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
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
  const selectInviteByToken = dbApi.db.prepare(`
    SELECT id, email, role, expires_at, accepted_at
    FROM invites
    WHERE token = ?
    LIMIT 1
  `);
  const selectUserByEmail = dbApi.db.prepare(`
    SELECT id
    FROM users
    WHERE email = ?
    LIMIT 1
  `);
  const insertUser = dbApi.db.prepare(`
    INSERT INTO users (email, password_hash, display_name, role, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  const selectSafeUserById = dbApi.db.prepare(`
    SELECT id, email, display_name, role, status, created_at, updated_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `);
  const selectPasswordHashByUserId = dbApi.db.prepare(`
    SELECT id, password_hash
    FROM users
    WHERE id = ?
    LIMIT 1
  `);
  const updatePasswordHashByUserId = dbApi.db.prepare(`
    UPDATE users
    SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  const markInviteAccepted = dbApi.db.prepare(`
    UPDATE invites
    SET accepted_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND accepted_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
  `);
  const createUserFromInvite = dbApi.db.transaction((invite, passwordHash, displayName) => {
    const insertResult = insertUser.run(
      invite.email,
      passwordHash,
      displayName,
      invite.role,
      'active',
    );
    const acceptResult = markInviteAccepted.run(invite.id);
    if (acceptResult.changes !== 1) {
      const error = new Error('invalid invite token');
      error.code = 'INVALID_INVITE_TOKEN';
      throw error;
    }

    return selectSafeUserById.get(insertResult.lastInsertRowid) || null;
  });

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

  router.post('/auth/register', async (req, res) => {
    const { token, password, display_name, displayName } = req.body ?? {};
    const normalizedToken = typeof token === 'string' ? token.trim() : '';
    const normalizedPassword = typeof password === 'string' ? password : '';
    const normalizedDisplayName =
      typeof display_name === 'string'
        ? display_name.trim()
        : typeof displayName === 'string'
          ? displayName.trim()
          : '';

    if (!normalizedToken) {
      res.status(400).json({ error: 'token is required' });
      return;
    }

    if (!normalizedPassword || normalizedPassword.trim() === '') {
      res.status(400).json({ error: 'password is required' });
      return;
    }

    if (!normalizedDisplayName) {
      res.status(400).json({ error: 'display_name is required' });
      return;
    }

    const invite = selectInviteByToken.get(normalizedToken);
    if (!invite || invite.accepted_at || invite.expires_at <= currentSqlTimestamp()) {
      res.status(400).json({ error: 'invalid invite token' });
      return;
    }

    const existingUser = selectUserByEmail.get(invite.email);
    if (existingUser) {
      res.status(409).json({ error: 'user already exists' });
      return;
    }

    const passwordHash = await hashPassword(normalizedPassword);

    let createdUser;
    try {
      createdUser = createUserFromInvite(invite, passwordHash, normalizedDisplayName);
    } catch (error) {
      if (error.code === 'INVALID_INVITE_TOKEN') {
        res.status(400).json({ error: 'invalid invite token' });
        return;
      }

      if (error.message.includes('UNIQUE constraint failed: users.email')) {
        res.status(409).json({ error: 'user already exists' });
        return;
      }

      throw error;
    }

    res.status(201).json({ user: toSafeUser(createdUser) });
  });

  router.get('/auth/me', authMiddleware, (req, res) => {
    res.json(toSafeUser(req.user));
  });

  router.post('/auth/change-password', authMiddleware, async (req, res) => {
    const { old_password, oldPassword, new_password, newPassword } = req.body ?? {};
    const normalizedOldPassword =
      typeof old_password === 'string'
        ? old_password
        : typeof oldPassword === 'string'
          ? oldPassword
          : '';
    const normalizedNewPassword =
      typeof new_password === 'string'
        ? new_password
        : typeof newPassword === 'string'
          ? newPassword
          : '';

    if (!normalizedOldPassword || normalizedOldPassword.trim() === '') {
      res.status(400).json({ error: 'old_password is required' });
      return;
    }

    if (!normalizedNewPassword || normalizedNewPassword.trim() === '') {
      res.status(400).json({ error: 'new_password is required' });
      return;
    }

    const user = selectPasswordHashByUserId.get(req.user.id);
    if (!user) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const passwordMatches = await verifyPassword(normalizedOldPassword, user.password_hash);
    if (!passwordMatches) {
      res.status(400).json({ error: 'old password is incorrect' });
      return;
    }

    const nextPasswordHash = await hashPassword(normalizedNewPassword);
    updatePasswordHashByUserId.run(nextPasswordHash, req.user.id);

    res.status(200).json({ ok: true });
  });

  return router;
}
