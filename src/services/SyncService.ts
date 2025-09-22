import type { INoteRepository } from "../repositories/interfaces/INoteRepository";
import type {
	SyncRequest,
	SyncResult,
	SyncResponse,
	Note,
} from "../types/note";
import { NoteModel } from "../models/Note";
import { ValidationError, NotFoundError } from "../types/errors";

export class SyncService {
	constructor(private noteRepository: INoteRepository) {}

	async syncNotes(syncRequests: SyncRequest[]): Promise<SyncResponse> {
		const results: SyncResult[] = [];

		for (const syncRequest of syncRequests) {
			try {
				const result = await this.processSingleNote(syncRequest);
				results.push(result);
			} catch (error) {
				results.push({
					_id: syncRequest._id,
					ok: false,
					error:
						error instanceof Error ? error.message : "Unknown error occurred",
				});
			}
		}

		return { results };
	}

	private async processSingleNote(
		syncRequest: SyncRequest,
	): Promise<SyncResult> {
		const { _id, _rev, updated_at } = syncRequest;

		if (!_id || !updated_at) {
			throw new ValidationError("Note ID and updated_at are required");
		}

		const existingNote = await this.noteRepository.findById(_id);

		if (!existingNote) {
			return await this.createNewNote(syncRequest);
		}

		return await this.handleExistingNote(syncRequest, existingNote);
	}

	private async createNewNote(syncRequest: SyncRequest): Promise<SyncResult> {
		if (
			!syncRequest.title ||
			!syncRequest.content ||
			!syncRequest.key ||
			!syncRequest.workspace_id
		) {
			throw new ValidationError(
				"Title, content, key, and workspace_id are required for new notes",
			);
		}

		const newNote = new NoteModel({
			_id: syncRequest._id,
			title: syncRequest.title,
			content: syncRequest.content,
			key: syncRequest.key,
			workspace_id: syncRequest.workspace_id,
			deleted: syncRequest.deleted || false,
		});

		newNote.updated_at = syncRequest.updated_at;

		const savedNote = await this.noteRepository.create(newNote.toJSON());

		return {
			_id: savedNote._id,
			ok: true,
			_rev: savedNote._rev,
			conflict: false,
		};
	}

	private async handleExistingNote(
		syncRequest: SyncRequest,
		existingNote: Note,
	): Promise<SyncResult> {
		const clientUpdatedAt = new Date(syncRequest.updated_at);
		const serverUpdatedAt = new Date(existingNote.updated_at);

		if (syncRequest._rev && syncRequest._rev === existingNote._rev) {
			return await this.updateNoteFromSync(syncRequest, existingNote);
		}

		if (clientUpdatedAt > serverUpdatedAt) {
			return await this.updateNoteFromSync(syncRequest, existingNote);
		}

		if (serverUpdatedAt > clientUpdatedAt) {
			return {
				_id: syncRequest._id,
				ok: false,
				conflict: true,
				server_doc: {
					_rev: existingNote._rev,
					title: existingNote.title,
					content: existingNote.content,
					key: existingNote.key,
					updated_at: existingNote.updated_at,
					workspace_id: existingNote.workspace_id,
					deleted: existingNote.deleted,
				},
			};
		}

		return await this.updateNoteFromSync(syncRequest, existingNote);
	}

	private async updateNoteFromSync(
		syncRequest: SyncRequest,
		existingNote: Note,
	): Promise<SyncResult> {
		const updatedNote: Note = {
			...existingNote,
			_rev: existingNote._rev,
		};

		if (syncRequest.title !== undefined) {
			updatedNote.title = syncRequest.title;
		}

		if (syncRequest.content !== undefined) {
			updatedNote.content = syncRequest.content;
		}

		if (syncRequest.key !== undefined) {
			updatedNote.key = syncRequest.key;
		}

		if (syncRequest.deleted !== undefined) {
			updatedNote.deleted = syncRequest.deleted;
		}

		if (syncRequest.workspace_id !== undefined) {
			updatedNote.workspace_id = syncRequest.workspace_id;
		}

		updatedNote.updated_at = syncRequest.updated_at;

		try {
			const savedNote = await this.noteRepository.update(updatedNote);

			return {
				_id: savedNote._id,
				ok: true,
				_rev: savedNote._rev,
				conflict: false,
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes("conflict")) {
				const currentNote = await this.noteRepository.findById(syncRequest._id);
				return {
					_id: syncRequest._id,
					ok: false,
					conflict: true,
					server_doc: currentNote
						? {
								_rev: currentNote._rev,
								title: currentNote.title,
								content: currentNote.content,
								key: currentNote.key,
								updated_at: currentNote.updated_at,
								workspace_id: currentNote.workspace_id,
								deleted: currentNote.deleted,
							}
						: undefined,
				};
			}
			throw error;
		}
	}

	async getNotesByWorkspace(workspaceId: string): Promise<Note[]> {
		return await this.noteRepository.findByWorkspace(workspaceId);
	}

	async createNote(noteData: {
		title: string;
		content: string;
		key: string;
		workspace_id: string;
		_id?: string;
	}): Promise<Note> {
		const newNote = new NoteModel({
			_id: noteData._id,
			title: noteData.title,
			content: noteData.content,
			key: noteData.key,
			workspace_id: noteData.workspace_id,
			deleted: false,
		});

		return await this.noteRepository.create(newNote.toJSON());
	}

	async updateNote(
		id: string,
		updates: {
			title?: string;
			content?: string;
			key?: string;
			workspace_id?: string;
			deleted?: boolean;
		},
	): Promise<Note> {
		const existingNote = await this.noteRepository.findById(id);
		if (!existingNote) {
			throw new NotFoundError(`Note with ID ${id} not found`);
		}

		const updatedNote: Note = {
			...existingNote,
			updated_at: new Date().toISOString(),
		};

		if (updates.title !== undefined) {
			updatedNote.title = updates.title;
		}
		if (updates.content !== undefined) {
			updatedNote.content = updates.content;
		}
		if (updates.key !== undefined) {
			updatedNote.key = updates.key;
		}
		if (updates.workspace_id !== undefined) {
			updatedNote.workspace_id = updates.workspace_id;
		}
		if (updates.deleted !== undefined) {
			updatedNote.deleted = updates.deleted;
		}

		return await this.noteRepository.update(updatedNote);
	}

	async getNoteById(id: string): Promise<Note | null> {
		return await this.noteRepository.findById(id);
	}
}
