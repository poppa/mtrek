import { enhance as svelteKitEnhance } from '$app/forms';

export function enhance(node: HTMLFormElement) {
	let pendingSubmissions = 0;
	let busyTimer: ReturnType<typeof setTimeout> | undefined;

	const enhancedForm = svelteKitEnhance(node, () => {
		pendingSubmissions += 1;
		node.dataset.submitting = 'true';
		const disabledControls = Array.from(
			node.querySelectorAll<
				| HTMLButtonElement
				| HTMLInputElement
				| HTMLSelectElement
				| HTMLTextAreaElement
			>('button, input, select, textarea')
		).map((control) => [control, control.disabled] as const);

		for (const [control] of disabledControls) {
			control.disabled = true;
		}

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
				await update({ reset: false });
			} finally {
				pendingSubmissions -= 1;

				if (pendingSubmissions === 0) {
					if (busyTimer !== undefined) clearTimeout(busyTimer);
					busyTimer = undefined;
					node.removeAttribute('aria-busy');
					delete node.dataset.submitting;

					for (const [control, wasDisabled] of disabledControls) {
						control.disabled = wasDisabled;
					}
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
