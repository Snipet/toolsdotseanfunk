<!--
	The mark: an isometric block, in the same family as the sibling site's cube.

	Its top face is divided in four — many tools, one box — which also keeps it
	from being read as a 3×3 puzzle. The dividing lines and the outline are drawn
	in the page background so the solid reads as separated planes on either theme.
-->
<script lang="ts">
	interface Props {
		size?: number;
	}

	let { size = 26 }: Props = $props();
</script>

<svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
	<path d="M32 4 60 18 32 32 4 18Z" fill="var(--section)" />
	<path d="M4 18 32 32 32 60 4 46Z" fill="var(--accent)" />
	<path d="M60 18 60 46 32 60 32 32Z" fill="color-mix(in oklab, var(--accent) 62%, black)" />
	<path
		d="M32 4 60 18 60 46 32 60 4 46 4 18Z M4 18 32 32 60 18 M32 32 32 60 M18 11 46 25 M46 11 18 25"
		fill="none"
		stroke="var(--bg)"
		stroke-width="2.5"
		stroke-linejoin="round"
	/>
</svg>

<style>
	svg {
		display: block;
		flex: none;
	}
</style>
