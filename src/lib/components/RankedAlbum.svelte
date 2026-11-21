<script lang="ts">
	import { resolve } from '$app/paths';
	import type { RankedAlbum } from '$lib/dbtypes';
	import { CircleCheck, ExternalLink } from '@lucide/svelte';
	import AlbumCard from './AlbumCard.svelte';

	interface Props {
		rank: number;
		trekId: string;
		album: RankedAlbum;
	}

	const { album, rank, trekId }: Props = $props();
</script>

<AlbumCard
	{album}
	{rank}
	pickedBy={{ name: album.submittedBy, userId: album.userId }}
	score={{
		value: album.averageScore,
		label: `${album.ratingCount} rating${album.ratingCount === 1 ? '' : 's'}`
	}}
>
	<div class="links">
		<a
			class="button ghost small"
			href={album.year === null
				? resolve('/treks/[trekId]/rounds/[roundId]', {
						trekId: trekId,
						roundId: album.roundId
					})
				: resolve('/treks/[trekId]/years/[year]', {
						trekId: trekId,
						year: String(album.year)
					})}
		>
			<CircleCheck size={15} />
			<span>{album.year ?? `Round ${album.roundPosition}`}</span>
		</a>
		{#if album.externalUrl}
			<a
				class="button small"
				href={album.externalUrl}
				target="_blank"
				rel="external noreferrer"
			>
				<ExternalLink size={15} />
				<span>Open</span>
			</a>
		{/if}
	</div>
</AlbumCard>

<style lang="scss">
	.links {
		margin-block-start: var(--gap);
		display: flex;
		flex-wrap: wrap;
		gap: calc(var(--gap) / 1.5);
	}
</style>
