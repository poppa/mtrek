import { requireUserId } from '$lib/server/session';
import { getConcludedYearDetail } from '$lib/server/trek-service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const userId = await requireUserId(event);
	const trekId = requireTrekParam(event.params.trekId);
	const year = requireYearParam(event.params.year);

	return await getConcludedYearDetail({
		trekId,
		userId,
		year
	});
};

function requireTrekParam(trekId: string | undefined) {
	if (!trekId) {
		throw error(400, 'Missing trek id.');
	}

	return trekId;
}

function requireYearParam(year: string | undefined) {
	const parsed = Number(year);

	if (!Number.isInteger(parsed)) {
		throw error(400, 'Missing or invalid year.');
	}

	return parsed;
}
