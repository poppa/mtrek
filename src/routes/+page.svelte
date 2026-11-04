<script lang="ts">
	import { resolve } from '$app/paths';
	import AuthButtons from '$lib/components/AuthButtons.svelte';
	import { getTrekRoundUnit, getTrekTypeDescription } from '$lib/trek-types';
	import { CalendarDays, Disc3, Plus, Shuffle, Users } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
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
		<div class="contents stack trek-sections">
			<div class="section-header main-header">
				<div>
					<p class="eyebrow">Dashboard</p>
					<h1>Your music treks</h1>
				</div>
				<a class="button primary" href={resolve('/treks/new')}>
					<Plus size={18} /> New trek
				</a>
			</div>

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
												<span>
													<CalendarDays size={15} />
													{getTrekTypeDescription(trek.type, trek)}
												</span>
												<span><Users size={15} /> {trek.participantCount}</span>
											</div>
										</div>
										<span
											class="badge"
											class:success={trek.status === 'completed'}
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
										<span>
											<Disc3 size={15} />
											{trek.completedYears}/{trek.totalYears}
											{getTrekRoundUnit(trek.type, true)}
										</span>
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
	</section>
{/if}

<style lang="scss">
	.auth-screen {
		display: grid;
		min-height: calc(100vh - 4.25rem);
		align-items: center;
		gap: 2rem;
	}

	.trek-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 24rem), 1fr));
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
