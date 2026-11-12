<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Monitor, Moon, Sun } from '@lucide/svelte';
	import { onMount } from 'svelte';

	type ThemePreference = 'system' | 'light' | 'dark';

	const THEME_STORAGE_KEY = 'mtrek-theme';
	const DARK_THEME_QUERY = '(prefers-color-scheme: dark)';
	const THEME_PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];
	const THEME_LABELS: Record<ThemePreference, string> = {
		system: 'System theme',
		light: 'Light theme',
		dark: 'Dark theme'
	};

	let theme = $state<ThemePreference>('system');
	let nextTheme = $derived(
		THEME_PREFERENCES[
			(THEME_PREFERENCES.indexOf(theme) + 1) % THEME_PREFERENCES.length
		]
	);

	function isThemePreference(value: string | null): value is ThemePreference {
		return (
			value !== null && THEME_PREFERENCES.includes(value as ThemePreference)
		);
	}

	function applyThemePreference(preference: ThemePreference) {
		if (preference === 'system') {
			delete document.documentElement.dataset.theme;
		} else {
			document.documentElement.dataset.theme = preference;
		}

		const usesDarkTheme =
			preference === 'dark' ||
			(preference === 'system' && matchMedia(DARK_THEME_QUERY).matches);
		document.documentElement.classList.toggle('dark', usesDarkTheme);
	}

	function setThemePreference(preference: ThemePreference) {
		theme = preference;
		applyThemePreference(preference);

		try {
			localStorage.setItem(THEME_STORAGE_KEY, preference);
		} catch {
			// Browsers can disable local storage in restrictive privacy modes.
		}
	}

	onMount(() => {
		const systemTheme = matchMedia(DARK_THEME_QUERY);
		const applySystemTheme = () => {
			if (theme === 'system') {
				applyThemePreference('system');
			}
		};

		try {
			const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

			if (isThemePreference(storedTheme)) {
				theme = storedTheme;
				applyThemePreference(storedTheme);
			}
		} catch {
			// The system theme remains active when local storage is unavailable.
		}

		systemTheme.addEventListener('change', applySystemTheme);

		return () => systemTheme.removeEventListener('change', applySystemTheme);
	});
</script>

<Button
	variant="ghost"
	size="icon-sm"
	class="theme-toggle nav-button"
	onclick={() => setThemePreference(nextTheme)}
	aria-label={`${THEME_LABELS[theme]}. Switch to ${THEME_LABELS[nextTheme].toLowerCase()}.`}
	title={`${THEME_LABELS[theme]} · switch to ${THEME_LABELS[nextTheme].toLowerCase()}`}
>
	{#if theme === 'light'}
		<Sun aria-hidden="true" />
	{:else if theme === 'dark'}
		<Moon aria-hidden="true" />
	{:else}
		<Monitor aria-hidden="true" />
	{/if}
</Button>

<style>
	:global(.theme-toggle) {
		width: 2.35rem;
		min-height: 2.35rem;
		flex: 0 0 auto;
		border-color: var(--line);
		color: var(--muted);
		background: var(--surface);
	}

	:global(.theme-toggle:hover) {
		color: var(--ink);
	}
</style>
