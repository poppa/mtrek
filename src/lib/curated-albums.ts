export type AlbumInput = {
	spotifyAlbumId?: string | null;
	albumName: string;
	artistName: string;
	releaseDate?: string | null;
	imageUrl?: string | null;
	externalUrl?: string | null;
};

/** Validate untrusted form data and normalize the creator's album list. */
export function parseCuratedAlbums(value: unknown): AlbumInput[] {
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error('Add at least one album to the curated list.');
	}
	const spotifyIds = new Set<string>();
	const names = new Set<string>();
	return value.map((entry: unknown) => {
		if (!entry || typeof entry !== 'object') throw new Error('Invalid album.');
		const fields = entry as Record<string, unknown>;
		const text = (key: string) => {
			const value = fields[key];
			if (value == null) return null;
			if (typeof value !== 'string') throw new Error(`Invalid album ${key}.`);
			return value.trim() || null;
		};
		const albumName = text('albumName');
		const artistName = text('artistName');
		if (!albumName || !artistName)
			throw new Error('Album and artist names are required.');
		const spotifyAlbumId = text('spotifyAlbumId');
		const key = JSON.stringify([
			albumName.toLowerCase(),
			artistName.toLowerCase()
		]);
		if ((spotifyAlbumId && spotifyIds.has(spotifyAlbumId)) || names.has(key)) {
			throw new Error(`${albumName} is already in the curated list.`);
		}
		if (spotifyAlbumId) spotifyIds.add(spotifyAlbumId);
		names.add(key);
		const url = (key: string) => {
			const value = text(key);
			if (value && !/^https?:\/\//i.test(value))
				throw new Error('Album links and images must use HTTP or HTTPS.');
			return value;
		};
		return {
			albumName,
			artistName,
			spotifyAlbumId,
			releaseDate: text('releaseDate'),
			imageUrl: url('imageUrl'),
			externalUrl: url('externalUrl')
		};
	});
}
