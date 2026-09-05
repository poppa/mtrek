/** Assign competition ranks to rows already sorted by score, before pagination. */
export function rankByScore<T>(rows: T[], score: (row: T) => number | null) {
	let rank = 0;
	let previousScore: number | null = null;
	return rows.map((row, index) => {
		const value = score(row);
		if (index === 0 || value !== previousScore) rank = index + 1;
		previousScore = value;
		return { ...row, rank };
	});
}
