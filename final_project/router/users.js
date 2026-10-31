const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const deriveKey = promisify(scrypt);
const users = new Map();

function validCredentials(username, password) {
  return typeof username === 'string' && /^[A-Za-z0-9_.-]{3,50}$/.test(username)
    && typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

async function registerUser(username, password) {
  if (!validCredentials(username, password)) {
    return { status: 400, message: 'Use a 3–50 character username (letters, digits, _, ., -) and an 8–128 character password' };
  }
  if (users.has(username)) return { status: 409, message: 'Username already exists' };
  const salt = randomBytes(16).toString('hex');
  const hash = await deriveKey(password, salt, 64);
  // A competing registration can finish while scrypt runs. Recheck before writing.
  if (users.has(username)) return { status: 409, message: 'Username already exists' };
  users.set(username, { salt, hash });
  return { status: 201, message: 'User successfully registered. You can now log in.' };
}

async function authenticatedUser(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string' || password.length > 128) return false;
  const user = users.get(username);
  if (!user) return false;
  const hash = await deriveKey(password, user.salt, 64);
  return timingSafeEqual(hash, user.hash);
}

module.exports = { users, validCredentials, registerUser, authenticatedUser, isValid: username => users.has(username) };
