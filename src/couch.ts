import axios, { type AxiosInstance, type AxiosError } from "axios";
import { env } from "./env";
import { DatabaseError } from "./types/errors";
import type {
	CouchResponse,
	CouchBulkResponse,
	CouchAllDocsResponse,
	CouchDoc,
} from "./types/couch";

class CouchDBClient {
	private client: AxiosInstance;
	private dbName: string;

	constructor() {
		this.dbName = env.COUCH_DB_NAME;
		this.client = axios.create({
			baseURL: env.COUCH_URL,
			timeout: 5000,
			headers: {
				"Content-Type": "application/json",
			},
		});

		this.setupInterceptors();
	}

	private setupInterceptors(): void {
		this.client.interceptors.response.use(
			(response) => response,
			(error: AxiosError) => {
				if (error.response) {
					throw new DatabaseError(
						`CouchDB Error: ${error.response.status} - ${error.response.data}`,
					);
				} else if (error.request) {
					throw new DatabaseError("Failed to connect to CouchDB");
				} else {
					throw new DatabaseError(`Request Error: ${error.message}`);
				}
			},
		);
	}

	async ensureDatabase(): Promise<void> {
		try {
			await this.client.head(`/${this.dbName}`);
		} catch (error) {
			if (error instanceof DatabaseError && error.message.includes("404")) {
				await this.client.put(`/${this.dbName}`);
			} else {
				throw error;
			}
		}
	}

	async get(path: string): Promise<CouchDoc | CouchAllDocsResponse> {
		const response = await this.client.get(`/${this.dbName}${path}`);
		return response.data;
	}

	async post(
		path: string,
		data: unknown,
	): Promise<CouchResponse | CouchBulkResponse[]> {
		const response = await this.client.post(`/${this.dbName}${path}`, data);
		return response.data;
	}

	async put(path: string, data: unknown): Promise<CouchResponse> {
		const response = await this.client.put(`/${this.dbName}${path}`, data);
		return response.data;
	}

	async delete(path: string): Promise<CouchResponse> {
		const response = await this.client.delete(`/${this.dbName}${path}`);
		return response.data;
	}

	async bulkDocs(docs: CouchDoc[]): Promise<CouchBulkResponse[]> {
		return this.post("/_bulk_docs", { docs }) as Promise<CouchBulkResponse[]>;
	}
}

export const couch = new CouchDBClient();
