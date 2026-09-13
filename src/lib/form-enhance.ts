import { enhance as svelteKitEnhance } from '$app/forms';

export function enhance(node: HTMLFormElement) {
	let pendingSubmissions = 0;
	let busyTimer: ReturnType<typeof setTimeout> | undefined;

	const enhancedForm = svelteKitEnhance(node, () => {
		pendingSubmissions += 1;

		if (!node.hasAttribute('aria-busy') && busyTimer === undefined) {
			busyTimer = setTimeout(() => {
				if (pendingSubmissions > 0) {
					node.setAttribute('aria-busy', 'true');
				}
				busyTimer = undefined;
			}, 100);
		}

		return async ({ update }) => {
			try {
				await update();
			} finally {
				pendingSubmissions -= 1;

				if (pendingSubmissions === 0) {
					if (busyTimer !== undefined) clearTimeout(busyTimer);
					busyTimer = undefined;
					node.removeAttribute('aria-busy');
				}
			}
		};
	});

	return {
		destroy() {
			if (busyTimer !== undefined) clearTimeout(busyTimer);
			enhancedForm.destroy();
		}
	};
}
