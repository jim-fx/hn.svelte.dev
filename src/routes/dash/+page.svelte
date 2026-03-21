<script lang="ts">
	import { LayerCake, Svg } from 'layercake';
	import { scaleBand } from 'd3-scale';
	import Bar from '$lib/charts/Bar.svelte';
	import Pie from '$lib/charts/Pie.svelte';
	import Line from '$lib/charts/Line.svelte';
	import AxisX from '$lib/charts/AxisX.svelte';
	import AxisY from '$lib/charts/AxisY.svelte';
	import Box from '$lib/charts/Box.svelte';

	const { data } = $props();
	const stats = $derived(data?.stats);

	function formatNumber(n: number) {
		return n?.toLocaleString() ?? '';
	}

	function formatAge(ms: number | null) {
		if (!ms) return 'N/A';
		const hours = Math.floor((Date.now() - ms) / 3600000);
		if (hours < 1) return 'Just now';
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	}

	const pieData = $derived(
		stats?.itemsByType.map((d) => ({ label: d.type, value: d.count })) ?? []
	);

	const barData = $derived(
		stats?.scoreDistribution.map((d) => ({ x: d.bucket, y: d.count })) ?? []
	);

	const lineData = $derived(stats?.itemsByHour.map((d) => ({ x: d.hour, y: d.count })) ?? []);
</script>

<svelte:head>
	<title>Cache Dashboard</title>
</svelte:head>

<h1>Cache Dashboard</h1>

