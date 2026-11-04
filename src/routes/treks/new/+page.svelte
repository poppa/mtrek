<script lang="ts">
	import { resolve } from '$app/paths';
	import TrekForm from '$lib/components/TrekForm.svelte';
	import { ArrowLeft } from '@lucide/svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Create trek · MTrek</title></svelte:head>

<section class="page stack">
	<div class="contents narrow stack">
		<a class="button ghost back-link" href={resolve('/')}
			><ArrowLeft size={16} /> Dashboard</a
		>
		<div class="section-header main-header">
			<div>
				<p class="eyebrow">New trek</p>
				<h1>Create trek</h1>
			</div>
		</div>
		<section class="panel">
			<div class="panel-body stack">
				{#if form?.createError}
					<p class="form-error alert">{form.createError}</p>
				{/if}
				<TrekForm
					action="?/createTrek"
					mode="create"
					lastConcludedYear={data.lastConcludedYear}
					spotifySearchConfigured={data.spotifySearchConfigured}
					values={form?.values}
				/>
			</div>
		</section>
	</div>
</section>

<style>
	.narrow {
		max-width: 52rem;
	}
</style>
