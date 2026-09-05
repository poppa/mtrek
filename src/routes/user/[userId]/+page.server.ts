import { requireUserId } from '$lib/server/session';
import {
	getRankedAlbumsForUser,
	getRankedConcludedYearsForTrek,
	getTrekMemberships,
	getUser,
	listTreksForUser
} from '$lib/server/trek-service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const loggedInUserId = await requireUserId(event);
	const userId = requireUserParam(event.params.userId);
	const [user, userTreks, memberships, albums, years] =
		await Promise.allSettled([
			getUser(userId),
			listTreksForUser(userId),
			getTrekMemberships(loggedInUserId),
			getRankedAlbumsForUser(userId),
			getRankedConcludedYearsForTrek(
				undefined,
				{ limit: 10, offset: 0 },
				userId
			)
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

	if (years.status !== 'fulfilled') {
		throw error(500, years.reason);
	}

	return {
		me: loggedInUserId === userId,
		user: user.value,
		userTreks: userTreks.value,
		memberships: memberships.value,
		albums: albums.value,
		years: years.value
	};
};

function requireUserParam(userId: string | undefined) {
	if (!userId) {
		throw error(400, 'Missing user id.');
	}

	return userId;
}
