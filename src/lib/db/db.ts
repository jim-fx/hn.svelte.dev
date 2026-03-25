import { existsSync, mkdirSync } from 'fs';
import { DB_DIR } from '$env/static/private';
import {
	DatabaseSync,
	type StatementSync,
  type SQLInputValue,
  type SQLOutputValue,
  type StatementResultingChanges
} from 'node:sqlite';
import { join, resolve } from 'path';
import { createLogger } from '$lib/logger';
import sqlStatements from './statements';

type ExtendedDatabase = DatabaseSync & {
	execSafe: (statement: string) => void;
	prepareSafe: (statement: string) => StatementSync;
  run:<T = Record<string, SQLOutputValue>>(statement:string) =>  {
    all: {
      (inputs: Record<string,SQLInputValue>): T[];
      (...inputs: SQLInputValue[]): T[];
    },
    get: {
      (inputs:Record<string,SQLInputValue>):T;
      (...inputs:SQLInputValue[]):T;
    }
    run: {
      (inputs:Record<string,SQLInputValue>): StatementResultingChanges;
      (...inputs:SQLInputValue[]): StatementResultingChanges;
    }
  };
};

const ZSTD_PATH = resolve(DB_DIR, 'zstd_vfs.so');
const IS_COMPRESSED = existsSync(ZSTD_PATH);
const DATA_DIR = DB_DIR ?? resolve('./data');
function openDatabase(dbName: 'hn.sqlite' | 'search.sqlite'): ExtendedDatabase {
	const logger = createLogger('db:' + dbName);
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (IS_COMPRESSED) {
    const bootstrap = new DatabaseSync(':memory:', { allowExtension: true });
    bootstrap.loadExtension(ZSTD_PATH);
    bootstrap.close();
  }
  const dbPath = join(resolve(DATA_DIR), dbName);
  try {
    const db = IS_COMPRESSED
      ? new DatabaseSync(`file:${dbPath}?vfs=zstd`) as ExtendedDatabase
      : new DatabaseSync(dbPath) as ExtendedDatabase;

    const preparedStatements:Record<string, StatementSync> = {};

    db.run = <T = unknown>(sql:string) => {
      const statement = sql in preparedStatements ? preparedStatements[sql] : db.prepareSafe(sql);
      preparedStatements[sql] = statement;
      return {
        all: (...inputs:(SQLInputValue|Record<string,SQLInputValue>)[]) => {
          try {
            return statement.all(...inputs as SQLInputValue[]) as T[];
          }catch(e){
            logger.error("failed to run statement.all", {e, statement, inputs})
            throw e
          }
        },
        get: (...inputs:(SQLInputValue|Record<string,SQLInputValue>)[]) => {
          try {
            return statement.get(...inputs as SQLInputValue[]) as T
          }catch(e){
            logger.error("failed to run statement.get", {e, sql: statement.expandedSQL, inputs})
            throw e
          }
        },
        run: (...inputs:(SQLInputValue|Record<string,SQLInputValue>)[]) => statement.run(...inputs as SQLInputValue[])
      }
    }

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
			try {
				const result = db.exec(statement);
				logger.debug(`executed statement`, { dbName, statement });
				return result;
			} catch (error) {
				logger.error(`Failed to execute statement`, { statement, error });
				throw error;
			}
		};
    return db;
  }catch(e) {
    logger.error(`Failed to open database`, { dbPath, error:e, zstd: IS_COMPRESSED?ZSTD_PATH:false,});
    throw e;
  }
}

export const db = openDatabase("hn.sqlite");
if (IS_COMPRESSED) {
  db.execSafe('PRAGMA journal_mode = DELETE');
  db.execSafe('PRAGMA cache_size = -102400');
}else {
  db.execSafe('PRAGMA journal_mode = WAL');
  db.execSafe('PRAGMA synchronous  = NORMAL');
}
db.execSafe(sqlStatements.setup_hn);

db.execSafe(`
  CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
  CREATE INDEX IF NOT EXISTS idx_items_by ON items(by);
  CREATE INDEX IF NOT EXISTS idx_items_time ON items(time DESC);
  CREATE INDEX IF NOT EXISTS idx_items_parent ON items(parent);
  CREATE INDEX IF NOT EXISTS idx_items_score ON items(score DESC);
`);


const searchDb = openDatabase("search.sqlite")
if (IS_COMPRESSED) {
  searchDb.execSafe('PRAGMA journal_mode = DELETE');
  searchDb.execSafe('PRAGMA cache_size = -102400');
}else {
  searchDb.execSafe('PRAGMA journal_mode = WAL');
  searchDb.execSafe('PRAGMA synchronous  = NORMAL');
}
searchDb.execSafe(sqlStatements.setup_search);
searchDb.close();

const searchDbPath = join(resolve(DATA_DIR), "search.sqlite");
db.execSafe(`ATTACH DATABASE '${IS_COMPRESSED ? `file:${searchDbPath}?vfs=zstd`:searchDbPath}' AS search`);
db.execSafe(sqlStatements.sync_search);
db.execSafe(sqlStatements.sync_users);

