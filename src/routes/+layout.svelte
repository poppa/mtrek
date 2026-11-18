<script lang="ts">
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import { House, UserRound } from '@lucide/svelte';
	import { onMount, type Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import '../app.css';

	const FLOATING_NAVBAR_SCROLL_THRESHOLD = 30;

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
	let showFloatingNavbar = $state(false);
	let themePreference = $state<'system' | 'light' | 'dark'>('system');

	function updateNavbarVisibility(): void {
		showFloatingNavbar = window.scrollY > FLOATING_NAVBAR_SCROLL_THRESHOLD;
	}

	onMount(updateNavbarVisibility);
</script>

<svelte:window onscroll={updateNavbarVisibility} />

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
	<title>MusicTrek</title>
</svelte:head>

{#snippet navbarContents(floating: boolean)}
	<div
		class={floating
			? 'topbar-contents floating-contents'
			: 'content-frame topbar-contents'}
	>
		<a class="brand" href={resolve('/')} aria-label="MusicTrek dashboard">
			<span class="brand-mark">
				<img src={favicon} alt="" />
			</span>
			<div class="text">
				<span class="brand-wordmark"><span>Music</span><span>Trek</span></span>
				<span class="brand-tagline">Listen deeper</span>
			</div>
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
			<ThemeToggle bind:theme={themePreference} />
		</div>
	</div>
{/snippet}

<div class="app-shell">
	<header
		class="topbar"
		class:is-hidden={showFloatingNavbar}
		aria-hidden={showFloatingNavbar}
		inert={showFloatingNavbar}
	>
		{@render navbarContents(false)}
	</header>

	<header
		class="floating-topbar"
		class:is-visible={showFloatingNavbar}
		aria-hidden={!showFloatingNavbar}
		inert={!showFloatingNavbar}
	>
		{@render navbarContents(true)}
	</header>

	<main>
		{@render children()}
	</main>
</div>

<style>
	.topbar {
		--navbar-fade-duration: 160ms;
		--navbar-swap-delay: 140ms;

		position: sticky;
		top: 0;
		z-index: 50;
		border-bottom: 1px solid var(--line);
		backdrop-filter: blur(18px) saturate(140%);
		transition:
			opacity var(--navbar-fade-duration) ease var(--navbar-swap-delay),
			visibility 0s linear 0s;
	}

	.topbar.is-hidden {
		opacity: 0;
		visibility: hidden;
		transition-delay: 0s, var(--navbar-fade-duration);
	}

	.floating-topbar {
		--floating-navbar-max-width: 31.25rem;
		--floating-navbar-offset: 1rem;
		--navbar-fade-duration: 160ms;
		--navbar-swap-delay: 140ms;

		position: fixed;
		top: var(--floating-navbar-offset);
		left: 50%;
		z-index: 60;
		width: min(
			var(--floating-navbar-max-width),
			calc(100% - (var(--floating-navbar-offset) * 2))
		);
		border: 1px solid var(--line);
		border-radius: calc(var(--radius) * 100);
		box-shadow: var(--shadow);
		opacity: 0;
		transform: translate(-50%, -0.5rem);
		visibility: hidden;
		backdrop-filter: blur(18px) saturate(140%);
		transition:
			opacity var(--navbar-fade-duration) ease 0s,
			transform var(--navbar-fade-duration) ease 0s,
			visibility 0s linear var(--navbar-fade-duration);
	}

	.floating-topbar.is-visible {
		opacity: 1;
		transform: translate(-50%, 0);
		visibility: visible;
		transition-delay: var(--navbar-swap-delay), var(--navbar-swap-delay), 0s;
	}

	.topbar-contents {
		display: flex;
		min-height: 4.75rem;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.floating-contents {
		min-height: auto;
		padding: 0.5rem 0.75rem;
	}

	.floating-topbar .nav-label {
		display: none;
	}

	.brand {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.65rem;
	}

	.brand .text {
		line-height: 1.2;
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

	.brand-wordmark span:last-child {
		color: var(--brand);
	}

	.brand-tagline {
		color: var(--muted);
		font-size: 0.75rem;
		/* font-weight: 700; */
		letter-spacing: 0.03em;
		display: block;
	}

	.primary-nav {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.4rem;
	}

	.header-actions {
		--surface-raised: transparent;
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
		.user-name {
			display: none;
		}
	}

	@media (max-width: 36rem) {
		.floating-topbar {
			--floating-navbar-offset: 0.5rem;
		}

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

		.floating-contents.topbar-contents {
			min-height: 0;
		}

		/* .floating-topbar .brand .text {
			display: none;
		} */
	}

	@media (prefers-reduced-motion: reduce) {
		.topbar,
		.topbar.is-hidden,
		.floating-topbar,
		.floating-topbar.is-visible {
			transition-duration: 0s;
			transition-delay: 0s;
		}
	}
</style>
