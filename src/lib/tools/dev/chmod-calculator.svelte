<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ octal: '644', setuid: false, setgid: false, sticky: false });

	const CLASSES = [
		{ key: 'owner', label: 'Owner (u)' },
		{ key: 'group', label: 'Group (g)' },
		{ key: 'others', label: 'Others (o)' }
	] as const;

	const PERMISSIONS = [
		{ key: 'read', label: 'Read', value: 4, letter: 'r' },
		{ key: 'write', label: 'Write', value: 2, letter: 'w' },
		{ key: 'execute', label: 'Execute', value: 1, letter: 'x' }
	] as const;

	const digits = $derived.by(() => {
		const clean = s.octal.replace(/[^0-7]/g, '').slice(-3).padStart(3, '0');
		return [Number(clean[0]), Number(clean[1]), Number(clean[2])];
	});

	function has(classIndex: number, value: number): boolean {
		return (digits[classIndex] & value) !== 0;
	}

	function toggle(classIndex: number, value: number) {
		const next = [...digits];
		next[classIndex] ^= value;
		s.octal = next.join('');
	}

	const specialBits = $derived((s.setuid ? 4 : 0) + (s.setgid ? 2 : 0) + (s.sticky ? 1 : 0));
	const fullOctal = $derived((specialBits ? String(specialBits) : '') + digits.join(''));

	const symbolic = $derived.by(() =>
		digits
			.map((digit, classIndex) => {
				let out = PERMISSIONS.map((p) => (digit & p.value ? p.letter : '-')).join('');
				// setuid/setgid/sticky replace the execute character in their class.
				if (classIndex === 0 && s.setuid) out = out.slice(0, 2) + (digit & 1 ? 's' : 'S');
				if (classIndex === 1 && s.setgid) out = out.slice(0, 2) + (digit & 1 ? 's' : 'S');
				if (classIndex === 2 && s.sticky) out = out.slice(0, 2) + (digit & 1 ? 't' : 'T');
				return out;
			})
			.join('')
	);

	const COMMON = [
		{ octal: '644', label: 'Regular files', note: 'Owner can edit, everyone can read' },
		{ octal: '755', label: 'Directories and scripts', note: 'Owner can write, everyone can read and traverse' },
		{ octal: '600', label: 'Private files', note: 'SSH keys, credentials — owner only' },
		{ octal: '700', label: 'Private directories', note: 'Such as ~/.ssh' },
		{ octal: '664', label: 'Group-writable files', note: 'Shared project files' },
		{ octal: '775', label: 'Group-writable directories', note: 'Shared project folders' },
		{ octal: '777', label: 'Everything to everyone', note: 'Almost always wrong' }
	];

	const dangerous = $derived(digits[2] >= 2);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Octal" for="cm-octal">
				<input id="cm-octal" type="text" class="mono big" bind:value={s.octal} maxlength="4" inputmode="numeric" />
			</Field>
			<Result label="Symbolic" primary value={symbolic} />
			<Result label="Command" primary value={`chmod ${fullOctal} file`} />
		</div>

		<div class="scroll-x">
			<table class="data grid">
				<thead>
					<tr>
						<th>Class</th>
						{#each PERMISSIONS as permission (permission.key)}<th class="num">{permission.label}</th>{/each}
						<th class="num">Octal</th>
					</tr>
				</thead>
				<tbody>
					{#each CLASSES as cls, classIndex (cls.key)}
						<tr>
							<td>{cls.label}</td>
							{#each PERMISSIONS as permission (permission.key)}
								<td class="num">
									<input
										type="checkbox"
										checked={has(classIndex, permission.value)}
										onchange={() => toggle(classIndex, permission.value)}
										aria-label="{permission.label} for {cls.label}"
									/>
								</td>
							{/each}
							<td class="num mono">{digits[classIndex]}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<details>
			<summary>Special bits</summary>
			<div class="specials">
				<label class="check"><input type="checkbox" bind:checked={s.setuid} /> setuid — run as the file's owner</label>
				<label class="check"><input type="checkbox" bind:checked={s.setgid} /> setgid — run as the file's group, or inherit group on new files in a directory</label>
				<label class="check"><input type="checkbox" bind:checked={s.sticky} /> sticky — only the owner can delete files in this directory</label>
			</div>
		</details>

		{#if dangerous}
			<Note tone="warning">
				This grants write access to <strong>everyone</strong> on the system. That is rarely what you
				want — 644 for files and 755 for directories covers almost every legitimate case.
			</Note>
		{/if}
	</div>

	<section class="card">
		<h2>Common permissions</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th class="num">Octal</th><th>Symbolic</th><th>Use</th><th>Notes</th></tr></thead>
				<tbody>
					{#each COMMON as row (row.octal)}
						<tr class:active={digits.join('') === row.octal}>
							<td class="num">
								<button type="button" class="pick mono" onclick={() => (s.octal = row.octal)}>{row.octal}</button>
							</td>
							<td class="mono">
								{[...row.octal].map((d) => PERMISSIONS.map((p) => (Number(d) & p.value ? p.letter : '-')).join('')).join('')}
							</td>
							<td>{row.label}</td>
							<td class="muted small">{row.note}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			Unix permissions are three groups of three bits: what the owner, the group and everyone else
			may do. Each group is one octal digit because three bits fit exactly into 0–7.
		</p>
		<code class="formula">read    = 4
write   = 2
execute = 1

644 = rw- r-- r--
755 = rwx r-x r-x</code>
		<h3>Execute means something different on directories</h3>
		<p>
			On a file, the execute bit permits running it. On a directory it permits <em>entering</em> it —
			accessing anything inside by name. A directory with read but not execute lets you list the
			names and nothing else, which is why directories are 755 rather than 644.
		</p>
		<h3>The special bits</h3>
		<dl>
			<dt>setuid (4000)</dt><dd>The program runs with the owner's privileges rather than the caller's. This is how <code>passwd</code> can edit a root-owned file. It is also a classic privilege-escalation vector.</dd>
			<dt>setgid (2000)</dt><dd>On a program, runs with the file's group. On a directory, new files inherit the directory's group — useful for shared project folders.</dd>
			<dt>sticky (1000)</dt><dd>In a world-writable directory, only the owner of a file can delete it. This is what makes <code>/tmp</code> (1777) safe.</dd>
		</dl>
		<h3>777 is almost always wrong</h3>
		<p>
			It usually appears as a debugging shortcut that was never reverted. If a web server cannot read
			a file, the fix is to correct the ownership, not to grant the whole machine write access. On a
			shared host, 777 lets any other user modify your code.
		</p>
		<h3>umask</h3>
		<p>
			New files do not get the permissions you might expect, because the umask masks bits out. The
			common default of 022 turns a requested 666 into 644 and 777 into 755 — which is why new files
			are not executable and not group-writable.
		</p>
	{/snippet}
</ToolShell>

<style>
	.big {
		font-size: 1.3rem;
		text-align: center;
		letter-spacing: 0.15em;
	}
	table.grid td,
	table.grid th {
		text-align: center;
	}
	table.grid td:first-child,
	table.grid th:first-child {
		text-align: left;
	}
	table.grid input[type='checkbox'] {
		width: 20px;
		height: 20px;
	}
	.specials {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.6rem;
	}
	details summary {
		cursor: pointer;
		font-size: 0.88rem;
		font-weight: 550;
		color: var(--text-muted);
	}
	details summary:hover {
		color: var(--accent);
	}
	tr.active {
		background: var(--accent-soft);
	}
	.pick {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: inherit;
		cursor: pointer;
	}
	.pick:hover {
		color: var(--accent);
		text-decoration: underline;
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
</style>
