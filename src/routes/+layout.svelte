<script lang="ts">
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import logo from '$lib/assets/logo.svg';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	//
	import '../app.scss';
	import { LogOut } from '@lucide/svelte';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="alternate icon" href="/favicon.ico" />
	<title>MTrek</title>
</svelte:head>

<div class="app-shell">
	<header class="topbar">
		<div class="contents">
			<a class="brand" href={resolve('/')}>
				<img class="brand-logo" src={logo} alt="MTrek" />
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
						<button
							class="button ghost small-text"
							type="submit"
							title="Sign out"
						>
							<LogOut size={16} />
							<span>Sign out</span>
						</button>
					</form>
				</div>
			{/if}
		</div>
	</header>

	<main>
		{@render children()}
	</main>
</div>

<style lang="scss">
	.topbar {
		position: sticky;
		top: 0;
		z-index: 10;
		border-bottom: 1px solid var(--line);
		padding: calc(var(--gutter) / 2) var(--gutter);
		background: var(--topbar-bg);
		backdrop-filter: blur(12px);
		container: topbar / inline-size;

		.contents {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--inline-gap);
		}
	}

	.brand {
		display: flex;
		align-items: center;
		min-width: 0;
		cursor: pointer;
	}

	.brand-logo {
		display: block;
		width: auto;
		height: 2.55rem;
	}

	.user-tools {
		display: flex;
		align-items: center;
		gap: var(--inline-gap);
		min-width: 0;
	}

	.user-name {
		max-width: 14rem;
		overflow: hidden;
		color: var(--muted);
		text-overflow: ellipsis;
		white-space: nowrap;
		margin-inline-end: var(--gutter);

		@container app (width < 600px) {
			display: none;
		}
	}

	.avatar {
		width: 2rem;
		height: 2rem;
		border: 1px solid var(--line);
		border-radius: 50%;
		object-fit: cover;
		background: var(--surface-soft);
	}
</style>
