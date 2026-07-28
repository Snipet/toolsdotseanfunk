import { error } from '@sveltejs/kit';
import { TOOL_BY_PATH, TOOLS, parsePairSlug } from '$lib/catalog';
import { DIMENSION_BY_ID } from '$lib/units/units';
import { loadTool } from '$lib/tools/registry';
import UnitConverter from '$lib/components/UnitConverter.svelte';
import type { EntryGenerator, PageLoad } from './$types';

/** Every tool page is prerendered; this is the full list. */
export const entries: EntryGenerator = () =>
	TOOLS.map((tool) => ({ category: tool.category, tool: tool.slug }));

export const load: PageLoad = async ({ params }) => {
	const tool = TOOL_BY_PATH.get(`${params.category}/${params.tool}`);
	if (!tool) error(404, 'No such tool');

	// Converter dimension and pair pages all share one component, driven by
	// the unit engine rather than by a file per page.
	if (tool.category === 'convert') {
		const pair = parsePairSlug(tool.slug);
		if (pair) {
			return { tool, component: UnitConverter, props: { from: pair.from, to: pair.to } };
		}
		const dimension = DIMENSION_BY_ID.get(tool.slug);
		if (dimension) {
			return { tool, component: UnitConverter, props: { dimensionId: dimension.id } };
		}
	}

	const component = await loadTool(tool.category, tool.slug);
	if (!component) error(404, 'That tool is not built yet');

	return { tool, component, props: {} };
};
