<script lang="ts">
	import { resolve } from '$app/paths';
	import Label from './Label.svelte';
	import { initials } from '$lib/utils';
	import {
		CircleCheck,
		CircleDashed,
		ExternalLink,
		MessageSquareMore,
		Music2
	} from '@lucide/svelte';
	import type { getRankedAlbumsForUser } from '$lib/server/trek-service';

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

<div class="user-ranked-album">
	<div class="rank-number align-self-start">{rank}</div>
	<div class="album-info">
		<div class="cover align-self-start" class:noimage={!album.imageUrl}>
			{#if album.imageUrl}
				<img class="cover" src={album.imageUrl} alt={album.albumName} />
			{:else}
				{initials(album.albumName)}
			{/if}
		</div>
		<div>
			<strong>{album.albumName}</strong>
			<Label label="Album by"
				>{album.artistName}
				<span class="muted">{album.releaseDate}</span></Label
			>
			<small class="muted">
				Picked by
				<a
					href={resolve('/user/[userId]', {
						userId: album.userId
					})}
					class="muted underline">{album.userName}</a
				></small
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
		</div>
	</div>
	<div class="score-box align-self-start">
		<span>{(album.rating / 10.0).toFixed(1)}</span>
	</div>
</div>

<style lang="scss">
	.user-ranked-album {
		grid-template-columns: 2.4rem minmax(0, 1fr) auto;

		.cover {
			width: 4rem;
		}

		@container app (width < 834px) {
			grid-template-columns: 2.4rem auto;
			grid-template-rows: auto 1fr;

			.rank-number {
				grid-row: 1;
				grid-column: 1;
			}

			.score-box {
				grid-area: 1 / 2;
				justify-self: end;
				min-width: auto;
			}

			.album-info {
				grid-template-columns: 4rem auto;
				grid-row: 2;
				grid-column: 1 / 3;
			}
		}
	}

	.album-info {
		display: grid;
		grid-template-columns: 4rem auto;
		align-self: start;
		gap: var(--gap);
	}

	.links {
		margin-block-start: var(--gap);
		display: flex;
		flex-wrap: wrap;
		gap: calc(var(--gap) / 1.5);
	}

	.note {
		margin-block: calc(var(--gap) / 1.5);

		:global(.lucide-icon) {
			margin-block-start: 1px;
			margin-block-end: -2px;
		}
	}
</style>
