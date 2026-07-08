<script lang="ts">
	import { resolve } from '$app/paths';
	import Label from '$lib/components/Label.svelte';
	import {
		ArrowLeft,
		CalendarDays,
		CheckCircle2,
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
	<a
		class="button ghost small back-link"
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
				<span><Star size={16} /> {data.summary.averageScore ?? 'Unrated'}</span>
				<span class="badge success"><CheckCircle2 size={15} /> completed</span>
			</div>
		</div>
	</div>

	{#if data.selections.length === 0}
		<p class="empty">No albums were recorded for this concluded year.</p>
	{:else}
		<div class="history-list">
			{#each data.selections as selection (selection.id)}
				<article class="history-card">
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
									<Label label="Picked by">{selection.submittedBy}</Label>
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
								<div class="rating-item">
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
								</div>
							{/each}
						</div>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</section>
