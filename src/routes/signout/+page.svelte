<script lang="ts">
	import { resolve } from '$app/paths';
	import { LogOut } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Sign out · MTrek</title>
</svelte:head>

<section class="page auth-screen">
	<div class="auth-copy">
		<p class="eyebrow">Sign out</p>
		<h1>Leave MTrek</h1>

		{#if data.session?.user}
			<p class="lead">End your current MTrek session on this device.</p>
			<form method="post">
				<input type="hidden" name="redirectTo" value="/" />
				<button class="button primary" type="submit">
					<LogOut size={18} />
					<span>Sign out</span>
				</button>
			</form>
		{:else}
			<p class="lead">There is no active session to sign out from.</p>
			<a class="button primary" href={resolve('/')}>Go to dashboard</a>
		{/if}
	</div>
</section>
