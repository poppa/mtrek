import { requireUserId } from '$lib/server/session';
import {
	getUser,
	getTrekMemberships,
	getAlbumCountForUser,
	getRankedAlbumsForUser,
	listTreksForUser
} from '$lib/server/trek-service';
import { pageNav } from '$lib/utils';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const viewerId = await requireUserId(event);
	const userId = event.params.userId;
	const [user, memberships, treks] = await Promise.all([
		getUser(userId),
		getTrekMemberships(viewerId),
		listTreksForUser(userId)
	]);
	const requestedTrekId = event.url.searchParams.get('trekId');
	const selectedTrekId =
		requestedTrekId !== null &&
		treks.some((trek) => trek.id === requestedTrekId)
			? requestedTrekId
			: undefined;
	const requestedPage = Number(event.url.searchParams.get('page') ?? 1);
	const page =
		Number.isSafeInteger(requestedPage) && requestedPage > 0
			? requestedPage
			: 1;
	const total = await getAlbumCountForUser(userId, selectedTrekId);
	const nav = pageNav({ page, limit: 20, total });
	const albums = await getRankedAlbumsForUser(
		userId,
		{
			limit: 20,
			offset: nav.current?.offset ?? 0
		},
		selectedTrekId
	);
	return {
		user,
		memberships,
		treks,
		selectedTrekId,
		albums,
		total,
		pageNav: nav
	};
};
