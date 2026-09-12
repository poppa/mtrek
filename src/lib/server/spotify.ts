import { env } from '$env/dynamic/private';

type SpotifyToken = {
	accessToken: string;
	expiresAt: number;
};

type SpotifyAlbum = {
	id: string;
	name: string;
	artists: { name: string }[];
	release_date: string;
	images: { url: string; height: number | null; width: number | null }[];
	external_urls: { spotify?: string };
};

type SpotifySearchResponse = {
	albums?: {
		items: SpotifyAlbum[];
	};
};

let cachedToken: SpotifyToken | null = null;

export type AlbumSearchResult = {
	spotifyAlbumId: string;
	albumName: string;
	artistName: string;
	releaseDate: string | null;
	imageUrl: string | null;
	externalUrl: string | null;
};

export function hasSpotifySearchConfig() {
	return Boolean(getSpotifyClientId() && getSpotifyClientSecret());
}

export async function searchSpotifyAlbums(input: {
	query: string;
	year?: number;
}) {
	const token = await getSpotifyAccessToken();
	const params = new URLSearchParams({
		q:
			input.year === undefined
				? input.query.trim()
				: `${input.query.trim()} year:${input.year}`,
		type: 'album',
		limit: '8'
	});

	const response = await fetch(
		`https://api.spotify.com/v1/search?${params.toString()}`,
		{
			headers: {
				Authorization: `Bearer ${token}`
			}
		}
	);

	if (!response.ok) {
		throw new Error(`Spotify search failed with ${response.status}.`);
	}

	const payload = (await response.json()) as SpotifySearchResponse;

	return (
		payload.albums?.items.map((album) => ({
			spotifyAlbumId: album.id,
			albumName: album.name,
			artistName: album.artists.map((artist) => artist.name).join(', '),
			releaseDate: album.release_date || null,
			imageUrl: pickAlbumImage(album.images),
			externalUrl: album.external_urls.spotify ?? null
		})) ?? []
	);
}

async function getSpotifyAccessToken() {
	if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
		return cachedToken.accessToken;
	}

	const clientId = getSpotifyClientId();
	const clientSecret = getSpotifyClientSecret();

	if (!clientId || !clientSecret) {
		throw new Error('Spotify album search is not configured.');
	}

	const response = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			grant_type: 'client_credentials'
		})
	});

	if (!response.ok) {
		throw new Error(`Spotify token request failed with ${response.status}.`);
	}

	const payload = (await response.json()) as {
		access_token: string;
		expires_in: number;
	};

	cachedToken = {
		accessToken: payload.access_token,
		expiresAt: Date.now() + payload.expires_in * 1000
	};

	return cachedToken.accessToken;
}

function getSpotifyClientId() {
	return env.SPOTIFY_CLIENT_ID || env.AUTH_SPOTIFY_ID;
}

function getSpotifyClientSecret() {
	return env.SPOTIFY_CLIENT_SECRET || env.AUTH_SPOTIFY_SECRET;
}

function pickAlbumImage(images: SpotifyAlbum['images']) {
	return (
		images.find((image) => image.width && image.width >= 250)?.url ??
		images[0]?.url ??
		null
	);
}
