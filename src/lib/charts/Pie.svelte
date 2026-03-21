<!--
  @component
  Generates a simple SVG pie chart.
-->
<script lang="ts">
	interface DataItem {
		label: string;
		value: number;
	}

	let {
		data = [],
		colors = [
			'#ff6b6b',
			'#4ecdc4',
			'#45b7d1',
			'#96ceb4',
			'#ffeaa7',
			'#dfe6e9',
			'#a29bfe',
			'#fd79a8'
		]
	}: {
		data?: DataItem[];
		colors?: string[];
	} = $props();

	const size = 200;
	const radius = size / 2 - 10;
	const center = size / 2;

	const total = $derived(data.length > 0 ? data.reduce((acc, val) => acc + val.value, 0) : 1);

	function getArcPath(startAngle: number, endAngle: number, r: number) {
		const x1 = center + r * Math.cos(startAngle);
		const y1 = center + r * Math.sin(startAngle);
		const x2 = center + r * Math.cos(endAngle);
		const y2 = center + r * Math.sin(endAngle);
		const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
		return `M ${center} ${center} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
	}

	const slices = $derived.by(() => {
		if (!data || data.length === 0) return [];
		let currentAngle = -Math.PI / 2;
		return data.map((d: DataItem, i: number) => {
			const slice = (d.value / total) * 2 * Math.PI;
			const start = currentAngle;
			const end = currentAngle + slice;
			currentAngle = end;
			return {
				label: d.label,
				value: d.value,
				path: getArcPath(start, end, radius),
				fill: colors[i % colors.length]
			};
		});
	});
</script>

<svg width={size} height={size} viewBox="0 0 {size} {size}">
	{#each slices as slice}
		<path d={slice.path} fill={slice.fill} stroke="var(--bg)" stroke-width="2">
			<title>{slice.label}: {slice.value} ({((slice.value / total) * 100).toFixed(1)}%)</title>
		</path>
	{/each}
</svg>
