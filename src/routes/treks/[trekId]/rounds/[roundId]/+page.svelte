<script lang="ts">
	import ConcludedRound from '$lib/components/ConcludedRound.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<ConcludedRound {data} />
