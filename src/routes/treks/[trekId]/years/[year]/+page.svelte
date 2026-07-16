<script lang="ts">
	import { resolve } from '$app/paths';
	import Label from '$lib/components/Label.svelte';
	import {
		ArrowLeft,
		CalendarDays,
		CircleCheck,
		Disc3,
		ExternalLink,
		Star,
		Users
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function initials(value: string) {
		return value
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('');
	}
</script>

<svelte:head>
	<title>{data.round.year} · {data.trek.name} · MTrek</title>
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
				<p class="eyebrow">Concluded year</p>
				<h1>{data.round.year}</h1>
				<div class="meta-row">
					<span><CalendarDays size={16} /> Round {data.round.position}</span>
					<span><Disc3 size={16} /> {data.summary.albumCount} albums</span>
					<span><Users size={16} /> {data.summary.ratingCount} ratings</span>
					<span
						><Star size={16} /> {data.summary.averageScore ?? 'Unrated'}</span
					>
					<span class="badge success"><CircleCheck size={15} /> completed</span>
				</div>
			</div>
		</div>

		{#if data.selections.length === 0}
			<p class="empty alert">
				No albums were recorded for this concluded year.
			</p>
		{:else}
			<div class="history-list">
				{#each data.selections as selection (selection.id)}
					<article class="card history-card">
						<div class="cover" class:noimage={!selection.imageUrl}>
							{#if selection.imageUrl}
								<img src={selection.imageUrl} alt="" />
							{:else}
								{initials(selection.albumName)}
							{/if}
						</div>

						<div class="history-main">
							<div class="history-heading">
								<div>
									<h2>{selection.albumName}</h2>
									<div class="meta-row">
										<Label label="Album by">{selection.artistName}</Label>
										{#if selection.releaseDate}
											<span>@{selection.releaseDate}</span>
										{/if}
										&bull;
										<Label label="Picked by">
											<a
												href={resolve('/user/[userId]', {
													userId: selection.userId
												})}
												class="underline"
											>
												{selection.submittedBy}
											</a>
										</Label>
									</div>
								</div>

								<div class="score-box">
									<span>{selection.averageScore ?? '-'}</span>
									<small>{selection.ratingCount} ratings</small>
								</div>
							</div>

							{#if selection.externalUrl}
								<a
									class="button small album-link"
									href={selection.externalUrl}
									target="_blank"
									rel="external noreferrer"
								>
									<ExternalLink size={15} />
									<span>Open album</span>
								</a>
							{/if}

							<div class="rating-breakdown">
								{#each selection.ratings as rating (`${selection.id}-${rating.userId}`)}
									<a
										class="rating-item"
										href={resolve('/user/[userId]', {
											userId: rating.userId
										})}
									>
										{#if rating.userImage}
											<img class="avatar" src={rating.userImage} alt="" />
										{:else}
											<div class="avatar"></div>
										{/if}
										<div>
											<strong>{rating.displayName}</strong>

											{#if rating.note}
												<p>{rating.note}</p>
											{/if}
										</div>
										<span class="rating-score">{rating.displayScore}</span>
									</a>
								{/each}
							</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</div>
</section>

<style lang="scss">
	.history-list {
		display: grid;
		gap: var(--gutter);
	}

	.history-card {
		display: grid;
		grid-template-columns: 7rem minmax(0, 1fr);
		gap: var(--gutter);
		background: var(--surface);

		@container app (width < 600px) {
			grid-template-columns: 1fr;
		}
	}

	.history-card .cover {
		width: 7rem;
	}

	.history-main {
		display: grid;
		gap: 0.85rem;
		min-width: 0;
	}

	.history-heading {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 1rem;
		align-items: start;
	}

	.rating-breakdown {
		display: grid;
		gap: var(--gap);
	}

	.rating-item {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: var(--gap);
		align-items: center;
		padding: var(--gap);
		border: 1px solid var(--line);
		border-radius: var(--border-radius);
		background: var(--input-bg);
	}

	.rating-item strong {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.rating-item p {
		margin: 0.15rem 0 0;
		color: var(--muted);
		font-size: 0.9rem;
		line-height: 1.35;
	}

	.rating-score {
		display: inline-grid;
		min-width: 2.7rem;
		min-height: 2.2rem;
		place-items: center;
		border-radius: var(--border-radius);
		color: var(--on-brand);
		background: var(--brand);
		font-weight: 900;
	}
</style>
