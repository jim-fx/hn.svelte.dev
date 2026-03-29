<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	const { data, xGet, yGet } = getContext<{
		data: Readable<any[]>;
		xGet: Readable<(a: number) => number>;
		yGet: Readable<(a: number) => number>;
	}>('LayerCake');

	let {
		fill = 'none',
		stroke = '#4ecdc4',
		strokeWidth = 2
	}: { fill?: string; stroke?: string; strokeWidth?: number } = $props();

  const colors = ['#ff6b6b','#4ecdc4','#45b7d1','#96ceb4','#ffeaa7','#dfe6e9','#a29bfe','#fd79a8'];

	const paths = $derived(
    Object.entries($data).map(([k,v],i) => {
      return {
        name: k,
        color: colors[i],
        path: v.map((d: any, i: number) => {
				const xVal = $xGet(d);
				const yVal = $yGet(d);
				return `${i === 0 ? 'M' : 'L'}${xVal},${yVal}`;
			})
			.join(' ')
      }
    })
	);
</script>

{#each paths as path}
<path d={path.path} {fill} stroke={path.color} stroke-width={strokeWidth}></path>
{/each}

