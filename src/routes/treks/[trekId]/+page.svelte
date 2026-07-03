<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		CalendarDays,
		CheckCircle2,
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
	<title>{data.trek.name} · MTrek</title>
</svelte:head>

<section class="page stack">
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
				<span class:coral={data.trek.status === 'completed'} class="badge"
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
		<p class="form-error">{form.actionError}</p>
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
						<div class="notice">
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
								<div class="cover">
									{#if data.mySelection.imageUrl}
										<img src={data.mySelection.imageUrl} alt="" />
									{:else}
										{initials(data.mySelection.albumName)}
									{/if}
								</div>
								<div class="album-info">
									<span class="badge violet">Your pick</span>
									<strong>{data.mySelection.albumName}</strong>
									<span>{data.mySelection.artistName}</span>
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
						{/if}

						<div class="stack">
							<div class="section-header">
								<h3>Find an album</h3>
								<span class:amber={!data.spotifySearchConfigured} class="badge">
									{data.spotifySearchConfigured
										? 'Spotify ready'
										: 'Manual mode'}
								</span>
							</div>

							<form class="form-grid" onsubmit={searchAlbums}>
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
								<p class="notice">{searchMessage}</p>
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

											<div class="cover">
												{#if album.imageUrl}
													<img src={album.imageUrl} alt="" />
												{:else}
													{initials(album.albumName)}
												{/if}
											</div>
											<div class="album-info">
												<strong>{album.albumName}</strong>
												<span>{album.artistName}</span>
												<div class="inline-row">
													<span
														>{album.releaseDate ?? data.currentRound.year}</span
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
					{:else if data.currentRound?.status === 'rating'}
						<div class="notice">
							{remainingRatings} rating{remainingRatings === 1 ? '' : 's'} left before
							this year wraps.
						</div>

						<div class="album-grid">
							{#each data.selections as selection (selection.id)}
								<div class="album-card wide">
									<div class="cover">
										{#if selection.imageUrl}
											<img src={selection.imageUrl} alt="" />
										{:else}
											{initials(selection.albumName)}
										{/if}
									</div>
									<div class="album-info">
										<strong>{selection.albumName}</strong>
										<span>{selection.artistName}</span>
										<div class="inline-row">
											<span>{selection.submittedBy}</span>
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
						<div class="notice">
							<CheckCircle2 size={18} />
							All years in this range have been explored.
						</div>
					{:else}
						<div class="empty">
							This trek is between years. Randomize the next year when ready.
						</div>
					{/if}
				</div>
			</section>

			{#if data.selections.length > 0 && data.currentRound?.status === 'selecting'}
				<section class="stack">
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
								<div class="cover">
									{#if selection.imageUrl}
										<img src={selection.imageUrl} alt="" />
									{:else}
										{initials(selection.albumName)}
									{/if}
								</div>
								<div class="album-info">
									<strong>{selection.albumName}</strong>
									<span>{selection.artistName}</span>
									<span>{selection.submittedBy}</span>
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}
		</div>

		<aside class="stack">
			{#if isOwner}
				<section class="panel">
					<div class="panel-body stack">
						<div class="panel-header">
							<h2>Manage trek</h2>
							<span class="badge violet">Owner</span>
						</div>

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
							<p class="footer-note">
								Treks can only be deleted before another participant joins.
							</p>
						{/if}
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
							<div class="participant">
								{#if participant.image}
									<img class="avatar" src={participant.image} alt="" />
								{:else}
									<div class="avatar"></div>
								{/if}
								<div>
									<strong>{participant.displayName}</strong>
									<span class="footer-note">{participant.role}</span>
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
						<span class="badge amber">{data.progress.remainingYears} left</span>
					</div>
					{#if data.rounds.length === 0}
						<p class="empty">No years have been randomized yet.</p>
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
										<CheckCircle2 size={15} />
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
</section>
