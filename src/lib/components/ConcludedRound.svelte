<script lang="ts">
	import { resolve } from '$app/paths';
	import AlbumCard from '$lib/components/AlbumCard.svelte';
	import {
		ArrowLeft,
		CalendarDays,
		CircleCheck,
		Disc3,
		ExternalLink,
		Star,
		Users
	} from '@lucide/svelte';
	import type { getConcludedYearDetail } from '$lib/server/trek-service';
	import { AppName, getConcludedRoundLabel } from '$lib/trek-types';
	type PageData = Awaited<ReturnType<typeof getConcludedYearDetail>>;

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title
		>{data.round.name ??
			data.round.year ??
			data.selections[0]?.albumName ??
			'Album round'} · {data.trek.name} · {AppName}</title
	>
</svelte:head>

<section class="page stack">
	<div class="content-frame">
		<a
			class="button ghost back-link"
			href={resolve('/treks/[trekId]', { trekId: data.trek.id })}
		>
			<ArrowLeft size={16} />
			<span>{data.trek.name}</span>
		</a>

		<div class="trek-hero">
			<div class="trek-title">
				<p class="eyebrow">
					{getConcludedRoundLabel(data.trek.type)}
				</p>
				<h1>
					{data.round.name ??
						data.round.year ??
						data.selections[0]?.albumName ??
						'Album round'}
				</h1>
				{#if data.round.description}<p class="footer-note">
						{data.round.description}
					</p>{/if}
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
			<p class="empty alert">No albums were recorded for this round.</p>
		{:else}
			<div class="history-list">
				{#each data.selections as selection (selection.id)}
					<AlbumCard
						album={selection}
						pickedBy={{ name: selection.submittedBy, userId: selection.userId }}
						score={{
							value: selection.averageScore,
							label: `${selection.ratingCount} rating${selection.ratingCount === 1 ? '' : 's'}`
						}}
					>
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

						{#snippet footer()}
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
						{/snippet}
					</AlbumCard>
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

	.rating-breakdown {
		display: grid;
		gap: var(--gap);
		margin-block-start: var(--gap);
	}

	.album-link {
		margin-block-start: var(--gap);
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
