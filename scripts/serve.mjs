/**
 * Minimal static file server for the built site.
 *
 * `vite preview` serves at the origin root regardless of paths.base, so it
 * cannot exercise a subdirectory deployment. This mirrors what a static host
 * actually does — extensionless URLs map to .html, unknown paths fall back to
 * 404.html — and honours BASE_PATH, so the GitHub Pages layout can be tested
 * locally exactly as it will be served.
 *
 * Usage: BASE_PATH=/repo node scripts/serve.mjs
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, normalize, resolve, sep } from 'node:path';
import process from 'node:process';

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.xml': 'application/xml; charset=utf-8',
	'.txt': 'text/plain; charset=utf-8',
	'.webmanifest': 'application/manifest+json',
	'.png': 'image/png',
	'.woff2': 'font/woff2'
};

export function startServer({ root = 'build', base = '', port = 4173 } = {}) {
	const dir = resolve(root);

	const server = createServer(async (request, response) => {
		const url = new URL(request.url ?? '/', 'http://localhost');
		let pathname = decodeURIComponent(url.pathname);

		if (base && !pathname.startsWith(base)) return send(response, 404, dir, base);
		pathname = pathname.slice(base.length) || '/';

		const file = await locate(dir, pathname);
		if (!file) return send(response, 404, dir, base);

		response.writeHead(200, { 'content-type': TYPES[extension(file)] ?? 'application/octet-stream' });
		createReadStream(file).pipe(response);
	});

	return new Promise((ready) => {
		server.listen(port, '127.0.0.1', () => ready(server));
	});
}

function extension(file) {
	const dot = file.lastIndexOf('.');
	return dot === -1 ? '' : file.slice(dot);
}

/** Resolve a URL path to a file the way a static host would. */
async function locate(dir, pathname) {
	const safe = normalize(join(dir, pathname));
	if (safe !== dir && !safe.startsWith(dir + sep)) return null; // no traversal above the root

	for (const candidate of pathname.endsWith('/') ? [join(safe, 'index.html')] : [safe, `${safe}.html`, join(safe, 'index.html')]) {
		try {
			if ((await stat(candidate)).isFile()) return candidate;
		} catch {
			/* try the next shape */
		}
	}
	return null;
}

async function send(response, status, dir, base) {
	const fallback = join(dir, '404.html');
	try {
		if ((await stat(fallback)).isFile()) {
			response.writeHead(status, { 'content-type': TYPES['.html'] });
			return createReadStream(fallback).pipe(response);
		}
	} catch {
		/* fall through to plain text */
	}
	response.writeHead(status, { 'content-type': TYPES['.txt'] });
	response.end(base ? `Not found. This build is served from ${base}\n` : 'Not found\n');
}

// Run directly: BASE_PATH=/repo node scripts/serve.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
	const base = (process.env.BASE_PATH ?? '').replace(/\/+$/, '');
	const port = Number(process.env.PREVIEW_PORT ?? 4173);
	await startServer({ base, port });
	console.log(`Serving build/ at http://127.0.0.1:${port}${base}/`);
}
