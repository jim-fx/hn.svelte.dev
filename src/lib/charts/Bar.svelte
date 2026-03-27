<script lang="ts">
	import { getContext } from 'svelte';

	const { data, xGet, yGet, xScale, yScale } = getContext('LayerCake');

	let { fill = '#4ecdc4' }: { fill?: string } = $props();
</script>

<g class="bar-group">
	{#each $data as d}
		<rect class="group-rect" x="0" y={$yGet(d)} height={$yScale.bandwidth()} width={$xGet(d)} {fill}
		></rect>
	{/each}
</g>
