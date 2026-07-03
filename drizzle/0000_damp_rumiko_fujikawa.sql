CREATE TABLE `account` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`userId`);--> statement-breakpoint
CREATE TABLE `album_selection` (
	`id` text PRIMARY KEY NOT NULL,
	`roundId` text NOT NULL,
	`userId` text NOT NULL,
	`spotifyAlbumId` text,
	`albumName` text NOT NULL,
	`artistName` text NOT NULL,
	`releaseDate` text,
	`imageUrl` text,
	`externalUrl` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`roundId`) REFERENCES `trek_round`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `album_selection_round_user_idx` ON `album_selection` (`roundId`,`userId`);--> statement-breakpoint
CREATE INDEX `album_selection_round_id_idx` ON `album_selection` (`roundId`);--> statement-breakpoint
CREATE INDEX `album_selection_user_id_idx` ON `album_selection` (`userId`);--> statement-breakpoint
CREATE TABLE `authenticator` (
	`credentialID` text NOT NULL,
	`userId` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`credentialPublicKey` text NOT NULL,
	`counter` integer NOT NULL,
	`credentialDeviceType` text NOT NULL,
	`credentialBackedUp` integer NOT NULL,
	`transports` text,
	PRIMARY KEY(`userId`, `credentialID`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `authenticator_credentialID_unique` ON `authenticator` (`credentialID`);--> statement-breakpoint
CREATE TABLE `rating` (
	`id` text PRIMARY KEY NOT NULL,
	`selectionId` text NOT NULL,
	`userId` text NOT NULL,
	`scoreTenth` integer NOT NULL,
	`note` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`selectionId`) REFERENCES `album_selection`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rating_selection_user_idx` ON `rating` (`selectionId`,`userId`);--> statement-breakpoint
CREATE INDEX `rating_selection_id_idx` ON `rating` (`selectionId`);--> statement-breakpoint
CREATE INDEX `rating_user_id_idx` ON `rating` (`userId`);--> statement-breakpoint
CREATE TABLE `session` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE TABLE `trek_participant` (
	`trekId` text NOT NULL,
	`userId` text NOT NULL,
	`role` text DEFAULT 'participant' NOT NULL,
	`joinedAt` integer NOT NULL,
	PRIMARY KEY(`trekId`, `userId`),
	FOREIGN KEY (`trekId`) REFERENCES `trek`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trek_participant_user_id_idx` ON `trek_participant` (`userId`);--> statement-breakpoint
CREATE TABLE `trek_round` (
	`id` text PRIMARY KEY NOT NULL,
	`trekId` text NOT NULL,
	`position` integer NOT NULL,
	`year` integer NOT NULL,
	`status` text DEFAULT 'selecting' NOT NULL,
	`createdAt` integer NOT NULL,
	`completedAt` integer,
	FOREIGN KEY (`trekId`) REFERENCES `trek`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trek_round_trek_year_idx` ON `trek_round` (`trekId`,`year`);--> statement-breakpoint
CREATE UNIQUE INDEX `trek_round_trek_position_idx` ON `trek_round` (`trekId`,`position`);--> statement-breakpoint
CREATE INDEX `trek_round_trek_id_idx` ON `trek_round` (`trekId`);--> statement-breakpoint
CREATE TABLE `trek` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`startYear` integer NOT NULL,
	`endYear` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`inviteCode` text NOT NULL,
	`createdBy` text NOT NULL,
	`createdAt` integer NOT NULL,
	`completedAt` integer,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trek_invite_code_idx` ON `trek` (`inviteCode`);--> statement-breakpoint
CREATE INDEX `trek_created_by_idx` ON `trek` (`createdBy`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`emailVerified` integer,
	`image` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verificationToken` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
