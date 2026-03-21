<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	const { data, xGet, yGet } = getContext<{
    data: Readable<any[]>, 
    xGet: Readable<(a:number) => number>, 
    yGet: Readable<(a:number) => number>
  }>('LayerCake');

	let {
		fill = 'none',
		stroke = '#4ecdc4',
		strokeWidth = 2
	}: { fill?: string; stroke?: string; strokeWidth?: number } = $props();

	const path = $derived(
		$data
			.map((d: any, i: number) => {
				const xVal = $xGet(d);
				const yVal = $yGet(d);
				return `${i === 0 ? 'M' : 'L'}${xVal},${yVal}`;
			})
			.join(' ')
	);
</script>

<path d={path} {fill} {stroke} stroke-width={strokeWidth}></path>
