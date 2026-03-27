import sqlStatements from './statements';
import { openDatabase, type ExtendedDatabase } from './utils';

let db: ExtendedDatabase;
let isSetup = false;
function queryCallback(data: { sql: string; duration: number }) {
	// Dont track inserts into statistics db because this would cause infinite loops
	if (data.sql.includes('statistics.')) return;
	console.log('STORE QUERY', { sql: data.sql });
	if (isSetup) db.run(sqlStatements.insert_query).run(data);
}
db = openDatabase('hn.sqlite', { queryCallback });

db.execSafe(sqlStatements.setup_hn);
db.execSafe(`
  CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
  CREATE INDEX IF NOT EXISTS idx_items_by ON items(by);
  CREATE INDEX IF NOT EXISTS idx_items_time ON items(time DESC);
  CREATE INDEX IF NOT EXISTS idx_items_parent ON items(parent);
  CREATE INDEX IF NOT EXISTS idx_items_score ON items(score DESC);
`);

const searchDb = openDatabase('search.sqlite', { queryCallback });
searchDb.execSafe(sqlStatements.setup_search);
searchDb.close();

const statisticsDb = openDatabase('statistics.sqlite');
statisticsDb.execSafe(sqlStatements.setup_statistics);
statisticsDb.close();

db.execSafe(`ATTACH DATABASE '${searchDb.path}' AS search`);
db.execSafe(sqlStatements.sync_search);
db.execSafe(sqlStatements.sync_users);

db.execSafe(`ATTACH DATABASE '${statisticsDb.path}' AS statistics`);

isSetup = true;

export { db };
