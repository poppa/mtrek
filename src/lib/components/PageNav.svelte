<script lang="ts">
	import { resolve } from '$app/paths';
	import type {
		PathnameWithSearchOrHash,
		RouteIdWithSearchOrHash
	} from '$app/types';
	import type { PageNav } from '$lib/utils';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';

	type PathParam = Parameters<
		typeof resolve<RouteIdWithSearchOrHash | PathnameWithSearchOrHash>
	>[0];

	type PathArgsParam = Parameters<
		typeof resolve<RouteIdWithSearchOrHash | PathnameWithSearchOrHash>
	>[1];

	interface Props {
		nav: PageNav;
		path: PathParam;
		pathArgs: PathArgsParam;
		queryName?: string;
		query?: Record<string, string | undefined>;
		invalidate?: VoidFunction;
	}

	const { nav, path, pathArgs, queryName, query, invalidate }: Props = $props();

	const getPath = (pg: number): PathParam => {
		const extraQuery = Object.entries(query ?? {})
			.flatMap(([name, value]) =>
				value === undefined
					? []
					: [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`]
			)
			.join('&');
		const params = [extraQuery, `${queryName ?? 'page'}=${pg}`]
			.filter(Boolean)
			.join('&');
		const p = `${path}${path.includes('?') ? '&' : '?'}${params}`;
		return p as PathParam;
	};
</script>

<nav>
	{#if nav.prev}
		<a
			class="prev"
			href={resolve(
				// @ts-expect-error Dude
				getPath(nav.prev.pageNumber ?? 0),
				pathArgs
			)}
			onclick={invalidate ? () => invalidate() : undefined}
		>
			<ChevronLeft />
		</a>
	{:else}
		<span class="prev"><ChevronLeft /></span>
	{/if}

	{#each nav.items as navItem (navItem.offset)}
		{#if navItem.isCurrent}
			<span>{navItem.pageNumber}</span>
		{:else}
			<a
				href={resolve(
					// @ts-expect-error Dude
					getPath(navItem.pageNumber),
					pathArgs
				)}
				onclick={invalidate ? () => invalidate() : undefined}
				>{navItem.pageNumber}</a
			>
		{/if}
	{/each}

	{#if nav.next}
		<a
			class="prev"
			href={resolve(
				// @ts-expect-error Dude
				getPath(nav.next.pageNumber ?? 0),
				pathArgs
			)}
			onclick={invalidate ? () => invalidate() : undefined}
		>
			<ChevronRight />
		</a>
	{:else}
		<span class="prev"><ChevronRight /></span>
	{/if}
</nav>

<style lang="scss">
	nav {
		display: flex;
		align-items: center;
	}

	a,
	span {
		display: flex;
		padding: var(--gap);
	}

	span {
		color: var(--muted);
		cursor: default;
	}

	a:hover {
		color: var(--muted);
	}
</style>
