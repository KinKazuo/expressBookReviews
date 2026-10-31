const express = require('express');
const jwt = require('jsonwebtoken');
const books = require('./booksdb');
const { users, isValid, authenticatedUser } = require('./users');
const regd_users = express.Router();

function requireAuthentication(req, res, next) {
  try {
    const token = req.session?.authorization?.accessToken;
    if (!token) return res.status(401).json({ message: 'You must log in to manage reviews' });
    const payload = jwt.verify(token, req.app.locals.jwtSecret, { algorithms: ['HS256'] });
    if (!isValid(payload.username)) return res.status(401).json({ message: 'Invalid user session' });
    req.username = payload.username;
    return next();
  } catch {
    return res.status(401).json({ message: 'Session is invalid or expired. Please log in again.' });
  }
}

regd_users.post('/login', async (req, res, next) => {
  const { username, password } = req.body || {};
  if (!await authenticatedUser(username, password)) return res.status(401).json({ message: 'Invalid username or password' });
  // Rotate the session ID on login; save before returning a successful response.
  req.session.regenerate(error => {
    if (error) return next(error);
    req.session.authorization = {
      accessToken: jwt.sign({ username }, req.app.locals.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' }),
    };
    req.session.save(error => {
      if (error) return next(error);
      return res.json({ message: 'User successfully logged in', username });
    });
  });
});

regd_users.put('/auth/review/:isbn', (req, res) => {
  const { isbn } = req.params;
  if (!Object.hasOwn(books, isbn)) return res.status(404).json({ message: 'Book not found' });
  const review = req.body?.review ?? req.query.review;
  if (typeof review !== 'string' || !review.trim() || review.length > 5000) return res.status(400).json({ message: 'Review must contain 1–5000 characters' });
  const reviews = books[isbn].reviews;
  const updated = Object.hasOwn(reviews, req.username);
  // Ownership comes from the verified session, never a username in request input.
  // A synchronous property write preserves concurrent reviews by other users.
  Object.defineProperty(reviews, req.username, { value: review.trim(), writable: true, enumerable: true, configurable: true });
  return res.status(updated ? 200 : 201).json({ message: updated ? 'Review updated successfully' : 'Review added successfully', isbn, reviews });
});

regd_users.delete('/auth/review/:isbn', (req, res) => {
  const { isbn } = req.params;
  if (!Object.hasOwn(books, isbn)) return res.status(404).json({ message: 'Book not found' });
  const reviews = books[isbn].reviews;
  if (!Object.hasOwn(reviews, req.username)) return res.status(404).json({ message: 'No review found for this user' });
  delete reviews[req.username];
  return res.json({ message: `Review for ISBN ${isbn} deleted successfully`, isbn, reviews });
});

regd_users.post('/logout', (req, res, next) => {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie('bookshop.sid');
    return res.json({ message: 'User successfully logged out' });
  });
});
module.exports = { authenticated: regd_users, requireAuthentication, users, isValid, authenticatedUser };
