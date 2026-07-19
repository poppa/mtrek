import { requireTrekParam, requireUserId } from '$lib/server/session';
import {
	getRankedConcludedYearsCountForTrek,
	getRankedConcludedYearsForTrek,
	getSimpleTrekDetail
} from '$lib/server/trek-service';
import { pageNav } from '$lib/utils';
import { error } from 'console';
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

	const yearCount = await getRankedConcludedYearsCountForTrek(trekId);
	const pgNav = pageNav({
		page,
		limit: PerPage,
		total: yearCount
	});

	const [years, trek] = await Promise.allSettled([
		getRankedConcludedYearsForTrek(trekId, {
			limit: PerPage,
			offset: pgNav.current?.offset ?? 0
		}),
		getSimpleTrekDetail(trekId, userId)
	]);

	if (years.status !== 'fulfilled') {
		throw error(404, years.reason);
	}

	if (trek.status !== 'fulfilled') {
		throw error(404, trek.reason);
	}

	return {
		trek: trek.value,
		years: years.value,
		yearCount: yearCount,
		pageNav: pgNav
	};
};
