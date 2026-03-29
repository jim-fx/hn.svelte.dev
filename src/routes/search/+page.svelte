<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ItemSummary from '../[list=category]/[page]/ItemSummary.svelte';
	import { timeToReadable } from '$lib/utils';

	const { data } = $props();

	// svelte-ignore state_referenced_locally
	let query: string = $state(data.query ?? '');
	// svelte-ignore state_referenced_locally
	let searchType: string = $state(data.type ?? 'story');
	// svelte-ignore state_referenced_locally
	let searchInBody: boolean = $state(data.searchInBody ?? false);

	$effect(() => {
		if (!query) return;
		const currentQ = page.url.searchParams.get('q');
		const currentType = page.url.searchParams.get('type') ?? 'story';
		const currentBody = page.url.searchParams.get('body') === '1';
		if (currentQ === query && currentType === searchType && currentBody === searchInBody) return;
		const u = new URL(page.url.toString());
		u.searchParams.set('q', query);
		u.searchParams.set('type', searchType);
		if (searchInBody) {
			u.searchParams.set('body', '1');
		} else {
			u.searchParams.delete('body');
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(u.toString());
	});
</script>

<div>
	<!-- svelte-ignore a11y_autofocus -->
	<input type="text" bind:value={query} placeholder="Search" autofocus />
	<select bind:value={searchType}>
		<option value="story">Stories</option>
		<option value="user">Users</option>
		<option value="comment">Comments</option>
	</select>
	{#if searchType === 'story'}
		<label class="checkbox">
			<input type="checkbox" bind:checked={searchInBody} />
			Search in body
		</label>
	{:else if searchType === 'user'}
		<label class="checkbox">
			<input type="checkbox" bind:checked={searchInBody} />
			Search in about
		</label>
	{/if}
</div>

{#if data.durationSearchMs}
	<div class="search-stats">
		<span>
			search {data.durationSearchMs?.toFixed(0)}<i>ms</i>
		</span>
		<span>
			{data.results.length}/{data.total} <i>items</i>
		</span>
	</div>
{/if}

{#if data.type === 'user'}
	{#each data.results as user, i (user)}
		<article>
			<h2>
				<a href="/user/{user.name}">
					{#if user.name_snippet}
						{@html user.name_snippet}
					{:else}
						{user.name}
					{/if}
				</a>
			</h2>
			{#if data.searchInBody && user.about_snippet}
				<p class="body-preview">
					{@html user.about_snippet}
				</p>
			{:else if user.about}
				<p class="body-preview">
					{user.about}
				</p>
			{/if}
			<p>
				{user.karma} karma
			</p>
			<span class="index">{i + 1}</span>
		</article>
	{/each}
{:else if data.type === 'comment'}
	{#each data.results as item, i (item.id)}
		{#if item}
			<article>
				<h2>
					<a href="/item/{item.id}">
						{#if item.text_snippet}
							{@html item.text_snippet}
						{:else}
							{item.text}
						{/if}
					</a>
				</h2>
				<p>
					by
					<a href="/user/{item.by}">{item.by}</a>
					|
					{item.score} points |
					{item.time ? timeToReadable(item.time) : ''}
				</p>
				<span class="index">{i + 1}</span>
			</article>
		{/if}
	{/each}
{:else}
	{#each data.results as item, i (item.id)}
		{#if item}
			<ItemSummary {item} index={i} showBodyPreview={searchInBody} />
		{/if}
	{/each}
{/if}

<style>
	div {
		display: flex;
		flex-direction: row;
		gap: 1em;
		margin-bottom: 1em;
		flex-wrap: wrap;
	}
	input[type='text'] {
		padding: 1em;
		flex: 1;
		min-width: 200px;
		background-color: var(--bg);
		border: 1px solid var(--border);
		border-radius: 0.5em;
		color: var(--fg-light) !important;
	}
	select {
		padding: 1em;
		background-color: var(--bg);
		border: 1px solid var(--border);
		border-radius: 0.5em;
		color: var(--fg-light);
	}
	.checkbox {
		display: flex;
		align-items: center;
		gap: 0.5em;
		color: var(--fg-light);
		padding: 1em;
		background-color: var(--bg);
		border: 1px solid var(--border);
		border-radius: 0.5em;
		font-size: 10px;
	}
	article {
		position: relative;
		padding: 0 0 0 4em;
		margin: 0 0 1.5em 0;
	}

	h2 {
		font-size: 1em;
		font-weight: 500;
		margin: 0 0 0.5em 0;
		color: var(--fg);
	}

	h2 a {
		text-decoration: none;
	}

	:global(h2 mark) {
		background-color: var(--highlight);
		color: var(--fg);
		border-radius: 0.2em;
		padding: 0 0.1em;
	}

	p {
		font-size: 0.8em;
		color: var(--fg-light);
		margin: 0;
		font-weight: 300;
	}

	.body-preview {
		font-size: 0.85em;
		color: var(--fg);
		background-color: var(--bg-secondary);
		padding: 0.5em;
		border-radius: 0.3em;
		margin: 0 0 0.5em 0;
		line-height: 1.4;
	}

	:global(.body-preview mark) {
		background-color: var(--highlight);
		color: var(--fg);
		border-radius: 0.2em;
		padding: 0 0.1em;
	}

	.index {
		position: absolute;
		font-size: 1.6em;
		font-weight: 200;
		color: var(--fg-light);
		left: 0.2em;
		top: 0;
		text-align: right;
		width: 0.75em;
		line-height: 1;
	}

	.search-stats {
		display: flex;
		gap: 10px;
	}

	.search-stats > span {
		background-color: var(--fg-lighter);
		font-size: 10px;
		padding: 2px 4px;
		border-radius: 5px;
	}
</style>
