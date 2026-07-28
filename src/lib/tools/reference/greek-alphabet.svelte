<script lang="ts">
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	const LETTERS = [
		{ upper: 'Α', lower: 'α', name: 'Alpha', pronunciation: 'AL-fuh', uses: 'Angles, significance level, thermal expansion, alpha particles' },
		{ upper: 'Β', lower: 'β', name: 'Beta', pronunciation: 'BAY-tuh', uses: 'Angles, regression coefficients, type II error, beta decay' },
		{ upper: 'Γ', lower: 'γ', name: 'Gamma', pronunciation: 'GAM-uh', uses: 'Gamma function, Lorentz factor, surface tension, gamma rays' },
		{ upper: 'Δ', lower: 'δ', name: 'Delta', pronunciation: 'DEL-tuh', uses: 'Change or difference (Δ), infinitesimals (δ), the Laplacian' },
		{ upper: 'Ε', lower: 'ε', name: 'Epsilon', pronunciation: 'EP-si-lon', uses: 'A very small quantity, permittivity, strain, error terms' },
		{ upper: 'Ζ', lower: 'ζ', name: 'Zeta', pronunciation: 'ZAY-tuh', uses: 'The Riemann zeta function, damping ratio' },
		{ upper: 'Η', lower: 'η', name: 'Eta', pronunciation: 'AY-tuh', uses: 'Efficiency, viscosity, learning rate' },
		{ upper: 'Θ', lower: 'θ', name: 'Theta', pronunciation: 'THAY-tuh', uses: 'Angles above all else; also temperature and asymptotic bounds' },
		{ upper: 'Ι', lower: 'ι', name: 'Iota', pronunciation: 'eye-OH-tuh', uses: 'Rare — it looks too much like i and 1' },
		{ upper: 'Κ', lower: 'κ', name: 'Kappa', pronunciation: 'KAP-uh', uses: 'Curvature, thermal conductivity, dielectric constant' },
		{ upper: 'Λ', lower: 'λ', name: 'Lambda', pronunciation: 'LAM-duh', uses: 'Wavelength, eigenvalues, decay constant, Poisson rate, lambda calculus' },
		{ upper: 'Μ', lower: 'μ', name: 'Mu', pronunciation: 'MEW', uses: 'Population mean, coefficient of friction, the SI prefix micro' },
		{ upper: 'Ν', lower: 'ν', name: 'Nu', pronunciation: 'NEW', uses: 'Frequency, kinematic viscosity, degrees of freedom' },
		{ upper: 'Ξ', lower: 'ξ', name: 'Xi', pronunciation: 'ZY or KSEE', uses: 'Random variables, correlation length' },
		{ upper: 'Ο', lower: 'ο', name: 'Omicron', pronunciation: 'OM-i-kron', uses: 'Almost never — it is identical to the letter o' },
		{ upper: 'Π', lower: 'π', name: 'Pi', pronunciation: 'PIE', uses: 'The circle constant (π), product notation (Π), osmotic pressure' },
		{ upper: 'Ρ', lower: 'ρ', name: 'Rho', pronunciation: 'ROW', uses: 'Density, resistivity, correlation coefficient' },
		{ upper: 'Σ', lower: 'σ', name: 'Sigma', pronunciation: 'SIG-muh', uses: 'Summation (Σ), standard deviation (σ), stress, conductivity' },
		{ upper: 'Τ', lower: 'τ', name: 'Tau', pronunciation: 'TAW or TOW', uses: 'Torque, time constant, shear stress, 2π' },
		{ upper: 'Υ', lower: 'υ', name: 'Upsilon', pronunciation: 'UP-si-lon', uses: 'Rare in mathematics; a particle in physics' },
		{ upper: 'Φ', lower: 'φ', name: 'Phi', pronunciation: 'FIE or FEE', uses: 'The golden ratio, angles, magnetic flux, Euler’s totient, the normal CDF' },
		{ upper: 'Χ', lower: 'χ', name: 'Chi', pronunciation: 'KY', uses: 'The chi-squared distribution, electronegativity, susceptibility' },
		{ upper: 'Ψ', lower: 'ψ', name: 'Psi', pronunciation: 'SIGH or PSY', uses: 'Wavefunctions in quantum mechanics, stream function' },
		{ upper: 'Ω', lower: 'ω', name: 'Omega', pronunciation: 'oh-MAY-guh', uses: 'Ohms (Ω), angular velocity (ω), the sample space' }
	];

	let filter = $state('');

	const shown = $derived(
		filter.trim()
			? LETTERS.filter(
					(l) =>
						l.name.toLowerCase().includes(filter.toLowerCase()) ||
						l.uses.toLowerCase().includes(filter.toLowerCase()) ||
						l.upper === filter ||
						l.lower === filter
				)
			: LETTERS
	);
