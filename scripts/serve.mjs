/**
 * The page is plain files, so this is only here to open them over http://
 * (ES modules do not load from file://).
 *
 *   npm start            then open http://localhost:4321
 *
 * Serves this folder and nothing outside it. No dependencies.
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const port = Number(process.env.PORT) || 4321;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
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
}).listen(port, () => console.log(`jev-builder on http://localhost:${port}`));
