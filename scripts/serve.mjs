/**
 * The page is plain files, so this serves them over http:// (ES modules do not
 * load from file://) and, when you have a key, runs requests against Jev for
 * the page's Run button.
 *
 *   npm start                     then open http://localhost:4321
 *   TYPESAFE_API_KEY=... npm start
 *
 * Why a runner at all: api.typesafe.ai refuses cross-origin browser requests,
 * so a web page cannot call it however the key is handled. This proxy runs on
 * your own machine. The key is read from your environment (or a .env file
 * beside this repo), never from the page, never sent to the page, and never
 * logged. It listens on the loopback address only.
 *
 * Serves this folder and nothing outside it. No dependencies.
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const port = Number(process.env.PORT) || 4321;
const host = '127.0.0.1';
const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
const MAX_BODY_BYTES = 1_000_000;
const RUN_TIMEOUT_MS = 60_000;
const RUNS_PER_MINUTE = 120;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

/** The key comes from the environment, or a .env beside the repo. Never from a request. */
async function readKey() {
  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY.trim();
  try {
    const text = await readFile(join(root, '.env'), 'utf8');
    const line = text.split(/\r?\n/).find((row) => row.trim().startsWith('TYPESAFE_API_KEY='));
    return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '') : '';
  } catch {
    return '';
  }
}

function sendJson(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(body);
}

/** A page from somewhere else must not be able to spend your key. */
function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;                       // not a browser request
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

function readBody(request) {
  return new Promise((accept, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('request over 1 MB'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => accept(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

const recent = [];
function overRate() {
  const now = Date.now();
  while (recent.length && now - recent[0] > 60_000) recent.shift();
  if (recent.length >= RUNS_PER_MINUTE) return true;
  recent.push(now);
  return false;
}

async function runAgainstJev(request, response) {
  if (!sameOrigin(request)) return sendJson(response, 403, { error: 'This runner only answers its own page.' });
  const key = await readKey();
  if (!key) return sendJson(response, 503, { error: 'No TYPESAFE_API_KEY in this runner\'s environment.' });
  if (overRate()) return sendJson(response, 429, { error: `More than ${RUNS_PER_MINUTE} runs in a minute; wait a moment.` });

  let payload;
  try {
    payload = JSON.parse(await readBody(request));
  } catch (error) {
    return sendJson(response, 400, { error: 'That request body is not JSON: ' + error.message });
  }
  if (!payload || typeof payload !== 'object' || !payload.questions) {
    return sendJson(response, 400, { error: 'Send the request body, with state and questions.' });
  }

  const started = Date.now();
  try {
    const answer = await fetch(JEV_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(RUN_TIMEOUT_MS),
    });
    const text = await answer.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* keep the text below */ }
    const ms = Date.now() - started;
    if (!answer.ok) {
      const detail = data?.error?.message || data?.error || text.slice(0, 400) || answer.statusText;
      return sendJson(response, 502, { error: `Jev answered ${answer.status}: ${detail}`, status: answer.status, ms });
    }
    sendJson(response, 200, { data, ms });
  } catch (error) {
    const reason = error.name === 'TimeoutError' ? `no answer within ${RUN_TIMEOUT_MS / 1000}s` : error.message;
    sendJson(response, 504, { error: 'Could not reach Jev: ' + reason, ms: Date.now() - started });
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (url.pathname === '/api/ready') {
    return sendJson(response, 200, { runner: true, keyed: Boolean(await readKey()) });
  }
  if (url.pathname === '/api/run') {
    if (request.method !== 'POST') return sendJson(response, 405, { error: 'POST only' });
    return runAgainstJev(request, response);
  }

  const wanted = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = resolve(join(root, normalize(wanted)));
  // Never serve anything outside this folder, whatever the path says.
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403).end('Outside the project');
    return;
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    response.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
  }
}).listen(port, host, async () => {
  const keyed = Boolean(await readKey());
  console.log(`jev-builder on http://localhost:${port}`);
  console.log(keyed ? 'Run is on: TYPESAFE_API_KEY found, requests go straight to Jev from here.'
                    : 'Run is off: set TYPESAFE_API_KEY (or put it in .env) and restart to enable it.');
});
