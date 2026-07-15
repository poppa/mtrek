<script lang="ts">
	import { resolve } from '$app/paths';
	import AuthButtons from '$lib/components/AuthButtons.svelte';
	import { LogIn } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Sign in · MTrek</title>
</svelte:head>

<section class="page auth-screen">
	<div class="contents">
		<div class="auth-copy">
			<p class="eyebrow">Sign in</p>
			<h1>Continue to MTrek</h1>

			{#if data.session?.user}
				<p class="lead">You are already signed in.</p>
				<a class="button primary" href={resolve('/')}>
					<LogIn size={18} />
					<span>Go to dashboard</span>
				</a>
			{:else}
				<p class="lead">
					Use a configured OAuth provider to create and join music treks.
				</p>
				<AuthButtons
					providers={data.authProviders}
					redirectTo={data.redirectTo}
				/>
			{/if}
		</div>
	</div>
</section>
