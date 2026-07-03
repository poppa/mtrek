CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "album_selection" (
	"id" text PRIMARY KEY NOT NULL,
	"roundId" text NOT NULL,
	"userId" text NOT NULL,
	"spotifyAlbumId" text,
	"albumName" text NOT NULL,
	"artistName" text NOT NULL,
	"releaseDate" text,
	"imageUrl" text,
	"externalUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authenticator" (
	"credentialID" text NOT NULL,
	"userId" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"credentialPublicKey" text NOT NULL,
	"counter" integer NOT NULL,
	"credentialDeviceType" text NOT NULL,
	"credentialBackedUp" boolean NOT NULL,
	"transports" text,
	CONSTRAINT "authenticator_userId_credentialID_pk" PRIMARY KEY("userId","credentialID"),
	CONSTRAINT "authenticator_credentialID_unique" UNIQUE("credentialID")
);
--> statement-breakpoint
CREATE TABLE "rating" (
	"id" text PRIMARY KEY NOT NULL,
	"selectionId" text NOT NULL,
	"userId" text NOT NULL,
	"scoreTenth" integer NOT NULL,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trek_participant" (
	"trekId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text DEFAULT 'participant' NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trek_participant_trekId_userId_pk" PRIMARY KEY("trekId","userId")
);
--> statement-breakpoint
CREATE TABLE "trek_round" (
	"id" text PRIMARY KEY NOT NULL,
	"trekId" text NOT NULL,
	"position" integer NOT NULL,
	"year" integer NOT NULL,
	"status" text DEFAULT 'selecting' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "trek" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"startYear" integer NOT NULL,
	"endYear" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"inviteCode" text NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_selection" ADD CONSTRAINT "album_selection_roundId_trek_round_id_fk" FOREIGN KEY ("roundId") REFERENCES "public"."trek_round"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_selection" ADD CONSTRAINT "album_selection_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authenticator" ADD CONSTRAINT "authenticator_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_selectionId_album_selection_id_fk" FOREIGN KEY ("selectionId") REFERENCES "public"."album_selection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trek_participant" ADD CONSTRAINT "trek_participant_trekId_trek_id_fk" FOREIGN KEY ("trekId") REFERENCES "public"."trek"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trek_participant" ADD CONSTRAINT "trek_participant_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trek_round" ADD CONSTRAINT "trek_round_trekId_trek_id_fk" FOREIGN KEY ("trekId") REFERENCES "public"."trek"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trek" ADD CONSTRAINT "trek_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "album_selection_round_user_idx" ON "album_selection" USING btree ("roundId","userId");--> statement-breakpoint
CREATE INDEX "album_selection_round_id_idx" ON "album_selection" USING btree ("roundId");--> statement-breakpoint
CREATE INDEX "album_selection_user_id_idx" ON "album_selection" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "rating_selection_user_idx" ON "rating" USING btree ("selectionId","userId");--> statement-breakpoint
CREATE INDEX "rating_selection_id_idx" ON "rating" USING btree ("selectionId");--> statement-breakpoint
CREATE INDEX "rating_user_id_idx" ON "rating" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "trek_participant_user_id_idx" ON "trek_participant" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "trek_round_trek_year_idx" ON "trek_round" USING btree ("trekId","year");--> statement-breakpoint
CREATE UNIQUE INDEX "trek_round_trek_position_idx" ON "trek_round" USING btree ("trekId","position");--> statement-breakpoint
CREATE INDEX "trek_round_trek_id_idx" ON "trek_round" USING btree ("trekId");--> statement-breakpoint
CREATE UNIQUE INDEX "trek_invite_code_idx" ON "trek" USING btree ("inviteCode");--> statement-breakpoint
CREATE INDEX "trek_created_by_idx" ON "trek" USING btree ("createdBy");