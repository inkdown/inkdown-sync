import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { couch } from "./couch";
import { container } from "./utils/container";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./env";

const app = new Elysia()
	.use(
		swagger({
			documentation: {
				info: {
					title: "Inkdown Sync API",
					version: "1.0.0",
					description:
						"API for synchronizing notes between client and server using CouchDB",
				},
				tags: [
					{
						name: "Sync",
						description: "Note synchronization endpoints",
					},
					{
						name: "Notes",
						description: "Individual note CRUD operations",
					},
					{
						name: "Health",
						description: "API health and status endpoints",
					},
				],
			},
		}),
	)
	.onError(({ error, set }) => errorHandler(error, { set }))
	.onStart(async () => {
		try {
			await couch.ensureDatabase();
			console.log("✅ CouchDB database ensured");
		} catch (error) {
			console.error("❌ Failed to ensure CouchDB database:", error);
			process.exit(1);
		}
	})
	.post(
		"/sync",
		async ({ body }) => {
			return await container.syncController.syncNotes(body);
		},
		{
			detail: {
				summary: "Sync notes",
				description:
					"Synchronize notes between client and server with conflict resolution",
				tags: ["Sync"],
				body: {
					description: "Array of notes to sync",
					content: {
						"application/json": {
							schema: {
								type: "array",
								items: {
									type: "object",
									required: ["_id", "updated_at"],
									properties: {
										_id: { type: "string", description: "Note ID" },
										_rev: { type: "string", description: "Document revision" },
										title: { type: "string", description: "Note title" },
										content: { type: "string", description: "Note content" },
										key: {
											type: "string",
											pattern: "^[\\w\\-\\/]+\\.md$",
											description: "File path with .md extension",
										},
										updated_at: {
											type: "string",
											format: "date-time",
											description: "Last update timestamp",
										},
										workspace_id: {
											type: "string",
											description: "Workspace ID",
										},
										deleted: {
											type: "boolean",
											description: "Whether the note is deleted",
										},
									},
								},
							},
						},
					},
				},
				responses: {
					200: {
						description: "Sync results",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										results: {
											type: "array",
											items: {
												type: "object",
												properties: {
													_id: { type: "string" },
													ok: { type: "boolean" },
													_rev: { type: "string" },
													conflict: { type: "boolean" },
													server_doc: { type: "object" },
													error: { type: "string" },
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	)
	.get(
		"/notes/:workspaceId",
		async ({ params: { workspaceId } }) => {
			return await container.syncController.getNotesByWorkspace(workspaceId);
		},
		{
			detail: {
				summary: "Get notes by workspace",
				description: "Retrieve all notes for a specific workspace",
				tags: ["Sync"],
				parameters: [
					{
						name: "workspaceId",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "Workspace ID",
					},
				],
				responses: {
					200: {
						description: "List of notes",
						content: {
							"application/json": {
								schema: {
									type: "array",
									items: {
										type: "object",
										properties: {
											_id: { type: "string" },
											_rev: { type: "string" },
											title: { type: "string" },
											content: { type: "string" },
											updated_at: { type: "string", format: "date-time" },
											created_at: { type: "string", format: "date-time" },
											workspace_id: { type: "string" },
											deleted: { type: "boolean" },
										},
									},
								},
							},
						},
					},
				},
			},
		},
	)
	.post(
		"/notes",
		async ({ body, set }) => {
			const result = await container.syncController.createNote(body);
			set.status = 201;
			return result;
		},
		{
			detail: {
				summary: "Create a new note",
				description: "Create a new note with title, content, and workspace",
				tags: ["Notes"],
				body: {
					description: "Note data to create",
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["title", "content", "key", "workspace_id"],
								properties: {
									title: {
										type: "string",
										minLength: 1,
										description: "Note title",
										example: "My New Note",
									},
									content: {
										type: "string",
										description: "Note content in markdown",
										example: "# Hello World\n\nThis is my first note!",
									},
									key: {
										type: "string",
										pattern: "^[\\w\\-\\/]+\\.md$",
										description: "File path with .md extension (e.g., 'folder/subfolder/filename.md')",
										example: "projects/notes/getting-started.md",
									},
									workspace_id: {
										type: "string",
										minLength: 1,
										description: "Workspace identifier",
										example: "workspace-123",
									},
									_id: {
										type: "string",
										description: "Optional custom note ID",
										example: "note:custom-id-123",
									},
								},
							},
						},
					},
				},
				responses: {
					201: {
						description: "Note created successfully",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										_id: { type: "string", example: "note:123456789-abc" },
										_rev: { type: "string", example: "1-xyz123" },
										title: { type: "string", example: "My New Note" },
										content: {
											type: "string",
											example: "# Hello World\n\nThis is my first note!",
										},
										key: { type: "string", example: "projects/notes/getting-started.md" },
										created_at: { type: "string", format: "date-time" },
										updated_at: { type: "string", format: "date-time" },
										workspace_id: { type: "string", example: "workspace-123" },
										deleted: { type: "boolean", example: false },
									},
								},
							},
						},
					},
					400: {
						description: "Invalid request data",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										error: { type: "string" },
										message: { type: "string" },
										code: { type: "string" },
									},
								},
							},
						},
					},
				},
			},
		},
	)
	.put(
		"/notes/:id",
		async ({ params: { id }, body }) => {
			return await container.syncController.updateNote(id, body);
		},
		{
			detail: {
				summary: "Update an existing note",
				description:
					"Update an existing note's title, content, workspace, or deleted status",
				tags: ["Notes"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "Note ID to update",
						example: "note:123456789-abc",
					},
				],
				body: {
					description: "Note fields to update",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									title: {
										type: "string",
										minLength: 1,
										description: "New note title",
										example: "Updated Note Title",
									},
									content: {
										type: "string",
										description: "New note content",
										example: "# Updated Content\n\nThis note has been updated!",
									},
									key: {
										type: "string",
										pattern: "^[\\w\\-\\/]+\\.md$",
										description: "New file path with .md extension",
										example: "projects/notes/updated-getting-started.md",
									},
									workspace_id: {
										type: "string",
										minLength: 1,
										description: "New workspace identifier",
										example: "workspace-456",
									},
									deleted: {
										type: "boolean",
										description: "Mark note as deleted",
										example: false,
									},
								},
							},
						},
					},
				},
				responses: {
					200: {
						description: "Note updated successfully",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										_id: { type: "string" },
										_rev: { type: "string" },
										title: { type: "string" },
										content: { type: "string" },
										key: { type: "string" },
										created_at: { type: "string", format: "date-time" },
										updated_at: { type: "string", format: "date-time" },
										workspace_id: { type: "string" },
										deleted: { type: "boolean" },
									},
								},
							},
						},
					},
					400: {
						description: "Invalid request data",
					},
					404: {
						description: "Note not found",
					},
				},
			},
		},
	)
	.get(
		"/notes/single/:id",
		async ({ params: { id } }) => {
			return await container.syncController.getNoteById(id);
		},
		{
			detail: {
				summary: "Get a single note by ID",
				description: "Retrieve a specific note by its ID",
				tags: ["Notes"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "Note ID to retrieve",
						example: "note:123456789-abc",
					},
				],
				responses: {
					200: {
						description: "Note retrieved successfully",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										_id: { type: "string" },
										_rev: { type: "string" },
										title: { type: "string" },
										content: { type: "string" },
										key: { type: "string" },
										created_at: { type: "string", format: "date-time" },
										updated_at: { type: "string", format: "date-time" },
										workspace_id: { type: "string" },
										deleted: { type: "boolean" },
									},
								},
							},
						},
					},
					400: {
						description: "Invalid note ID",
					},
					404: {
						description: "Note not found",
					},
				},
			},
		},
	)
	.get(
		"/health",
		() => ({ status: "ok", timestamp: new Date().toISOString() }),
		{
			detail: {
				summary: "Health check",
				description: "Check if the API is running",
				tags: ["Health"],
				responses: {
					200: {
						description: "API is healthy",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										status: { type: "string" },
										timestamp: { type: "string", format: "date-time" },
									},
								},
							},
						},
					},
				},
			},
		},
	)
	.listen(env.PORT);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
console.log(
	`📚 Swagger documentation available at http://localhost:${env.PORT}/swagger`,
);
