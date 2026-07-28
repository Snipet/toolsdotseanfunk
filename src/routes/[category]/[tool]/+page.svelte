<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const Tool = $derived(data.component);
</script>

<!--
	Each tool component renders its own <ToolShell>, so it controls the page
	title, the explainer copy and the sources note.
-->
<Tool tool={data.tool} {...data.props} />
