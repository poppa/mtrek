export function initials(value: string) {
	if (!value.trim()) {
		return '...';
	}

	const val = value.split(/\s+/).filter(Boolean);
	const out = [val[0][0].toLocaleUpperCase()];

	if (val.length > 1) {
		out.push(val.at(-1)?.[0].toLocaleUpperCase() ?? '?');
	}

	return out.join('');
}
