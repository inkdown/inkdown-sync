import type { Note } from "../types/note";
import type { CouchDoc } from "../types/couch";

export class NoteModel implements Note {
	_id: string;
	_rev?: string;
	title: string;
	content: string;
	key: string;
	updated_at: string;
	created_at: string;
	workspace_id: string;
	deleted?: boolean;

	constructor(
		data: Omit<Note, "_id" | "created_at" | "updated_at"> & { _id?: string },
	) {
		this._id =
			data._id ||
			`note:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		this._rev = data._rev;
		this.title = data.title;
		this.content = data.content;
		this.key = data.key;
		this.workspace_id = data.workspace_id;
		this.deleted = data.deleted !== undefined ? data.deleted : false;

		const now = new Date().toISOString();
		this.created_at = now;
		this.updated_at = now;
	}

	updateContent(content: string): void {
		this.content = content;
		this.updated_at = new Date().toISOString();
	}

	updateTitle(title: string): void {
		this.title = title;
		this.updated_at = new Date().toISOString();
	}

	updateKey(key: string): void {
		this.key = key;
		this.updated_at = new Date().toISOString();
	}

	markAsDeleted(): void {
		this.deleted = true;
		this.updated_at = new Date().toISOString();
	}

	isNewer(otherNote: Note): boolean {
		return new Date(this.updated_at) > new Date(otherNote.updated_at);
	}

	toJSON(): Note {
		return {
			_id: this._id,
			_rev: this._rev,
			title: this.title,
			content: this.content,
			key: this.key,
			updated_at: this.updated_at,
			created_at: this.created_at,
			workspace_id: this.workspace_id,
			deleted: this.deleted,
		};
	}

	static fromCouchDoc(doc: CouchDoc): NoteModel {
		const noteDoc = doc as unknown as Note;
		const note = new NoteModel({
			_id: noteDoc._id,
			_rev: noteDoc._rev,
			title: noteDoc.title,
			content: noteDoc.content,
			key: noteDoc.key,
			workspace_id: noteDoc.workspace_id,
			deleted: noteDoc.deleted,
		});

		note.created_at = noteDoc.created_at;
		note.updated_at = noteDoc.updated_at;

		return note;
	}
}
