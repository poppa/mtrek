import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { authAdapterTables, users } from '$lib/server/db/schema';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { SvelteKitAuth, type SvelteKitAuthConfig } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import Spotify from '@auth/sveltekit/providers/spotify';
import { eq } from 'drizzle-orm';

export function getAuthProviderStatus() {
	return {
		google: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
		spotify: Boolean(env.AUTH_SPOTIFY_ID && env.AUTH_SPOTIFY_SECRET)
	};
}

async function getAuthConfig(): Promise<SvelteKitAuthConfig> {
	const providerStatus = getAuthProviderStatus();
	const providers: NonNullable<SvelteKitAuthConfig['providers']> = [];

	if (providerStatus.google) {
		providers.push(
			Google({
				clientId: env.AUTH_GOOGLE_ID,
				clientSecret: env.AUTH_GOOGLE_SECRET
			})
		);
	}

	if (providerStatus.spotify) {
		providers.push(
			Spotify({
				clientId: env.AUTH_SPOTIFY_ID,
				clientSecret: env.AUTH_SPOTIFY_SECRET,
				authorization: {
					url: 'https://accounts.spotify.com/authorize',
					params: {
						scope: 'user-read-email user-read-private'
					}
				}
			})
		);
	}

	return {
		adapter: DrizzleAdapter(db, authAdapterTables),
		providers,
		secret: env.AUTH_SECRET,
		trustHost: env.AUTH_TRUST_HOST === 'true' || !env.AUTH_TRUST_HOST,
		events: {
			async signIn({ user, account, profile }) {
				if (!user.id || !profile) return;

				// Read the fresh provider profile; user.image may still be the saved image.
				const image =
					account?.provider === 'google'
						? profile.picture
						: account?.provider === 'spotify' && Array.isArray(profile.images)
							? profile.images[0]?.url
							: undefined;

				if (typeof image !== 'string' || !image.trim()) return;

				await db.update(users).set({ image }).where(eq(users.id, user.id));
			}
		},
		callbacks: {
			session({ session, user }) {
				if (session.user && user.id) {
					session.user.id = user.id;
				}

				return session;
			}
		}
	};
}

export const { handle, signIn, signOut } = SvelteKitAuth(getAuthConfig);
