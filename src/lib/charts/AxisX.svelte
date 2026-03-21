<!--
  @component
  Generates an SVG x-axis
-->
<script lang="ts">
	import { getContext } from 'svelte';

	const context = getContext('LayerCake') as
		| {
				width: any;
				height: any;
				xScale: any;
				yRange: any;
		  }
		| undefined;

	let { ticks = 5, format = (d: any) => d }: { ticks?: number; format?: (d: any) => string } =
		$props();

	const width = context?.width;
	const xScale = context?.xScale;
	const yRange = context?.yRange;

	const tickVals = $derived($xScale.ticks ? $xScale.ticks(ticks) : $xScale.domain());
	const bottomY = $derived(Math.max(...$yRange));
</script>

{#if context}
	<g class="x-axis">
		{#each tickVals as tick}
			<g transform="translate({$xScale(tick)}, {bottomY})">
				<line x1="0" x2="0" y1="0" y2="6" stroke="var(--fg-light)"></line>
				<text y="20" text-anchor="middle" fill="var(--fg-light)" font-size="11">
					{format(tick)}
				</text>
			</g>
		{/each}
		<line x1="0" x2={$width+1} y1={bottomY} y2={bottomY} stroke="var(--fg-light)"></line>
	</g>
{/if}
