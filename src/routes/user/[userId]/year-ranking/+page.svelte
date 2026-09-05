<script lang="ts">
	import { resolve } from '$app/paths';
	import PageNav from '$lib/components/PageNav.svelte';
	import RankedYear from '$lib/components/RankedYear.svelte';
	import { ArrowLeft } from '@lucide/svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.user.name} · Year Ranking · MTrek</title></svelte:head
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
				<p class="eyebrow">Year Ranking</p>
				<h1>{data.user.name}</h1>
				<div class="meta-row">{data.total} years</div>
			</div>
		</div>
		<section class="panel">
			<div class="panel-body stack">
				<div class="ranked-list">
					{#each data.years as item, n (item.roundId)}
						{@const rank = n + 1 + (data.pageNav.current?.offset ?? 0)}
						<RankedYear
							year={item}
							{rank}
							trekId={data.memberships.some((m) => m.trekId === item.trekId)
								? item.trekId
								: undefined}
							trekName={item.trekName}
							albums={item.albums}
						/>
					{:else}<p class="muted">No rated completed years yet.</p>{/each}
				</div>
			</div>
			{#if data.total > 0}<div class="panel-footer">
					<PageNav
						nav={data.pageNav}
						path="/user/[userId]/year-ranking"
						pathArgs={{ userId: data.user.id }}
					/>
				</div>{/if}
		</section>
	</div>
</section>
