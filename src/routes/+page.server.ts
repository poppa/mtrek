import { readString, requireUserId } from '$lib/server/session';
import { hasSpotifySearchConfig } from '$lib/server/spotify';
import { parseNamedRounds } from '$lib/named-rounds';
import {
	createTrek,
	getLastConcludedYear,
	listTreksForUser,
	parseBoundedYear
} from '$lib/server/trek-service';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import { getAuthProviderStatus } from '../auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();

	return {
		authProviders: getAuthProviderStatus(),
		spotifySearchConfigured: hasSpotifySearchConfig(),
		lastConcludedYear: getLastConcludedYear(),
		treks: session?.user?.id ? await listTreksForUser(session.user.id) : []
	};
};

export const actions: Actions = {
	createTrek: async (event) => {
		const userId = await requireUserId(event);
		const formData = await event.request.formData();
		const name = readString(formData, 'name');
		const type = readString(formData, 'type') || 'years';
		const roundOrder = readString(formData, 'roundOrder') || 'random';
		const albums = readString(formData, 'albums');
		const rounds = readString(formData, 'rounds');
		let trekId: string;

		try {
			if (type !== 'years' && type !== 'curated' && type !== 'named')
				throw new Error('Invalid trek type.');
			if (roundOrder !== 'random' && roundOrder !== 'consecutive')
				throw new Error('Invalid round order.');
			switch (type) {
				case 'years':
					trekId = await createTrek({
						name,
						startYear: parseBoundedYear(
							formData.get('startYear'),
							'Start year'
						),
						endYear: parseBoundedYear(formData.get('endYear'), 'End year'),
						userId,
						roundOrder
					});
					break;
				case 'curated':
					trekId = await createTrek({
						name,
						userId,
						type,
						roundOrder,
						albums: JSON.parse(albums || '[]')
					});
					break;
				case 'named':
					trekId = await createTrek({
						name,
						userId,
						type,
						roundOrder,
						rounds: parseNamedRounds(JSON.parse(rounds || '[]'))
					});
					break;
			}
		} catch (createError) {
			return fail(400, {
				createError:
					createError instanceof Error
						? createError.message
						: 'Could not create trek.',
				values: {
					name,
					type,
					roundOrder,
					albums,
					rounds,
					startYear: readString(formData, 'startYear'),
					endYear: readString(formData, 'endYear')
				}
			});
		}

		throw redirect(303, `/treks/${trekId}`);
	}
};
