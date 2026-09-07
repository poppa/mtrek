<script lang="ts">
	import { resolve } from '$app/paths';
	import type { RankedAlbum } from '$lib/dbtypes';
	import { initials } from '$lib/utils';
	import { CircleCheck, ExternalLink } from '@lucide/svelte';
	import Label from './Label.svelte';

	interface Props {
		rank: number;
		trekId: string;
		album: RankedAlbum;
	}

	const { album, rank, trekId }: Props = $props();
</script>

<article class="ranked-album">
	<span class="rank-number align-self-start">{rank}</span>
	<div class="cover align-self-start" class:noimage={!album.imageUrl}>
		{#if album.imageUrl}
			<img src={album.imageUrl} alt="" />
		{:else}
			{initials(album.albumName)}
		{/if}
	</div>
	<div class="album-info">
		<div>
			<strong>{album.albumName}</strong>
			<Label label="Album by">{album.artistName}</Label>
		</div>
		<div class="inline-row">
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
			<Label label="Picked by" small>
				<a
					href={resolve('/user/[userId]', {
						userId: album.userId
					})}
					class="underline">{album.submittedBy}</a
				>
			</Label>
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
	</div>
	<div class="score-box compact">
		<span>{album.averageScore ?? '-'}</span>
		<small>
			{album.ratingCount} rating{album.ratingCount === 1 ? '' : 's'}
		</small>
	</div>
</article>
