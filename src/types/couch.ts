export interface CouchResponse {
	ok: boolean;
	id: string;
	rev: string;
}

export interface CouchBulkResponse {
	ok?: boolean;
	id: string;
	rev?: string;
	error?: string;
	reason?: string;
}

export interface CouchDoc {
	_id: string;
	_rev?: string;
	[key: string]: unknown;
}

export interface CouchAllDocsResponse {
	total_rows: number;
	offset: number;
	rows: Array<{
		id: string;
		key: string;
		value: { rev: string };
		doc?: CouchDoc;
	}>;
}

export interface CouchErrorResponse {
	error: string;
	reason: string;
}
