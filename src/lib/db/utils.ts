import {
	DatabaseSync,
	type StatementSync,
	type SQLInputValue,
	type SQLOutputValue,
	type StatementResultingChanges
} from 'node:sqlite';
import { join, resolve } from 'path';
import { createLogger } from '$lib/logger';
import { DATA_DIR, IS_COMPRESSED, ZSTD_PATH } from './constants';

type RunOptions<T> = {
	deserialize?: (input: Record<string, SQLInputValue>) => T;
};

export type ExtendedDatabase = DatabaseSync & {
	path: string;
	execSafe: (statement: string) => void;
	prepareSafe: (statement: string) => StatementSync;
	run: <T = Record<string, SQLOutputValue>>(
		statement: string,
		options?: RunOptions<T>
	) => {
		all: {
			(inputs: Record<string, SQLInputValue>): T[];
			(...inputs: SQLInputValue[]): T[];
		};
		get: {
			(inputs: Record<string, SQLInputValue>): T;
			(...inputs: SQLInputValue[]): T;
		};
		run: {
			(inputs: Record<string, SQLInputValue>): StatementResultingChanges;
			(...inputs: SQLInputValue[]): StatementResultingChanges;
		};
	};
};

type DatabaseOptions = {
	queryCallback?: (queryStats: { sql: string; duration: number }) => void;
};

export function openDatabase(
	dbName: 'hn.sqlite' | 'search.sqlite' | 'statistics.sqlite',
	dbOpts?: DatabaseOptions
): ExtendedDatabase {
	const logger = createLogger('db:' + dbName);
	if (IS_COMPRESSED) {
		const bootstrap = new DatabaseSync(':memory:', { allowExtension: true });
		bootstrap.loadExtension(ZSTD_PATH);
		bootstrap.close();
	}
	let dbPath = join(resolve(DATA_DIR), dbName);
	if (IS_COMPRESSED) {
		dbPath = `file:${dbPath}?vfs=zstd`;
	}
	try {
		const db = new DatabaseSync(dbPath) as ExtendedDatabase;
		db.path = dbPath;

		const preparedStatements: Record<string, StatementSync> = {};

		db.run = <T = unknown>(sql: string, opts?: RunOptions<T>) => {
			const statement = sql in preparedStatements ? preparedStatements[sql] : db.prepareSafe(sql);
			preparedStatements[sql] = statement;
			return {
				all: (...inputs: (SQLInputValue | Record<string, SQLInputValue>)[]) => {
					let start = performance.now();
					try {
						return statement
							.all(...(inputs as SQLInputValue[]))
							.map((r) => opts?.deserialize?.(r) ?? r) as T[];
					} catch (e) {
						logger.error('failed to run statement.all', { e, statement, inputs });
						throw e;
					} finally {
            logger.debug("run statement", {sql: statement.expandedSQL, inputs})
						const duration = performance.now() - start;
						dbOpts?.queryCallback?.({ sql: statement.sourceSQL, duration });
					}
				},
				get: (...inputs: (SQLInputValue | Record<string, SQLInputValue>)[]) => {
					const start = performance.now();
					try {
						const row = statement.get(...(inputs as SQLInputValue[]));
						return (row ? (opts?.deserialize?.(row) ?? row) : undefined) as T;
					} catch (e) {
						logger.error('failed to run statement.get', { e, sql: statement.expandedSQL, inputs });
						throw e;
					} finally {
						dbOpts?.queryCallback?.({
							sql: statement.sourceSQL,
							duration: performance.now() - start
						});
					}
				},
				run: (...inputs: (SQLInputValue | Record<string, SQLInputValue>)[]) => {
					const start = performance.now();
					try {
						return statement.run(...(inputs as SQLInputValue[]));
					} catch (e) {
						logger.error('failed to run statement.get', { e, sql: statement.expandedSQL, inputs });
						throw e;
					} finally {
						dbOpts?.queryCallback?.({
							sql: statement.sourceSQL,
							duration: performance.now() - start
						});
					}
				}
			};
		};

		db.prepareSafe = (statement: string) => {
			try {
				const prepared = db.prepare(statement);
				logger.debug(`prepared statement`, { dbName, statement });
				return prepared;
			} catch (error) {
				logger.error(`Failed to prepare statement`, { statement, error });
				throw error;
			}
		};

		db.execSafe = function (statement: string) {
			const start = performance.now();
			try {
				const result = db.exec(statement);
				logger.debug(`executed statement`, { dbName, statement });
				return result;
			} catch (error) {
				logger.error(`Failed to execute statement`, { statement, error });
				throw error;
			} finally {
				dbOpts?.queryCallback?.({ sql: statement, duration: performance.now() - start });
			}
		};

		if (IS_COMPRESSED) {
			db.execSafe('PRAGMA journal_mode = DELETE');
			db.execSafe('PRAGMA cache_size = -102400');
		} else {
			db.execSafe('PRAGMA journal_mode = WAL');
			db.execSafe('PRAGMA synchronous  = NORMAL');
		}

		return db;
	} catch (e) {
		logger.error(`Failed to open database`, {
			dbPath,
			error: e,
			zstd: IS_COMPRESSED ? ZSTD_PATH : false
		});
		throw e;
	}
}
