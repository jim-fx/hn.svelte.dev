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
import sqlStatements from './statements';
import { pathToFileURL } from 'url';

type RunOptions<T> = {
	deserialize?: (input: Record<string, SQLInputValue>) => T;
};

type StatementId = keyof typeof sqlStatements;

function limitObjectStrings<T = unknown>(v: T): T {
	if (v && typeof v === 'object') {
		return Object.fromEntries(
			Object.entries(v as any).map(([k, v]: [string, unknown]) => [k, limitObjectStrings(v)])
		) as T;
	}

	if (typeof v === 'string' && v.length > 50) {
		return (v.slice(0, 47) + '...') as T;
	}

	return v;
}

function safeParse(maybeNumber: string, fallback = 0) {
	try {
		return parseInt(maybeNumber);
	} catch (e) {
		return fallback;
	}
}

export type ExtendedDatabase = DatabaseSync & {
	path: string;
	execSafe: (statement: StatementId | string) => void;
	prepareSafe: (statement: string) => StatementSync;
	migrate: (migrations: Record<string, string>) => void;
	run: <T = Record<string, SQLOutputValue>>(
		statement: StatementId | string,
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
	readonly?: boolean;
	queryCallback?: (queryStats: { sql: string; duration: number }) => void;
};

export function openDatabase(
	dbName: 'hn.sqlite' | 'statistics.sqlite',
	dbOpts?: DatabaseOptions
): ExtendedDatabase {
	const logger = createLogger('db:' + dbName);
	if (IS_COMPRESSED) {
		const bootstrap = new DatabaseSync(':memory:', { allowExtension: true });
		bootstrap.loadExtension(ZSTD_PATH);
		bootstrap.close();
	}
	let dbPath = pathToFileURL(join(resolve(DATA_DIR), dbName));
	if (IS_COMPRESSED) dbPath.searchParams.set('vfs', 'zstd');
	if (dbOpts?.readonly) dbPath.searchParams.set('mode', 'ro');
	logger.info('opening database', { IS_COMPRESSED, ZSTD_PATH, dbOpts, dbPath });

	try {
		const db = new DatabaseSync(dbPath) as ExtendedDatabase;
		db.path = dbPath.pathname;

		const preparedStatements: Record<string, StatementSync> = {};
		function getStatement(sqlOrId: string) {
			const sql = sqlOrId in sqlStatements ? sqlStatements[sqlOrId as StatementId] : sqlOrId;

			if (sql in preparedStatements) {
				return preparedStatements[sql];
			}

			const statement = db.prepareSafe(sql);
			preparedStatements[sql] = statement;

			return statement;
		}

		db.run = <T = unknown>(statementId: StatementId | string, opts?: RunOptions<T>) => {
			const statement = getStatement(statementId);
			return {
				all: (...inputs: (SQLInputValue | Record<string, SQLInputValue>)[]) => {
					const start = performance.now();
					try {
						return statement
							.all(...(inputs as SQLInputValue[]))
							.map((r) => opts?.deserialize?.(r) ?? r) as T[];
					} catch (e) {
						logger.error('failed to run statement.all', {
							e,
							dbName,
							sql: statement.expandedSQL,
							inputs: limitObjectStrings(inputs)
						});
						throw e;
					} finally {
						logger.debug('run statement', {
							statementId,
							dbName,
							sql: statement.expandedSQL,
							inputs: limitObjectStrings(inputs)
						});
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
						logger.error('failed to run statement.get', {
							e,
							dbName,
							sql: statement.expandedSQL,
							inputs: limitObjectStrings(inputs)
						});
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
						logger.error('failed to run statement.run', {
							e,
							dbName,
							sql: statement.expandedSQL,
							inputs: limitObjectStrings(inputs)
						});
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
				return db.prepare(statement);
			} catch (error) {
				logger.error(`Failed to prepare statement`, { dbName, statement, error });
				throw error;
			}
		};

		db.migrate = (migrations: Record<string, string>) => {
			db.execSafe('setup_migration_table');
			const existingMigrations = db.run('SELECT * FROM migrations').all();
			const existingKeys = new Set(existingMigrations.map((m: any) => m.name));
			const keys = Object.keys(migrations).sort((a: string, b: string) => {
				const an = safeParse(a.split('-')[0], 0);
				const bn = safeParse(b.split('-')[0], 0);
				return an - bn;
			});
			for (const key of keys) {
				if (existingKeys.has(key)) continue;
				const migrationSql = migrations[key];
				try {
					db.execSafe(migrationSql);
					db.run('insert_migration').run({
						name: key,
						sql: migrationSql,
						run_at: Date.now()
					});
				} catch (e) {
					logger.error('failed to run migration', { dbName, key, error: e });
					throw e;
				}
			}
		};

		db.execSafe = function (statement: StatementId | string) {
			if (!statement) throw new Error(`cant execute '${statement}' you dummy :)`);
			const sql = statement in sqlStatements ? sqlStatements[statement as StatementId] : statement;
			const start = performance.now();
			try {
				const result = db.exec(sql);
				logger.debug(`executed statement`, { dbName, statement });
				return result;
			} catch (error) {
				logger.error(`Failed to execute statement`, { dbName, statement, sql, error });
				throw error;
			} finally {
				dbOpts?.queryCallback?.({ sql: statement, duration: performance.now() - start });
			}
		};

    if(dbOpts?.readonly !== true) {
      if (IS_COMPRESSED) {
        db.execSafe(`
          PRAGMA journal_mode = DELETE;
          PRAGMA cache_size = -102400;
          PRAGMA temp_store = MEMORY;
        `);
      } else {
        db.execSafe(`
          PRAGMA journal_mode = WAL;
          PRAGMA synchronous = NORMAL;
          PRAGMA temp_store = MEMORY;
          PRAGMA mmap_size = 268435456;
          PRAGMA auto_vacuum = INCREMENTAL;
        `);
      }
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
