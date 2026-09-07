import { readString, requireUserId } from '$lib/server/session';
import { hasSpotifySearchConfig } from '$lib/server/spotify';
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
		const albums = readString(formData, 'albums');
		let trekId: string;

		try {
			if (type !== 'years' && type !== 'curated')
				throw new Error('Invalid trek type.');
			trekId =
				type === 'curated'
					? await createTrek({
							name,
							userId,
							type,
							albums: JSON.parse(albums || '[]')
						})
					: await createTrek({
							name,
							startYear: parseBoundedYear(
								formData.get('startYear'),
								'Start year'
							),
							endYear: parseBoundedYear(formData.get('endYear'), 'End year'),
							userId
						});
		} catch (createError) {
			return fail(400, {
				createError:
					createError instanceof Error
						? createError.message
						: 'Could not create trek.',
				values: {
					name,
					type,
					albums,
					startYear: readString(formData, 'startYear'),
					endYear: readString(formData, 'endYear')
				}
			});
		}

		throw redirect(303, `/treks/${trekId}`);
	}
};
