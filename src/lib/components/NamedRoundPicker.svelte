<script lang="ts">
	import type { NamedRoundInput } from '$lib/named-rounds';
	import { Plus, Trash2 } from '@lucide/svelte';

	let {
		rounds = $bindable<NamedRoundInput[]>([])
	}: { rounds: NamedRoundInput[] } = $props();

	function addRound() {
		rounds = [...rounds, { name: '', description: '' }];
	}
</script>

<div class="stack">
	<p class="footer-note">
		Add the rounds for this trek now. Names are required; descriptions are
		optional.
	</p>
	<input type="hidden" name="rounds" value={JSON.stringify(rounds)} />
	{#each rounds as round, index (index)}
		<div class="card round-fields">
			<div class="field">
				<label for={`round-name-${index}`}>Round {index + 1} name</label>
				<input id={`round-name-${index}`} bind:value={round.name} required />
			</div>
			<div class="field">
				<label for={`round-description-${index}`}
					>Description <span class="footer-note">(optional)</span></label
				>
				<input
					id={`round-description-${index}`}
					bind:value={round.description}
				/>
			</div>
			<button
				type="button"
				class="button danger small icon-only"
				aria-label={`Remove round ${index + 1}`}
				onclick={() =>
					(rounds = rounds.filter((_, itemIndex) => itemIndex !== index))}
				><Trash2 size={16} /></button
			>
		</div>
	{/each}
	<button type="button" class="button" onclick={addRound}
		><Plus size={16} /> Add round</button
	>
</div>

<style lang="scss">
	.round-fields {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
		gap: var(--gap);
		align-items: end;

		@container app (width < 560px) {
			grid-template-columns: 1fr;
		}
	}
</style>
