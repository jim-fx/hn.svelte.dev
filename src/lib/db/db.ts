import { openDatabase, type ExtendedDatabase } from './utils';
import migrations from './migrations/?all';
import { createLogger } from '$lib/logger';
import { formatDuration } from '$lib/format';

let db: ExtendedDatabase;
let isSetup = false;
db = openDatabase('hn.sqlite', {
	queryCallback: (data) => {
		// Dont track inserts into statistics db because this would cause infinite loops
		if (data.sql.includes('statistics.')) return;
		if (isSetup) db.run('insert_query').run(data);
	}
});
db.execSafe('setup_hn');
db.migrate(migrations);

const statisticsDb = openDatabase('statistics.sqlite');
statisticsDb.execSafe('setup_statistics');
statisticsDb.close();

db.execSafe(`ATTACH DATABASE '${statisticsDb.path}' AS statistics`);

isSetup = true;

const readonlyLogger = createLogger('db:hn.sqlite:ro' );
const readOnlyDb = openDatabase("hn.sqlite", { readonly: true, queryCallback: (s) => {
  readonlyLogger.debug('query', {
    sql: s.sql,
    duration: formatDuration(s.duration)
  });
}})

export { db, readOnlyDb };
