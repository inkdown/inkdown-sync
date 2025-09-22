import type { Note, SyncRequest } from "../../types/note";
import type { CouchBulkResponse } from "../../types/couch";

export interface INoteRepository {
	findById(id: string): Promise<Note | null>;
	create(note: Note): Promise<Note>;
	update(note: Note): Promise<Note>;
	delete(id: string, rev: string): Promise<void>;
	bulkSync(notes: SyncRequest[]): Promise<CouchBulkResponse[]>;
	findByWorkspace(workspaceId: string): Promise<Note[]>;
	getCurrentRevision(id: string): Promise<string | null>;
}
