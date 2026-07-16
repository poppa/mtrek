<script lang="ts">
	import { resolve } from '$app/paths';
	import Label from '$lib/components/Label.svelte';
	import {
		CalendarDays,
		CircleCheck,
		Disc3,
		ExternalLink,
		Link,
		Music2,
		Save,
		Search,
		Shuffle,
		Star,
		Trash2,
		UserMinus,
		Users
	} from '@lucide/svelte';
	import type { ActionData, PageData } from './$types';
	import { initials } from '$lib/utils';

	type AlbumSearchResult = {
		spotifyAlbumId: string;
		albumName: string;
		artistName: string;
		releaseDate: string | null;
		imageUrl: string | null;
		externalUrl: string | null;
	};

	type SearchPayload = {
		configured?: boolean;
		albums?: AlbumSearchResult[];
		message?: string;
	};

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let query = $state('');
	let results = $state<AlbumSearchResult[]>([]);
	let isSearching = $state(false);
	let searchMessage = $state('');

	const invitePath = $derived(`/join/${data.trek.inviteCode}`);
	const waitingSelections = $derived(
		Math.max(data.progress.participantCount - data.progress.selectionCount, 0)
	);
	const remainingRatings = $derived(
		Math.max(data.progress.requiredRatingCount - data.progress.ratingCount, 0)
	);
	const isOwner = $derived(data.membership.role === 'owner');
	const canDeleteSelection = $derived(
		Boolean(data.mySelection) && data.progress.ratingCount === 0
	);

	async function searchAlbums(event: SubmitEvent) {
		event.preventDefault();

		if (!data.currentRound) return;

		isSearching = true;
		searchMessage = '';
		results = [];

		const params = new URLSearchParams({
			q: query,
			year: String(data.currentRound.year)
		});

		try {
			const response = await fetch(`/api/spotify/search?${params.toString()}`);
			const payload = (await response.json()) as SearchPayload;

			if (!response.ok) {
				searchMessage = payload.message ?? 'Spotify search failed.';
				return;
			}

			if (!payload.configured) {
				searchMessage =
					'Spotify search is not configured. Manual entry is available.';
				return;
			}

			results = payload.albums ?? [];
			searchMessage =
				results.length === 0 ? 'No albums found for that search.' : '';
		} catch {
			searchMessage = 'Spotify search failed.';
		} finally {
			isSearching = false;
		}
	}

	let manageTrekCollapsed = $state(true);
</script>

<svelte:head>
	<title>{data.trek.name} · MTrek</title>
</svelte:head>

