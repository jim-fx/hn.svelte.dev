<script>
	import ItemSummary from './ItemSummary.svelte';

	const { data } = $props();
	const PAGE_SIZE = 30;
	const start = $derived(1 + (data.page - 1) * PAGE_SIZE);
	const next = $derived(`/${data.list}/${data.page + 1}`);
</script>

<svelte:head>
	<title>Svelte Hacker News</title>
	<meta name="description" content="Latest Hacker News stories in the {data.list} category" />
</svelte:head>

{@html `<script>console.log(${JSON.stringify(data.items)})</script>`}

{#each data.items as item, i}
	{#if item}
		<ItemSummary {item} index={start + i} />
	{/if}
{/each}

{#if next}
	<a class="more" href={next}>More...</a>
{/if}
