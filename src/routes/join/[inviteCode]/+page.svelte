<script lang="ts">
	import { CalendarDays, LogIn, Users } from '@lucide/svelte';
	import AuthButtons from '$lib/components/AuthButtons.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Join trek · MTrek</title>
</svelte:head>

<section class="page auth-screen">
	<div class="contents">
		{#if !data.trek}
			<div class="auth-copy">
				<p class="eyebrow">Invite</p>
				<h1>Invite not found</h1>
				<p class="lead notice alert margin-gutter-block-start">
					This MTrek invite link does not match an active trek.
				</p>
			</div>
		{:else}
			<div class="auth-copy">
				<p class="eyebrow">Join trek</p>
				<h1>{data.trek.name}</h1>
				<div class="meta-row">
					<span
						><CalendarDays size={16} />
						{data.trek.startYear}-{data.trek.endYear}</span
					>
					<span><Users size={16} /> {data.trek.status}</span>
				</div>

				<div class="margin-gutter-block-start">
					{#if form?.joinError}
						<p class="form-error alert">{form.joinError}</p>
					{/if}
					{#if data.isSignedIn}
						<form method="post">
							<button class="button primary" type="submit">
								<LogIn size={18} />
								<span>Join trek</span>
							</button>
						</form>
					{:else}
						<p class="lead">
							Sign in to join this trek and pick albums when the year opens.
						</p>
						<AuthButtons
							providers={data.authProviders}
							redirectTo={`/join/${data.trek.inviteCode}`}
						/>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</section>
