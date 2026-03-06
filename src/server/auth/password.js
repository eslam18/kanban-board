import bcrypt from 'bcrypt';

const DEFAULT_SALT_ROUNDS = 10;

function getSaltRounds() {
  const fromEnv = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '', 10);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_SALT_ROUNDS;
}

export function hashPassword(password) {
  return bcrypt.hash(password, getSaltRounds());
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function hashPasswordSync(password) {
  return bcrypt.hashSync(password, getSaltRounds());
}

export function verifyPasswordSync(password, passwordHash) {
  return bcrypt.compareSync(password, passwordHash);
}
