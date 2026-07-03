import favicon from '$lib/assets/favicon.svg?raw';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	return new Response(favicon, {
		headers: {
			'content-type': 'image/svg+xml; charset=utf-8',
			'cache-control': 'public, max-age=604800'
		}
	});
};
