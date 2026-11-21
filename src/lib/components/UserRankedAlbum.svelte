<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		CircleCheck,
		CircleDashed,
		ExternalLink,
		MessageSquareMore,
		Music2
	} from '@lucide/svelte';
	import type { getRankedAlbumsForUser } from '$lib/server/trek-service';
	import AlbumCard from './AlbumCard.svelte';

	let {
		album,
		rank,
		canAccessTrek
	}: {
		album: Awaited<ReturnType<typeof getRankedAlbumsForUser>>[number];
		rank: number;
		canAccessTrek: boolean;
	} = $props();
</script>

<AlbumCard
	{album}
	{rank}
	pickedBy={{
		name: album.userName ?? album.userEmail ?? 'Unknown',
		userId: album.userId
	}}
	score={{ value: (album.rating / 10.0).toFixed(1) }}
>
	{#if album.ratingNote}
		<div class="note">
			<MessageSquareMore size={15} />
			{album.ratingNote}
		</div>
	{/if}
	<div class="links">
		{#if album.externalUrl}<a
				href={album.externalUrl}
				class="button small"
				target="_blank"
				rel="external noreferrer"
			>
				<ExternalLink size={15} />
				Open
			</a>{/if}
		{#if canAccessTrek}
			<a
				class="button small"
				href={resolve('/treks/[trekId]', {
					trekId: album.trekId
				})}
			>
				<Music2 size={15} />
				{album.trekName}
			</a>

			{#if album.roundStatus === 'completed'}
				<a
					class="button small"
					href={album.year === null
						? resolve('/treks/[trekId]/rounds/[roundId]', {
								trekId: album.trekId,
								roundId: album.roundId
							})
						: resolve('/treks/[trekId]/years/[year]', {
								trekId: album.trekId,
								year: String(album.year)
							})}
				>
					<CircleCheck size={15} />
					{album.year ?? `Round ${album.roundPosition}`}
				</a>
			{:else}
				<span class="small button muted">
					<CircleDashed size={15} />
					{album.year ?? `Round ${album.roundPosition}`}
				</span>
			{/if}
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

	.note {
		// display: flex;
		// align-items: baseline;
		margin-block: calc(var(--gap) / 1.5);

		:global(.lucide-icon) {
			display: inline;
			margin-block-start: -2px;
			margin-inline-end: 2px;
		}
	}
</style>
