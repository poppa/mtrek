import { error, fail, redirect, type Actions } from '@sveltejs/kit';

import { getAuthProviderStatus } from '../../../auth';
import { getTrekByInviteCode, joinTrek } from '$lib/server/trek-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	const inviteCode = requireInviteCode(event.params.inviteCode);
	const trek = getTrekByInviteCode(inviteCode);

	return {
		authProviders: getAuthProviderStatus(),
		trek,
		isSignedIn: Boolean(session?.user?.id)
	};
};

export const actions: Actions = {
	default: async (event) => {
		const session = await event.locals.auth();
		const userId = session?.user?.id;
		const inviteCode = requireInviteCode(event.params.inviteCode);

		if (!userId) {
			throw redirect(303, `/join/${inviteCode}`);
		}

		let trekId: string;

		try {
			trekId = joinTrek(inviteCode, userId);
		} catch (joinError) {
			return fail(400, {
				joinError:
					joinError instanceof Error
						? joinError.message
						: 'Could not join trek.'
			});
		}

		throw redirect(303, `/treks/${trekId}`);
	}
};

function requireInviteCode(inviteCode: string | undefined) {
	if (!inviteCode) {
		throw error(400, 'Missing invite code.');
	}

	return inviteCode;
}
