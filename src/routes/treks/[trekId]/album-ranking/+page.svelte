<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import PageNav from '$lib/components/PageNav.svelte';
	import RankedAlbum from '$lib/components/RankedAlbum.svelte';
	import { ArrowLeft, CalendarDays, Disc3 } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.trek.name} · Album Ranking · MTrek</title>
</svelte:head>

<section class="page stack">
	<div class="contents">
		<a
			class="button ghost back-link"
			href={resolve('/treks/[trekId]', { trekId: data.trek.id })}
		>
			<ArrowLeft size={16} />
			<span>{data.trek.name}</span>
		</a>
		<div class="trek-hero">
			<div class="trek-title">
				<p class="eyebrow">Album Ranking</p>
				<h1>
					{data.trek.name}
				</h1>
				<div class="meta-row">
					<span
						><CalendarDays size={16} />
						{data.trek.startYear}-{data.trek.endYear}</span
					>

					<span
						><Disc3 size={16} />
						{data.albumCount} albums</span
					>

					<span class:success={data.trek.status === 'completed'} class="badge"
						>{data.trek.status}</span
					>
				</div>
			</div>
		</div>

		<section class="panel">
			<div class="panel-body stack">
				<div class="ranked-list">
					{#each data.albums as album (album.id)}
						<RankedAlbum {album} rank={album.rank} trekId={data.trek.id} />
					{/each}
				</div>
			</div>
			<div class="panel-footer">
				<PageNav
					nav={data.pageNav}
					path="/treks/[trekId]/album-ranking"
					pathArgs={{ trekId: data.trek.id }}
					invalidate={() => invalidate('url')}
				/>
			</div>
		</section>
	</div>
</section>
