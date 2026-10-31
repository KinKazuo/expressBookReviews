const express = require('express');
const session = require('express-session');
const { randomBytes } = require('node:crypto');
const { general } = require('./router/general');
const { authenticated, requireAuthentication } = require('./router/auth_users');

const app = express();
app.disable('x-powered-by');
app.set('json spaces', 2);
app.use(express.json({ limit: '16kb' }));
app.locals.jwtSecret = process.env.JWT_SECRET || randomBytes(48).toString('hex');
app.use('/customer', session({
  name: 'bookshop.sid',
  secret: process.env.SESSION_SECRET || randomBytes(48).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 60 * 60 * 1000 },
}));
app.use('/customer/auth', requireAuthentication);
app.use('/customer', authenticated);
app.use('/', general);
app.use((req, res) => res.status(404).json({ message: 'Endpoint not found' }));
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ message: 'Invalid JSON request body' });
  console.error(error.message);
  return res.status(error.status || 500).json({ message: 'Unable to process request' });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 5000);
  app.listen(port, '127.0.0.1', () => console.log(`Book review API running at http://127.0.0.1:${port}`));
}
module.exports = app;
