import { requireTrekParam, requireUserId } from '$lib/server/session';
import {
	getAlbumCountForTrek,
	getRankedAlbumsForTrek,
	getSimpleTrekDetail
} from '$lib/server/trek-service';
import { pageNav } from '$lib/utils';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const PerPage = 20;

export const load: PageServerLoad = async (event) => {
	const { depends } = event;

	depends('url');

	const userId = await requireUserId(event);
	const trekId = requireTrekParam(event.params.trekId);
	const page = Number(
		new URL(event.request.url).searchParams.get('page') ?? '1'
	);

	const albumCount = await getAlbumCountForTrek(trekId);
	const pgNav = pageNav({ page, limit: PerPage, total: albumCount });

	const [albums, trek] = await Promise.allSettled([
		getRankedAlbumsForTrek(trekId, {
			limit: PerPage,
			offset: pgNav.current?.offset ?? 0
		}),
		getSimpleTrekDetail(trekId, userId)
	]);

	if (albums.status !== 'fulfilled') {
		throw error(404, albums.reason);
	}

	if (trek.status !== 'fulfilled') {
		throw error(404, trek.reason);
	}

	return {
		albums: albums.value,
		albumCount,
		trek: trek.value,
		pageNav: pgNav
	};
};