</script>

<ToolShell {tool}>
	<div class="card no-print">
		<div class="row">
			<label class="visually-hidden" for="ga-filter">Filter letters</label>
			<input id="ga-filter" type="search" bind:value={filter} placeholder="Filter by name or use — try “angle” or “density”…" autocomplete="off" />
			<button type="button" class="btn" onclick={() => window.print()}><Icon name="print" size={16} /> Print</button>
		</div>
	</div>

	<div class="letters">
		{#each shown as letter (letter.name)}
			<div class="letter card">
				<div class="glyphs">
					<span class="upper">{letter.upper}</span>
					<span class="lower">{letter.lower}</span>
				</div>
				<div class="details">
					<div class="name-row">
						<h2>{letter.name}</h2>
						<CopyButton value={letter.lower} compact label="Copy {letter.name}" />
					</div>
					<p class="pron small muted">{letter.pronunciation}</p>
					<p class="uses small">{letter.uses}</p>
				</div>
			</div>
		{/each}
	</div>

	{#snippet explainer()}
		<p>
			Mathematics and the sciences borrowed the Greek alphabet for the simple reason that the Latin
			one ran out. Over centuries, individual letters accumulated strong conventional meanings —
			seeing σ in a statistics paper tells you it is a standard deviation before you read a word.
		</p>
		<h3>Case carries meaning</h3>
		<p>
			Upper and lower case are usually different quantities entirely. Σ is summation while σ is
			standard deviation; Δ is a change while δ is an infinitesimal; Π is a product while π is the
			circle constant. Getting the case wrong changes the statement.
		</p>
		<h3>The letters nobody uses</h3>
		<p>
			Omicron and iota are almost absent from mathematical notation because they are visually
			identical to o and i. Capital Alpha, Beta, Epsilon, Zeta, Eta, Iota, Kappa, Mu, Nu, Omicron,
			Rho, Tau, Upsilon and Chi are all identical to Latin capitals, so they are rarely used either.
		</p>
		<h3>Typing them</h3>
		<p>
			Copy from this page, or in LaTeX write <code>\alpha</code>, <code>\Sigma</code> and so on. On
			Windows, Alt codes work; on macOS, the Greek keyboard layout or the character viewer. In
			HTML, named entities such as <code>&amp;alpha;</code> and <code>&amp;pi;</code> are available.
		</p>
	{/snippet}
</ToolShell>

<style>
	.row input {
		flex: 1;
		min-width: 200px;
	}
	.letters {
		display: grid;
		gap: 0.6rem;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	}
	.letter {
		display: flex;
		gap: 0.85rem;
		align-items: flex-start;
	}
	.glyphs {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		flex: none;
		min-width: 54px;
		padding: 0.35rem 0;
		background: var(--bg-sunken);
		border-radius: var(--radius-sm);
	}
	.upper {
		font-size: 1.5rem;
		line-height: 1.1;
	}
	.lower {
		font-size: 1.5rem;
		line-height: 1.1;
		color: var(--accent);
	}
	.details {
		min-width: 0;
	}
	.name-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	h2 {
		font-size: 0.98rem;
	}
	.pron {
		font-style: italic;
	}
	.uses {
		margin-top: 0.3rem;
		line-height: 1.5;
		color: var(--text-muted);
	}
</style>
