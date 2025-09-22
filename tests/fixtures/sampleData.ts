import type { Note, NoteCreate, SyncRequest } from '../../src/types/note';

export const sampleNotes: Note[] = [
  {
    _id: 'note:test-1',
    _rev: '1-abc123',
    title: 'Getting Started',
    content: '# Getting Started\n\nThis is a sample note.',
    key: 'docs/getting-started.md',
    workspace_id: 'workspace-1',
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-01T10:00:00Z',
    deleted: false,
  },
  {
    _id: 'note:test-2',
    _rev: '2-def456',
    title: 'API Documentation',
    content: '# API Documentation\n\nDetailed API documentation.',
    key: 'docs/api/endpoints.md',
    workspace_id: 'workspace-1',
    created_at: '2025-01-01T11:00:00Z',
    updated_at: '2025-01-01T12:00:00Z',
    deleted: false,
  },
  {
    _id: 'note:test-3',
    _rev: '1-ghi789',
    title: 'Project Notes',
    content: '# Project Notes\n\nImportant project information.',
    key: 'projects/main/notes.md',
    workspace_id: 'workspace-2',
    created_at: '2025-01-01T13:00:00Z',
    updated_at: '2025-01-01T13:00:00Z',
    deleted: false,
  },
];

export const validNoteCreate: NoteCreate = {
  title: 'Test Note',
  content: '# Test Note\n\nThis is a test note.',
  key: 'test/sample.md',
  workspace_id: 'test-workspace',
};

export const validNoteCreateWithId: NoteCreate = {
  ...validNoteCreate,
  _id: 'note:custom-test-123',
};

export const invalidNoteCreates = [
  {
    // Missing title
    content: 'Content without title',
    key: 'test/invalid.md',
    workspace_id: 'test-workspace',
  },
  {
    // Invalid key format
    title: 'Invalid Key',
    content: 'Content with invalid key',
    key: 'invalid-key-without-extension',
    workspace_id: 'test-workspace',
  },
  {
    // Missing workspace_id
    title: 'No Workspace',
    content: 'Content without workspace',
    key: 'test/no-workspace.md',
  },
];

export const validSyncRequests: SyncRequest[] = [
  {
    _id: 'note:sync-1',
    title: 'Synced Note 1',
    content: '# Synced Note 1\n\nContent for sync.',
    key: 'sync/note-1.md',
    workspace_id: 'sync-workspace',
    updated_at: '2025-01-01T14:00:00Z',
  },
  {
    _id: 'note:sync-2',
    _rev: '1-existing',
    title: 'Updated Note',
    content: '# Updated Note\n\nUpdated content.',
    key: 'sync/updated.md',
    workspace_id: 'sync-workspace',
    updated_at: '2025-01-01T15:00:00Z',
  },
];

export const conflictScenarios = {
  clientNewer: {
    client: {
      _id: 'note:conflict-1',
      _rev: '1-old',
      title: 'Client Version',
      content: 'Client has newer timestamp',
      key: 'conflict/client-newer.md',
      workspace_id: 'conflict-workspace',
      updated_at: '2025-01-01T16:00:00Z',
    },
    server: {
      _id: 'note:conflict-1',
      _rev: '1-old',
      title: 'Server Version',
      content: 'Server has older timestamp',
      key: 'conflict/server-older.md',
      workspace_id: 'conflict-workspace',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T15:00:00Z',
      deleted: false,
    },
  },
  serverNewer: {
    client: {
      _id: 'note:conflict-2',
      _rev: '1-old',
      title: 'Client Version',
      content: 'Client has older timestamp',
      key: 'conflict/client-older.md',
      workspace_id: 'conflict-workspace',
      updated_at: '2025-01-01T14:00:00Z',
    },
    server: {
      _id: 'note:conflict-2',
      _rev: '2-newer',
      title: 'Server Version',
      content: 'Server has newer timestamp',
      key: 'conflict/server-newer.md',
      workspace_id: 'conflict-workspace',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T16:00:00Z',
      deleted: false,
    },
  },
};

export const keyValidationTests = [
  { key: 'simple.md', valid: true },
  { key: 'folder/file.md', valid: true },
  { key: 'deep/nested/folder/file.md', valid: true },
  { key: 'file-with-dashes.md', valid: true },
  { key: 'file_with_underscores.md', valid: true },
  { key: 'invalid.txt', valid: false },
  { key: 'no-extension', valid: false },
  { key: '.md', valid: false },
  { key: 'spaces in file.md', valid: false },
  { key: 'special@chars.md', valid: false },
];