<section class="page stack">
	<div class="contents">
		<div class="trek-hero">
			<div class="trek-title">
				<p class="eyebrow">Music trek</p>
				<h1>{data.trek.name}</h1>
				<div class="meta-row">
					<span
						><CalendarDays size={16} />
						{data.trek.startYear}-{data.trek.endYear}</span
					>
					<span
						><Users size={16} />
						{data.progress.participantCount} participants</span
					>
					<span
						><Disc3 size={16} />
						{data.progress.completedYears}/{data.progress.totalYears} years</span
					>
					<span class:success={data.trek.status === 'completed'} class="badge"
						>{data.trek.status}</span
					>
				</div>
			</div>

			<div class="invite-box">
				<div class="inline-row">
					<Link size={16} />
					<strong>Invite</strong>
				</div>
				<code>{invitePath}</code>
			</div>
		</div>

		{#if form?.actionError}
			<p class="form-error alert">{form.actionError}</p>
		{/if}

		<div class="workspace-grid">
			<div class="stack">
				<section class="panel">
					<div class="panel-body stack">
						<div class="panel-header">
							<div>
								<h2>
									{#if data.currentRound}
										{data.currentRound.year}
									{:else if data.trek.status === 'completed'}
										Trek complete
									{:else}
										Ready for next year
									{/if}
								</h2>
								{#if data.currentRound}
									<p class="footer-note">
										Round {data.currentRound.position} · {data.currentRound
											.status}
									</p>
								{/if}
							</div>

							{#if data.progress.canAdvance}
								<form method="post" action="?/advance">
									<button class="button primary" type="submit">
										<Shuffle size={18} />
										<span>Randomize year</span>
									</button>
								</form>
							{/if}
						</div>

						{#if data.currentRound?.status === 'selecting'}
							<div class="notice alert">
								{#if waitingSelections === 0}
									All albums are in. Ratings will open automatically.
								{:else}
									Waiting for {waitingSelections} more album selection{waitingSelections ===
									1
										? ''
										: 's'}.
								{/if}
							</div>

							{#if data.mySelection}
								<div class="album-card">
									<div class="cover" class:noimage={!data.mySelection.imageUrl}>
										{#if data.mySelection.imageUrl}
											<img src={data.mySelection.imageUrl} alt="" />
										{:else}
											{initials(data.mySelection.albumName)}
										{/if}
									</div>
									<div class="album-info">
										<div class="grid-line">
											<strong>{data.mySelection.albumName}</strong>
											<span class="badge violet">Your pick</span>
										</div>
										<Label label="Album by" small
											>{data.mySelection.artistName}</Label
										>
										{#if canDeleteSelection}
											<form method="post" action="?/deleteSelection">
												<button class="button danger small" type="submit">
													<Trash2 size={15} />
													<span>Delete pick</span>
												</button>
											</form>
										{/if}
									</div>
								</div>
							{:else}
								<div class="stack">
									<div class="section-header">
										<h3>Find an album</h3>
										<span
											class:notice={!data.spotifySearchConfigured}
											class="badge"
										>
											{data.spotifySearchConfigured
												? 'Spotify ready'
												: 'Manual mode'}
										</span>
									</div>

									<form class="form-grid search" onsubmit={searchAlbums}>
										<div class="field">
											<label for="album-search">Album or artist</label>
											<input
												id="album-search"
												bind:value={query}
												autocomplete="off"
												placeholder="Search Spotify"
												disabled={!data.spotifySearchConfigured}
											/>
										</div>
										<button
											class="button"
											type="submit"
											disabled={!data.spotifySearchConfigured || isSearching}
										>
											<Search size={18} />
											<span>{isSearching ? 'Searching' : 'Search'}</span>
										</button>
									</form>

									{#if searchMessage}
										<p class="notice alert">{searchMessage}</p>
									{/if}

									{#if results.length > 0}
										<div class="search-results">
											{#each results as album (album.spotifyAlbumId)}
												<form
													class="album-card wide"
													method="post"
													action="?/selectAlbum"
												>
													<input
														type="hidden"
														name="spotifyAlbumId"
														value={album.spotifyAlbumId}
													/>
													<input
														type="hidden"
														name="albumName"
														value={album.albumName}
													/>
													<input
														type="hidden"
														name="artistName"
														value={album.artistName}
													/>
													<input
														type="hidden"
														name="releaseDate"
														value={album.releaseDate ?? ''}
													/>
													<input
														type="hidden"
														name="imageUrl"
														value={album.imageUrl ?? ''}
													/>
													<input
														type="hidden"
														name="externalUrl"
														value={album.externalUrl ?? ''}
													/>

													<div class="cover" class:noimage={!album.imageUrl}>
														{#if album.imageUrl}
															<img src={album.imageUrl} alt="" />
														{:else}
															{initials(album.albumName)}
														{/if}
													</div>
													<div class="album-info">
														<strong>{album.albumName}</strong>
														<Label label="Album by" small
															>{album.artistName}</Label
														>
														<div class="inline-row">
															<span
																>{album.releaseDate ??
																	data.currentRound.year}</span
															>
															<button class="button small" type="submit">
																<Music2 size={16} />
																<span>Select</span>
															</button>
														</div>
													</div>
												</form>
											{/each}
										</div>
									{/if}
								</div>

								<hr class="divider" />

								<form class="form-grid" method="post" action="?/selectAlbum">
									<h3>Manual entry</h3>
									<div class="two-col">
										<div class="field">
											<label for="albumName">Album</label>
											<input id="albumName" name="albumName" required />
										</div>
										<div class="field">
											<label for="artistName">Artist</label>
											<input id="artistName" name="artistName" required />
										</div>
									</div>
									<div class="two-col">
										<div class="field">
											<label for="releaseDate">Release date</label>
											<input
												id="releaseDate"
												name="releaseDate"
												placeholder={String(data.currentRound.year)}
											/>
										</div>
										<div class="field">
											<label for="externalUrl">Album link</label>
											<input id="externalUrl" name="externalUrl" type="url" />
										</div>
									</div>
									<button class="button primary" type="submit">
										<Music2 size={18} />
										<span>Save album</span>
									</button>
								</form>
							{/if}
						{:else if data.currentRound?.status === 'rating'}
							<div class="notice alert">
								{remainingRatings} rating{remainingRatings === 1 ? '' : 's'} left
								before this year wraps.
							</div>

							<div class="album-grid">
								{#each data.selections as selection (selection.id)}
									<div class="album-card wide">
										<div class="cover" class:noimage={!selection.imageUrl}>
											{#if selection.imageUrl}
												<img src={selection.imageUrl} alt="" />
											{:else}
												{initials(selection.albumName)}
											{/if}
										</div>
										<div class="album-info">
											<strong>{selection.albumName}</strong>
											<Label label="Album by">{selection.artistName}</Label>
											<div class="inline-row">
												<Label label="Picked by" small>
													<a
														class="underline"
														href={resolve('/user/[userId]', {
															userId: selection.userId
														})}
													>
														{selection.submittedBy}
													</a>
												</Label>
												&bull;
												<span
													><Star size={15} />
													{selection.averageScore ?? 'Unrated'}</span
												>
												{#if selection.userId === data.session?.user?.id && canDeleteSelection}
													<form method="post" action="?/deleteSelection">
														<button class="button danger small" type="submit">
															<Trash2 size={15} />
															<span>Delete pick</span>
														</button>
													</form>
												{/if}
												{#if selection.externalUrl}
													<a
														class="button small"
														href={selection.externalUrl}
														target="_blank"
														rel="external noreferrer"
													>
														<ExternalLink size={15} />
														<span>Open</span>
													</a>
												{/if}
											</div>

											<form
												class="rating-form"
												method="post"
												action="?/rateAlbum"
											>
												<input
													type="hidden"
													name="selectionId"
													value={selection.id}
												/>
												<div class="rating-row">
													<div class="field">
														<label for={`score-${selection.id}`}>Score</label>
														<input
															id={`score-${selection.id}`}
															name="score"
															type="number"
															min="0"
															max="5"
															step="0.1"
															value={selection.myRating?.displayScore ?? ''}
															required
														/>
													</div>
													<div class="field">
														<label for={`note-${selection.id}`}>Note</label>
														<input
															id={`note-${selection.id}`}
															name="note"
															value={selection.myRating?.note ?? ''}
														/>
													</div>
													<button class="button" type="submit">
														<Star size={16} />
														<span>Rate</span>
													</button>
												</div>
											</form>
										</div>
									</div>
								{/each}
							</div>
						{:else if data.trek.status === 'completed'}
							<div class="success alert">
								<span class="align-text-and-icon">
									<CircleCheck size={18} />
									All years in this range have been explored.
								</span>
							</div>
						{:else}
							<div class="empty alert">
								This trek is between years. Randomize the next year when ready.
							</div>
						{/if}
					</div>
				</section>

				{#if data.selections.length > 0 && data.currentRound?.status === 'selecting'}
					<section class="stack panel">
						<div class="section-header">
							<h2>Selections</h2>
							<span class="badge"
								>{data.progress.selectionCount}/{data.progress
									.participantCount}</span
							>
						</div>
						<div class="album-grid">
							{#each data.selections as selection (selection.id)}
								<div class="album-card">
									<div class="cover" class:noimage={!selection.imageUrl}>
										{#if selection.imageUrl}
											<img src={selection.imageUrl} alt="" />
										{:else}
											{initials(selection.albumName)}
										{/if}
									</div>
									<div class="album-info">
										<strong>{selection.albumName}</strong>
										<Label label="Album by" small>{selection.artistName}</Label>
										<Label label="Picked by" small>
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
							{/each}
						</div>
					</section>
				{/if}

				{#if data.progress.completedYears > 0}
					<section class="panel">
						<div class="panel-body stack">
							<div class="panel-header">
								<div>
									<h2>Year ranking</h2>
									<p class="footer-note">Concluded years by average score</p>
								</div>
								<span class="badge">{data.rankedYears.length}</span>
							</div>

							{#if data.rankedYears.length === 0}
								<p class="empty alert">
									No concluded years have been ranked yet.
								</p>
							{:else}
								<div class="ranked-list">
									{#each data.rankedYears as year, index (year.roundId)}
										<a
											class="ranked-year card"
											href={resolve('/treks/[trekId]/years/[year]', {
												trekId: data.trek.id,
												year: String(year.year)
											})}
										>
											<span class="rank-number">{index + 1}</span>
											<div class="year-rank-main">
												<strong>{year.year}</strong>
												<div class="meta-row">
													<span
														><Disc3 size={15} />
														{year.albumCount} album{year.albumCount === 1
															? ''
															: 's'}</span
													>
													<span
														><Star size={15} />
														{year.ratingCount} rating{year.ratingCount === 1
															? ''
															: 's'}</span
													>
												</div>
											</div>
											<div class="score-box compact">
												<span>{year.averageScore ?? '-'}</span>
												<small>average</small>
											</div>
										</a>
									{/each}
								</div>
							{/if}
						</div>
					</section>

					<section class="panel">
						<div class="panel-body stack">
							<div class="panel-header">
								<div>
									<h2>Album ranking</h2>
									<p class="footer-note">Across concluded years</p>
								</div>
								<span class="badge">{data.rankedAlbums.length}</span>
							</div>

							{#if data.rankedAlbums.length === 0}
								<p class="empty alert">
									No rated albums have been recorded yet.
								</p>
							{:else}
								<div class="ranked-list">
									{#each data.rankedAlbums as album, index (album.id)}
										<article class="ranked-album">
											<span class="rank-number align-self-start"
												>{index + 1}</span
											>
											<div
												class="cover align-self-start"
												class:noimage={!album.imageUrl}
											>
												{#if album.imageUrl}
													<img src={album.imageUrl} alt="" />
												{:else}
													{initials(album.albumName)}
												{/if}
											</div>
											<div class="album-info">
												<div>
													<strong>{album.albumName}</strong>
													<Label label="Album by">{album.artistName}</Label>
												</div>
												<div class="inline-row">
													<a
														class="button ghost small"
														href={resolve('/treks/[trekId]/years/[year]', {
															trekId: data.trek.id,
															year: String(album.year)
														})}
													>
														<CircleCheck size={15} />
														<span>{album.year}</span>
													</a>
													<Label label="Picked by" small>
														<a
															href={resolve('/user/[userId]', {
																userId: album.userId
															})}
															class="underline">{album.submittedBy}</a
														>
													</Label>
													{#if album.externalUrl}
														<a
															class="button small"
															href={album.externalUrl}
															target="_blank"
															rel="external noreferrer"
														>
															<ExternalLink size={15} />
															<span>Open</span>
														</a>
													{/if}
												</div>
											</div>
											<div class="score-box compact">
												<span>{album.averageScore ?? '-'}</span>
												<small>
													{album.ratingCount} rating{album.ratingCount === 1
														? ''
														: 's'}
												</small>
											</div>
										</article>
									{/each}
								</div>
							{/if}
						</div>
					</section>
				{/if}
			</div>

			<aside class="stack">
				{#if isOwner}
					<section class="panel">
						<div
							class="panel-body stack collapsible"
							class:collapsed={manageTrekCollapsed}
						>
							<button
								class="panel-header no-button manage-trek"
								onclick={() => (manageTrekCollapsed = !manageTrekCollapsed)}
							>
								<h2>Manage trek</h2>
								<span class="badge violet">Owner</span>
							</button>

							<div class="panel-content">
								<form class="form-grid" method="post" action="?/updateTitle">
									<div class="field">
										<label for="trek-name">Title</label>
										<input
											id="trek-name"
											name="name"
											value={data.trek.name}
											required
										/>
									</div>
									<button class="button" type="submit">
										<Save size={16} />
										<span>Save title</span>
									</button>
								</form>

								{#if data.progress.participantCount === 1}
									<form method="post" action="?/deleteTrek">
										<button class="button danger" type="submit">
											<Trash2 size={16} />
											<span>Delete trek</span>
										</button>
									</form>
								{:else}
									<p class="footer-note small">
										Treks can only be deleted before another participant joins.
									</p>
								{/if}
							</div>
						</div>
					</section>
				{/if}

				<section class="panel">
					<div class="panel-body stack">
						<div class="panel-header">
							<h2>Participants</h2>
							<span class="badge">{data.participants.length}</span>
						</div>
						<div class="participants">
							{#each data.participants as participant (participant.userId)}
								<div class="participant card">
									{#if participant.image}
										<img class="avatar" src={participant.image} alt="" />
									{:else}
										<div class="avatar"></div>
									{/if}
									<div class="line-height-small">
										<a
											href={resolve('/user/[userId]', {
												userId: participant.userId
											})}
										>
											<strong>{participant.displayName}</strong>
										</a>
										<span class="footer-note small">{participant.role}</span>
									</div>
									{#if isOwner && participant.role !== 'owner'}
										<form method="post" action="?/removeParticipant">
											<input
												type="hidden"
												name="participantId"
												value={participant.userId}
											/>
											<button
												class="button danger small icon-only"
												type="submit"
												title="Remove participant"
											>
												<UserMinus size={15} />
											</button>
										</form>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</section>

				<section class="panel">
					<div class="panel-body stack">
						<div class="panel-header">
							<h2>Timeline</h2>
							<span class="badge">{data.progress.remainingYears} left</span>
						</div>
						{#if data.rounds.length === 0}
							<p class="empty alert">No years have been randomized yet.</p>
						{:else}
							<div class="timeline">
								{#each data.rounds as round (round.id)}
									{#if round.status === 'completed'}
										<a
											class="round-chip"
											data-status={round.status}
											href={resolve('/treks/[trekId]/years/[year]', {
												trekId: data.trek.id,
												year: String(round.year)
											})}
										>
											<CircleCheck size={15} />
											{round.year}
										</a>
									{:else}
										<span class="round-chip" data-status={round.status}>
											<Shuffle size={15} />
											{round.year}
										</span>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				</section>
			</aside>
		</div>
	</div>
</section>

<style lang="scss">
	.workspace-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 320px;
		gap: var(--gutter);
		align-items: start;

		@container app (width < 834px) {
			grid-template-columns: 1fr;
		}

		.panel-header {
			margin-block-end: var(--gutter);
		}

		aside {
			.panel-header {
				margin-block-end: 0;
			}
		}
	}

	.trek-hero {
		align-items: flex-end;
		grid-template-columns: 1fr auto;

		@container app (width < 600px) {
			grid-template-columns: 1fr;
		}
	}

	.form-grid.search {
		grid-template-columns: 1fr auto;
		align-items: last baseline;
	}

	.invite-box {
		display: grid;
		gap: var(--gap);
		padding: var(--gutter);
		border: 1px solid var(--line);
		border-radius: var(--border-radius);
		background: var(--surface);
	}

	.invite-box code {
		display: block;
		overflow: hidden;
		padding: var(--gap);
		border-radius: calc(var(--border-radius) * 0.75);
		background: var(--surface-soft);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.manage-trek {
		margin-block-end: 0;
	}

	.rating-row {
		display: grid;
		grid-template-columns: 4rem minmax(0, 1fr) auto;
		gap: var(--gap);
		align-items: end;

		@container app (width < 600px) {
			grid-template-columns: 1fr;
		}
	}
</style>
