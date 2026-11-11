<script lang="ts">
	import { LogIn, Music2 } from '@lucide/svelte';
	import { enhance } from '$lib/form-enhance';
	import { Button } from '$lib/components/ui/button';

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
		<form
			method="post"
			action="/signin"
			use:enhance
			style:--form-pending-label="Logging on…"
		>
			<input type="hidden" name="providerId" value="google" />
			<input type="hidden" name="redirectTo" value={redirectTo} />
			<Button type="submit" size="lg">
				<LogIn size={18} />
				<span>Continue with Google</span>
			</Button>
		</form>
	{/if}

	{#if providers.spotify}
		<form
			method="post"
			action="/signin"
			use:enhance
			style:--form-pending-label="Logging on…"
		>
			<input type="hidden" name="providerId" value="spotify" />
			<input type="hidden" name="redirectTo" value={redirectTo} />
			<Button type="submit" variant="outline" size="lg" class="spotify">
				<Music2 size={18} />
				<span>Continue with Spotify</span>
			</Button>
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
</style>
