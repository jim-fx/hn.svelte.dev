import { readOnlyDb } from '$lib/db/db';

const MAX_ROWS = 1000;
const TIMEOUT_MS = 5000;

export async function load({ url }: { url: URL }) {
	const sql = url.searchParams.get('sql') ?? '';
	const results = sql ? await executeQuery(sql) : [];
	return {
		sql,
		results
	};
}

async function executeQuery(sql: string) {
	try {
		const stmt = readOnlyDb.prepareSafe(sql);
		const rows: Record<string, unknown>[] = [];
		let columns: string[] = [];

		const start = Date.now();

		for (const row of stmt.iterate()) {
			if (Date.now() - start > TIMEOUT_MS) {
				return { error: `Query timed out after ${TIMEOUT_MS}ms` };
			}
			if (rows.length >= MAX_ROWS) {
				return {
					error: `Row limit of ${MAX_ROWS} reached. Add a LIMIT clause for more specific results.`,
					columns,
					rows
				};
			}
			if (rows.length === 0) {
				columns = Object.keys(row);
			}
			rows.push(row);
		}

		if (rows.length === 0) return [];
		return { columns, rows };
	} catch (e) {
		return { error: (e as Error).message };
	}
}
