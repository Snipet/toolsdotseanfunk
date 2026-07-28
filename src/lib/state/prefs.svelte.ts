/**
 * Local preferences: theme, favourites and recently-used tools.
 *
 * Everything lives in localStorage — no account, no server, no sync. Reads are
 * guarded because prerendering runs this module on the server, and because
 * Safari private mode throws on localStorage access.
 */

import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'tb:theme';
const FAVORITES_KEY = 'tb:favorites';
const RECENTS_KEY = 'tb:recents';
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
	theme = $state<Theme>('system');
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
		this.theme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'system';
		this.favorites = read<string[]>(FAVORITES_KEY, []);
		this.recents = read<string[]>(RECENTS_KEY, []);
		this.hydrated = true;
	}

	setTheme(theme: Theme): void {
		this.theme = theme;
		if (!browser) return;
		try {
			if (theme === 'system') localStorage.removeItem(THEME_KEY);
			else localStorage.setItem(THEME_KEY, theme);
		} catch {
			/* ignore */
		}
		if (theme === 'system') delete document.documentElement.dataset.theme;
		else document.documentElement.dataset.theme = theme;
	}

	cycleTheme(): void {
		const order: Theme[] = ['system', 'light', 'dark'];
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
