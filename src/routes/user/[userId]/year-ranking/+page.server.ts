import { requireUserId } from '$lib/server/session';
import {
	getUser,
	getTrekMemberships,
	getRankedConcludedYearsForTrek
} from '$lib/server/trek-service';
import { pageNav } from '$lib/utils';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const viewerId = await requireUserId(event);
	const userId = event.params.userId;
	const user = await getUser(userId);
	const memberships = await getTrekMemberships(viewerId);
	const requestedPage = Number(event.url.searchParams.get('page') ?? 1);
	const page =
		Number.isSafeInteger(requestedPage) && requestedPage > 0
			? requestedPage
			: 1;
	const allYears = await getRankedConcludedYearsForTrek(
		undefined,
		{ limit: 0, offset: 0 },
		userId
	);
	const total = allYears.length;
	const nav = pageNav({ page, limit: 20, total });
	const offset = nav.current?.offset ?? 0;
	const years = allYears.slice(offset, offset + 20);
	return { user, memberships, years, total, pageNav: nav };
};
