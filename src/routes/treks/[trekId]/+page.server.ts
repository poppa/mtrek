import { readString, requireUserId } from '$lib/server/session';
import { hasSpotifySearchConfig } from '$lib/server/spotify';
import {
	advanceTrek,
	deleteOwnSelection,
	deleteTrek,
	getTrekDetail,
	parseScoreTenth,
	rateSelection,
	removeParticipant,
	selectAlbum,
	updateTrekTitle
} from '$lib/server/trek-service';
import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const userId = await requireUserId(event);
	const trekId = requireTrekParam(event.params.trekId);

	return {
		...(await getTrekDetail(trekId, userId)),
		spotifySearchConfigured: hasSpotifySearchConfig()
	};
};

export const actions: Actions = {
	updateTitle: async (event) => {
		const userId = await requireUserId(event);
		const trekId = requireTrekParam(event.params.trekId);
		const formData = await event.request.formData();

		try {
			await updateTrekTitle({
				trekId,
				userId,
				name: readString(formData, 'name')
			});
		} catch (updateError) {
			return fail(400, {
				actionError:
					updateError instanceof Error
						? updateError.message
						: 'Could not update trek title.'
			});
		}

		return { updatedTitle: true };
	},

	selectAlbum: async (event) => {
		const userId = await requireUserId(event);
		const trekId = requireTrekParam(event.params.trekId);
		const formData = await event.request.formData();

		try {
			await selectAlbum(trekId, userId, {
				spotifyAlbumId: readString(formData, 'spotifyAlbumId'),
				albumName: readString(formData, 'albumName'),
				artistName: readString(formData, 'artistName'),
				releaseDate: readString(formData, 'releaseDate'),
				imageUrl: readString(formData, 'imageUrl'),
				externalUrl: readString(formData, 'externalUrl')
			});
		} catch (selectError) {
			return fail(400, {
				actionError:
					selectError instanceof Error
						? selectError.message
						: 'Could not save album.'
			});
		}

		return { savedAlbum: true };
	},

	deleteSelection: async (event) => {
		const userId = await requireUserId(event);
		const trekId = requireTrekParam(event.params.trekId);

		try {
			await deleteOwnSelection({ trekId, userId });
		} catch (deleteError) {
			return fail(400, {
				actionError:
					deleteError instanceof Error
						? deleteError.message
						: 'Could not delete album selection.'
			});
		}

		return { deletedSelection: true };
	},

	rateAlbum: async (event) => {
		const userId = await requireUserId(event);
		const trekId = requireTrekParam(event.params.trekId);
		const formData = await event.request.formData();

		try {
			await rateSelection({
				trekId,
				userId,
				selectionId: readString(formData, 'selectionId'),
				scoreTenth: parseScoreTenth(formData.get('score')),
				note: readString(formData, 'note')
			});
		} catch (ratingError) {
			return fail(400, {
				actionError:
					ratingError instanceof Error
						? ratingError.message
						: 'Could not save rating.'
			});
		}

		return { savedRating: true };
	},

	advance: async (event) => {
		const userId = await requireUserId(event);
		const trekId = requireTrekParam(event.params.trekId);

		try {
			await advanceTrek(trekId, userId);
		} catch (advanceError) {
			return fail(400, {
				actionError:
					advanceError instanceof Error
						? advanceError.message
						: 'Could not randomize next year.'
			});
		}

		return { advanced: true };
	},

	removeParticipant: async (event) => {
		const ownerId = await requireUserId(event);
		const trekId = requireTrekParam(event.params.trekId);
		const formData = await event.request.formData();

		try {
			await removeParticipant({
				trekId,
				ownerId,
				participantId: readString(formData, 'participantId')
			});
		} catch (removeError) {
			return fail(400, {
				actionError:
					removeError instanceof Error
						? removeError.message
						: 'Could not remove participant.'
			});
		}

		return { removedParticipant: true };
	},

	deleteTrek: async (event) => {
		const userId = await requireUserId(event);
		const trekId = requireTrekParam(event.params.trekId);

		try {
			await deleteTrek({ trekId, userId });
		} catch (deleteError) {
			return fail(400, {
				actionError:
					deleteError instanceof Error
						? deleteError.message
						: 'Could not delete trek.'
			});
		}

		throw redirect(303, '/');
	}
};

function requireTrekParam(trekId: string | undefined) {
	if (!trekId) {
		throw error(400, 'Missing trek id.');
	}

	return trekId;
}
