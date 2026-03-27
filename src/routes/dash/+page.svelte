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

	$inspect({ barData });

	const barYScale = $derived(() =>
		scaleBand()
			.domain(['0', '1', '2-9', '10-49', '50-99', '100-499', '500-999', '1000+'])
			.paddingInner(0.05)
	);

	const lineData = $derived(stats?.itemsByHour.map((d) => ({ x: d.hour, y: d.count })) ?? []);
</script>

<svelte:head>
	<title>Cache Dashboard</title>
</svelte:head>

<h1>Cache Dashboard</h1>

{#if stats}
	<section class="db-section">
		<h2>Main Database (hn.sqlite)</h2>
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-value">{formatNumber(stats.totalItems)}</div>
				<div class="stat-label">Total Items</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{formatNumber(stats.totalUsers)}</div>
				<div class="stat-label">Total Users</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{stats.dbSize}</div>
				<div class="stat-label">Database Size</div>
			</div>
			<div class="stat-card small">
				<div class="stat-value">{formatNumber(stats.dbMeta.pageCount)}</div>
				<div class="stat-label">Total Pages</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{formatNumber(stats.rawCacheStats.count)}</div>
				<div class="stat-label">Cached API Responses</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{formatAge(stats.rawCacheStats.oldest)}</div>
				<div class="stat-label">Oldest Cache</div>
			</div>
		</div>
	</section>

	<div class="charts-grid">
		<section class="chart-section">
			<h2>Items by Type</h2>
			<div class="chart-container pie">
				<Pie data={pieData} />
			</div>
			<div class="legend">
				{#each stats.itemsByType as item, i (i)}
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
			<h2>Score Distribution (Stories)</h2>
			<div class="chart-container">
				<LayerCake
					data={barData}
					x="y"
					y="x"
					yScale={barYScale()}
					padding={{ bottom: 30, left: 70 }}
				>
					<Svg>
						<Box />
						<Bar />
						<AxisX ticks={5} />
						<AxisY ticks={8} />
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

		<section class="chart-section">
			<h2>Top Users</h2>
			<div class="user-list">
				{#each stats.topUsers as user, i (user.id)}
					<div class="user-row">
						<span class="rank">{i + 1}</span>
						<a href="/user/{user.id}">
							<span class="username">{user.id}</span>
						</a>
						<span class="count">{formatNumber(user.karma)}</span>
					</div>
				{/each}
			</div>
		</section>

		<section class="chart-section full-width">
			<h2>Top Stories</h2>
			<div class="item-list">
				{#each stats.topStories as story, i (story.id)}
					<div class="item-row">
						<span class="rank">{i + 1}</span>
						<a href="/item/{story.id}" class="item-title">{story.title}</a>
						<span class="score">{formatNumber(story.score)} pts</span>
					</div>
				{/each}
			</div>
		</section>

		<section class="db-section">
			<h2>Search Database (search.sqlite)</h2>
			<div class="stats-grid" style="margin-bottom: 0px">
				<div class="stat-card">
					<div class="stat-value">{stats.searchDbSize}</div>
					<div class="stat-label">Search DB Size</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{formatNumber(stats.indexedItemsCount)}</div>
					<div class="stat-label">Indexed Items</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{formatNumber(stats.indexedUsersCount)}</div>
					<div class="stat-label">Indexed Users</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{stats.searchDbMeta.pageCount}</div>
					<div class="stat-label">Total Pages</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{stats.syncStatus.totalIndexed}</div>
					<div class="stat-label">Total Indexed</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{stats.fts5Info.itemsTokenizer}</div>
					<div class="stat-label">Items Tokenizer</div>
				</div>
			</div>
		</section>

		<section class="chart-section full-width">
			<h2>Most Common Tokens (Top 20)</h2>
			{#if stats.commonTokens.length > 0}
				<div class="token-list">
					{#each stats.commonTokens as token, i (token)}
						<div class="token-row">
							<span class="rank">{i + 1}</span>
							<span class="token">{token.term}</span>
							<span class="count">{formatNumber(token.count)}</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty-message">No tokens data available</p>
			{/if}
		</section>

		<section class="db-section">
			<h2>Statistics Database (statistics.sqlite)</h2>
			<div class="stats-grid" style="margin-bottom: 0px">
				<div class="stat-card">
					<div class="stat-value">{stats.statisticsDbSize}</div>
					<div class="stat-label">Statistics DB Size</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{formatNumber(stats.requestStats.totalRequests)}</div>
					<div class="stat-label">Total Requests</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{stats.requestStats.minDuration}ms</div>
					<div class="stat-label">Min Duration</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{stats.requestStats.avgDuration.toFixed(0)}ms</div>
					<div class="stat-label">Avg Duration</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{stats.requestStats.p95Duration}ms</div>
					<div class="stat-label">P95 Duration</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{stats.requestStats.maxDuration}ms</div>
					<div class="stat-label">Max Duration</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{formatNumber(stats.queryStats.totalQueries)}</div>
					<div class="stat-label">Total Queries</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{stats.queryStats.avgDuration.toFixed(1)}ms</div>
					<div class="stat-label">Avg Query Duration</div>
				</div>
			</div>
		</section>

		<section class="chart-section">
			<h2>Requests by Status</h2>
			{#if stats.requestStats.requestsByStatus.length > 0}
				<div class="status-list">
					{#each stats.requestStats.requestsByStatus as item}
						<div class="status-row">
							<span
								class="status-code"
								class:success={item.status >= 200 && item.status < 300}
								class:redirect={item.status >= 300 && item.status < 400}
								class:error={item.status >= 400}>{item.status}</span
							>
							<span class="count">{formatNumber(item.count)}</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty-message">No request data available</p>
			{/if}
		</section>

		<section class="chart-section">
			<h2>Top Requested URLs</h2>
			{#if stats.requestStats.requestsByUrl.length > 0}
				<div class="url-list">
					{#each stats.requestStats.requestsByUrl as item}
						<div class="url-row">
							<span class="url">{item.url.replace(/^https?:\/\/[^/]+/, '')}</span>
							<span class="count">{formatNumber(item.count)}</span>
							<span class="duration">{item.avgDuration.toFixed(0)}ms avg</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty-message">No request data available</p>
			{/if}
		</section>

		<section class="chart-section full-width">
			<h2>Top Queries</h2>
			{#if stats.queryStats.topQueries.length > 0}
				<div class="query-list">
					{#each stats.queryStats.topQueries as query}
						<div class="query-row">
							<span class="count">{formatNumber(query.count)}</span>
							<span class="sql">{query.sql}</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty-message">No query data available</p>
			{/if}
		</section>

		<section class="chart-section full-width">
			<h2>Slowest Queries</h2>
			{#if stats.queryStats.slowQueries.length > 0}
				<div class="query-list">
					{#each stats.queryStats.slowQueries as query}
						<div class="query-row">
							<span class="duration">{Math.floor(query.duration * 10) / 10}ms</span>
							<span class="sql">{query.sql}</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty-message">No query data available</p>
			{/if}
		</section>
	</div>
{/if}

<style>
	h1 {
		margin-bottom: 1.5rem;
	}

	h2 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
	}

	.db-section {
		grid-column: 1 / -1;
	}

	.db-section h2 {
		margin-top: 1.5rem;
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

	.token-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.5rem;
	}

	.token-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.03);
	}

	:global(html.dark) .token-row {
		background: rgba(255, 255, 255, 0.03);
	}

	.token-row .rank {
		color: var(--fg-light);
		font-size: 0.75rem;
		width: 1.5rem;
	}

	.token-row .token {
		flex: 1;
		font-family: monospace;
		font-size: 0.75rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.token-row .count {
		color: var(--fg-light);
		font-size: 0.75rem;
	}

	.empty-message {
		color: var(--fg-light);
		font-style: italic;
		padding: 1rem;
		text-align: center;
	}

	.status-list,
	.url-list,
	.query-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.status-row,
	.url-row,
	.query-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.03);
	}

	:global(html.dark) .status-row,
	:global(html.dark) .url-row,
	:global(html.dark) .query-row {
		background: rgba(255, 255, 255, 0.03);
	}

	.status-code {
		font-family: monospace;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		background: var(--fg-light);
		color: var(--bg);
		font-size: 0.75rem;
	}

	.status-code.success {
		background: #22c55e;
		color: white;
	}
	.status-code.redirect {
		background: #eab308;
		color: white;
	}
	.status-code.error {
		background: #ef4444;
		color: white;
	}

	.url,
	.sql {
		flex: 1;
		font-family: monospace;
		font-size: 0.75rem;
		word-break: break-all;
	}

	.duration {
		font-family: monospace;
		font-size: 0.75rem;
		color: var(--fg-light);
		white-space: nowrap;
	}

	@media (max-width: 500px) {
		.charts-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
