import { requireUserId } from '$lib/server/session';
import { getConcludedAlbumRoundDetail } from '$lib/server/trek-service';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async (event) =>
	getConcludedAlbumRoundDetail({
		trekId: event.params.trekId,
		roundId: event.params.roundId,
		userId: await requireUserId(event)
	});
