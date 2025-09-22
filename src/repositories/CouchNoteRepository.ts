import { couch } from "../couch";
import type { Note, SyncRequest } from "../types/note";
import type { INoteRepository } from "./interfaces/INoteRepository";
import { DatabaseError } from "../types/errors";
import { NoteModel } from "../models/Note";
import type {
	CouchDoc,
	CouchAllDocsResponse,
	CouchBulkResponse,
	CouchResponse,
} from "../types/couch";

export class CouchNoteRepository implements INoteRepository {
	async findById(id: string): Promise<Note | null> {
		try {
			const doc = (await couch.get(`/${id}`)) as CouchDoc;
			return NoteModel.fromCouchDoc(doc).toJSON();
		} catch (error) {
			if (error instanceof DatabaseError && error.message.includes("404")) {
				return null;
			}
			throw error;
		}
	}

	async create(note: Note): Promise<Note> {
		try {
			const result = (await couch.put(`/${note._id}`, note)) as CouchResponse;
			return {
				...note,
				_rev: result.rev,
			};
		} catch (error) {
			throw new DatabaseError(`Failed to create note: ${error}`);
		}
	}

	async update(note: Note): Promise<Note> {
		try {
			const result = (await couch.put(`/${note._id}`, note)) as CouchResponse;
			return {
				...note,
				_rev: result.rev,
			};
		} catch (error) {
			throw new DatabaseError(`Failed to update note: ${error}`);
		}
	}

	async delete(id: string, rev: string): Promise<void> {
		try {
			await couch.delete(`/${id}?rev=${rev}`);
		} catch (error) {
			throw new DatabaseError(`Failed to delete note: ${error}`);
		}
	}

	async getCurrentRevision(id: string): Promise<string | null> {
		try {
			const doc = (await couch.get(`/${id}`)) as CouchDoc;
			return doc._rev || null;
		} catch (error) {
			if (error instanceof DatabaseError && error.message.includes("404")) {
				return null;
			}
			throw error;
		}
	}

	async bulkSync(notes: SyncRequest[]): Promise<CouchBulkResponse[]> {
		try {
			const bulkDocs = notes.map((note) => ({
				...note,
				_id: note._id,
				_rev: note._rev,
			}));

			const result = await couch.bulkDocs(bulkDocs);
			return result;
		} catch (error) {
			throw new DatabaseError(`Failed to bulk sync notes: ${error}`);
		}
	}

	async findByWorkspace(workspaceId: string): Promise<Note[]> {
		try {
			const result = (await couch.get(
				`/_all_docs?include_docs=true&startkey="note:"&endkey="note:\ufff0"`,
			)) as CouchAllDocsResponse;

			return result.rows
				.filter(
					(row) =>
						row.doc &&
						(row.doc as unknown as Note).workspace_id === workspaceId &&
						!(row.doc as unknown as Note).deleted,
				)
				.map((row) => NoteModel.fromCouchDoc(row.doc as CouchDoc).toJSON());
		} catch (error) {
			throw new DatabaseError(`Failed to find notes by workspace: ${error}`);
		}
	}
}
