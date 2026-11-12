<script lang="ts">
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import { House, UserRound } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import '../app.css';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="alternate icon" href="/favicon.ico" />
	<meta
		name="description"
		content="Explore albums together, rate every listen, and find the records that stay with you."
	/>
	<meta
		name="theme-color"
		content="#111513"
		media="(prefers-color-scheme: dark)"
	/>
	<meta
		name="theme-color"
		content="#f6f0e6"
		media="(prefers-color-scheme: light)"
	/>
	<title>MTrek</title>
</svelte:head>

<div class="app-shell">
	<header class="topbar">
		<div class="topbar-contents">
			<a class="brand" href={resolve('/')} aria-label="MTrek dashboard">
				<span class="brand-mark">
					<img src={favicon} alt="" />
				</span>
				<span class="brand-wordmark">MTrek</span>
				<span class="brand-tagline">Listen deeper.</span>
			</a>

			<div class="header-actions">
				{#if data.session?.user}
					<nav class="primary-nav" aria-label="Primary navigation">
						<Button
							href={resolve('/')}
							variant="ghost"
							size="sm"
							class="nav-button"
						>
							<House aria-hidden="true" />
							<span class="nav-label">Dashboard</span>
						</Button>
						<Button
							href={resolve('/user/[userId]', { userId: data.session.user.id })}
							variant="outline"
							size="sm"
							class="profile-button"
						>
							{#if data.session.user.image}
								<img class="nav-avatar" src={data.session.user.image} alt="" />
							{:else}
								<UserRound aria-hidden="true" />
							{/if}
							<span class="user-name">
								{data.session.user.name ?? data.session.user.email}
							</span>
						</Button>
					</nav>
				{/if}
				<ThemeToggle />
			</div>
		</div>
	</header>

	<main>
		{@render children()}
	</main>
</div>

<style>
	.topbar {
		position: sticky;
		top: 0;
		z-index: 50;
		border-bottom: 1px solid var(--line);
		background: var(--topbar-bg);
		backdrop-filter: blur(18px) saturate(140%);
	}

	.topbar-contents {
		display: flex;
		width: min(100%, 80rem);
		min-height: 4.75rem;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-inline: auto;
		padding-inline: var(--gutter);
	}

	.brand {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.65rem;
	}

	.brand-mark {
		display: grid;
		width: 2.5rem;
		aspect-ratio: 1;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 50%;
		background: var(--brand);
		box-shadow: 0 0 0 5px color-mix(in oklch, var(--brand) 12%, transparent);
	}

	.brand-mark img {
		width: 100%;
		height: 100%;
		border-radius: inherit;
	}

	.brand-wordmark {
		font-size: 1.2rem;
		font-weight: 850;
		letter-spacing: -0.055em;
	}

	.brand-tagline {
		margin-left: 0.15rem;
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.03em;
	}

	.primary-nav {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.4rem;
	}

	.header-actions {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.4rem;
	}

	:global(.nav-button),
	:global(.profile-button) {
		min-height: 2.35rem;
	}

	:global(.nav-button svg),
	:global(.profile-button svg) {
		width: 1rem;
		height: 1rem;
	}

	.nav-avatar {
		width: 1.55rem;
		height: 1.55rem;
		border-radius: 50%;
		object-fit: cover;
	}

	.user-name {
		max-width: 10rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (max-width: 50rem) {
		.brand-tagline,
		.user-name {
			display: none;
		}
	}

	@media (max-width: 36rem) {
		.topbar-contents {
			min-height: 4.25rem;
		}

		.nav-label {
			display: none;
		}

		:global(.nav-button),
		:global(.profile-button) {
			width: 2.35rem;
			padding-inline: 0;
		}

		.brand-mark {
			width: 2.2rem;
		}
	}
</style>
