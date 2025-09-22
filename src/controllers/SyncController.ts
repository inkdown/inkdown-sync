import type { SyncService } from "../services/SyncService";
import {
	SyncRequestSchema,
	NoteCreateSchema,
	NotePutSchema,
} from "../types/note";
import { ValidationError, NotFoundError } from "../types/errors";

export class SyncController {
	constructor(private syncService: SyncService) {}

	async syncNotes(body: unknown) {
		const parseResult = SyncRequestSchema.safeParse(body);

		if (!parseResult.success) {
			throw new ValidationError(
				`Invalid sync request: ${parseResult.error.issues?.map((e: any) => e.message).join(", ") || "Validation failed"}`,
			);
		}

		const syncRequests = parseResult.data;
		return await this.syncService.syncNotes(syncRequests);
	}

	async getNotesByWorkspace(workspaceId: string) {
		if (!workspaceId) {
			throw new ValidationError("Workspace ID is required");
		}

		return await this.syncService.getNotesByWorkspace(workspaceId);
	}

	async createNote(body: unknown) {
		const parseResult = NoteCreateSchema.safeParse(body);

		if (!parseResult.success) {
			throw new ValidationError(
				`Invalid note creation request: ${parseResult.error.issues?.map((e: any) => e.message).join(", ") || "Validation failed"}`,
			);
		}

		const noteData = parseResult.data;
		return await this.syncService.createNote(noteData);
	}

	async updateNote(id: string, body: unknown) {
		if (!id) {
			throw new ValidationError("Note ID is required");
		}

		const parseResult = NotePutSchema.safeParse(body);

		if (!parseResult.success) {
			throw new ValidationError(
				`Invalid note update request: ${parseResult.error.issues?.map((e: any) => e.message).join(", ") || "Validation failed"}`,
			);
		}

		const updateData = parseResult.data;
		return await this.syncService.updateNote(id, updateData);
	}

	async getNoteById(id: string) {
		if (!id) {
			throw new ValidationError("Note ID is required");
		}

		const note = await this.syncService.getNoteById(id);
		if (!note) {
			throw new NotFoundError(`Note with ID ${id} not found`);
		}

		return note;
	}
}
