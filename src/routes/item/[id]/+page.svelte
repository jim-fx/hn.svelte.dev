<script>
	import Comment from './Comment.svelte';
	const { data:item } = $props();
	const domain = $derived(new URL(item.url??"").hostname);
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
			{item.time}
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

	.comments > :global(.comment):first-child {
		border-top: none;
	}
</style>
