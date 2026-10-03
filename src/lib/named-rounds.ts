export type NamedRoundInput = {
	name: string;
	description?: string | null;
};

/** Validate untrusted form data and normalize the creator's named rounds. */
export function parseNamedRounds(value: unknown): NamedRoundInput[] {
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error('Add at least one named round.');
	}

	return value.map((entry) => {
		if (!entry || typeof entry !== 'object') throw new Error('Invalid round.');
		const fields = entry as Record<string, unknown>;
		const text = (key: string) => {
			const value = fields[key];
			if (value == null) return null;
			if (typeof value !== 'string') throw new Error(`Invalid round ${key}.`);
			return value.trim() || null;
		};
		const name = text('name');
		if (!name) throw new Error('Every round needs a name.');
		return { name, description: text('description') };
	});
}
