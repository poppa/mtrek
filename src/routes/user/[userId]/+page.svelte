<script lang="ts">
	import { resolve } from '$app/paths';
	import Label from '$lib/components/Label.svelte';
	import { initials } from '$lib/utils';
	import {
		CircleCheck,
		CircleDashed,
		ExternalLink,
		LogOut,
		MessageSquareMore,
		Music2
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// $inspect(data.albums, 'Data').with(console.log);

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
			<section class="albums panel">
				<div class="panel-body stack">
					<div class="panel-header">
						<h2>Ranked Albums</h2>
					</div>

					<div class="user-ranked-list">
						{#each data.albums as album, n (album.id)}
							<div class="ranked-album wide">
								<div class="rank-number align-self-start">{n + 1}</div>
								<div class="album-info">
									<div
										class="cover align-self-start"
										class:noimage={!album.imageUrl}
									>
										{#if album.imageUrl}
											<img
												class="cover"
												src={album.imageUrl}
												alt={album.albumName}
											/>
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
											<a
												href={album.externalUrl}
												class="button small"
												target="_blank"
												rel="external noreferrer"
											>
												<ExternalLink size={15} />
												Open
											</a>
											{#if myMemberships[album.trekId]}
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
														href={resolve('/treks/[trekId]/years/[year]', {
															trekId: album.trekId,
															year: String(album.year)
														})}
													>
														<CircleCheck size={15} />
														{album.year}
													</a>
												{:else}
													<span class="small button muted">
														<CircleDashed size={15} />
														{album.year}
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
						{/each}
					</div>
				</div>
			</section>

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

	.ranked-album {
		grid-template-columns: 2.4rem minmax(0, 1fr) auto;

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

	.note {
		margin-block: calc(var(--gap) / 1.5);

		:global(.lucide-icon) {
			margin-block-start: 1px;
			margin-block-end: -2px;
		}
	}
</style>
