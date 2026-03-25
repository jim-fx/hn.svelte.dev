<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ItemSummary from '../[list=category]/[page]/ItemSummary.svelte';

  const { data } = $props();

  let query: string = $state("");;

  $inspect({data});

  $effect(() => {
    if(!query || page.url.searchParams.get('q') === query) return;
    console.log({ query, q: page.url.searchParams.get('q') });
    const u = new URL(page.url.toString());
    u.searchParams.set('q', query);
    goto(u.toString());
  })

</script>

<div>
  <input type="text" bind:value={query} placeholder="Search" autofocus>
  <button>
    Search
  </button>
</div>

{#each data.items as item, i}
	{#if item}
		<ItemSummary {item} index={ i} />
	{/if}
{/each}

<style>
  div {
    display: flex;
    flex-direction: row;
    gap: 1em;
    margin-bottom: 1em;
  }
  input {
    padding: 1em;
    flex: 1;
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: 0.5em;
    color: var(--fg-light) !important;
  }
  button {
    padding-inline: 1em;
    background-color: var(--border);
    color: var(--bg);
    border: none;
    border-radius: 0.5em;
  }
</style>
