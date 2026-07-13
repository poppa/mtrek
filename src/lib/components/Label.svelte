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

<style lang="scss">
	.with-label {
		display: flex;
		gap: var(--inline-gap);
	}

	.with-label.small {
		font-size: small;
	}

	.with-label .label {
		color: var(--muted);
	}
</style>
