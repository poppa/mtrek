<script lang="ts">
	import { resolve } from '$app/paths';
	import { CalendarDays, Disc3, Plus, Shuffle, Users } from '@lucide/svelte';
	import AuthButtons from '$lib/components/AuthButtons.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

{#if !data.session?.user}
	<section class="page auth-screen">
		<div class="auth-copy">
			<p class="eyebrow">Music exploration with friends</p>
			<h1>MTrek</h1>
			<p class="lead">
				Create a trek across a year range, randomize one year at a time, pick
				albums, listen, rate, and finish when every year has been explored.
			</p>
			<AuthButtons providers={data.authProviders} redirectTo="/" />
		</div>
	</section>
{:else}
	<section class="page stack">
		<div class="section-header">
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
						<p class="form-error">{form.createError}</p>
					{/if}

					<form class="form-grid" method="post" action="?/createTrek">
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

						<div class="two-col">
							<div class="field">
								<label for="startYear">Start year</label>
								<input
									id="startYear"
									name="startYear"
									type="number"
									min="1900"
									max={data.lastConcludedYear}
									value={form?.values?.startYear ?? data.lastConcludedYear - 9}
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

						<button class="button primary" type="submit">
							<Shuffle size={18} />
							<span>Create and randomize</span>
						</button>
					</form>

					<p class="footer-note">
						The latest selectable end year is {data.lastConcludedYear}.
						Current-year treks stay out until the year has fully concluded.
					</p>
				</div>
			</section>

			<section class="stack">
				<div class="section-header">
					<h2>Active treks</h2>
					<span class="badge violet">{data.treks.length} total</span>
				</div>

				{#if data.treks.length === 0}
					<p class="empty">
						No treks yet. Create one to randomize the first year.
					</p>
				{:else}
					<div class="trek-list">
						{#each data.treks as trek (trek.id)}
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
												{trek.startYear}-{trek.endYear}</span
											>
											<span><Users size={15} /> {trek.participantCount}</span>
										</div>
									</div>
									<span class:coral={trek.status === 'completed'} class="badge">
										{trek.status}
									</span>
								</div>

								<div class="progress-track" aria-hidden="true">
									<div
										class="progress-fill"
										style={`width: ${(trek.completedYears / trek.totalYears) * 100}%`}
									></div>
								</div>

								<div class="metric-row">
									<span
										><Disc3 size={15} />
										{trek.completedYears}/{trek.totalYears} years</span
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
		</div>
	</section>
{/if}
