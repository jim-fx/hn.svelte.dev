<script lang="ts">
	import type { Item } from '$lib/hn';
	import { timeToReadable } from '$lib/utils';

	const {
		item,
		index,
		showBodyPreview = false
	} = $props<{ item: Item; index: number; showBodyPreview?: boolean }>();
	const domain = $derived(item.url ? new URL(item.url)?.hostname : '');
	const timeAgo = $derived(item.time ? timeToReadable(item.time) : '');
</script>

<article>
	<h2>
		<a href={item.domain ? item.url : `/item/${item.id}`}>
			{#if item.matchedTitle}
				{@html item.matchedTitle}
			{:else}
				{item.title}
			{/if}
			{#if domain}<small>({domain})</small>{/if}
		</a>
	</h2>

	{#if showBodyPreview && item.matchedBody}
		<p class="body-preview">
			{@html item.matchedBody}
		</p>
	{/if}

	{#if item.type === 'job'}
		<p>{timeAgo}</p>
	{:else}
		<p>
			{item.score} points by
			<a href="/user/{item.user}">{item.by}</a>
			{timeAgo}
			|
			<a href="/item/{item.id}">
				{item.comments?.length}
				{item.comments?.length === 1 ? 'comment' : 'comments'}
			</a>
		</p>
	{/if}

	<span class="index">{index}</span>
</article>

<style>
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

	small {
		color: var(--fg-light);
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
</style>
