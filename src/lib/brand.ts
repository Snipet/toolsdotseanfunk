/**
 * The site's name, in one place.
 *
 * Written lowercase throughout, with the bracketed `[dot]` kept literally — it is
 * part of the name, not a stand-in for a full stop. Never capitalise it, not even
 * at the start of a sentence or in a page title. This matches its sibling,
 * rubiks[dot]seanfunk.
 */

export const BRAND = 'tools[dot]seanfunk';

/** The three pieces, for rendering the wordmark with the bracket styled apart. */
export const BRAND_PARTS = ['tools', '[dot]', 'seanfunk'] as const;

export const TAGLINE =
	'Converting, calculating, generating, checking — answered in the browser, instantly.';

/** Build a page title. Section pages read "converters · tools[dot]seanfunk". */
export function pageTitle(section?: string): string {
	return section ? `${section} · ${BRAND}` : BRAND;
}
