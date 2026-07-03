<script lang="ts">
	import { resolve } from '$app/paths';
	import { Compass, LogOut } from '@lucide/svelte';
	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutData } from './$types';
	import '../app.css';

	let {
		children,
		data
	}: { children: import('svelte').Snippet; data: LayoutData } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="alternate icon" href="/favicon.ico" />
	<title>MTrek</title>
</svelte:head>

<div class="app-shell">
	<header class="topbar">
		<a class="brand" href={resolve('/')}>
			<span class="brand-mark"><Compass size={20} /></span>
			<span>MTrek</span>
		</a>

		{#if data.session?.user}
			<div class="user-tools">
				{#if data.session.user.image}
					<img class="avatar" src={data.session.user.image} alt="" />
				{/if}
				<span class="user-name"
					>{data.session.user.name ?? data.session.user.email}</span
				>
				<form method="post" action="/signout">
					<input type="hidden" name="redirectTo" value="/" />
					<button class="button ghost small" type="submit" title="Sign out">
						<LogOut size={16} />
						<span>Sign out</span>
					</button>
				</form>
			</div>
		{/if}
	</header>

	<main>
		{@render children()}
	</main>
</div>
