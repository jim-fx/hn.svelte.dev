<script lang="ts">
	import { timeToReadable } from '$lib/utils';
	const { data } = $props();
	const createdAgo = $derived(data.created ? timeToReadable(data.created) : '');
</script>

<svelte:head>
	<title>{data.name} • Svelte Hacker News</title>
</svelte:head>

<h1>{data.name}</h1>

<div>
	<p>
		...joined <strong>{createdAgo}</strong>, and has <strong>{data.karma}</strong> karma
	</p>

	<p>
		<a href="https://news.ycombinator.com/submitted?id={data.id}">submissions</a> /
		<a href="https://news.ycombinator.com/threads?id={data.id}">comments</a> /
		<a href="https://news.ycombinator.com/favorites?id={data.id}">favourites</a>
	</p>

	{#if data.about}
		<div class="about">
			{@html '<p>' + data.about}
		</div>
	{/if}
</div>
