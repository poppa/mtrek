import { requireUserId } from '$lib/server/session';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	getRankedAlbumsForUser,
	getTrekMemberships,
	getUser,
	listTreksForUser
} from '$lib/server/trek-service';

export const load: PageServerLoad = async (event) => {
	const loggedInUserId = await requireUserId(event);
	const userId = requireUserParam(event.params.userId);
	const [user, userTreks, memberships, albums] = await Promise.allSettled([
		getUser(userId),
		listTreksForUser(userId),
		getTrekMemberships(loggedInUserId),
		getRankedAlbumsForUser(userId)
	]);

	if (user.status !== 'fulfilled') {
		throw error(404, user.reason);
	}

	if (userTreks.status !== 'fulfilled') {
		throw error(500, userTreks.reason);
	}

	if (memberships.status !== 'fulfilled') {
		throw error(500, memberships.reason);
	}

	if (albums.status !== 'fulfilled') {
		throw error(500, albums.reason);
	}

	return {
		me: loggedInUserId === userId,
		user: user.value,
		userTreks: userTreks.value,
		memberships: memberships.value,
		albums: albums.value
	};
};

function requireUserParam(userId: string | undefined) {
	if (!userId) {
		throw error(400, 'Missing trek id.');
	}

	return userId;
}
