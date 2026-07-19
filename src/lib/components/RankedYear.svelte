<script lang="ts">
	import { resolve } from '$app/paths';
	import type { RankedYear, SimpleAlbum } from '$lib/dbtypes';
	import { initials } from '$lib/utils';
	import { Disc3, Star } from '@lucide/svelte';
	import Label from './Label.svelte';

	interface Props {
		rank: number;
		trekId: string;
		year: RankedYear;
		albums?: SimpleAlbum[] | null;
	}

	const { year, rank, trekId, albums }: Props = $props();
</script>

<a
	class="ranked-year card"
	href={resolve('/treks/[trekId]/years/[year]', {
		trekId: trekId,
		year: String(year.year)
	})}
>
	<span class="rank-number">{rank}</span>
	<div class="year-rank-main">
		<strong>{year.year}</strong>
		<div class="meta-row">
			<span
				><Disc3 size={15} />
				{year.albumCount} album{year.albumCount === 1 ? '' : 's'}</span
			>
			<span
				><Star size={15} />
				{year.ratingCount} rating{year.ratingCount === 1 ? '' : 's'}</span
			>
		</div>
	</div>
	<div class="score-box compact">
		<span>{year.averageScore ?? '-'}</span>
		<small>average</small>
	</div>

	{#if albums}
		<div class="ranked-list">
			{#each albums ?? [] as album (album.id)}
				<div class="simple-album card">
					{#if album.imageUrl}
						<img src={album.imageUrl} alt="" class="cover" />
					{:else}
						<div class="cover">{initials(album.albumName)}</div>
					{/if}
					<div>
						<div class="album-name"><small>{album.albumName}</small></div>
						<div class="artist-name">
							<Label label="Album by" small>
								{album.artistName}
							</Label>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</a>

<style lang="scss">
	.ranked-list {
		grid-row: 2;
		grid-column: 1 / 4;

		@container app (width >= 834px) {
			display: flex;
			flex-wrap: wrap;
		}
	}

	.simple-album {
		display: grid;
		gap: var(--gap);
		grid-template-columns: 3rem auto;
		align-items: center;
		padding: var(--gap);

		@container app (width >= 834px) {
			max-width: 40%;
		}

		.album-name {
			font-weight: bold;
			line-height: 1.1;
		}

		:global(.cover) {
			width: 3rem;
		}
	}
</style>
