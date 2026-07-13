<script lang="ts">
	import { LogIn, Music2 } from '@lucide/svelte';

	type ProviderStatus = {
		google: boolean;
		spotify: boolean;
	};

	let {
		providers,
		redirectTo = '/'
	}: {
		providers: ProviderStatus;
		redirectTo?: string;
	} = $props();
</script>

<div class="auth-actions">
	{#if providers.google}
		<form method="post" action="/signin">
			<input type="hidden" name="providerId" value="google" />
			<input type="hidden" name="redirectTo" value={redirectTo} />
			<button class="button primary" type="submit">
				<LogIn size={18} />
				<span>Continue with Google</span>
			</button>
		</form>
	{/if}

	{#if providers.spotify}
		<form method="post" action="/signin">
			<input type="hidden" name="providerId" value="spotify" />
			<input type="hidden" name="redirectTo" value={redirectTo} />
			<button class="button spotify" type="submit">
				<Music2 size={18} />
				<span>Continue with Spotify</span>
			</button>
		</form>
	{/if}

	{#if !providers.google && !providers.spotify}
		<p class="notice alert">
			Configure Google or Spotify OAuth variables in `.env` to enable sign-in.
		</p>
	{/if}
</div>

<style lang="scss">
	.auth-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gap);
		margin-block-start: var(--gutter);
	}

	.spotify {
		--button-bg: #1db954;
		--button-fg: #191414;
		--button-line: light-dark(#268246, #4fd27d);
	}
</style>
