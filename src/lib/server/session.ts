import { redirect, type RequestEvent } from '@sveltejs/kit';

export async function requireUserId(event: RequestEvent) {
	const session = await event.locals.auth();
	const userId = session?.user?.id;

	if (!userId) {
		throw redirect(303, '/');
	}

	return userId;
}

export function readString(formData: FormData, key: string) {
	const value = formData.get(key);

	return typeof value === 'string' ? value : '';
}
