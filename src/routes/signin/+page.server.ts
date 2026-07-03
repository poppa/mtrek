import { getAuthProviderStatus, signIn } from '../../auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	return {
		authProviders: getAuthProviderStatus(),
		redirectTo: event.url.searchParams.get('redirectTo') ?? '/'
	};
};

export const actions: Actions = {
	default: signIn
};
