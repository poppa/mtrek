<script lang="ts">
	import { resolve } from '$app/paths';
	import RankedYear from '$lib/components/RankedYear.svelte';
	import UserRankedAlbum from '$lib/components/UserRankedAlbum.svelte';
	import { ChevronsRight, LogOut } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const myMemberships = $derived.by(() => {
		const m: Record<string, (typeof data.memberships)[0]> = {};

		for (const ms of data.memberships) {
			m[ms.trekId] = ms;
		}

		return m;
	});
</script>

<svelte:head>
	<title>{data.user.name} · MTrek</title>
</svelte:head>

<section class="page auth-screen">
	<div class="contents">
		<div class="trek-hero">
			<div class="trek-title">
				<p class="eyebrow">User Profile</p>
				<h1 class:with-avatar={!!data.user.image}>
					{#if data.user.image}
						<img class="avatar" src={data.user.image} alt={data.user.name} />
					{/if}
					{data.me ? 'Me' : data.user.name}
				</h1>
			</div>
			{#if data.me}
				<form method="post" action="/signout">
					<input type="hidden" name="redirectTo" value="/" />
					<button
						class="button ghost small-text muted"
						type="submit"
						title="Sign out"
					>
						<LogOut size={16} />
						<span>Sign out</span>
					</button>
				</form>
			{/if}
		</div>

		<div class="user-grid">
			<div class="stack">
				<section class="albums panel">
					<div class="panel-body stack">
						<div class="panel-header">
							<h2>Top 10 albums</h2>
						</div>

						<div class="user-ranked-list">
							{#each data.albums as album, n (album.id)}
								<UserRankedAlbum
									{album}
									rank={n + 1}
									canAccessTrek={!!myMemberships[album.trekId]}
								/>
							{:else}<p class="muted">No rated albums yet.</p>
							{/each}
						</div>
					</div>
					<div class="panel-footer">
						<a
							class="goto"
							href={resolve('/user/[userId]/album-ranking', {
								userId: data.user.id
							})}>All album rankings <ChevronsRight /></a
						>
					</div>
				</section>
				<section class="panel stack">
					<div class="panel-header"><h2>Top 10 years</h2></div>
					<div class="ranked-list">
						{#each data.years as year, n (year.roundId)}
							<RankedYear
								{year}
								rank={n + 1}
								trekId={myMemberships[year.trekId] ? year.trekId : undefined}
								trekName={year.trekName}
							/>
						{:else}<p class="muted">No rated completed years yet.</p>{/each}
					</div>
					<div class="panel-footer">
						<a
							class="goto"
							href={resolve('/user/[userId]/year-ranking', {
								userId: data.user.id
							})}>All year rankings <ChevronsRight /></a
						>
					</div>
				</section>
			</div>

			<aside class="treks stack">
				<section class="panel stack">
					<div class="panel-header">
						<h2>User Treks</h2>
					</div>

					<div class="user-treks">
						{#each data.userTreks as trek (trek.id)}
							<svelte:element
								this={myMemberships[trek.id] ? 'a' : 'div'}
								class="trek card"
								href={myMemberships[trek.id]
									? resolve('/treks/[trekId]', { trekId: trek.id })
									: undefined}
							>
								<strong>{trek.name}</strong>
								<span class="badge" class:success={trek.status === 'completed'}>
									{trek.status}
								</span>
							</svelte:element>
						{/each}
					</div>
				</section>
			</aside>
		</div>
	</div>
</section>

<style lang="scss">
	.with-avatar {
		display: flex;
		gap: var(--gutter);
		align-items: center;

		.avatar {
			--size: clamp(2.5rem, 7vw, 5.4rem);
			width: var(--size);
			height: var(--size);
		}
	}

	.user-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 320px;
		gap: var(--gutter);
		align-items: start;

		@container app (width < 834px) {
			grid-template-columns: 1fr;
		}
	}

	.user-ranked-list {
		display: grid;
		gap: var(--gap);
	}

	.trek {
		display: flex;
		gap: var(--gap);
		justify-content: space-between;
	}

	@container app (width < 834px) {
		.trek-hero {
			grid-template-columns: minmax(0, 1fr) auto;
		}
	}

	.user-treks {
		display: flex;
		flex-direction: column;
		gap: var(--gap);
	}
</style>
