import type { AdapterAccountType } from '@auth/core/adapters';
import { relations } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';

export type TrekStatus = 'active' | 'completed';
export type ParticipantRole = 'owner' | 'participant';
export type RoundStatus = 'selecting' | 'rating' | 'completed';

export const users = pgTable('user', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name'),
	email: text('email').unique(),
	emailVerified: timestamp('emailVerified', { mode: 'date' }),
	image: text('image')
});

export const accounts = pgTable(
	'account',
	{
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: text('type').$type<AdapterAccountType>().notNull(),
		provider: text('provider').notNull(),
		providerAccountId: text('providerAccountId').notNull(),
		refresh_token: text('refresh_token'),
		access_token: text('access_token'),
		expires_at: integer('expires_at'),
		token_type: text('token_type'),
		scope: text('scope'),
		id_token: text('id_token'),
		session_state: text('session_state')
	},
	(account) => ({
		compositePk: primaryKey({
			columns: [account.provider, account.providerAccountId]
		}),
		userIdIdx: index('account_user_id_idx').on(account.userId)
	})
);

export const sessions = pgTable(
	'session',
	{
		sessionToken: text('sessionToken').primaryKey(),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expires: timestamp('expires', { mode: 'date' }).notNull()
	},
	(session) => ({
		userIdIdx: index('session_user_id_idx').on(session.userId)
	})
);

export const verificationTokens = pgTable(
	'verificationToken',
	{
		identifier: text('identifier').notNull(),
		token: text('token').notNull(),
		expires: timestamp('expires', { mode: 'date' }).notNull()
	},
	(verificationToken) => ({
		compositePk: primaryKey({
			columns: [verificationToken.identifier, verificationToken.token]
		})
	})
);

export const authenticators = pgTable(
	'authenticator',
	{
		credentialID: text('credentialID').notNull().unique(),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		providerAccountId: text('providerAccountId').notNull(),
		credentialPublicKey: text('credentialPublicKey').notNull(),
		counter: integer('counter').notNull(),
		credentialDeviceType: text('credentialDeviceType').notNull(),
		credentialBackedUp: boolean('credentialBackedUp').notNull(),
		transports: text('transports')
	},
	(authenticator) => ({
		compositePk: primaryKey({
			columns: [authenticator.userId, authenticator.credentialID]
		})
	})
);

export const treks = pgTable(
	'trek',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text('name').notNull(),
		startYear: integer('startYear').notNull(),
		endYear: integer('endYear').notNull(),
		status: text('status').$type<TrekStatus>().notNull().default('active'),
		inviteCode: text('inviteCode').notNull(),
		createdBy: text('createdBy')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
		completedAt: timestamp('completedAt', { mode: 'date' })
	},
	(trek) => ({
		inviteCodeIdx: uniqueIndex('trek_invite_code_idx').on(trek.inviteCode),
		createdByIdx: index('trek_created_by_idx').on(trek.createdBy)
	})
);

export const trekParticipants = pgTable(
	'trek_participant',
	{
		trekId: text('trekId')
			.notNull()
			.references(() => treks.id, { onDelete: 'cascade' }),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		role: text('role')
			.$type<ParticipantRole>()
			.notNull()
			.default('participant'),
		joinedAt: timestamp('joinedAt', { mode: 'date' }).notNull().defaultNow()
	},
	(participant) => ({
		compositePk: primaryKey({
			columns: [participant.trekId, participant.userId]
		}),
		userIdIdx: index('trek_participant_user_id_idx').on(participant.userId)
	})
).enableRLS();

export const trekRounds = pgTable(
	'trek_round',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		trekId: text('trekId')
			.notNull()
			.references(() => treks.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		year: integer('year').notNull(),
		status: text('status').$type<RoundStatus>().notNull().default('selecting'),
		createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
		completedAt: timestamp('completedAt', { mode: 'date' })
	},
	(round) => ({
		trekYearIdx: uniqueIndex('trek_round_trek_year_idx').on(
			round.trekId,
			round.year
		),
		trekPositionIdx: uniqueIndex('trek_round_trek_position_idx').on(
			round.trekId,
			round.position
		),
		trekIdIdx: index('trek_round_trek_id_idx').on(round.trekId)
	})
);

export const albumSelections = pgTable(
	'album_selection',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		roundId: text('roundId')
			.notNull()
			.references(() => trekRounds.id, { onDelete: 'cascade' }),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		spotifyAlbumId: text('spotifyAlbumId'),
		albumName: text('albumName').notNull(),
		artistName: text('artistName').notNull(),
		releaseDate: text('releaseDate'),
		imageUrl: text('imageUrl'),
		externalUrl: text('externalUrl'),
		createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow()
	},
	(selection) => ({
		roundUserIdx: uniqueIndex('album_selection_round_user_idx').on(
			selection.roundId,
			selection.userId
		),
		roundIdIdx: index('album_selection_round_id_idx').on(selection.roundId),
		userIdIdx: index('album_selection_user_id_idx').on(selection.userId)
	})
);

export const ratings = pgTable(
	'rating',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		selectionId: text('selectionId')
			.notNull()
			.references(() => albumSelections.id, { onDelete: 'cascade' }),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		scoreTenth: integer('scoreTenth').notNull(),
		note: text('note'),
		createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
		updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow()
	},
	(rating) => ({
		selectionUserIdx: uniqueIndex('rating_selection_user_idx').on(
			rating.selectionId,
			rating.userId
		),
		selectionIdIdx: index('rating_selection_id_idx').on(rating.selectionId),
		userIdIdx: index('rating_user_id_idx').on(rating.userId)
	})
);

export const usersRelations = relations(users, ({ many }) => ({
	treks: many(treks),
	participants: many(trekParticipants),
	selections: many(albumSelections),
	ratings: many(ratings)
}));

export const treksRelations = relations(treks, ({ one, many }) => ({
	creator: one(users, {
		fields: [treks.createdBy],
		references: [users.id]
	}),
	participants: many(trekParticipants),
	rounds: many(trekRounds)
}));

export const trekParticipantsRelations = relations(
	trekParticipants,
	({ one }) => ({
		trek: one(treks, {
			fields: [trekParticipants.trekId],
			references: [treks.id]
		}),
		user: one(users, {
			fields: [trekParticipants.userId],
			references: [users.id]
		})
	})
);

export const trekRoundsRelations = relations(trekRounds, ({ one, many }) => ({
	trek: one(treks, {
		fields: [trekRounds.trekId],
		references: [treks.id]
	}),
	selections: many(albumSelections)
}));

export const albumSelectionsRelations = relations(
	albumSelections,
	({ one, many }) => ({
		round: one(trekRounds, {
			fields: [albumSelections.roundId],
			references: [trekRounds.id]
		}),
		user: one(users, {
			fields: [albumSelections.userId],
			references: [users.id]
		}),
		ratings: many(ratings)
	})
);

export const ratingsRelations = relations(ratings, ({ one }) => ({
	selection: one(albumSelections, {
		fields: [ratings.selectionId],
		references: [albumSelections.id]
	}),
	user: one(users, {
		fields: [ratings.userId],
		references: [users.id]
	})
}));
