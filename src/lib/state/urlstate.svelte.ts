/**
 * State-in-URL for every tool.
 *
 * A tool declares its inputs and their defaults; this keeps them in the query
 * string so any result is shareable and bookmarkable. Only values that differ
 * from the default are written, so a freshly-opened tool has a clean URL.
 *
 * Usage, at the top level of a tool component:
 *
 *     const s = urlState({ value: 3, from: 'tablespoon' });
 *     // read/write s.value as ordinary reactive state
 */

import { browser } from '$app/environment';
import { replaceState } from '$app/navigation';
import { page } from '$app/state';

type Primitive = string | number | boolean;

/**
 * Widen the literal types TypeScript infers from the defaults object, so a
 * field declared as `{ metric: true }` accepts `false` later, and one declared
 * as `{ mode: 'encode' }` accepts any string.
 */
type Widen<T> = T extends boolean ? boolean : T extends number ? number : T extends string ? string : T;
type Widened<T> = { [K in keyof T]: Widen<T[K]> };

function decode<T extends Primitive>(raw: string, fallback: T): T {
	if (typeof fallback === 'number') {
		const n = Number(raw);
		return (Number.isFinite(n) ? n : fallback) as T;
	}
	if (typeof fallback === 'boolean') return (raw === '1' || raw === 'true') as T;
	return raw as T;
}

function encode(value: Primitive): string {
	if (typeof value === 'boolean') return value ? '1' : '0';
	return String(value);
}

export function urlState<T extends Record<string, Primitive>>(defaults: T): Widened<T> {
	const initial = { ...defaults };

	if (browser) {
		const params = new URLSearchParams(window.location.search);
		for (const key of Object.keys(defaults) as Array<keyof T & string>) {
			const raw = params.get(key);
			if (raw !== null) initial[key] = decode(raw, defaults[key]);
		}
	}

	const state = $state(initial);

	if (browser) {
		let frame = 0;
		$effect(() => {
			// Touch every field so the effect re-runs on any change.
			const snapshot: Record<string, Primitive> = {};
			for (const key of Object.keys(defaults)) snapshot[key] = state[key];

			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const params = new URLSearchParams();
				for (const [key, value] of Object.entries(snapshot)) {
					if (value === defaults[key]) continue;
					if (value === '' || value === null || value === undefined) continue;
					if (typeof value === 'number' && !Number.isFinite(value)) continue;
					params.set(key, encode(value));
				}
				const query = params.toString();
				const next = `${page.url.pathname}${query ? `?${query}` : ''}`;
				if (next !== `${window.location.pathname}${window.location.search}`) {
					try {
						replaceState(next, page.state);
					} catch {
						// The router may not be ready during the first frame after a
						// hard navigation; the next change will catch up.
					}
				}
			});

			return () => cancelAnimationFrame(frame);
		});
	}

	return state as Widened<T>;
}

/** Build a shareable absolute URL for the current tool state. */
export function shareUrl(): string {
	if (!browser) return '';
	return window.location.href;
}
