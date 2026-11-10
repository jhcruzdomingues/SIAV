import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

// Strict, loopback-only, read-only test server. No SPA fallback or source-directory access.
export async function serveDist(directory) {
  const root = resolve(directory);
  const requests = [];
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const path = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const file = resolve(root, '.' + path);
      if (!file.startsWith(root + sep) || !['GET', 'HEAD'].includes(request.method) || !(await stat(file)).isFile()) throw new Error('not found');
      const body = await readFile(file);
      const types = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
      requests.push({ path: url.pathname, status: 200 });
      response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=0' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      requests.push({ path: request.url, status: 404 });
      response.writeHead(404, { 'Content-Type': 'text/plain' }); response.end('Not found');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, requests,
    close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}
