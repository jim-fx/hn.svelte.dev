<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	const { data } = $props();

	let sql: string = $state(data.sql ?? '');

	function execute() {
		if (!sql.trim()) return;
		const u = new URL(page.url.toString());
		u.searchParams.set('sql', sql);
		goto(u.toString());
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && e.shiftKey) {
			e.preventDefault();
			execute();
		}
	}
</script>

<div class="input-row">
	<textarea
		bind:value={sql}
		onkeydown={handleKeydown}
		placeholder="SELECT * FROM items LIMIT 10"
		rows="4"
		autofocus
	></textarea>
	<button onclick={execute}>Execute (Shift+Enter)</button>
</div>

{#if data.results}
	{#if data.results.error}
		<div class="error">{data.results.error}</div>
	{:else if data.results.length === 0}
		<div class="empty">No results</div>
	{:else}
		{@const { columns, rows } = data.results}
		<div class="results-info">{rows.length} rows</div>
		<div class="table-wrapper">
			<table>
				<thead>
					<tr>
						{#each columns as col}
							<th>{col}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each rows as row}
						<tr>
							{#each columns as col}
								<td>{row[col]}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
{/if}

<style>
	.input-row {
		display: flex;
		gap: 1em;
		margin-bottom: 1em;
		align-items: flex-start;
	}
	textarea {
		flex: 1;
		padding: 1em;
		background-color: var(--bg);
		border: 1px solid var(--border);
		border-radius: 0.5em;
		color: var(--fg-light);
		font-family: monospace;
		resize: vertical;
	}
	button {
		padding: 1em;
		background-color: var(--bg);
		border: 1px solid var(--border);
		border-radius: 0.5em;
		color: var(--fg-light);
		cursor: pointer;
		white-space: nowrap;
	}
	button:hover {
		background-color: var(--bg-secondary);
	}
	.error {
		color: #ff6b6b;
		padding: 1em;
		background-color: rgba(255, 107, 107, 0.1);
		border-radius: 0.5em;
		font-family: monospace;
		white-space: pre-wrap;
	}
	.empty {
		color: var(--fg-light);
		padding: 1em;
	}
	.results-info {
		color: var(--fg-light);
		font-size: 0.8em;
		margin-bottom: 0.5em;
	}
	.table-wrapper {
		overflow-x: auto;
		width: calc(100vw - 40px);
		margin-left: calc(50% - 50vw + 20px);
		border-radius: 0.5em;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85em;
    margin-inline: 1em;
		border-radius: 0.5em;
		overflow: hidden;
	}
	th,
	td {
		padding: 0.5em;
		text-align: left;
		border-bottom: 1px solid var(--fg-lighter);
	}
	th {
		background-color: var(--bg-secondary);
		color: var(--fg-light);
		font-weight: 500;
		position: sticky;
		top: 0;
	}
	td {
		font-family: monospace;
		color: var(--fg);
		max-width: 300px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	tr:hover {
		background-color: var(--bg-secondary);
	}
</style>
