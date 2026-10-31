const { spawnSync, spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const root = path.resolve(__dirname, '../..');
const baseURL = process.env.BOOKSHOP_API_URL || 'http://127.0.0.1:5000';
const curl = process.platform === 'win32' ? 'curl.exe' : 'curl';
const jar = '.evidence-cookies.txt';
const names = ['githubrepo', 'getallbooks', 'getbooksbyISBN', 'getbooksbyauthor', 'getbooksbytitle', 'getbookreview', 'register', 'login', 'reviewadded', 'deletereview'];
const results = new Map();

function runCurl(args, expectedStatus) {
  const response = spawnSync(curl, ['--silent', '--show-error', '--max-time', '15', ...args, '--write-out', '\nHTTP %{http_code}\n'], { cwd: root, encoding: 'utf8' });
  if (response.status !== 0) throw new Error(response.stderr || `cURL exit ${response.status}`);
  const status = Number(response.stdout.match(/HTTP (\d{3})\s*$/)?.[1]);
  assert.equal(status, expectedStatus, response.stdout);
  return response.stdout.trim();
}
function save(name, command, output) {
  const entry = `Command:\n${command}\n\nOutput:\n${output}\n`;
  results.set(name, (results.get(name) || '') + (results.has(name) ? '\n' : '') + entry);
}

async function main() {
  // Spawn a fresh server so registration and initial empty reviews are reproducible.
  const server = spawn(process.execPath, ['index.js'], { cwd: path.join(root, 'final_project'), stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: new URL(baseURL).port || '5000' } });
  let serverErrors = '';
  server.stderr.on('data', chunk => { serverErrors += chunk; });
  try {
    await Promise.race([
      once(server.stdout, 'data'),
      once(server, 'exit').then(() => { throw new Error(serverErrors || 'Server stopped before listening'); }),
      new Promise((_, reject) => { const timeout = setTimeout(() => reject(new Error('Server start timed out')), 15000); timeout.unref(); }),
    ]);

    const github = spawnSync(curl, ['--silent', '--show-error', '--fail', '--max-time', '30', 'https://api.github.com/repos/KinKazuo/expressBookReviews'], { encoding: 'utf8' });
    if (github.status !== 0) throw new Error(github.stderr);
    const summary = spawnSync(process.execPath, ['final_project/scripts/fork-summary.js'], { input: github.stdout, cwd: root, encoding: 'utf8' });
    if (summary.status !== 0) throw new Error(summary.stderr);
    save('githubrepo', 'curl --silent --show-error --fail "https://api.github.com/repos/KinKazuo/expressBookReviews" | node final_project/scripts/fork-summary.js', summary.stdout.trim());

    for (const [name, endpoint] of [['getallbooks', '/'], ['getbooksbyISBN', '/isbn/1'], ['getbooksbyauthor', '/author/Unknown'], ['getbooksbytitle', '/title/Pride'], ['getbookreview', '/review/1']]) {
      save(name, `curl --silent --show-error "${baseURL}${endpoint}" --write-out '\\nHTTP %{http_code}\\n'`, runCurl([baseURL + endpoint], 200));
    }
    const credentials = JSON.stringify({ username: 'bookreader_demo', password: 'DemoPassword123!' });
    save('register', `curl --silent --show-error --request POST "${baseURL}/register" --header 'Content-Type: application/json' --data '${credentials}' --write-out '\\nHTTP %{http_code}\\n'`, runCurl(['--request', 'POST', baseURL + '/register', '--header', 'Content-Type: application/json', '--data', credentials], 201));
    save('login', `curl --silent --show-error --request POST "${baseURL}/customer/login" --header 'Content-Type: application/json' --data '${credentials}' --cookie-jar ${jar} --write-out '\\nHTTP %{http_code}\\n'`, runCurl(['--request', 'POST', baseURL + '/customer/login', '--header', 'Content-Type: application/json', '--data', credentials, '--cookie-jar', jar], 200));
    for (const [review, status] of [['An insightful novel with memorable characters.', 201], ['A powerful story about tradition and change. Highly recommended.', 200]]) {
      const body = JSON.stringify({ review });
      save('reviewadded', `curl --silent --show-error --request PUT "${baseURL}/customer/auth/review/1" --cookie ${jar} --header 'Content-Type: application/json' --data '${body}' --write-out '\\nHTTP %{http_code}\\n'`, runCurl(['--request', 'PUT', baseURL + '/customer/auth/review/1', '--cookie', jar, '--header', 'Content-Type: application/json', '--data', body], status));
    }
    save('deletereview', `curl --silent --show-error --request DELETE "${baseURL}/customer/auth/review/1" --cookie ${jar} --write-out '\\nHTTP %{http_code}\\n'`, runCurl(['--request', 'DELETE', baseURL + '/customer/auth/review/1', '--cookie', jar], 200));

    for (const name of names) await fs.writeFile(path.join(root, name), results.get(name), 'utf8');
    const url = 'https://github.com/KinKazuo/expressBookReviews/blob/main/final_project/router/general.js';
    const combined = ['# Book Review — answers for Questions 1–11', '', 'Paste each answer below into the corresponding question. Commands were executed against a fresh local server; outputs are captured from cURL, not fabricated. Demo credentials are fictional and exist only in that temporary server process.', ''];
    for (const [index, name] of names.entries()) combined.push(`## Question ${index + 1} — ${name}`, '', '```text', results.get(name).trim(), '```', '');
    combined.push('## Question 11 — general.js', '', url, '', 'The current official upstream is ibm-developer-skills-network/expressBookReviews (plural); the singular URL printed in the assignment returns 404. The fork metadata in Question 1 identifies the real IBM parent.', '');
    await fs.writeFile(path.join(root, 'SUBMISSION.md'), combined.join('\n'), 'utf8');
    console.log(`Captured ${names.length} real cURL evidence files and SUBMISSION.md`);
  } finally {
    server.kill();
    await fs.unlink(path.join(root, jar)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
