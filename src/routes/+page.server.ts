import { listTreksForUser } from '$lib/server/trek-service';
import { getAuthProviderStatus } from '../auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();

	return {
		authProviders: getAuthProviderStatus(),
		treks: session?.user?.id ? await listTreksForUser(session.user.id) : []
	};
};
