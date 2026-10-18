<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$lib/form-enhance';
	import CuratedAlbumPicker from '$lib/components/CuratedAlbumPicker.svelte';
	import NamedRoundPicker from '$lib/components/NamedRoundPicker.svelte';
	import { parseNamedRounds, type NamedRoundInput } from '$lib/named-rounds';
	import { parseCuratedAlbums, type AlbumInput } from '$lib/curated-albums';
	import { getTrekRoundUnit, getTrekTypeDescription } from '$lib/trek-types';
	import AuthButtons from '$lib/components/AuthButtons.svelte';
	import { CalendarDays, Disc3, Plus, Shuffle, Users } from '@lucide/svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let trekType = $state('years');
	let roundOrder = $state<'random' | 'consecutive'>('random');
	let albums = $state<AlbumInput[]>([]);
	let rounds = $state<NamedRoundInput[]>([{ name: '', description: '' }]);
	let trekGroups = $derived([
		{
			title: 'Active treks',
			treks: data.treks.filter((trek) => trek.status === 'active'),
			emptyMessage: 'No active treks. Create one to start exploring.'
		},
		{
			title: 'Completed treks',
			treks: data.treks.filter((trek) => trek.status === 'completed'),
			emptyMessage:
				'No completed treks yet. Finish a trek and it will appear here.'
		}
	]);

	$effect(() => {
		if (form?.values) {
			trekType = form.values.type;
			roundOrder =
				form.values.roundOrder === 'consecutive' ? 'consecutive' : 'random';
			try {
				albums = parseCuratedAlbums(JSON.parse(form.values.albums || '[]'));
			} catch {
				albums = [];
			}
			try {
				rounds = parseNamedRounds(JSON.parse(form.values.rounds || '[]'));
			} catch {
				rounds = [{ name: '', description: '' }];
			}
		}
	});
</script>

{#if !data.session?.user}
	<section class="page auth-screen">
		<div class="contents">
			<div class="auth-copy">
				<p class="eyebrow">Music exploration with friends</p>
				<h1><span class="brand-color">M</span>Trek</h1>
				<p class="lead">
					Explore a year range or a curated album list with friends. Draw a year
					or album at random, listen, and rate together.
				</p>
				<AuthButtons providers={data.authProviders} redirectTo="/" />
			</div>
		</div>
	</section>
{:else}
	<section class="page stack">
		<div class="contents">
			<div class="section-header main-header">
				<div>
					<p class="eyebrow">Dashboard</p>
					<h1>Your music treks</h1>
				</div>
			</div>

			<div class="dashboard-grid">
				<section class="panel">
					<div class="panel-body">
						<div class="panel-header">
							<h2>Create trek</h2>
							<span class="badge"><Plus size={14} /> New</span>
						</div>

						{#if form?.createError}
							<p class="form-error alert">{form.createError}</p>
						{/if}

						<form
							class="form-grid"
							method="post"
							action="?/createTrek"
							use:enhance
						>
							<div class="field">
								<label for="name">Name</label>
								<input
									id="name"
									name="name"
									autocomplete="off"
									value={form?.values?.name ?? 'Weekend deep cuts'}
									required
								/>
							</div>

							<div class="field">
								<label for="trek-type">Trek type</label><select
									id="trek-type"
									name="type"
									bind:value={trekType}
									><option value="years">Year-based</option><option
										value="curated">Curated albums</option
									><option value="named">Named rounds</option></select
								>
							</div>

							<div class="field">
								<label for="round-order">Round order</label>
								<select
									id="round-order"
									name="roundOrder"
									bind:value={roundOrder}
								>
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
								<CuratedAlbumPicker
									bind:albums
									{roundOrder}
									spotifySearchConfigured={data.spotifySearchConfigured}
								/>
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
											max={data.lastConcludedYear}
											value={form?.values?.startYear ??
												data.lastConcludedYear - 9}
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
											max={data.lastConcludedYear}
											value={form?.values?.endYear ?? data.lastConcludedYear}
											required
										/>
									</div>
								</div>
							{/if}
							<button
								class="button primary"
								type="submit"
								disabled={(trekType === 'curated' && albums.length === 0) ||
									(trekType === 'named' && rounds.length === 0)}
							>
								<Shuffle size={18} />
								<span
									>{roundOrder === 'consecutive'
										? 'Create and start'
										: 'Create and randomize'}</span
								>
							</button>
						</form>

						{#if trekType === 'years'}<p class="footer-note small">
								The latest selectable end year is {data.lastConcludedYear}.
								Current-year treks stay out until the year has fully concluded.
							</p>{/if}
					</div>
				</section>

				<div class="stack trek-sections">
					{#each trekGroups as group (group.title)}
						<section class="stack">
							<div class="section-header">
								<h2>{group.title}</h2>
								<span
									class="badge"
									class:violet={group.title === 'Active treks'}
									class:success={group.title === 'Completed treks'}
								>
									{group.treks.length}
									{group.treks.length === 1 ? 'trek' : 'treks'}
								</span>
							</div>

							{#if group.treks.length === 0}
								<p class="empty alert">{group.emptyMessage}</p>
							{:else}
								<div class="trek-list">
									{#each group.treks as trek (trek.id)}
										<a
											class="trek-card"
											href={resolve('/treks/[trekId]', { trekId: trek.id })}
										>
											<div class="trek-card-top">
												<div>
													<h3>{trek.name}</h3>
													<div class="meta-row">
														<span
															><CalendarDays size={15} />
															{getTrekTypeDescription(trek.type, trek)}</span
														>
														<span
															><Users size={15} /> {trek.participantCount}</span
														>
													</div>
												</div>
												<span
													class:success={trek.status === 'completed'}
													class="badge"
												>
													{trek.status}
												</span>
											</div>

											<div class="progress-track" aria-hidden="true">
												<div
													class="progress-fill"
													class:completed={trek.status === 'completed'}
													style={`width: ${(trek.completedYears / trek.totalYears) * 100}%`}
												></div>
											</div>

											<div class="metric-row">
												<span
													><Disc3 size={15} />
													{trek.completedYears}/{trek.totalYears}
													{getTrekRoundUnit(trek.type, true)}</span
												>
												{#if trek.activeYear}
													<span><Shuffle size={15} /> {trek.activeYear}</span>
												{/if}
											</div>
										</a>
									{/each}
								</div>
							{/if}
						</section>
					{/each}
				</div>
			</div>
		</div>
	</section>
{/if}

<style lang="scss">
	.auth-screen {
		display: grid;
		min-height: calc(100vh - 4.25rem);
		align-items: center;
		gap: 2rem;
	}

	.dashboard-grid {
		display: grid;
		gap: calc(var(--gutter) * 2);
		grid-template-columns: clamp(320px, 30%, 480px) auto;

		@container app (width < 834px) {
			grid-template-columns: 1fr;
		}
	}

	.trek-list {
		display: flex;
		flex-direction: column;
		gap: var(--gutter);
	}

	.trek-sections {
		gap: calc(var(--gutter) * 2);
	}

	.trek-card {
		padding: var(--gutter);
		border: 1px solid var(--line);
		border-radius: var(--border-radius);
		background-color: var(--surface);
		display: flex;
		flex-direction: column;
		gap: var(--gap);

		transition:
			border-color 125ms ease-in,
			background-color 125ms ease-in;

		&:hover {
			border-color: var(--line-strong);
			background-color: var(--surface-soft);
		}
	}

	.trek-card-top {
		display: flex;
		align-items: start;
		justify-content: space-between;
	}
</style>
