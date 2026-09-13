import { enhance as svelteKitEnhance } from '$app/forms';

export function enhance(node: HTMLFormElement) {
	return svelteKitEnhance(node, () => {
		node.setAttribute('aria-busy', 'true');

		return async ({ update }) => {
			try {
				await update();
			} finally {
				node.removeAttribute('aria-busy');
			}
		};
	});
}
