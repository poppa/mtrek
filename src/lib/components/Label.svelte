<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		label,
		small,
		children
	}: {
		label: string;
		small?: boolean;
		children: Snippet;
	} = $props();
</script>

<div class="with-label" class:small>
	<span class="label">{label}</span>
	{@render children()}
</div>
