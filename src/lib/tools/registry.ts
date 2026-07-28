/**
 * Resolves a catalog entry to its Svelte component.
 *
 * Tools live at `src/lib/tools/<category>/<slug>.svelte` by convention, so
 * adding a tool means adding one file plus one catalog entry — no wiring.
 * The glob is lazy, so each tool is its own chunk and the home page does not
 * download the matrix calculator.
 */

import type { Component } from 'svelte';

const modules = import.meta.glob('./**/*.svelte') as Record<
	string,
	() => Promise<{ default: Component<Record<string, unknown>> }>
>;

export function hasTool(category: string, slug: string): boolean {
	return `./${category}/${slug}.svelte` in modules;
}

export async function loadTool(
	category: string,
	slug: string
): Promise<Component<Record<string, unknown>> | undefined> {
	const loader = modules[`./${category}/${slug}.svelte`];
	if (!loader) return undefined;
	return (await loader()).default;
}
