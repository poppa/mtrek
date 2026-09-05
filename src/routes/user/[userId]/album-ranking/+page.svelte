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
		<section class="panel">
			<div class="panel-body stack">
				<div class="ranked-list">
					{#each data.albums as item, n (item.id)}
						{@const rank = n + 1 + (data.pageNav.current?.offset ?? 0)}
						<UserRankedAlbum
							album={item}
							{rank}
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
					/>
				</div>{/if}
		</section>
	</div>
</section>
