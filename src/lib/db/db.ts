import { openDatabase, type ExtendedDatabase } from './utils';

let db: ExtendedDatabase;
let isSetup = false;
db = openDatabase('hn.sqlite', { queryCallback: (data) => {
	// Dont track inserts into statistics db because this would cause infinite loops
	if (data.sql.includes('statistics.')) return;
	if (isSetup) db.run("insert_query").run(data);
}});
db.execSafe("setup_hn");

const statisticsDb = openDatabase('statistics.sqlite');
statisticsDb.execSafe("setup_statistics");
statisticsDb.close();

db.execSafe(`ATTACH DATABASE '${statisticsDb.path}' AS statistics`);

isSetup = true;

export { db };
