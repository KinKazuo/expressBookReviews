# Book Review Application — IBM Final Project

A Node.js and Express server for an online bookstore, with public book searches, user registration, session/JWT authentication, and per-user book reviews. Includes real asynchronous Axios clients and concurrent-access tests.

This repository is a **GitHub fork** of [ibm-developer-skills-network/expressBookReviews](https://github.com/ibm-developer-skills-network/expressBookReviews). The singular `expressBookReview` URL printed in the assignment currently returns 404; the available official IBM upstream uses the plural name. The original `final_project/router/booksdb.js` catalog remains unchanged and supplies all ten books.

## Assignment answers

Open **[SUBMISSION.md](./SUBMISSION.md)** for all eleven answers in question order. Questions 1–10 contain real cURL commands and captured outputs. Paste the full command and output into each TEXT field, rather than a file URL.

The ten evidence files are saved at the repository root with exactly the requested names: `githubrepo`, `getallbooks`, `getbooksbyISBN`, `getbooksbyauthor`, `getbooksbytitle`, `getbookreview`, `register`, `login`, `reviewadded`, and `deletereview`.

**Question 11 — public URL:**

https://github.com/KinKazuo/expressBookReviews/blob/main/final_project/router/general.js

`reviewadded` demonstrates both adding and modifying a review. The initial review in the supplied catalog is `{}`, which is shown honestly in `getbookreview`.

## Install and run

Requires Node.js 22 or later, npm, and cURL for evidence capture.

```sh
git clone https://github.com/KinKazuo/expressBookReviews.git
cd expressBookReviews/final_project
npm ci
npm start
```

The API listens on `http://127.0.0.1:5000`. Set `PORT` to use another port. The original book keys `1`–`10` are the ISBN identifiers expected by this exercise.

## Public endpoints

- `GET /` — all available books and details.
- `GET /isbn/:isbn` — book details by ISBN; unknown ISBN returns 404.
- `GET /author/:author` — case-insensitive author search, including partial matches.
- `GET /title/:title` — case-insensitive title search, including partial matches.
- `GET /review/:isbn` — reviews for a book.
- `POST /register` — JSON `{ "username": "reader", "password": "BookPassword123!" }`; creates a user with status 201.

Search results retain the original ISBN keys. No matching author/title returns an empty object. URL-encode names and titles containing spaces or Unicode.

## Authenticated endpoints

- `POST /customer/login` — JSON credentials; returns a success message and a session cookie.
- `PUT /customer/auth/review/:isbn` — JSON `{ "review": "My review" }`, or a `review` query parameter. Creates a review (201) or updates that same user's review (200).
- `DELETE /customer/auth/review/:isbn` — removes only the logged-in user's review.
- `POST /customer/logout` — destroys the session.

Use cURL `--cookie-jar` on login and `--cookie` on subsequent requests. User identity comes from the JWT in the server-side session; submitting a different username cannot edit another user's review. Invalid/missing authentication returns 401, invalid bodies return 400, duplicate usernames return 409, and missing books or own reviews return 404.

Usernames contain 3–50 letters, digits, dots, underscores or hyphens. Passwords contain 8–128 characters. Passwords are salted and hashed with asynchronous scrypt, rather than stored as plaintext. Sessions rotate on login and expire after one hour. Demo credentials in submission evidence are fictional and were used only in a temporary local process; session cookies are ignored by Git and removed after capture.

## Axios tasks in general.js

The same [general.js](./final_project/router/general.js) contains the public routes and four real HTTP client functions:

- `getAllBooks(callback)` — asynchronous error-first callback, also returns a Promise.
- `getBooksByISBN(isbn)` — Axios with Promise callbacks.
- `getBooksByAuthor(author)` — Axios with async/await.
- `getBooksByTitle(title)` — Axios with async/await.

Each function returns the response data and propagates request failures. `createBookClient(baseURL)` supports independent server addresses. Set `BOOKSHOP_API_URL` to change the default client address. With the server running, try:

```sh
node router/general.js all
node router/general.js isbn 1
node router/general.js author "Unknown"
node router/general.js title "Pride"
```

## Verification and reproducible evidence

```sh
npm test
npm audit
# Stop any server already using port 5000 before running this command:
npm run evidence
```

The evidence command starts a fresh local server, executes cURL requests, verifies their status codes, saves the ten named files plus `SUBMISSION.md`, deletes the temporary cookie jar, and stops its server. The GitHub evidence runs cURL against the public repository API and pipes its real output through `fork-summary.js` to retain only the fork-related fields.

Sixteen integration tests use a real listening HTTP server and cover the original catalog, ISBN/author/title searches, empty reviews, errors, registration, hashed passwords, login, session protection, review creation/modification/deletion, ownership, logout, Axios callbacks and rejection handling. Concurrent tests cover duplicate registration, two users writing reviews on the same book, and forty simultaneous Axios requests. GitHub Actions runs the tests and dependency audit.

## Scope

This is the course's in-memory, single-process application. Accounts, reviews and sessions reset when the server restarts. Concurrent writes by different users preserve each user's review; writes by the same user use last-write-wins behavior. A production deployment would require persistent shared data/session stores and HTTPS cookie configuration. Optional `SESSION_SECRET` and `JWT_SECRET` environment variables configure secrets; local runs generate random secrets automatically.

Implementation references: [Axios examples](https://axios-http.com/docs/example) and [Express session documentation](https://expressjs.com/en/resources/middleware/session/). The upstream Apache-2.0 license is retained in `LICENSE`.
