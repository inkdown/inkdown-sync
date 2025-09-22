import { z } from "zod";

export interface CouchDocument {
	_id: string;
	_rev?: string;
}

export interface Note extends CouchDocument {
	_id: string;
	_rev?: string;
	title: string;
	content: string;
	key: string;
	updated_at: string;
	created_at: string;
	workspace_id: string;
	deleted?: boolean;
}

export interface SyncRequest {
	_id: string;
	_rev?: string;
	title?: string;
	content?: string;
	key?: string;
	updated_at: string;
	workspace_id?: string;
	deleted?: boolean;
}

export interface SyncResult {
	_id: string;
	ok: boolean;
	_rev?: string;
	conflict?: boolean;
	server_doc?: Partial<Note>;
	error?: string;
}

export interface SyncResponse {
	results: SyncResult[];
}

export const NoteCreateSchema = z.object({
	title: z.string().min(1, "Title is required"),
	content: z.string(),
	key: z.string().regex(/^[\w\-\/]+\.md$/, "Key must be a valid file path ending with .md"),
	workspace_id: z.string().min(1, "Workspace ID is required"),
	_id: z.string().optional(),
});

export const NoteUpdateSchema = z.object({
	_id: z.string().min(1, "Note ID is required"),
	_rev: z.string().optional(),
	title: z.string().optional(),
	content: z.string().optional(),
	key: z.string().regex(/^[\w\-\/]+\.md$/, "Key must be a valid file path ending with .md").optional(),
	updated_at: z.string().datetime("Invalid date format"),
	workspace_id: z.string().optional(),
	deleted: z.boolean().optional(),
});

export const NotePutSchema = z.object({
	title: z.string().min(1).optional(),
	content: z.string().optional(),
	key: z.string().regex(/^[\w\-\/]+\.md$/, "Key must be a valid file path ending with .md").optional(),
	workspace_id: z.string().min(1).optional(),
	deleted: z.boolean().optional(),
});

export const SyncRequestSchema = z.array(NoteUpdateSchema);

export type NoteCreate = z.infer<typeof NoteCreateSchema>;
export type NoteUpdate = z.infer<typeof NoteUpdateSchema>;
export type NotePut = z.infer<typeof NotePutSchema>;
