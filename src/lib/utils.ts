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

export interface PageNavItem {
	pageNumber: number;
	offset: number;
	isCurrent?: boolean;
}

export interface PageNav {
	items: PageNavItem[];
	current?: PageNavItem;
	next?: PageNavItem;
	prev?: PageNavItem;
}

export function pageNav({
	page,
	limit,
	total
}: {
	page: number;
	limit: number;
	total: number;
}) {
	if (page < 1) {
		page = 1;
	}
	const pages = Math.ceil(total / limit);
	const items: PageNavItem[] = [];

	if (page > pages) {
		page = pages;
	}

	for (let i = 0; i < pages; i++) {
		const pg = i + 1;
		items.push({
			pageNumber: pg,
			offset: i * limit,
			isCurrent: pg === page
		});
	}

	const ret: PageNav = {
		items,
		current: items.find((i) => i.isCurrent),
		prev:
			page === 1
				? undefined
				: {
						offset: limit * (page - 2),
						pageNumber: page - 1
					},
		next:
			page === pages
				? undefined
				: {
						offset: limit * page,
						pageNumber: page + 1
					}
	};

	return ret;
}
