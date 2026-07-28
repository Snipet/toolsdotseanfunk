<script lang="ts">
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	interface Status {
		code: number;
		name: string;
		summary: string;
		note?: string;
	}

	const STATUSES: Status[] = [
		{ code: 100, name: 'Continue', summary: 'Keep sending the request body.' },
		{ code: 101, name: 'Switching Protocols', summary: 'Upgrading, usually to WebSocket.' },
		{ code: 103, name: 'Early Hints', summary: 'Preload hints before the real response.' },

		{ code: 200, name: 'OK', summary: 'Success. The response body carries the result.' },
		{ code: 201, name: 'Created', summary: 'A new resource exists.', note: 'Should include a Location header pointing at it.' },
		{ code: 202, name: 'Accepted', summary: 'Queued for processing; not done yet.' },
		{ code: 204, name: 'No Content', summary: 'Success, and there is deliberately no body.', note: 'The correct reply to a DELETE that worked.' },
		{ code: 206, name: 'Partial Content', summary: 'A byte range, for resumable downloads and video seeking.' },

		{ code: 301, name: 'Moved Permanently', summary: 'Use the new URL from now on.', note: 'Cached aggressively and hard to undo — be certain before sending it.' },
		{ code: 302, name: 'Found', summary: 'Temporary redirect. May change the method to GET.' },
		{ code: 303, name: 'See Other', summary: 'Fetch the result elsewhere with GET.', note: 'The correct POST-redirect-GET status.' },
		{ code: 304, name: 'Not Modified', summary: 'Your cached copy is still good.' },
		{ code: 307, name: 'Temporary Redirect', summary: 'Like 302 but the method is preserved.' },
		{ code: 308, name: 'Permanent Redirect', summary: 'Like 301 but the method is preserved.' },

		{ code: 400, name: 'Bad Request', summary: 'Malformed — the server cannot parse it.' },
		{ code: 401, name: 'Unauthorized', summary: 'Not authenticated.', note: 'Misnamed: it means unauthenticated. Authorisation failure is 403.' },
		{ code: 403, name: 'Forbidden', summary: 'Authenticated, but not allowed.' },
		{ code: 404, name: 'Not Found', summary: 'No such resource.', note: 'Also used deliberately to hide the existence of something from unauthorised users.' },
		{ code: 405, name: 'Method Not Allowed', summary: 'Wrong verb for this URL.', note: 'Must include an Allow header listing what is permitted.' },
		{ code: 409, name: 'Conflict', summary: 'Collides with the current state — an edit conflict, a duplicate key.' },
		{ code: 410, name: 'Gone', summary: 'It existed and was deliberately removed.' },
		{ code: 413, name: 'Payload Too Large', summary: 'The body exceeds the limit.' },
		{ code: 415, name: 'Unsupported Media Type', summary: 'Wrong Content-Type.' },
		{ code: 418, name: "I'm a Teapot", summary: 'An April Fools joke from 1998 that never went away.', note: 'RFC 2324. Deliberately never removed from the registry.' },
		{ code: 422, name: 'Unprocessable Content', summary: 'Syntactically valid but semantically wrong — validation failed.' },
		{ code: 429, name: 'Too Many Requests', summary: 'Rate limited.', note: 'Should include Retry-After.' },

		{ code: 500, name: 'Internal Server Error', summary: 'Something broke and was not handled.' },
		{ code: 501, name: 'Not Implemented', summary: 'The server does not support this method at all.' },
		{ code: 502, name: 'Bad Gateway', summary: 'An upstream server returned something invalid.' },
		{ code: 503, name: 'Service Unavailable', summary: 'Overloaded or down for maintenance.', note: 'Should include Retry-After. Use this rather than 500 during a deploy.' },
		{ code: 504, name: 'Gateway Timeout', summary: 'An upstream server did not answer in time.' }
	];

	const CLASSES = [
		{ range: '1xx', label: 'Informational', description: 'The request was received; the process continues.' },
		{ range: '2xx', label: 'Success', description: 'Received, understood and accepted.' },
		{ range: '3xx', label: 'Redirection', description: 'Further action is needed to complete the request.' },
		{ range: '4xx', label: 'Client error', description: 'The request is faulty. Fixing it is the caller’s job.' },
		{ range: '5xx', label: 'Server error', description: 'A valid request the server failed to fulfil.' }
	];

	let filter = $state('');

	const shown = $derived(
		filter.trim()
			? STATUSES.filter(
					(s) =>
						String(s.code).includes(filter.trim()) ||
						s.name.toLowerCase().includes(filter.toLowerCase()) ||
						s.summary.toLowerCase().includes(filter.toLowerCase())
				)
			: STATUSES
	);

	const classOf = (code: number) => Math.floor(code / 100);
