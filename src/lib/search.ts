/**
 * Fuzzy tool search for the omnibox and the command palette.
 *
 * Deliberately simple and synchronous — the catalog is small enough that a
 * linear scan is faster than building an index, and it keeps "resize pic",
 * "shrink image" and "image resizer" all landing on the same tool without any
 * server round-trip.
 */

import { CATEGORY_BY_ID, TOOLS, toolPath, type Tool } from './catalog';

export interface SearchHit {
	tool: Tool;
	score: number;
	path: string;
}

/** Subsequence match: does every char of `needle` appear in order in `hay`? */
function subsequenceScore(needle: string, hay: string): number {
	let i = 0;
	let score = 0;
	let streak = 0;
	for (let j = 0; j < hay.length && i < needle.length; j++) {
		if (hay[j] === needle[i]) {
			i++;
			streak++;
			// Reward consecutive hits and hits at word boundaries.
			score += 1 + streak * 0.5 + (j === 0 || hay[j - 1] === ' ' || hay[j - 1] === '-' ? 2 : 0);
		} else {
			streak = 0;
		}
	}
	return i === needle.length ? score / hay.length : 0;
}

function scoreTool(query: string, tool: Tool): number {
	const q = query.trim().toLowerCase();
	if (!q) return 0;

	const title = tool.title.toLowerCase();
	const slug = tool.slug.toLowerCase();
	const category = CATEGORY_BY_ID.get(tool.category)?.name.toLowerCase() ?? tool.category;
	const keywords = (tool.keywords ?? []).map((k) => k.toLowerCase());

	if (title === q || slug === q) return 1000;
	if (keywords.includes(q)) return 900;
	if (title.startsWith(q)) return 800 - title.length;
	if (slug.startsWith(q)) return 780 - slug.length;

	let best = 0;
	if (title.includes(q)) best = Math.max(best, 600 - title.indexOf(q));
	if (slug.includes(q)) best = Math.max(best, 560 - slug.indexOf(q));
	for (const k of keywords) {
		if (k === q) best = Math.max(best, 700);
		else if (k.startsWith(q)) best = Math.max(best, 500);
		else if (k.includes(q)) best = Math.max(best, 400);
	}
	if (tool.blurb.toLowerCase().includes(q)) best = Math.max(best, 250);
	if (category.includes(q)) best = Math.max(best, 220);

	// Every whitespace-separated word must appear somewhere: "resize pic" only
	// matches when both "resize" and "pic"-ish tokens are present.
	const words = q.split(/\s+/).filter(Boolean);
	if (best === 0 && words.length > 1) {
		const haystack = [title, slug, tool.blurb.toLowerCase(), ...keywords].join(' ');
		if (words.every((w) => haystack.includes(w))) best = 300;
	}

	if (best === 0 && q.length >= 3) {
		const fuzzy = Math.max(
			subsequenceScore(q, title),
			subsequenceScore(q, slug),
			...keywords.map((k) => subsequenceScore(q, k))
		);
		if (fuzzy > 0.12) best = 100 + fuzzy * 100;
	}

	return best;
}

export function searchTools(query: string, limit = 12): SearchHit[] {
	const hits: SearchHit[] = [];
	for (const tool of TOOLS) {
		const score = scoreTool(query, tool);
		if (score > 0) hits.push({ tool, score, path: toolPath(tool) });
	}
	hits.sort((a, b) => b.score - a.score || a.tool.title.length - b.tool.title.length);
	return hits.slice(0, limit);
}
