#!/usr/bin/env node
/**
 * Iran Watch proxy service
 *
 * Minimal HTTP server that proxies RSS feed requests server-side,
 * adding CORS headers so the browser can read cross-origin responses.
 *
 * In Docker: runs as a separate service; nginx forwards /proxy requests here.
 * In dev:    started automatically via `npm run dev` (concurrently + vite proxy).
 *
 * Usage: tsx server/proxy.ts
 * Port:  7475 (internal only — not exposed to the host)
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

const PORT = parseInt(process.env['PROXY_PORT'] ?? '7475', 10);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
};

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const target = url.searchParams.get('url'); // URLSearchParams auto-decodes %3A%2F%2F → ://

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (!target) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing ?url= parameter');
    return;
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        'User-Agent': 'IranWatch/1.0 RSS Reader',
        Accept: 'application/rss+xml, application/atom+xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(15_000),
    });

    const body = await upstream.text();

    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') ?? 'text/xml',
      'Cache-Control': 'no-store',
      ...CORS_HEADERS,
    });
    res.end(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[proxy] ${target} → ${message}`);
    res.writeHead(502, { 'Content-Type': 'text/plain', ...CORS_HEADERS });
    res.end(message);
  }
}

createServer((req, res) => {
  handleRequest(req, res).catch((err: unknown) => {
    console.error('[proxy] unhandled error:', err);
    res.writeHead(500);
    res.end('Internal server error');
  });
}).listen(PORT, () => {
  console.log(`  Proxy service: http://localhost:${PORT}/proxy?url=<feed-url>`);
});
