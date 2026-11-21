<script lang="ts">
	import { resolve } from '$app/paths';
	import { initials } from '$lib/utils';
	import type { Snippet } from 'svelte';

	interface Album {
		albumName: string;
		artistName: string;
		imageUrl?: string | null;
		releaseDate?: string | null;
	}

	interface PickedBy {
		name: string;
		userId: string;
	}

	interface Score {
		value: string | number | null;
		label?: string;
	}

	interface Props {
		album: Album;
		rank?: number;
		pickedBy?: PickedBy;
		score?: Score;
		coverFallback?: string;
		children?: Snippet;
		footer?: Snippet;
	}

	const {
		album,
		rank,
		pickedBy,
		score,
		coverFallback,
		children,
		footer
	}: Props = $props();

	const hasScore = $derived(score && score.value !== null);
</script>

<article
	class="album-entry"
	class:has-rank={rank !== undefined}
	class:has-score={hasScore}
>
	{#if rank !== undefined}
		<div class="rank-number align-self-start">{rank}</div>
	{/if}

	<div class="album-main">
		<div class="cover align-self-start" class:noimage={!album.imageUrl}>
			{#if album.imageUrl}
				<img src={album.imageUrl} alt={album.albumName} />
			{:else}
				{coverFallback ?? initials(album.albumName)}
			{/if}
		</div>

		<div class="album-details">
			<strong>{album.albumName}</strong>
			<div class="artist">
				{album.artistName}{#if album.releaseDate}<span class="muted">
						· {album.releaseDate}</span
					>{/if}
			</div>

			{#if pickedBy}
				<small class="muted">
					Picked by
					<a
						href={resolve('/user/[userId]', { userId: pickedBy.userId })}
						class="muted underline">{pickedBy.name}</a
					>
				</small>
			{/if}

			{#if children}
				{@render children()}
			{/if}
		</div>
	</div>

	{#if hasScore && score}
		<div class="score-box align-self-start" class:compact={score.label}>
			<span>{score.value ?? '-'}</span>
			{#if score.label}<small>{score.label}</small>{/if}
		</div>
	{/if}

	{#if footer}
		<div class="album-footer">
			{@render footer()}
		</div>
	{/if}
</article>

<style lang="scss">
	.album-entry {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		align-items: center;
		gap: var(--gap);
		padding: 0.85rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface-soft);
	}

	.album-entry.has-rank {
		grid-template-columns: 2.4rem minmax(0, 1fr);
	}

	.album-entry.has-score {
		grid-template-columns: minmax(0, 1fr) auto;
	}

	.album-entry.has-rank.has-score {
		grid-template-columns: 2.4rem minmax(0, 1fr) auto;
	}

	.album-main {
		display: grid;
		grid-template-columns: 4rem minmax(0, 1fr);
		align-self: start;
		gap: var(--gap);
		min-width: 0;
	}

	.album-main .cover {
		width: 4rem;
	}

	.album-details {
		min-width: 0;
	}

	.album-footer {
		grid-column: 1 / -1;
		min-width: 0;
	}

	.album-details strong,
	.artist {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@container app (width < 834px) {
		.album-entry.has-score {
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-rows: auto 1fr;
		}

		.album-entry.has-rank.has-score {
			grid-template-columns: 2.4rem minmax(0, 1fr);
		}

		.album-entry.has-rank.has-score .rank-number {
			grid-area: 1 / 1;
		}

		.album-entry.has-score .score-box {
			grid-area: 1 / 2;
			justify-self: end;
			min-width: auto;
		}

		.album-entry.has-score .album-main {
			grid-area: 2 / 1 / 2 / 3;
		}
	}
</style>
