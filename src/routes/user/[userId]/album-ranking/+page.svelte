<script lang="ts">
	import { resolve } from '$app/paths';
	import PageNav from '$lib/components/PageNav.svelte';
	import UserRankedAlbum from '$lib/components/UserRankedAlbum.svelte';
	import { ArrowLeft } from '@lucide/svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head
	><title>{data.user.name} · Album Ranking · MTrek</title></svelte:head
>
<section class="page stack">
	<div class="contents">
		<a
			class="button ghost back-link"
			href={resolve('/user/[userId]', { userId: data.user.id })}
			><ArrowLeft size={16} />{data.user.name}</a
		>
		<div class="trek-hero">
			<div class="trek-title">
				<p class="eyebrow">Album Ranking</p>
				<h1>{data.user.name}</h1>
				<div class="meta-row">{data.total} albums</div>
			</div>
		</div>
		<form class="user-filter panel" method="GET">
			<label for="trek-filter">Filter on Trek</label>
			<select
				id="trek-filter"
				name="trekId"
				value={data.selectedTrekId ?? ''}
				onchange={(event) => event.currentTarget.form?.requestSubmit()}
			>
				<option value="">All Treks</option>
				{#each data.treks as trek (trek.id)}
					<option value={trek.id}>{trek.name}</option>
				{/each}
			</select>
		</form>
		<section class="panel">
			<div class="panel-body stack">
				<div class="ranked-list">
					{#each data.albums as item (item.id)}
						<UserRankedAlbum
							album={item}
							rank={item.rank}
							canAccessTrek={data.memberships.some(
								(m) => m.trekId === item.trekId
							)}
						/>
					{:else}<p class="muted">No rated albums yet.</p>{/each}
				</div>
			</div>
			{#if data.total > 0}<div class="panel-footer">
					<PageNav
						nav={data.pageNav}
						path="/user/[userId]/album-ranking"
						pathArgs={{ userId: data.user.id }}
						query={{ trekId: data.selectedTrekId }}
					/>
				</div>{/if}
		</section>
	</div>
</section>
