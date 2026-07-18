export interface RankedAlbum {
	submittedBy: string;
	ratingCount: number;
	averageScoreTenth: number | null;
	averageScore: string | null;
	id: string;
	roundId: string;
	userId: string;
	spotifyAlbumId: string | null;
	albumName: string;
	artistName: string;
	releaseDate: string | null;
	imageUrl: string | null;
	externalUrl: string | null;
	createdAt: Date;
	year: number;
	roundPosition: number;
	userName: string | null;
	userEmail: string | null;
}
