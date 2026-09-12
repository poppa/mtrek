import {
	hasSpotifySearchConfig,
	searchSpotifyAlbums
} from '$lib/server/spotify';
import { getLastConcludedYear } from '$lib/server/trek-service';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
	const session = await event.locals.auth();

	if (!session?.user?.id) {
		throw error(401, 'Sign in to search Spotify albums.');
	}

	const query = event.url.searchParams.get('q')?.trim() ?? '';
	const yearParam = event.url.searchParams.get('year');
	const year = yearParam === null ? undefined : Number(yearParam);

	if (!query || query.length < 2) {
		return json({ configured: hasSpotifySearchConfig(), albums: [] });
	}

	if (
		year !== undefined &&
		(!Number.isInteger(year) || year < 1900 || year > getLastConcludedYear())
	) {
		throw error(400, 'Year must be a fully concluded year.');
	}

	if (!hasSpotifySearchConfig()) {
		return json({
			configured: false,
			albums: []
		});
	}

	try {
		const albums = await searchSpotifyAlbums({ query, year });

		return json({
			configured: true,
			albums
		});
	} catch (spotifyError) {
		const message =
			spotifyError instanceof Error
				? spotifyError.message
				: 'Spotify search failed.';

		throw error(502, message);
	}
};
