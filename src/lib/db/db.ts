import sqlStatements from './statements';
import { openDatabase, type ExtendedDatabase } from './utils';

let db: ExtendedDatabase;
let isSetup = false;
db = openDatabase('hn.sqlite', { queryCallback: (data) => {
	// Dont track inserts into statistics db because this would cause infinite loops
	if (data.sql.includes('statistics.')) return;
	if (isSetup) db.run(sqlStatements.insert_query).run(data);
}});
db.execSafe(sqlStatements.setup_hn);

const searchDb = openDatabase('search.sqlite');
searchDb.execSafe(sqlStatements.setup_search);
searchDb.close();

const statisticsDb = openDatabase('statistics.sqlite');
statisticsDb.execSafe(sqlStatements.setup_statistics);
statisticsDb.close();

db.execSafe(`ATTACH DATABASE '${searchDb.path}' AS search`);

db.execSafe(`ATTACH DATABASE '${statisticsDb.path}' AS statistics`);

isSetup = true;

export { db };
