/**
 * Crawl every page in the built sitemap and fail on any runtime problem.
 *
 * Unit tests cover the maths and svelte-check covers the types; this covers the
 * third category — components that only break once they hydrate in a browser.
 * It has already earned its keep: it caught an infinite reactive loop in the
 * sorting visualizer that neither of the other two layers could see.
 *
 * Usage: node scripts/crawl.mjs   (with `npm run preview` already serving)
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const ORIGIN = process.env.PREVIEW_URL ?? 'http://localhost:4173';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || undefined;
const MAX_REPORTED = 40;

const sitemap = readFileSync('build/sitemap.xml', 'utf8');
// <loc> already carries the deployment base path, so this works for a root
// deployment and for a GitHub Pages project site alike.
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

if (paths.length === 0) {
	console.error('No URLs in build/sitemap.xml — did the build run?');
	process.exit(1);
}

const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const problems = [];
let current = '';
page.on('console', (message) => {
	if (message.type() === 'error') problems.push(`${current} :: console: ${message.text()}`);
});
page.on('pageerror', (error) => problems.push(`${current} :: pageerror: ${error.message}`));

for (const path of paths) {
	current = path;
	const response = await page.goto(ORIGIN + path, { waitUntil: 'load', timeout: 30000 });
	if (!response || response.status() >= 400) {
		problems.push(`${path} :: HTTP ${response?.status() ?? 'no response'}`);
		continue;
	}
	// Give hydration a moment so client-side errors surface.
	await page.waitForTimeout(120);
	const text = (await page.locator('main').innerText().catch(() => '')) || '';
	if (text.trim().length < 40) problems.push(`${path} :: main is essentially empty`);
	if ((await page.locator('h1').count()) === 0) problems.push(`${path} :: no <h1>`);
}

await browser.close();

console.log(`Crawled ${paths.length} pages.`);
if (problems.length) {
	console.log(`\n${problems.length} problems:`);
	for (const problem of problems.slice(0, MAX_REPORTED)) console.log('  ' + problem);
	if (problems.length > MAX_REPORTED) console.log(`  …and ${problems.length - MAX_REPORTED} more`);
	process.exit(1);
}
console.log('No console errors, no page errors, every page rendered with an h1.');
