const express = require('express');
const axios = require('axios');
const books = require('./booksdb');
const { registerUser } = require('./users');
const public_users = express.Router();

// Read the original IBM JSON-shaped catalog without changing its ISBNs or details.
public_users.get('/', (req, res) => res.json(books));
public_users.get('/isbn/:isbn', (req, res) => {
  if (!Object.hasOwn(books, req.params.isbn)) return res.status(404).json({ message: 'Book not found' });
  return res.json(books[req.params.isbn]);
});

function searchBooks(field, query) {
  const term = query.toLocaleLowerCase().trim();
  return Object.fromEntries(Object.entries(books).filter(([, book]) => book[field].toLocaleLowerCase().includes(term)));
}
public_users.get('/author/:author', (req, res) => res.json(searchBooks('author', req.params.author)));
public_users.get('/title/:title', (req, res) => res.json(searchBooks('title', req.params.title)));
public_users.get('/review/:isbn', (req, res) => {
  if (!Object.hasOwn(books, req.params.isbn)) return res.status(404).json({ message: 'Book not found' });
  return res.json(books[req.params.isbn].reviews);
});
public_users.post('/register', async (req, res) => {
  const { username, password } = req.body || {};
  const result = await registerUser(username, password);
  return res.status(result.status).json({ message: result.message });
});

/** Tasks 11–14: asynchronous retrieval using real Axios HTTP calls.
 * The helpers call the public API; the route handlers read the supplied catalog.
 * Separate clients can address different servers without changing global state.
 */
function createBookClient(baseURL = process.env.BOOKSHOP_API_URL || 'http://127.0.0.1:5000') {
  const client = axios.create({ baseURL, timeout: 10000, proxy: false });

  // Async callback form with an optional returned Promise for await callers.
  function getAllBooks(callback) {
    const request = client.get('/').then(response => response.data);
    if (typeof callback === 'function') request.then(data => callback(null, data), error => callback(error));
    return request;
  }
  // Promise callback implementation for an ISBN lookup.
  function getBooksByISBN(isbn) {
    return client.get(`/isbn/${encodeURIComponent(isbn)}`).then(response => response.data);
  }
  // Async/await implementations for author and title searches.
  async function getBooksByAuthor(author) {
    const response = await client.get(`/author/${encodeURIComponent(author)}`);
    return response.data;
  }
  async function getBooksByTitle(title) {
    const response = await client.get(`/title/${encodeURIComponent(title)}`);
    return response.data;
  }
  return { getAllBooks, getBooksByISBN, getBooksByAuthor, getBooksByTitle };
}

module.exports = { general: public_users, createBookClient, ...createBookClient() };

// Examples: node router/general.js all | isbn 1 | author "Unknown" | title "Pride"
if (require.main === module) {
  const [command = 'all', ...parts] = process.argv.slice(2);
  const methods = { all: 'getAllBooks', isbn: 'getBooksByISBN', author: 'getBooksByAuthor', title: 'getBooksByTitle' };
  const method = methods[command];
  if (!method) {
    console.error('Usage: node router/general.js [all|isbn|author|title] [search value]');
    process.exitCode = 1;
  } else {
    module.exports[method](...(command === 'all' ? [] : [parts.join(' ')]))
      .then(data => console.log(JSON.stringify(data, null, 2)))
      .catch(error => { console.error(error.response?.data || error.message); process.exitCode = 1; });
  }
}
