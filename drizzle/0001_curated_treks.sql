CREATE TABLE "curated_album" (
	"id" text PRIMARY KEY NOT NULL,
	"trekId" text NOT NULL,
	"position" integer NOT NULL,
	"spotifyAlbumId" text,
	"albumName" text NOT NULL,
	"artistName" text NOT NULL,
	"releaseDate" text,
	"imageUrl" text,
	"externalUrl" text
);
--> statement-breakpoint
ALTER TABLE "curated_album" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trek_round" ALTER COLUMN "year" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "trek" ALTER COLUMN "startYear" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "trek" ALTER COLUMN "endYear" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "trek_round" ADD COLUMN "curatedAlbumId" text;--> statement-breakpoint
ALTER TABLE "trek" ADD COLUMN "type" text DEFAULT 'years' NOT NULL;--> statement-breakpoint
ALTER TABLE "curated_album" ADD CONSTRAINT "curated_album_trekId_trek_id_fk" FOREIGN KEY ("trekId") REFERENCES "public"."trek"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "curated_album_trek_position_idx" ON "curated_album" USING btree ("trekId","position");--> statement-breakpoint
CREATE UNIQUE INDEX "curated_album_trek_spotify_idx" ON "curated_album" USING btree ("trekId","spotifyAlbumId");--> statement-breakpoint
ALTER TABLE "trek_round" ADD CONSTRAINT "trek_round_curatedAlbumId_curated_album_id_fk" FOREIGN KEY ("curatedAlbumId") REFERENCES "public"."curated_album"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trek_round_curated_album_idx" ON "trek_round" USING btree ("curatedAlbumId");
