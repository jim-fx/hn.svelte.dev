<script lang="ts">
	import { getContext } from 'svelte';

	const context = getContext('LayerCake') as
		| {
				height: any;
				yScale: any;
				xRange: any;
		  }
		| undefined;

	let { ticks = 5, format = (d: any) => d }: { ticks?: number; format?: (d: any) => string } =
		$props();

	const height = context?.height;
	const yScale = context?.yScale;
	const xRange = context?.xRange;

	const tickVals = $derived($yScale.ticks ? $yScale.ticks(ticks) : $yScale.domain());
</script>

{#if context}
	<g class="y-axis">
    <line x1="0" x2="0" y1="0" y2={$height} stroke="var(--fg-light)"></line>
		{#each tickVals as tick}
			<g
				transform="translate({$xRange[0]}, {$yScale(tick) +
					($yScale.bandwidth ? $yScale.bandwidth() / 2 : 0)})"
			>
				<line x1="-6" x2="0" y1="0" y2="0" stroke="var(--fg-light)"></line>
				<text
					x="-10"
					text-anchor="end"
					dominant-baseline="middle"
					fill="var(--fg-light)"
					font-size="11"
				>
					{format(tick)}
				</text>
			</g>
		{/each}
	</g>
{/if}
