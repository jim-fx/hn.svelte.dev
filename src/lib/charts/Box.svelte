<script lang="ts">
	import { getContext } from 'svelte';

	const context = getContext('LayerCake') as
		| {
				width: any;
				height: any;
				xRange: any;
				yRange: any;
		  }
		| undefined;

	const xRange = context?.xRange;
	const yRange = context?.yRange;
</script>

{#if context}
	<g class="box">
		<line x1={$xRange[0]} x2={$xRange[1]} y1={$yRange[1]} y2={$yRange[1]} stroke="var(--fg-light)"
		></line>
		<line x1={$xRange[0]} x2={$xRange[0]} y1={$yRange[0]} y2={$yRange[1]} stroke="var(--fg-light)"
		></line>
	</g>
{/if}
