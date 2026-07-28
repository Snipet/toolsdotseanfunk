/**
 * Serve the build and run the browser suites against it.
 *
 * Expects `npm run build` to have run already, and a Chromium available to
 * Playwright (`npx playwright install chromium`, or CHROMIUM_PATH pointing at
 * an existing binary). Set BASE_PATH to the same value used for the build to
 * exercise a subdirectory deployment.
 */
import { spawn } from 'node:child_process';
import process from 'node:process';
import { startServer } from './serve.mjs';

const port = Number(process.env.PREVIEW_PORT ?? 4173);
const base = (process.env.BASE_PATH ?? '').replace(/\/+$/, '');
const origin = `http://127.0.0.1:${port}`;

const server = await startServer({ base, port });
console.log(`Serving build/ at ${origin}${base}/\n`);

let failure = 0;
for (const script of ['scripts/smoke.mjs', 'scripts/crawl.mjs']) {
	failure = await run('node', [script]);
	if (failure !== 0) break;
}

server.close();
process.exit(failure);

function run(command, args) {
	return new Promise((done) => {
		const child = spawn(command, args, {
			stdio: 'inherit',
			env: { ...process.env, PREVIEW_URL: origin }
		});
		child.on('exit', (code) => done(code ?? 1));
	});
}
