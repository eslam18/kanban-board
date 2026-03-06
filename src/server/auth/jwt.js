import jwt from 'jsonwebtoken';

const DEFAULT_EXPIRES_IN = '7d';
const DEV_FALLBACK_SECRET = 'qanat-local-dev-secret';

function getJwtSecret() {
  return process.env.JWT_SECRET || DEV_FALLBACK_SECRET;
}

export function signAuthToken(payload, options = {}) {
  const mergedOptions = {
    expiresIn: DEFAULT_EXPIRES_IN,
    ...options,
  };

  return jwt.sign(payload, getJwtSecret(), mergedOptions);
}

export function verifyAuthToken(token, options = {}) {
  return jwt.verify(token, getJwtSecret(), options);
}
