import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  hashPasswordSync,
  verifyPassword,
  verifyPasswordSync,
} from '../src/server/auth/password.js';
import { signAuthToken, verifyAuthToken } from '../src/server/auth/jwt.js';

describe('auth utilities', () => {
  it('hashes and verifies passwords asynchronously', async () => {
    const hash = await hashPassword('super-secret');

    expect(hash).not.toBe('super-secret');
    await expect(verifyPassword('super-secret', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('hashes and verifies passwords synchronously', () => {
    const hash = hashPasswordSync('sync-secret');

    expect(hash).not.toBe('sync-secret');
    expect(verifyPasswordSync('sync-secret', hash)).toBe(true);
    expect(verifyPasswordSync('invalid-secret', hash)).toBe(false);
  });

  it('signs and verifies JWT auth tokens', () => {
    const token = signAuthToken({ sub: 42, role: 'admin' });
    const decoded = verifyAuthToken(token);

    expect(decoded.sub).toBe(42);
    expect(decoded.role).toBe('admin');
    expect(decoded.exp).toBeTypeOf('number');
  });
});
