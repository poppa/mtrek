<script lang="ts">
	import { enhance } from '$lib/form-enhance';
	import type { AlbumInput } from '$lib/curated-albums';
	import type { NamedRoundInput } from '$lib/named-rounds';
	import type { TrekType } from '$lib/trek-types';
	import CuratedAlbumPicker from './CuratedAlbumPicker.svelte';
	import NamedRoundPicker from './NamedRoundPicker.svelte';
	import { Save, Shuffle } from '@lucide/svelte';
	import { untrack } from 'svelte';

	type FormValues = {
		name?: string;
		type?: string;
		roundOrder?: string;
		secret?: string;
		albums?: string;
		rounds?: string;
		startYear?: string;
		endYear?: string;
	};

	let {
		action,
		mode,
		initialType = 'years',
		initialName = 'Weekend deep cuts',
		initialRoundOrder = 'random',
		initialSecret = false,
		initialAlbums = [],
		initialRounds = [{ name: '', description: '' }],
		initialStartYear,
		initialEndYear,
		lastConcludedYear,
		spotifySearchConfigured,
		structureEditable = true,
		values
	}: {
		action: string;
		mode: 'create' | 'edit';
		initialType?: TrekType;
		initialName?: string;
		initialRoundOrder?: 'random' | 'consecutive';
		initialSecret?: boolean;
		initialAlbums?: AlbumInput[];
		initialRounds?: NamedRoundInput[];
		initialStartYear?: number | null;
		initialEndYear?: number | null;
		lastConcludedYear: number;
		spotifySearchConfigured: boolean;
		structureEditable?: boolean;
		values?: FormValues;
	} = $props();

	const parseList = <T,>(value: string | undefined, fallback: T[]) => {
		try {
			const parsed = JSON.parse(value ?? '');
			return Array.isArray(parsed) ? (parsed as T[]) : fallback;
		} catch {
			return fallback;
		}
	};
	const initial = untrack(() => {
		const valueType = values?.type;
		return {
			type:
				valueType === 'curated' ||
				valueType === 'named' ||
				valueType === 'years'
					? valueType
					: initialType,
			name: values?.name ?? initialName,
			roundOrder: values
				? values.roundOrder === 'consecutive'
					? ('consecutive' as const)
					: ('random' as const)
				: initialRoundOrder,
			secret: values ? values.secret === 'true' : initialSecret,
			albums: parseList(values?.albums, initialAlbums),
			rounds: parseList(values?.rounds, initialRounds)
		};
	});
	let trekType = $state<TrekType>(initial.type);
	let name = $state(initial.name);
	let roundOrder = $state<'random' | 'consecutive'>(initial.roundOrder);
	let secret = $state(initial.secret);
	let albums = $state<AlbumInput[]>(initial.albums);
	let rounds = $state<NamedRoundInput[]>(initial.rounds);
</script>

<form class="form-grid" method="post" {action} use:enhance>
	<div class="field">
		<label for="name">Name</label>
		<input
			id="name"
			name="name"
			autocomplete="off"
			bind:value={name}
			required
		/>
	</div>

	<div class="field">
		<label for="trek-type">Trek type</label>
		<select
			id="trek-type"
			name="type"
			bind:value={trekType}
			disabled={mode === 'edit'}
		>
			<option value="years">Year-based</option>
			<option value="curated">Curated albums</option>
			<option value="named">Named rounds</option>
		</select>
	</div>

	{#if structureEditable}
		<div class="field">
			<label for="round-order">Round order</label>
			<select id="round-order" name="roundOrder" bind:value={roundOrder}>
				<option value="random">Randomized</option>
				<option value="consecutive">
					{trekType === 'curated'
						? 'Album list order'
						: trekType === 'named'
							? 'Round list order'
							: 'Chronological year order'}
				</option>
			</select>
		</div>

		{#if trekType === 'curated'}
			<label class="inline-row">
				<input type="checkbox" name="secret" bind:checked={secret} />
				<span>Keep albums secret until their round begins</span>
			</label>
			<CuratedAlbumPicker bind:albums {roundOrder} {spotifySearchConfigured} />
		{:else if trekType === 'named'}
			<NamedRoundPicker bind:rounds />
		{:else}
			<div class="two-col">
				<div class="field">
					<label for="startYear">Start year</label>
					<input
						id="startYear"
						name="startYear"
						type="number"
						min="1900"
						max={lastConcludedYear}
						value={values?.startYear ??
							initialStartYear ??
							lastConcludedYear - 9}
						required
					/>
				</div>
				<div class="field">
					<label for="endYear">End year</label>
					<input
						id="endYear"
						name="endYear"
						type="number"
						min="1900"
						max={lastConcludedYear}
						value={values?.endYear ?? initialEndYear ?? lastConcludedYear}
						required
					/>
				</div>
			</div>
		{/if}
	{/if}

	<button
		class="button primary"
		type="submit"
		disabled={structureEditable &&
			((trekType === 'curated' && albums.length === 0) ||
				(trekType === 'named' && rounds.length === 0))}
	>
		{#if mode === 'create'}<Shuffle size={18} />{:else}<Save size={18} />{/if}
		<span>{mode === 'create' ? 'Create and start' : 'Save changes'}</span>
	</button>
</form>

{#if structureEditable && trekType === 'years'}
	<p class="footer-note small">
		The latest selectable end year is {lastConcludedYear}. Current-year treks
		stay out until the year has fully concluded.
	</p>
{/if}
