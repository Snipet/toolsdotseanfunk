import { error } from '@sveltejs/kit';
import { CATEGORIES, CATEGORY_BY_ID, toolsIn } from '$lib/catalog';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => CATEGORIES.map((c) => ({ category: c.id }));

export const load: PageLoad = ({ params }) => {
	const category = CATEGORY_BY_ID.get(params.category);
	if (!category) error(404, 'No such category');
	return { category, tools: toolsIn(category.id) };
};
