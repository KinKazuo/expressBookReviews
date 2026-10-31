const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const app = require('../index');
const books = require('../router/booksdb');
const { users } = require('../router/users');
const { createBookClient } = require('../router/general');

let server;
let baseURL;
let client;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseURL = `http://127.0.0.1:${server.address().port}`;
  client = createBookClient(baseURL);
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});
beforeEach(() => {
  users.clear();
  for (const book of Object.values(books)) book.reviews = {};
});

async function request(path, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(baseURL + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
async function login(username = 'reader_one') {
  const body = { username, password: 'BookPassword123!' };
  assert.equal((await request('/register', { method: 'POST', body })).status, 201);
  const result = await request('/customer/login', { method: 'POST', body });
  assert.equal(result.status, 200);
  assert.ok(result.cookie);
  return result.cookie;
}

test('lists all ten original books with unchanged titles and authors', async () => {
  const result = await request('/');
  assert.equal(result.status, 200);
  assert.equal(Object.keys(result.data).length, 10);
  assert.deepEqual(result.data, JSON.parse(JSON.stringify(books)));
});
test('finds books by ISBN, author and partial case-insensitive title', async () => {
  assert.equal((await client.getBooksByISBN('1')).title, 'Things Fall Apart');
  assert.deepEqual(Object.keys(await client.getBooksByAuthor('unknown')), ['4', '5', '6', '7']);
  assert.equal((await client.getBooksByAuthor('Chinua Achebe'))['1'].title, 'Things Fall Apart');
  assert.equal((await client.getBooksByTitle('pride'))['8'].author, 'Jane Austen');
  assert.equal((await client.getBooksByTitle("Njál's Saga"))['7'].author, 'Unknown');
  assert.deepEqual(await client.getBooksByTitle('not-a-book'), {});
});
test('returns initial reviews and handles missing ISBNs safely', async () => {
  assert.deepEqual((await request('/review/1')).data, {});
  for (const path of ['/isbn/999', '/review/999', '/isbn/toString', '/isbn/__proto__']) {
    assert.equal((await request(path)).status, 404);
  }
  await assert.rejects(client.getBooksByISBN('999'), error => error.response.status === 404);
});
test('registers valid users, rejects duplicates and never stores plaintext passwords', async () => {
  const body = { username: 'reader_one', password: 'BookPassword123!' };
  assert.equal((await request('/register', { method: 'POST', body })).status, 201);
  assert.equal((await request('/register', { method: 'POST', body })).status, 409);
  assert.equal(users.get(body.username).password, undefined);
  assert.ok(Buffer.isBuffer(users.get(body.username).hash));
  for (const invalid of [{}, { username: 'a', password: 'short' }, { username: {}, password: [] }]) {
    assert.equal((await request('/register', { method: 'POST', body: invalid })).status, 400);
  }
});
test('prevents duplicate accounts during concurrent registration', async () => {
  const body = { username: 'same_reader', password: 'BookPassword123!' };
  const results = await Promise.all([request('/register', { method: 'POST', body }), request('/register', { method: 'POST', body })]);
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  assert.equal(users.size, 1);
});
test('rejects unregistered and wrong-password logins and accepts valid credentials', async () => {
  assert.equal((await request('/customer/login', { method: 'POST', body: { username: 'nobody', password: 'BookPassword123!' } })).status, 401);
  await login();
  assert.equal((await request('/customer/login', { method: 'POST', body: { username: 'reader_one', password: 'wrongpassword' } })).status, 401);
});
test('requires authentication for both review write endpoints', async () => {
  for (const method of ['PUT', 'DELETE']) assert.equal((await request('/customer/auth/review/1', { method, body: { review: 'Unauthorized' } })).status, 401);
  assert.deepEqual(books[1].reviews, {});
});
test('adds and updates a review with the same authenticated username', async () => {
  const cookie = await login();
  const added = await request('/customer/auth/review/1', { method: 'PUT', cookie, body: { review: 'An excellent novel.' } });
  assert.equal(added.status, 201);
  assert.equal(added.data.reviews.reader_one, 'An excellent novel.');
  const updated = await request('/customer/auth/review/1?review=Updated%20review', { method: 'PUT', cookie });
  assert.equal(updated.status, 200);
  assert.deepEqual(updated.data.reviews, { reader_one: 'Updated review' });
  assert.deepEqual((await request('/review/1')).data, updated.data.reviews);
});
test('deletes only the logged-in user review and preserves another user review', async () => {
  const [firstCookie, secondCookie] = await Promise.all([login('reader_one'), login('reader_two')]);
  await Promise.all([
    request('/customer/auth/review/1', { method: 'PUT', cookie: firstCookie, body: { review: 'First reader' } }),
    request('/customer/auth/review/1', { method: 'PUT', cookie: secondCookie, body: { review: 'Second reader' } }),
  ]);
  assert.equal(Object.keys(books[1].reviews).length, 2);
  const removed = await request('/customer/auth/review/1?username=reader_two', { method: 'DELETE', cookie: firstCookie });
  assert.equal(removed.status, 200);
  assert.match(removed.data.message, /deleted successfully/);
  assert.deepEqual(removed.data.reviews, { reader_two: 'Second reader' });
  assert.equal((await request('/customer/auth/review/1', { method: 'DELETE', cookie: firstCookie })).status, 404);
});
test('ignores forged usernames and validates review bodies and ISBNs', async () => {
  const cookie = await login();
  const result = await request('/customer/auth/review/1?username=somebody_else', { method: 'PUT', cookie, body: { username: 'somebody_else', review: 'My own review' } });
  assert.deepEqual(result.data.reviews, { reader_one: 'My own review' });
  for (const review of ['', '   ', 42, {}, 'a'.repeat(5001)]) assert.equal((await request('/customer/auth/review/1', { method: 'PUT', cookie, body: { review } })).status, 400);
  for (const method of ['PUT', 'DELETE']) assert.equal((await request('/customer/auth/review/999', { method, cookie, body: { review: 'Test' } })).status, 404);
});
test('handles prototype-like usernames as own review keys without changing prototypes', async () => {
  const cookie = await login('__proto__');
  await request('/customer/auth/review/1', { method: 'PUT', cookie, body: { review: 'A legitimate review' } });
  assert.equal(Object.hasOwn(books[1].reviews, '__proto__'), true);
  assert.equal(Object.getPrototypeOf(books[1].reviews), Object.prototype);
});
test('logs out and invalidates the existing session', async () => {
  const cookie = await login();
  assert.equal((await request('/customer/logout', { method: 'POST', cookie })).status, 200);
  assert.equal((await request('/customer/auth/review/1', { method: 'PUT', cookie, body: { review: 'Test' } })).status, 401);
});
test('retrieves all books through the asynchronous Axios callback', async () => {
  let returned = false;
  const result = new Promise((resolve, reject) => {
    client.getAllBooks((error, data) => {
      assert.equal(returned, true);
      if (error) reject(error); else resolve(data);
    });
    returned = true;
  });
  assert.equal(Object.keys(await result).length, 10);
});
test('propagates Axios connection failures to the promise and callback', async () => {
  const unavailable = createBookClient('http://127.0.0.1:1');
  await assert.rejects(unavailable.getBooksByTitle('Pride'));
  const callbackError = new Promise(resolve => unavailable.getAllBooks(error => resolve(error)));
  assert.ok(await callbackError);
});
test('serves forty concurrent Axios searches consistently', async () => {
  const jobs = Array.from({ length: 10 }, () => [client.getAllBooks(), client.getBooksByISBN('1'), client.getBooksByAuthor('Unknown'), client.getBooksByTitle('Pride')]).flat();
  const results = await Promise.all(jobs);
  assert.equal(results.length, 40);
  for (let i = 0; i < results.length; i += 4) {
    assert.equal(Object.keys(results[i]).length, 10);
    assert.equal(results[i + 1].author, 'Chinua Achebe');
    assert.equal(Object.keys(results[i + 2]).length, 4);
    assert.equal(results[i + 3]['8'].title, 'Pride and Prejudice');
  }
});
test('returns JSON errors for malformed JSON and unknown routes', async () => {
  const invalid = await fetch(baseURL + '/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
  assert.equal(invalid.status, 400);
  assert.equal((await request('/missing')).status, 404);
});
