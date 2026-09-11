<script lang="ts">
	import type { AlbumInput } from '$lib/curated-albums';
	import { parseCuratedAlbums } from '$lib/curated-albums';
	import { initials } from '$lib/utils';
	import { Search, Plus, Trash2 } from '@lucide/svelte';

	let {
		albums = $bindable<AlbumInput[]>([]),
		spotifySearchConfigured
	}: { albums: AlbumInput[]; spotifySearchConfigured: boolean } = $props();
	let query = $state('');
	let results = $state<AlbumInput[]>([]);
	let searching = $state(false);
	let message = $state('');
	let albumName = $state('');
	let artistName = $state('');
	let releaseDate = $state('');
	let externalUrl = $state('');
	let imageUrl = $state('');

	async function search() {
		if (query.trim().length < 2) {
			message = 'Enter at least two characters.';
			return;
		}
		searching = true;
		message = '';
		results = [];
		try {
			const response = await fetch(
				`/api/spotify/search?${new URLSearchParams({ q: query })}`
			);
			const payload = await response.json();
			if (!response.ok)
				throw new Error(payload.message ?? 'Spotify search failed.');
			results = payload.albums ?? [];
			if (!results.length)
				message =
					'No albums found. Try another search or add the album manually.';
		} catch (error) {
			message =
				error instanceof Error ? error.message : 'Spotify search failed.';
		} finally {
			searching = false;
		}
	}

	function add(album: AlbumInput) {
		try {
			albums = parseCuratedAlbums([...albums, album]);
			message = '';
			return true;
		} catch (error) {
			message = error instanceof Error ? error.message : 'Could not add album.';
			return false;
		}
	}
	function manualKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addManual();
		}
	}
	function addManual() {
		if (add({ albumName, artistName, releaseDate, externalUrl, imageUrl })) {
			albumName = '';
			artistName = '';
			releaseDate = '';
			externalUrl = '';
			imageUrl = '';
		}
	}
</script>

<div class="stack">
	<p class="footer-note">
		Add as many albums as you like. Each round draws one at random. The list is
		fixed when you create the trek.
	</p>
	<input type="hidden" name="albums" value={JSON.stringify(albums)} />
	<div class="field">
		<label for="curated-search">Album or artist</label>
		<input
			id="curated-search"
			bind:value={query}
			placeholder="Search Spotify"
			disabled={!spotifySearchConfigured}
			onkeydown={(event) => {
				if (event.key === 'Enter') {
					event.preventDefault();
					void search();
				}
			}}
		/>
	</div>
	<button
		type="button"
		class="button"
		onclick={search}
		disabled={!spotifySearchConfigured || searching}
		><Search size={16} />{searching ? 'Searching…' : 'Search Spotify'}</button
	>
	{#if !spotifySearchConfigured}<p class="footer-note">
			Spotify search is unavailable. Add albums manually below.
		</p>{/if}
	{#if message}<p class="notice alert" role="status">{message}</p>{/if}
	{#each results as album (album.spotifyAlbumId)}
		<div class="card picker-album">
			{#if album.imageUrl}<img
					class="cover"
					src={album.imageUrl}
					alt=""
				/>{:else}<div class="cover">{initials(album.albumName)}</div>{/if}
			<div>
				<strong>{album.albumName}</strong>
				<p class="footer-note">
					{album.artistName} · {album.releaseDate ?? ''}
				</p>
			</div>
			<button type="button" class="button small" onclick={() => add(album)}
				><Plus size={16} />Add</button
			>
		</div>
	{/each}
	<details>
		<summary>Manual entry</summary>
		<div class="stack manual">
			<div class="field">
				<label for="curated-album">Album</label><input
					id="curated-album"
					onkeydown={manualKeydown}
					bind:value={albumName}
				/>
			</div>
			<div class="field">
				<label for="curated-artist">Artist</label><input
					id="curated-artist"
					onkeydown={manualKeydown}
					bind:value={artistName}
				/>
			</div>
			<div class="field">
				<label for="curated-release">Release date</label><input
					id="curated-release"
					onkeydown={manualKeydown}
					bind:value={releaseDate}
					placeholder="YYYY-MM-DD or year"
				/>
			</div>
			<div class="field">
				<label for="curated-link">Album link</label><input
					id="curated-link"
					onkeydown={manualKeydown}
					type="url"
					bind:value={externalUrl}
				/>
			</div>
			<div class="field">
				<label for="curated-image">Cover image URL</label><input
					id="curated-image"
					onkeydown={manualKeydown}
					type="url"
					bind:value={imageUrl}
				/>
			</div>
			<button type="button" class="button" onclick={addManual}
				><Plus size={16} />Add album</button
			>
		</div>
	</details>
	<h3>{albums.length} album{albums.length === 1 ? '' : 's'} added</h3>
	{#each albums as album, index (index)}
		<div class="card picker-album">
			{#if album.imageUrl}<img
					class="cover"
					src={album.imageUrl}
					alt=""
				/>{:else}<div class="cover">{initials(album.albumName)}</div>{/if}
			<div>
				<strong>{album.albumName}</strong>
				<p class="footer-note">{album.artistName}</p>
			</div>
			<button
				type="button"
				class="button danger small"
				aria-label={`Remove ${album.albumName}`}
				onclick={() => (albums = albums.filter((_, i) => i !== index))}
				><Trash2 size={16} /></button
			>
		</div>
	{/each}
</div>

<style lang="scss">
	.picker-album {
		display: grid;
		grid-template-columns: 3rem minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--gap);
	}
	.cover {
		width: 3rem;
	}
	.manual {
		margin-block-start: var(--gap);
	}

	details {
		summary {
			cursor: pointer;
		}
	}
</style>
