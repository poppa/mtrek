import { getPersonalStats, listTreksForUser } from '$lib/server/trek-service';
import { getAuthProviderStatus } from '../auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	const userId = session?.user?.id;
	const [treks, personalStats] = userId
		? await Promise.all([listTreksForUser(userId), getPersonalStats(userId)])
		: [[], null];

	return {
		authProviders: getAuthProviderStatus(),
		treks,
		personalStats
	};
};
