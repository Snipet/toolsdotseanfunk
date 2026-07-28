<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { analyse } from '$lib/text/text';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const KEY = 'tb:notepad';

	let text = $state('');
	let saved = $state(false);
	let loaded = $state(false);
	let monospace = $state(false);
	let saveTimer: ReturnType<typeof setTimeout>;

	onMount(() => {
		try {
			text = localStorage.getItem(KEY) ?? '';
		} catch {
			// Private mode: the notepad still works, it just will not persist.
		}
		loaded = true;
	});

	// Debounced so a fast typist does not hit localStorage on every keystroke.
	$effect(() => {
		void text;
		if (!loaded || !browser) return;
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			try {
				localStorage.setItem(KEY, text);
				saved = true;
				setTimeout(() => (saved = false), 1400);
			} catch {
				/* quota or private mode */
			}
		}, 400);
	});

	const stats = $derived(analyse(text));

	function download() {
		const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `note-${new Date().toISOString().slice(0, 10)}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function clear() {
		if (text && !confirm('Clear the notepad? This cannot be undone.')) return;
		text = '';
	}
</script>

<ToolShell {tool}>
	<div class="card pad">
		<div class="bar no-print">
			<span class="status small" class:on={saved}>
				<Icon name={saved ? 'check' : 'info'} size={14} />
				{saved ? 'Saved' : 'Saves automatically'}
			</span>
			<div class="actions">
				<label class="check"><input type="checkbox" bind:checked={monospace} /> Monospace</label>
				<CopyButton value={() => text} label="Copy all" />
				<button type="button" class="btn btn-sm" onclick={download}><Icon name="download" size={14} /> .txt</button>
				<button type="button" class="btn btn-sm" onclick={clear}><Icon name="trash" size={14} /></button>
			</div>
		</div>

		<label class="visually-hidden" for="np-text">Notepad</label>
		<textarea
			id="np-text"
			bind:value={text}
			class:mono={monospace}
			placeholder="Start typing. Everything is saved in this browser — nothing is uploaded."
			spellcheck="true"
		></textarea>

		<p class="small muted counts">
			{stats.words} words · {stats.characters} characters · {stats.lines} lines
		</p>
	</div>

	<Note>
		Notes are stored in this browser's local storage on this device only. They survive closing the
		tab and going offline, but they are <strong>not</strong> backed up, not synced, and clearing your
		browser data will delete them. Download anything you need to keep.
	</Note>

	{#snippet explainer()}
		<p>
			A plain scratchpad that saves as you type. There is no account, no server and no network
			request — the text goes into your browser's local storage, which is why it is instant and why
			it works with no connection.
		</p>
		<h3>What local storage means for you</h3>
		<p>
			Storage is scoped to this site in this browser on this device. Open the page in a different
			browser, or on your phone, and you will find an empty notepad. Private or incognito windows
			discard it when closed. Most browsers allow around 5 MB per site, which is roughly a million
			words of plain text.
		</p>
		<h3>Saving is debounced</h3>
		<p>
			The note is written 400 ms after you stop typing, rather than on every keystroke. That keeps
			typing smooth in long documents while making the window of possible loss negligible.
		</p>
		<h3>If it matters, download it</h3>
		<p>
			Browser storage is convenience, not backup. It is cleared by “clear browsing data”, by some
			privacy extensions, and occasionally by the browser itself under storage pressure. The .txt
			button gives you a real file.
		</p>
	{/snippet}
</ToolShell>

<style>
	.pad {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.status {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--text-faint);
		transition: color 0.2s ease;
	}
	.status.on {
		color: var(--positive);
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	textarea {
		min-height: 60vh;
		font-size: 1rem;
		line-height: 1.7;
		border: none;
		background: transparent;
		padding: 0.5rem 0;
		resize: vertical;
	}
	textarea:focus-visible {
		box-shadow: none;
		border: none;
		outline: none;
	}
	.counts {
		border-top: 1px solid var(--border);
		padding-top: 0.5rem;
	}
</style>
