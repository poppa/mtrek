import {
	readString,
	requireTrekParam,
	requireUserId
} from '$lib/server/session';
import { hasSpotifySearchConfig } from '$lib/server/spotify';
import {
	getLastConcludedYear,
	getTrekEditData,
	parseBoundedYear,
	updateTrek
} from '$lib/server/trek-service';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const userId = await requireUserId(event);
	const trekId = requireTrekParam(event.params.trekId);
	return {
		...(await getTrekEditData(trekId, userId)),
		spotifySearchConfigured: hasSpotifySearchConfig(),
		lastConcludedYear: getLastConcludedYear()
	};
};

export const actions: Actions = {
	updateTrek: async (event) => {
		const userId = await requireUserId(event);
		const trekId = requireTrekParam(event.params.trekId);
		const formData = await event.request.formData();
		const name = readString(formData, 'name');
		const roundOrder = readString(formData, 'roundOrder') || 'random';
		const albums = readString(formData, 'albums');
		const rounds = readString(formData, 'rounds');
		const secret = readString(formData, 'secret') === 'on';

		try {
			const editData = await getTrekEditData(trekId, userId);
			let configuration: Parameters<typeof updateTrek>[0]['configuration'];
			if (editData.canEditStructure) {
				if (roundOrder !== 'random' && roundOrder !== 'consecutive') {
					throw new Error('Invalid round order.');
				}
				switch (editData.trek.type) {
					case 'years':
						configuration = {
							type: 'years',
							startYear: parseBoundedYear(
								formData.get('startYear'),
								'Start year'
							),
							endYear: parseBoundedYear(formData.get('endYear'), 'End year'),
							roundOrder
						};
						break;
					case 'curated':
						configuration = {
							type: 'curated',
							albums: JSON.parse(albums || '[]'),
							secret,
							roundOrder
						};
						break;
					case 'named':
						configuration = {
							type: 'named',
							rounds: JSON.parse(rounds || '[]'),
							roundOrder
						};
						break;
				}
			}
			await updateTrek({ trekId, userId, name, configuration });
		} catch (updateError) {
			return fail(400, {
				updateError:
					updateError instanceof Error
						? updateError.message
						: 'Could not update trek.',
				values: {
					name,
					roundOrder,
					secret: String(secret),
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
