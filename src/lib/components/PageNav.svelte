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
		invalidate?: VoidFunction;
	}

	const { nav, path, pathArgs, queryName, invalidate }: Props = $props();

	const getPath = (pg: number): PathParam => {
		const concat = path.includes(`?`) ? '&' : '?';
		const p = `${path}${concat}${queryName ?? 'page'}=${pg}`;
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
