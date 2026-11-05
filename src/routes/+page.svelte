<script lang="ts">
	import { resolve } from '$app/paths';
	import AuthButtons from '$lib/components/AuthButtons.svelte';
	import { getTrekRoundUnit, getTrekTypeDescription } from '$lib/trek-types';
	import {
		CalendarDays,
		CheckCircle2,
		Disc3,
		Music2,
		Plus,
		Shuffle,
		Star,
		TrendingUp,
		Users
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	const RATING_DIFFERENCE_EPSILON = 0.05;

	let { data }: { data: PageData } = $props();
	let trekGroups = $derived([
		{
			title: 'Active treks',
			treks: data.treks.filter((trek) => trek.status === 'active'),
			emptyMessage: 'No active treks. Create one to start exploring.'
		},
		{
			title: 'Completed treks',
			treks: data.treks.filter((trek) => trek.status === 'completed'),
			emptyMessage:
				'No completed treks yet. Finish a trek and it will appear here.'
		}
	]);
	let ratingComparison = $derived.by(() => {
		const difference = data.personalStats?.ratingDifference;

		if (difference === null || difference === undefined) {
			return '—';
		}

		if (Math.abs(difference) < RATING_DIFFERENCE_EPSILON) {
			return 'Even';
		}

		return `${difference > 0 ? '+' : ''}${difference.toFixed(1)}`;
	});
	let mostRankedArtistCount = $derived(
		data.personalStats?.topArtists[0]?.albumCount ?? 0
	);
</script>

{#if !data.session?.user}
	<section class="page auth-screen">
		<div class="contents">
			<div class="auth-copy">
				<p class="eyebrow">Music exploration with friends</p>
				<h1><span class="brand-color">M</span>Trek</h1>
				<p class="lead">
					Explore a year range or a curated album list with friends. Draw a year
					or album at random, listen, and rate together.
				</p>
				<AuthButtons providers={data.authProviders} redirectTo="/" />
			</div>
		</div>
	</section>
{:else}
	<section class="page stack">
		<div class="contents stack trek-sections">
			<div class="section-header main-header">
				<div>
					<p class="eyebrow">Dashboard</p>
					<h1>Your music treks</h1>
				</div>
				<a class="button primary" href={resolve('/treks/new')}>
					<Plus size={18} /> New trek
				</a>
			</div>

			{#if data.personalStats}
				<section
					class="dashboard-stats stack"
					aria-labelledby="personal-stats-title"
				>
					<div class="section-header">
						<div>
							<p class="eyebrow">By the numbers</p>
							<h2 id="personal-stats-title">Your listening stats</h2>
						</div>
					</div>

					<div class="stats-layout">
						<div class="stat-grid">
							<article class="stat-card">
								<div class="stat-icon">
									<CheckCircle2 size={20} aria-hidden="true" />
								</div>
								<strong>{data.personalStats.completedTreks}</strong>
								<span>Treks finished</span>
							</article>

							<article class="stat-card">
								<div class="stat-icon">
									<Disc3 size={20} aria-hidden="true" />
								</div>
								<strong>{data.personalStats.ratedAlbums}</strong>
								<span>Albums ranked</span>
							</article>

							<article class="stat-card">
								<div class="stat-icon">
									<Star size={20} aria-hidden="true" />
								</div>
								<strong>{data.personalStats.averageRating ?? '—'}</strong>
								<span
									>Average rating{data.personalStats.averageRating
										? ' / 5'
										: ''}</span
								>
							</article>

							<article class="stat-card comparison">
								<div class="stat-icon">
									<TrendingUp size={20} aria-hidden="true" />
								</div>
								<strong>{ratingComparison}</strong>
								<span>
									{#if data.personalStats.communityAverageRating}
										vs {data.personalStats.communityAverageRating} from everyone
									{:else}
										Compared with everyone
									{/if}
								</span>
							</article>
						</div>

						<article class="artist-card">
							<div class="artist-heading">
								<div class="artist-icon">
									<Music2 size={20} aria-hidden="true" />
								</div>
								<div>
									<h3>Most-ranked artists</h3>
									<p>Artists you keep coming back to</p>
								</div>
							</div>

							{#if data.personalStats.topArtists.length > 0}
								<ol class="artist-list">
									{#each data.personalStats.topArtists as artist (artist.artistName)}
										<li>
											<div class="artist-label">
												<span>{artist.artistName}</span>
												<small>{artist.albumCount}</small>
											</div>
											<div class="artist-track" aria-hidden="true">
												<div
													class="artist-fill"
													style={`width: ${(artist.albumCount / mostRankedArtistCount) * 100}%`}
												></div>
											</div>
										</li>
									{/each}
								</ol>
							{:else}
								<p class="artist-empty">
									Your favorite regulars will appear here.
								</p>
							{/if}
						</article>
					</div>
				</section>
			{/if}

			{#each trekGroups as group (group.title)}
				<section class="stack">
					<div class="section-header">
						<h2>{group.title}</h2>
						<span
							class="badge"
							class:violet={group.title === 'Active treks'}
							class:success={group.title === 'Completed treks'}
						>
							{group.treks.length}
							{group.treks.length === 1 ? 'trek' : 'treks'}
						</span>
					</div>

					{#if group.treks.length === 0}
						<p class="empty alert">{group.emptyMessage}</p>
					{:else}
						<div class="trek-list">
							{#each group.treks as trek (trek.id)}
								<a
									class="trek-card"
									href={resolve('/treks/[trekId]', { trekId: trek.id })}
								>
									<div class="trek-card-top">
										<div>
											<h3>{trek.name}</h3>
											<div class="meta-row">
												<span>
													<CalendarDays size={15} />
													{getTrekTypeDescription(trek.type, trek)}
												</span>
												<span><Users size={15} /> {trek.participantCount}</span>
											</div>
										</div>
										<span
											class="badge"
											class:success={trek.status === 'completed'}
										>
											{trek.status}
										</span>
									</div>

									<div class="progress-track" aria-hidden="true">
										<div
											class="progress-fill"
											class:completed={trek.status === 'completed'}
											style={`width: ${(trek.completedYears / trek.totalYears) * 100}%`}
										></div>
									</div>

									<div class="metric-row">
										<span>
											<Disc3 size={15} />
											{trek.completedYears}/{trek.totalYears}
											{getTrekRoundUnit(trek.type, true)}
										</span>
										{#if trek.activeYear}
											<span><Shuffle size={15} /> {trek.activeYear}</span>
										{/if}
									</div>
								</a>
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</div>
	</section>
{/if}

<style lang="scss">
	.auth-screen {
		display: grid;
		min-height: calc(100vh - 4.25rem);
		align-items: center;
		gap: 2rem;
	}

	.trek-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 24rem), 1fr));
		gap: var(--gutter);
	}

	.trek-sections {
		gap: calc(var(--gutter) * 2);
	}

	.dashboard-stats {
		gap: var(--gap);
	}

	.stats-layout {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(17rem, 1fr);
		gap: var(--gutter);
	}

	.stat-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--gutter);
	}

	.stat-card,
	.artist-card {
		border: 1px solid var(--line);
		border-radius: var(--border-radius);
		background: var(--surface);
	}

	.stat-card {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
		padding: var(--gutter);

		.stat-icon {
			grid-column: 2;
			grid-row: 1;
			line-height: 0;
			color: var(--brand);
		}

		strong {
			grid-column: 1;
			font-size: clamp(2rem, 5vw, 3.1rem);
			line-height: 1;
		}

		span {
			grid-column: 1 / -1;
			margin-block-start: var(--gap);
			color: var(--muted);
			font-size: var(--fs-small);
		}
	}

	.artist-card {
		padding: var(--gutter);
	}

	.artist-heading {
		display: flex;
		align-items: start;
		gap: var(--gap);

		.artist-icon {
			flex: 0 0 auto;
			line-height: 0;
			color: var(--brand);
		}

		p {
			margin: 0;
			color: var(--muted);
			font-size: var(--fs-small);
		}
	}

	.artist-list {
		display: grid;
		gap: var(--gap);
		margin: var(--gutter) 0 0;
		padding: 0;
		list-style: none;
	}

	.artist-label {
		display: flex;
		justify-content: space-between;
		gap: var(--gap);
		margin-block-end: var(--text-gap);
		font-size: var(--fs-small);

		small {
			color: var(--muted);
		}
	}

	.artist-track {
		height: 0.3rem;
		overflow: hidden;
		border-radius: 999px;
		background: var(--surface-soft);
	}

	.artist-fill {
		height: 100%;
		border-radius: inherit;
		background: var(--brand);
	}

	.artist-empty {
		margin: var(--gutter) 0 0;
		color: var(--muted);
		font-size: var(--fs-small);
	}

	@container app (width < 834px) {
		.stats-layout {
			grid-template-columns: 1fr;
		}
	}

	@container app (width < 480px) {
		.stat-grid {
			gap: var(--gap);
		}

		.stat-card {
			strong {
				font-size: 2rem;
			}
		}
	}

	.trek-card {
		padding: var(--gutter);
		border: 1px solid var(--line);
		border-radius: var(--border-radius);
		background-color: var(--surface);
		display: flex;
		flex-direction: column;
		gap: var(--gap);
		transition:
			border-color 125ms ease-in,
			background-color 125ms ease-in;

		&:hover {
			border-color: var(--line-strong);
			background-color: var(--surface-soft);
		}
	}

	.trek-card-top {
		display: flex;
		align-items: start;
		justify-content: space-between;
	}
</style>
