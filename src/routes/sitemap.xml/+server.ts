import { base } from '$app/paths';
import { CATEGORIES, TOOLS, toolPath } from '$lib/catalog';

export const prerender = true;

/**
 * Every page on the site is static and public, so the sitemap is simply the
 * catalog plus the handful of index pages.
 */
export function GET() {
	const paths = [
		'/',
		'/all',
		'/about',
		...CATEGORIES.map((category) => `/${category.id}`),
		...TOOLS.map(toolPath)
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths
	.map(
		(path) =>
			`\t<url>\n\t\t<loc>${base}${path}</loc>\n\t\t<changefreq>monthly</changefreq>\n\t\t<priority>${path === '/' ? '1.0' : path.split('/').length === 2 ? '0.8' : '0.6'}</priority>\n\t</url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(body, {
		headers: { 'Content-Type': 'application/xml' }
	});
}
