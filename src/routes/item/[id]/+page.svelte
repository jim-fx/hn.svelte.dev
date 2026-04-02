<script lang="ts">
	import Comment from '$lib/Comment.svelte';
	import { formatDuration } from '$lib/format';
	import { isStale, getItemStaleThreshold } from '$lib/hn/utils';
	const { data: item } = $props();

	const secondsUntilStale = $derived(() => {
		if (!item.cached_at) return null;
		const stale = isStale(item);
		if (stale) return 0;
		const threshold = getItemStaleThreshold(item);
		const msUntilStale = threshold - (Date.now() - item.cached_at.getTime());
		return Math.max(0, Math.floor(msUntilStale / 1000));
	});

	const lastRefreshedAgo = $derived(() => {
		if (!item.cached_at) return null;
		return formatDuration(Math.floor((Date.now() - item.cached_at.getTime()) / 1000), 1) + ' ago';
	});
	function parseDomain(u?: string) {
		if (!u) return '';
		try {
			return new URL(u ?? '').hostname;
		} catch {
			return '';
		}
	}
	const domain = $derived(parseDomain(item.url));
	const timeAgo = $derived(
		item.time ? formatDuration(Math.floor(Date.now() / 1000 - item.time), 1) + ' ago' : ''
	);
</script>

<svelte:head>
	<title>{item.title} | Svelte Hacker News</title>
</svelte:head>

<div>
	<article class="item">
		<a class="main-link" href={item.url}>
			<h1>{item.title}</h1>
			{#if domain}<small>{domain}</small>{/if}
		</a>

		<p class="meta">
			{item.score} points by <a href="/user/{item.by}">{item.by}</a>
			{timeAgo}
			{#if item.parent}
				| <a href="/item/{item.parent}">parent</a>
			{/if}
			{#if lastRefreshedAgo() !== null}
				| <span class="stale"
					>cached {lastRefreshedAgo()}, refreshes in {formatDuration(secondsUntilStale()!)}</span
				>
			{/if}
		</p>

		{#if item.text}
			{@html item.text}
		{/if}
	</article>

	<div class="comments">
		{#each item.comments as comment}
			<Comment {comment} />
		{/each}
	</div>
</div>

<style>
	h1 {
		font-weight: 500;
	}

	.item {
		border-bottom: 1em solid rgba(0, 0, 0, 0.1);
		margin: 0 -2em 2em -2em;
		padding: 0 2em 2em 2em;
	}

	:global(html.dark) .item {
		border-bottom: 1em solid rgba(255, 255, 255, 0.1);
	}

	.main-link {
		display: block;
		text-decoration: none;
	}

	small {
		display: block;
		font-size: 14px;
	}

	.meta {
		font-size: 0.8em;
		font-weight: 300;
		color: var(--fg-light);
	}

	.stale {
		color: var(--fg-light);
		opacity: 0.7;
	}

	.comments > :global(.comment):first-child {
		border-top: none;
	}
</style>
