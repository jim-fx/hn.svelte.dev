import { db } from './db';
import sqlStatements from './statements';

type DbRequest = {
	url: string;
	duration: number;
	status: number;
	responseSize: number;
};

export function storeRequest(request: DbRequest) {
	return db.run(sqlStatements.insert_request).run(request);
}

type DbQuery = {
	sql: string;
	duration: number;
};

export function storeQuery(query: DbQuery) {
	return db.run(sqlStatements.insert_query).run(query);
}
