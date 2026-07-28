<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const GRADES = [
		{ letter: 'A+', points: 4.0 }, { letter: 'A', points: 4.0 }, { letter: 'A−', points: 3.7 },
		{ letter: 'B+', points: 3.3 }, { letter: 'B', points: 3.0 }, { letter: 'B−', points: 2.7 },
		{ letter: 'C+', points: 2.3 }, { letter: 'C', points: 2.0 }, { letter: 'C−', points: 1.7 },
		{ letter: 'D+', points: 1.3 }, { letter: 'D', points: 1.0 }, { letter: 'D−', points: 0.7 },
		{ letter: 'F', points: 0.0 }
	];

	const LEVELS = [
		{ id: 'regular', label: 'Regular', bonus: 0 },
		{ id: 'honors', label: 'Honors', bonus: 0.5 },
		{ id: 'ap', label: 'AP / IB', bonus: 1 }
	];

	interface Course {
		id: number;
		name: string;
		grade: string;
		credits: number;
		level: string;
	}

	let nextId = 5;
	let courses = $state<Course[]>([
		{ id: 1, name: 'Calculus', grade: 'A−', credits: 4, level: 'ap' },
		{ id: 2, name: 'Literature', grade: 'B+', credits: 3, level: 'honors' },
		{ id: 3, name: 'Chemistry', grade: 'A', credits: 4, level: 'regular' },
		{ id: 4, name: 'History', grade: 'B', credits: 3, level: 'regular' }
	]);

	let priorGpa = $state(0);
	let priorCredits = $state(0);

	const pointsFor = (letter: string) => GRADES.find((g) => g.letter === letter)?.points ?? 0;
	const bonusFor = (level: string) => LEVELS.find((l) => l.id === level)?.bonus ?? 0;

	const totalCredits = $derived(courses.reduce((sum, c) => sum + Math.max(0, c.credits), 0));

	const unweightedPoints = $derived(
		courses.reduce((sum, c) => sum + pointsFor(c.grade) * Math.max(0, c.credits), 0)
	);
	const weightedPoints = $derived(
		courses.reduce(
			(sum, c) => sum + Math.min(5, pointsFor(c.grade) + bonusFor(c.level)) * Math.max(0, c.credits),
			0
		)
	);

	const unweighted = $derived(totalCredits > 0 ? unweightedPoints / totalCredits : 0);
	const weighted = $derived(totalCredits > 0 ? weightedPoints / totalCredits : 0);

	const cumulativeCredits = $derived(totalCredits + Math.max(0, priorCredits));
	const cumulative = $derived(
		cumulativeCredits > 0
			? (unweightedPoints + priorGpa * Math.max(0, priorCredits)) / cumulativeCredits
			: 0
	);

	function add() {
		courses = [...courses, { id: nextId++, name: '', grade: 'A', credits: 3, level: 'regular' }];
	}
	function remove(id: number) {
		courses = courses.filter((c) => c.id !== id);
	}
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="scroll-x">
			<table class="data">
				<thead>
					<tr><th>Course</th><th>Grade</th><th class="num">Credits</th><th>Level</th><th class="num">Points</th><th></th></tr>
				</thead>
				<tbody>
					{#each courses as course (course.id)}
						<tr>
							<td><input type="text" bind:value={course.name} placeholder="Course name" aria-label="Course name" /></td>
							<td>
								<select bind:value={course.grade} aria-label="Grade">
									{#each GRADES as grade (grade.letter)}<option value={grade.letter}>{grade.letter}</option>{/each}
								</select>
							</td>
							<td class="num"><input type="number" min="0" max="12" step="0.5" bind:value={course.credits} aria-label="Credits" class="narrow" /></td>
							<td>
								<select bind:value={course.level} aria-label="Course level">
									{#each LEVELS as level (level.id)}<option value={level.id}>{level.label}</option>{/each}
								</select>
							</td>
							<td class="num">{fmtLoose(pointsFor(course.grade), 1)}{bonusFor(course.level) ? ` +${bonusFor(course.level)}` : ''}</td>
							<td>
								<button type="button" class="btn btn-sm btn-ghost" onclick={() => remove(course.id)} disabled={courses.length <= 1} aria-label="Remove course">
									<Icon name="trash" size={14} />
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<button type="button" class="btn btn-sm no-print" onclick={add}><Icon name="plus" size={14} /> Add course</button>

		<div class="results-grid">
			<Result label="Unweighted GPA" primary value={fmtLoose(unweighted, 3)} detail="On the standard 4.0 scale" />
			<Result label="Weighted GPA" primary value={fmtLoose(weighted, 3)} detail="With honors and AP bonuses, capped at 5.0" />
			<Result label="Total credits" value={fmtLoose(totalCredits, 1)} />
			<Result label="Quality points" value={fmtLoose(unweightedPoints, 2)} detail="Grade points × credits" />
		</div>
	</div>

	<section class="card stack">
		<h2>Cumulative GPA</h2>
		<p class="small muted">Combine this term with everything before it.</p>
		<div class="field-row">
			<Field label="GPA before this term" for="gp-prior"><input id="gp-prior" type="number" min="0" max="5" step="0.01" bind:value={priorGpa} /></Field>
			<Field label="Credits before this term" for="gp-priorc"><input id="gp-priorc" type="number" min="0" max="400" step="0.5" bind:value={priorCredits} /></Field>
			<Result label="New cumulative GPA" primary value={fmtLoose(cumulative, 3)} detail={`Over ${fmtLoose(cumulativeCredits, 1)} credits`} />
		</div>
		{#if priorCredits > 0}
			<Note>
				This term moved your cumulative GPA by
				<strong>{cumulative >= priorGpa ? '+' : ''}{fmtLoose(cumulative - priorGpa, 3)}</strong>.
				The more credits you have already banked, the less any single term can shift it — which is
				why an early strong term is worth more than a late one.
			</Note>
		{/if}
	</section>

	{#snippet explainer()}
		<p>
			GPA is a credit-weighted average of grade points. A four-credit course counts twice as much as
			a two-credit one, which is why a bad grade in a lab course hurts more than the same grade in a
			one-credit seminar.
		</p>
		<code class="formula">GPA = Σ (grade points × credits) ÷ Σ credits</code>
		<h3>Weighted versus unweighted</h3>
		<p>
			Unweighted caps at 4.0 and treats every course the same. Weighted adds a bonus for harder
			courses — commonly +1.0 for AP or IB and +0.5 for honors — so it can exceed 4.0. Which one
			matters depends entirely on who is reading it: many US universities recalculate GPA themselves
			using their own scale, ignoring whatever your school reported.
		</p>
		<h3>The A+ question</h3>
		<p>
			Most institutions cap A+ at 4.0 on an unweighted scale, which is what this calculator does. A
			minority award 4.3. Check yours — over a full degree the difference is not trivial.
		</p>
		<h3>Why late terms move the needle less</h3>
		<p>
			Cumulative GPA is an average over all credits ever taken. After 90 credits, a 15-credit term is
			only a sixth of the total, so even a perfect term shifts the cumulative figure modestly. The
			arithmetic is unforgiving in both directions, which is the real argument for starting strong.
		</p>
	{/snippet}
</ToolShell>

<style>
	table input,
	table select {
		min-height: 34px;
		padding: 0.3rem 0.45rem;
		font-size: 0.88rem;
	}
	.narrow {
		width: 80px;
		text-align: right;
	}
	h2 {
		font-size: 1.05rem;
	}
</style>
