/**
 * End-to-end smoke test of the interactions that define the site: the
 * answer-first omnibox, the command palette, state-in-URL converters, the
 * flagship visualizer, and a few tools whose output is easy to assert.
 *
 * Usage: node scripts/smoke.mjs   (with `npm run preview` already serving)
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const ORIGIN = process.env.PREVIEW_URL ?? 'http://localhost:4173';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || undefined;

// The sitemap's shortest entry is the home page, which carries whatever base
// path the build was made with — so this suite works for any deployment.
const locs = [...readFileSync('build/sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(
	(m) => m[1]
);
const BASE = ORIGIN + locs.reduce((a, b) => (a.length <= b.length ? a : b)).replace(/\/$/, '');

const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on('console', (message) => {
	if (message.type() === 'error') errors.push(`[console] ${page.url()} :: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`[pageerror] ${page.url()} :: ${error.message}`));

const results = [];
const check = (name, pass, detail = '') => {
	results.push({ name, pass });
	console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

// The omnibox answers in place rather than linking to a tool.
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.fill('input[role="combobox"]', '3 tbsp to tsp');
await page.waitForTimeout(400);
const answer = (await page.locator('.answer-value').first().textContent())?.trim();
check('omnibox answers "3 tbsp to tsp"', answer === '9 teaspoons', answer);

await page.fill('input[role="combobox"]', '15% of 80');
await page.waitForTimeout(300);
const percent = (await page.locator('.answer-value').first().textContent())?.trim();
check('omnibox answers "15% of 80"', percent === '12', percent);

await page.keyboard.press('Escape');
await page.click('body');
await page.keyboard.press('Control+k');
await page.waitForTimeout(300);
check('Cmd-K opens the command palette', await page.locator('[role="dialog"]').isVisible());
await page.keyboard.press('Escape');

// State in the URL: read on load, written back on change.
await page.goto(`${BASE}/convert/tablespoon-to-teaspoon?value=3`, { waitUntil: 'networkidle' });
const converted = (await page.locator('.result.primary output').first().textContent())?.trim();
check('pair converter reads state from the URL', converted?.includes('9 teaspoons'), converted);

await page.fill('#conv-value', '5');
await page.waitForTimeout(300);
const reconverted = (await page.locator('.result.primary output').first().textContent())?.trim();
check('converter recomputes on input', reconverted?.includes('15 teaspoons'), reconverted);
check('converter writes state back to the URL', page.url().includes('value=5'));

// The flagship visualizer.
await page.goto(`${BASE}/visualize/supply-and-demand`, { waitUntil: 'networkidle' });
const equilibrium = (await page.locator('.result.primary output').first().textContent())?.trim();
check('supply & demand computes equilibrium', equilibrium === '60', equilibrium);
await page.selectOption('#sd-intervention', 'tax');
await page.waitForTimeout(300);
check('tax mode reveals deadweight loss', (await page.locator('text=Deadweight loss').count()) > 0);

await page.goto(`${BASE}/dev/qr-code`, { waitUntil: 'networkidle' });
const modules = await page.locator('.qr-wrap svg path').count();
check('QR code renders modules', modules > 0, `${modules} path element(s)`);

await page.goto(`${BASE}/math/scientific-calculator`, { waitUntil: 'networkidle' });
await page.fill('#calc-input', '2 + 3 * sin(pi/2)');
await page.waitForTimeout(300);
const calculated = (await page.locator('.result.primary output').first().textContent())?.trim();
check('scientific calculator evaluates', calculated === '5', calculated);

await page.goto(`${BASE}/stats/descriptive-statistics`, { waitUntil: 'networkidle' });
await page.fill('#ds-data', '2, 4, 4, 4, 5, 5, 7, 9');
await page.waitForTimeout(300);
const mean = (await page.locator('.result.primary output').first().textContent())?.trim();
check('descriptive statistics computes the mean', mean === '5', mean);

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.click('button[aria-label*="Switch theme"]');
await page.click('button[aria-label*="Switch theme"]');
await page.waitForTimeout(200);
const theme = await page.getAttribute('html', 'data-theme');
check('theme toggle sets a theme', theme === 'light' || theme === 'dark', theme ?? 'none');

await page.goto(`${BASE}/cooking`, { waitUntil: 'networkidle' });
check('category page lists tools', (await page.locator('.tool-card').count()) >= 5);

await page.goto(`${BASE}/all`, { waitUntil: 'networkidle' });
const cards = await page.locator('.tool-card').count();
check('all-tools index lists everything', cards > 100, `${cards} cards`);

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log('\n' + '='.repeat(60));
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (errors.length) {
	console.log(`\n${errors.length} console/page errors:`);
	for (const error of errors.slice(0, 20)) console.log('  ' + error);
} else {
	console.log('No console or page errors.');
}
process.exit(failed.length || errors.length ? 1 : 0);