{#if stats}
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-value">{formatNumber(stats.totalItems)}</div>
			<div class="stat-label">Total Items</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{formatNumber(stats.rawCacheStats.count)}</div>
			<div class="stat-label">Cached API Responses</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{formatAge(stats.rawCacheStats.oldest)}</div>
			<div class="stat-label">Oldest Cache Entry</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{formatAge(stats.rawCacheStats.newest)}</div>
			<div class="stat-label">Newest Cache Entry</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{stats.dbSize}</div>
			<div class="stat-label">Database Size</div>
		</div>
		<div class="stat-card small">
			<div class="stat-value">{formatNumber(stats.dbMeta.pageCount)}</div>
			<div class="stat-label">Db Total Pages</div>
		</div>
	</div>

	<div class="charts-grid">
		<section class="chart-section">
			<h2>Items by Type</h2>
			<div class="chart-container pie">
				<Pie data={pieData} />
			</div>
			<div class="legend">
				{#each stats.itemsByType as item, i}
					<div class="legend-item">
						<span
							class="legend-dot"
							style="background: {[
								'#ff6b6b',
								'#4ecdc4',
								'#45b7d1',
								'#96ceb4',
								'#ffeaa7',
								'#dfe6e9',
								'#a29bfe',
								'#fd79a8'
							][i % 8]}"
						></span>
						<span class="legend-label">{item.type}</span>
						<span class="legend-value">{formatNumber(item.count)}</span>
					</div>
				{/each}
			</div>
		</section>

		<section class="chart-section">
			<h2>Score Distribution</h2>
			<div class="chart-container">
				<LayerCake
					data={barData}
					x="y"
					y="x"
					yScale={scaleBand().paddingInner(0.05)}
					padding={{ bottom: 30, left: 70 }}
				>
					<Svg>
						<Box />
						<Bar />
						<AxisX ticks={5} />
						<AxisY ticks={6} />
					</Svg>
				</LayerCake>
			</div>
		</section>

		<section class="chart-section">
			<h2>Items Cached by Hour</h2>
			<div class="chart-container">
				<LayerCake
					data={lineData}
					x="x"
					y="y"
					padding={{ top: 20, right: 20, bottom: 40, left: 50 }}
				>
					<Svg>
						<AxisY ticks={5} />
						<AxisX ticks={6} format={(d) => `${d}:00`} />
						<Line />
					</Svg>
				</LayerCake>
			</div>
		</section>

    <br>

		<section class="chart-section">
			<h2>Top Users</h2>
			<div class="user-list">
				{#each stats.topUsers as user, i}
					<div class="user-row">
						<span class="rank">{i + 1}</span>
            <a href="/user/{user.by}">
              <span class="username">{user.by}</span>
            </a>
						<span class="count">{formatNumber(user.count)}</span>
					</div>
				{/each}
			</div>
		</section>

		<section class="chart-section">
			<h2>Top Stories</h2>
			<div class="item-list">
				{#each stats.topStories as story, i}
					<div class="item-row">
						<span class="rank">{i + 1}</span>
						<a href="/item/{story.id}" class="item-title">{story.title}</a>
						<span class="score">{formatNumber(story.score)} pts</span>
					</div>
				{/each}
			</div>
		</section>

		<section class="chart-section full-width">
			<h2>Top Comments</h2>
			<div class="item-list">
				{#each stats.topComments as comment, i}
					<div class="item-row">
						<span class="rank">{i + 1}</span>
						<a href="/item/{comment.parent}#comment-{comment.id}" class="comment-text">
							{comment.text.slice(0, 120)}{comment.text.length > 120 ? '...' : ''}
						</a>
						<span class="score">{formatNumber(comment.score)} pts</span>
					</div>
				{/each}
			</div>
		</section>
	</div>
{/if}

<style>
	h1 {
		margin-bottom: 1.5rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: var(--bg);
		border: 1px solid var(--fg-light);
		border-radius: 8px;
		padding: 1.5rem;
		text-align: center;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.stat-label {
		color: var(--fg-light);
		font-size: 0.875rem;
	}

	.stat-card.small {
		padding: 1rem;
	}

	.stat-card.small .stat-value {
		font-size: 1.5rem;
	}

	.charts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 2rem;
	}

	.chart-section {
		background: var(--bg);
		border: 1px solid var(--fg-light);
		border-radius: 8px;
		padding: 1.5rem;
	}

	.chart-section h2 {
		margin-bottom: 1rem;
		font-size: 1.25rem;
	}

	.chart-section.full-width {
		grid-column: 1 / -1;
	}

	.chart-container {
		height: 250px;
		position: relative;
		width: 100%;
	}

	.chart-container.pie {
		display: flex;
		justify-content: center;
		align-items: center;
		height: auto;
	}

	.legend {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.legend-dot {
		width: 12px;
		height: 12px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.legend-value {
		color: var(--fg-light);
		margin-left: auto;
	}

	.user-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.user-row {
		display: grid;
		grid-template-columns: 2rem 1fr auto;
		gap: 1rem;
		align-items: center;
		padding: 0.5rem;
		border-radius: 4px;
	}

	.user-row:nth-child(odd) {
		background: rgba(0, 0, 0, 0.03);
	}

	:global(html.dark) .user-row:nth-child(odd) {
		background: rgba(255, 255, 255, 0.03);
	}

	.rank {
		color: var(--fg-light);
		font-weight: 600;
	}

	.username {
		font-family: monospace;
	}

	.count {
		color: var(--fg-light);
	}

	.item-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.item-row {
		display: grid;
		grid-template-columns: 2rem 1fr auto;
		gap: 0.75rem;
		align-items: start;
		padding: 0.5rem;
		border-radius: 4px;
	}

	.item-row:nth-child(odd) {
		background: rgba(0, 0, 0, 0.03);
	}

	:global(html.dark) .item-row:nth-child(odd) {
		background: rgba(255, 255, 255, 0.03);
	}

	.item-title {
		color: var(--fg);
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-title:hover {
		text-decoration: underline;
	}

	.comment-text {
		color: var(--fg);
		text-decoration: none;
		font-size: 0.875rem;
		line-height: 1.4;
	}

	.comment-text:hover {
		text-decoration: underline;
	}

  a {
    text-decoration: none;
  }

  a:hover {
		text-decoration: underline;
  }

	.score {
		color: var(--fg-light);
		font-size: 0.75rem;
		white-space: nowrap;
	}

	@media (max-width: 500px) {
		.charts-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
