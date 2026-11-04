<script lang="ts">
	import { resolve } from '$app/paths';
	import TrekForm from '$lib/components/TrekForm.svelte';
	import { ArrowLeft } from '@lucide/svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Edit {data.trek.name} · MTrek</title></svelte:head>

<section class="page stack">
	<div class="contents narrow stack">
		<a
			class="button ghost back-link"
			href={resolve('/treks/[trekId]', { trekId: data.trek.id })}
		>
			<ArrowLeft size={16} />
			{data.trek.name}
		</a>
		<div class="section-header main-header">
			<div>
				<p class="eyebrow">Trek settings</p>
				<h1>Edit trek</h1>
			</div>
		</div>
		<section class="panel">
			<div class="panel-body stack">
				{#if form?.updateError}
					<p class="form-error alert">{form.updateError}</p>
				{/if}
				{#if data.canEditStructure}
					<p class="notice alert">
						Changing the Trek structure resets its rounds, selections, and
						ratings. Title-only changes preserve progress.
					</p>
				{:else}
					<p class="footer-note notice alert">
						Only the title can be changed after another participant joins.
					</p>
				{/if}
				<TrekForm
					action="?/updateTrek"
					mode="edit"
					initialType={data.trek.type}
					initialName={data.trek.name}
					initialRoundOrder={data.trek.roundOrder}
					initialSecret={data.trek.secret}
					initialAlbums={data.albums}
					initialRounds={data.rounds}
					initialStartYear={data.trek.startYear}
					initialEndYear={data.trek.endYear}
					lastConcludedYear={data.lastConcludedYear}
					spotifySearchConfigured={data.spotifySearchConfigured}
					structureEditable={data.canEditStructure}
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
