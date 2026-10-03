export type TrekType = 'years' | 'curated' | 'named';

type TrekDateRange = {
	startYear: number | null;
	endYear: number | null;
};

export function getTrekTypeDescription(
	type: TrekType,
	{ startYear, endYear }: TrekDateRange
) {
	switch (type) {
		case 'years':
			return `${startYear}-${endYear}`;
		case 'curated':
			return 'Curated albums';
		case 'named':
			return 'Named rounds';
	}
}

export function getTrekRoundUnit(type: TrekType, plural = false) {
	switch (type) {
		case 'years':
			return plural ? 'years' : 'year';
		case 'curated':
			return plural ? 'albums' : 'album';
		case 'named':
			return plural ? 'rounds' : 'round';
	}
}

export function getConcludedRoundLabel(type: TrekType) {
	switch (type) {
		case 'years':
			return 'Concluded year';
		case 'curated':
			return 'Concluded album';
		case 'named':
			return 'Concluded round';
	}
}

export function getJoinTrekMessage(type: TrekType) {
	switch (type) {
		case 'years':
			return 'Sign in to join this trek and pick albums when the year opens.';
		case 'curated':
			return 'Sign in to rate the curated albums together. You will also rate any albums drawn before you join.';
		case 'named':
			return 'Sign in to join this trek and pick albums when each round opens.';
	}
}

export function getTrekMode(type: TrekType) {
	switch (type) {
		case 'years':
			return {
				isYears: true,
				isCurated: false,
				isNamed: false,
				roundUnit: 'year'
			};
		case 'curated':
			return {
				isYears: false,
				isCurated: true,
				isNamed: false,
				roundUnit: 'album'
			};
		case 'named':
			return {
				isYears: false,
				isCurated: false,
				isNamed: true,
				roundUnit: 'round'
			};
	}
}
