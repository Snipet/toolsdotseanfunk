/**
 * Local preferences: theme, favourites and recently-used tools.
 *
 * Everything lives in localStorage — no account, no server, no sync. Reads are
 * guarded because prerendering runs this module on the server, and because
 * Safari private mode throws on localStorage access.
 */

import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';

// Namespaced like the sibling site, so the family shares one storage convention.
const THEME_KEY = 'tools-seanfunk:theme';
const FAVORITES_KEY = 'tools-seanfunk:favorites';
const RECENTS_KEY = 'tools-seanfunk:recents';
const MAX_RECENTS = 12;

function read<T>(key: string, fallback: T): T {
	if (!browser) return fallback;
	try {
		const raw = localStorage.getItem(key);
		return raw === null ? fallback : (JSON.parse(raw) as T);
	} catch {
		return fallback;
	}
}

function write(key: string, value: unknown): void {
	if (!browser) return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Quota or private mode. Preferences are a nicety, not a requirement.
	}
}

class Prefs {
	/** Dark is the brand's default, as on the sibling site; `system` is a choice. */
	theme = $state<Theme>('dark');
	favorites = $state<string[]>([]);
	recents = $state<string[]>([]);
	/** True once the browser values have replaced the SSR defaults. */
	hydrated = $state(false);

	/** Called once from the root layout, after mount. */
	load(): void {
		if (!browser) return;
		const savedTheme = (() => {
			try {
				return localStorage.getItem(THEME_KEY);
			} catch {
				return null;
			}
		})();
		this.theme =
			savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system'
				? savedTheme
				: 'dark';
		this.favorites = read<string[]>(FAVORITES_KEY, []);
		this.recents = read<string[]>(RECENTS_KEY, []);
		this.hydrated = true;
		this.apply();

		// Follow the OS while the preference is `system`.
		window
			.matchMedia('(prefers-color-scheme: light)')
			.addEventListener('change', () => this.apply());
	}

	setTheme(theme: Theme): void {
		this.theme = theme;
		if (!browser) return;
		try {
			localStorage.setItem(THEME_KEY, theme);
		} catch {
			/* ignore */
		}
		this.apply();
	}

	/**
	 * Write the resolved theme to the root.
	 *
	 * Dark is the base and light is opt-in, so `system` has to be resolved here
	 * rather than by a media query — the same job the inline script in app.html
	 * does before first paint.
	 */
	apply(): void {
		if (!browser) return;
		const light =
			this.theme === 'light' ||
			(this.theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
		document.documentElement.dataset.theme = light ? 'light' : 'dark';
	}

	cycleTheme(): void {
		const order: Theme[] = ['dark', 'light', 'system'];
		this.setTheme(order[(order.indexOf(this.theme) + 1) % order.length]);
	}

	isFavorite(path: string): boolean {
		return this.favorites.includes(path);
	}

	toggleFavorite(path: string): void {
		this.favorites = this.isFavorite(path)
			? this.favorites.filter((p) => p !== path)
			: [path, ...this.favorites];
		write(FAVORITES_KEY, this.favorites);
	}

	noteVisit(path: string): void {
		if (!browser) return;
		this.recents = [path, ...this.recents.filter((p) => p !== path)].slice(0, MAX_RECENTS);
		write(RECENTS_KEY, this.recents);
	}

	clearRecents(): void {
		this.recents = [];
		write(RECENTS_KEY, []);
	}
}

export const prefs = new Prefs();
