import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

/**
 * Where the site is served from. Empty for a root deployment (Cloudflare
 * Pages); GitHub Pages project sites are served from /<repo>, and the deploy
 * workflow passes that in as BASE_PATH.
 */
function basePath(): '' | `/${string}` {
	const raw = (process.env.BASE_PATH ?? '').trim().replace(/\/+$/, '');
	if (!raw) return '';
	return (raw.startsWith('/') ? raw : `/${raw}`) as `/${string}`;
}

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ fallback: '404.html' }),
			// Every internal link goes through `base` from $app/paths, so the whole
			// site moves with this one setting.
			paths: { base: basePath() },
			prerender: {
				handleHttpError: 'fail',
				handleMissingId: 'warn'
			}
		})
	],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
