<script lang="ts">
	import { onMount } from 'svelte';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	const nextYear = new Date().getFullYear() + (new Date().getMonth() === 11 && new Date().getDate() > 25 ? 1 : 0);
	const s = urlState({ target: `${nextYear}-12-25T00:00`, label: 'Christmas' });

	let now = $state(Date.now());
	let big = $state(false);

	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 200);
		return () => clearInterval(timer);
	});

	const targetTime = $derived(new Date(s.target).getTime());
	const valid = $derived(Number.isFinite(targetTime));
	const remaining = $derived(Math.max(0, targetTime - now));
	const passed = $derived(valid && targetTime < now);

	const parts = $derived({
		days: Math.floor(remaining / 86400000),
		hours: Math.floor((remaining % 86400000) / 3600000),
		minutes: Math.floor((remaining % 3600000) / 60000),
		seconds: Math.floor((remaining % 60000) / 1000)
	});

	const PRESETS = [
		{ label: 'New Year', date: () => `${new Date().getFullYear() + 1}-01-01T00:00` },
		{ label: 'Christmas', date: () => `${nextYear}-12-25T00:00` },
		{ label: 'Tomorrow morning', date: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.toISOString().slice(0, 16); } }
	];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row no-print">
			<Field label="Counting down to" for="cd-target"><input id="cd-target" type="datetime-local" bind:value={s.target} /></Field>
			<Field label="Label" for="cd-label"><input id="cd-label" type="text" bind:value={s.label} maxlength="60" /></Field>
		</div>

		<div class="row no-print">
			{#each PRESETS as p (p.label)}
				<button type="button" class="btn btn-sm" onclick={() => { s.target = p.date(); s.label = p.label; }}>{p.label}</button>
			{/each}
			<button type="button" class="btn btn-sm" onclick={() => (big = !big)}>
				<Icon name={big ? 'close' : 'grid'} size={14} />
				{big ? 'Exit' : 'Presenter'} view
			</button>
		</div>
	</div>

	<div class="countdown" class:big class:passed>
		{#if s.label}<p class="label">{s.label}</p>{/if}
		{#if !valid}
			<p class="muted">Pick a date and time.</p>
		{:else if passed}
			<p class="done">That moment has passed.</p>
		{:else}
			<div class="units">
				<div class="unit"><span class="value">{parts.days}</span><span class="name">day{parts.days === 1 ? '' : 's'}</span></div>
				<div class="unit"><span class="value">{String(parts.hours).padStart(2, '0')}</span><span class="name">hours</span></div>
				<div class="unit"><span class="value">{String(parts.minutes).padStart(2, '0')}</span><span class="name">minutes</span></div>
				<div class="unit"><span class="value">{String(parts.seconds).padStart(2, '0')}</span><span class="name">seconds</span></div>
			</div>
			<p class="target small muted">
				{new Date(targetTime).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
			</p>
		{/if}
	</div>

	{#snippet explainer()}
		<p>
			The countdown ticks against your device's clock and updates several times a second. Because
			the target and label live in the URL, the address bar is a shareable countdown page — send it
			to a class, a team or a group chat and everyone sees the same deadline.
		</p>
		<h3>Time zones</h3>
		<p>
			The target is interpreted in <em>your</em> local time zone. Sharing the link with someone in
			another zone counts down to the same wall-clock reading in their zone, not the same instant.
			For a synchronised moment across zones, set the target in UTC and say so in the label.
		</p>
		<h3>Presenter view</h3>
		<p>
			Presenter view scales the digits up and strips the surrounding interface, which is what you
			want on a projector or a second monitor. It works well with the browser's own full-screen mode.
		</p>
	{/snippet}
</ToolShell>

<style>
	.countdown {
		background: var(--bg-raised);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 2.5rem 1.5rem;
		text-align: center;
	}
	.countdown.big {
		position: fixed;
		inset: 0;
		z-index: 120;
		border-radius: 0;
		display: grid;
		place-content: center;
		background: var(--bg);
	}
	.label {
		font-size: 1.1rem;
		color: var(--text-muted);
		margin-bottom: 1rem;
	}
	.big .label {
		font-size: 2rem;
		margin-bottom: 2rem;
	}
	.units {
		display: flex;
		justify-content: center;
		gap: clamp(0.75rem, 4vw, 2.5rem);
		flex-wrap: wrap;
	}
	.unit {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 78px;
	}
	.value {
		font-size: clamp(2.2rem, 8vw, 4rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.big .value {
		font-size: clamp(3.5rem, 14vw, 9rem);
	}
	.name {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
	}
	.big .name {
		font-size: 1rem;
	}
	.target {
		margin-top: 1.25rem;
	}
	.done {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--accent);
	}
</style>