</script>

<ToolShell {tool}>
	<div class="card no-print">
		<div class="row">
			<label class="visually-hidden" for="hs-filter">Filter status codes</label>
			<input id="hs-filter" type="search" bind:value={filter} placeholder="Search — try “404”, “redirect”, “rate”…" autocomplete="off" />
			<button type="button" class="btn" onclick={() => window.print()}><Icon name="print" size={16} /> Print</button>
		</div>
	</div>

	<section class="card">
		<h2>The five classes</h2>
		<div class="classes">
			{#each CLASSES as item (item.range)}
				<div class="class-card" data-class={item.range[0]}>
					<span class="range">{item.range}</span>
					<span class="label">{item.label}</span>
					<span class="small muted">{item.description}</span>
				</div>
			{/each}
		</div>
	</section>

	<section class="card">
		<h2>{shown.length} status codes</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th class="num">Code</th><th>Name</th><th>Meaning</th></tr></thead>
				<tbody>
					{#each shown as status (status.code)}
						<tr data-class={classOf(status.code)}>
							<td class="num code">{status.code}</td>
							<td class="name">{status.name}</td>
							<td>
								{status.summary}
								{#if status.note}<span class="note small muted"> {status.note}</span>{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			The first digit is the whole story: 2 worked, 3 go elsewhere, 4 you made a mistake, 5 we made
			a mistake. Clients are required to understand the class even when they do not recognise the
			specific code, so an unknown 499 is safely treated as a 400.
		</p>
		<h3>401 versus 403</h3>
		<p>
			The most commonly confused pair, not helped by 401 being named “Unauthorized” when it actually
			means <em>unauthenticated</em>. Use <strong>401</strong> when the caller has not proven who
			they are — no token, expired token. Use <strong>403</strong> when you know exactly who they are
			and they still may not do this.
		</p>
		<h3>301 is close to permanent</h3>
		<p>
			Browsers cache 301 responses aggressively, sometimes indefinitely, and there is no reliable way
			to make a client forget one. A mistaken 301 can be effectively irreversible for a user who
			already received it. Use 302 or 307 unless you are certain.
		</p>
		<h3>307 and 308 exist because of a bug in history</h3>
		<p>
			Early browsers changed POST to GET when following a 301 or 302, contradicting the
			specification. Rather than break the web, the standard added 307 and 308 with identical
			semantics but an explicit guarantee that the method is preserved. Use them when the method
			matters.
		</p>
		<h3>422 versus 400</h3>
		<p>
			400 means the server could not parse the request at all — broken JSON, a malformed header. 422
			means it parsed perfectly and the contents are wrong: a missing required field, an email that
			is not an email. The distinction genuinely helps API consumers debug.
		</p>
		<h3>503 during deployments</h3>
		<p>
			A 503 with a <code>Retry-After</code> header tells clients and crawlers this is temporary, so
			they should come back rather than de-index your pages. Returning 500 or a 200 with an error
			page during a deploy is a common and avoidable mistake.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			Definitions follow <strong>RFC 9110</strong> (HTTP Semantics, 2022), which supersedes the
			older RFC 7231 family, plus the IANA HTTP Status Code Registry. And RFC 2324 for the teapot.
		</p>
	{/snippet}
</ToolShell>

<style>
	.row input[type='search'] {
		flex: 1;
		min-width: 200px;
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	.classes {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	}
	.class-card {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		padding: 0.7rem 0.85rem;
		background: var(--bg-sunken);
		border-radius: var(--radius-sm);
		border-left: 4px solid var(--text-faint);
	}
	.class-card[data-class='2'] {
		border-left-color: var(--positive);
	}
	.class-card[data-class='3'] {
		border-left-color: #1f6fb8;
	}
	.class-card[data-class='4'] {
		border-left-color: var(--warning);
	}
	.class-card[data-class='5'] {
		border-left-color: var(--negative);
	}
	.range {
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: 1.05rem;
	}
	.label {
		font-weight: 600;
		font-size: 0.9rem;
	}
	td.code {
		font-family: var(--font-mono);
		font-weight: 700;
	}
	tr[data-class='2'] .code {
		color: var(--positive);
	}
	tr[data-class='3'] .code {
		color: #1f6fb8;
	}
	tr[data-class='4'] .code {
		color: var(--warning);
	}
	tr[data-class='5'] .code {
		color: var(--negative);
	}
	td.name {
		font-weight: 550;
		white-space: nowrap;
	}
	td {
		white-space: normal;
	}
	.note {
		display: block;
		margin-top: 0.15rem;
	}
</style>
