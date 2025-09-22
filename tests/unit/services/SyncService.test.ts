import { describe, it, expect, beforeEach } from '@jest/globals';
import { SyncService } from '../../../src/services/SyncService';
import type { INoteRepository } from '../../../src/repositories/interfaces/INoteRepository';
import type { Note, SyncRequest } from '../../../src/types/note';
import { ValidationError, NotFoundError } from '../../../src/types/errors';
import { sampleNotes, validSyncRequests, conflictScenarios } from '../../fixtures/sampleData';

// Mock repository
class MockNoteRepository implements INoteRepository {
  private notes: Map<string, Note> = new Map();
  private revCounter = 1;

  async findById(id: string): Promise<Note | null> {
    return this.notes.get(id) || null;
  }

  async create(note: Note): Promise<Note> {
    const newNote = {
      ...note,
      _rev: `1-${this.revCounter++}`,
    };
    this.notes.set(note._id, newNote);
    return newNote;
  }

  async update(note: Note): Promise<Note> {
    const existingNote = this.notes.get(note._id);
    if (!existingNote) {
      throw new Error('Note not found');
    }
    
    const updatedNote = {
      ...note,
      _rev: `${this.revCounter++}-updated`,
    };
    this.notes.set(note._id, updatedNote);
    return updatedNote;
  }

  async delete(id: string, rev: string): Promise<void> {
    this.notes.delete(id);
  }

  async bulkSync(notes: any[]): Promise<any[]> {
    return notes.map(() => ({ ok: true, id: 'test', rev: '1-test' }));
  }

  async findByWorkspace(workspaceId: string): Promise<Note[]> {
    return Array.from(this.notes.values()).filter(
      note => note.workspace_id === workspaceId && !note.deleted
    );
  }

  async getCurrentRevision(id: string): Promise<string | null> {
    const note = this.notes.get(id);
    return note?._rev || null;
  }

  // Helper methods for testing
  seed(notes: Note[]) {
    this.notes.clear();
    notes.forEach(note => this.notes.set(note._id, note));
  }

  clear() {
    this.notes.clear();
  }
}

describe('SyncService', () => {
  let syncService: SyncService;
  let mockRepository: MockNoteRepository;

  beforeEach(() => {
    mockRepository = new MockNoteRepository();
    syncService = new SyncService(mockRepository);
  });

  describe('createNote', () => {
    it('should create a new note with all required fields', async () => {
      const noteData = {
        title: 'Test Note',
        content: 'Test content',
        key: 'test/create.md',
        workspace_id: 'test-workspace',
      };

      const result = await syncService.createNote(noteData);

      expect(result).toBeValidNote();
      expect(result.title).toBe(noteData.title);
      expect(result.content).toBe(noteData.content);
      expect(result.key).toBe(noteData.key);
      expect(result.workspace_id).toBe(noteData.workspace_id);
      expect(result._rev).toBeDefined();
    });

    it('should create a note with custom ID', async () => {
      const noteData = {
        title: 'Custom ID Note',
        content: 'Test content',
        key: 'test/custom.md',
        workspace_id: 'test-workspace',
        _id: 'note:custom-123',
      };

      const result = await syncService.createNote(noteData);

      expect(result._id).toBe('note:custom-123');
      expect(result.title).toBe(noteData.title);
    });
  });

  describe('updateNote', () => {
    beforeEach(() => {
      mockRepository.seed([sampleNotes[0]]);
    });

    it('should update an existing note', async () => {
      const updates = {
        title: 'Updated Title',
        content: 'Updated content',
        key: 'test/updated.md',
      };

      const result = await syncService.updateNote('note:test-1', updates);

      expect(result.title).toBe(updates.title);
      expect(result.content).toBe(updates.content);
      expect(result.key).toBe(updates.key);
      expect(result._rev).toContain('updated');
    });

    it('should throw NotFoundError for non-existent note', async () => {
      const updates = { title: 'Updated Title' };

      await expect(
        syncService.updateNote('note:non-existent', updates)
      ).rejects.toThrow(NotFoundError);
    });

    it('should update only provided fields', async () => {
      const originalNote = sampleNotes[0];
      const updates = { title: 'New Title Only' };

      const result = await syncService.updateNote('note:test-1', updates);

      expect(result.title).toBe(updates.title);
      expect(result.content).toBe(originalNote.content);
      expect(result.key).toBe(originalNote.key);
      expect(result.workspace_id).toBe(originalNote.workspace_id);
    });
  });

  describe('getNoteById', () => {
    beforeEach(() => {
      mockRepository.seed([sampleNotes[0]]);
    });

    it('should return existing note', async () => {
      const result = await syncService.getNoteById('note:test-1');

      expect(result).toEqual(sampleNotes[0]);
    });

    it('should return null for non-existent note', async () => {
      const result = await syncService.getNoteById('note:non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getNotesByWorkspace', () => {
    beforeEach(() => {
      mockRepository.seed(sampleNotes);
    });

    it('should return notes for specific workspace', async () => {
      const result = await syncService.getNotesByWorkspace('workspace-1');

      expect(result).toHaveLength(2);
      expect(result.every(note => note.workspace_id === 'workspace-1')).toBe(true);
    });

    it('should return empty array for workspace with no notes', async () => {
      const result = await syncService.getNotesByWorkspace('empty-workspace');

      expect(result).toHaveLength(0);
    });
  });

  describe('syncNotes', () => {
    it('should sync multiple notes successfully', async () => {
      const result = await syncService.syncNotes(validSyncRequests);

      expect(result.results).toHaveLength(2);
      expect(result.results.every(r => r.ok === true)).toBe(true);
    });

    it('should handle sync request with invalid data', async () => {
      const invalidRequest: SyncRequest[] = [
        {
          _id: 'note:invalid',
          updated_at: '2025-01-01T10:00:00Z',
          // Missing required fields for new note
        },
      ];

      const result = await syncService.syncNotes(invalidRequest);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].error).toContain('required');
    });

    it('should create new note when it does not exist', async () => {
      const newNoteRequest: SyncRequest[] = [
        {
          _id: 'note:new-sync',
          title: 'New Sync Note',
          content: 'New sync content',
          key: 'sync/new.md',
          workspace_id: 'sync-workspace',
          updated_at: '2025-01-01T10:00:00Z',
        },
      ];

      const result = await syncService.syncNotes(newNoteRequest);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].ok).toBe(true);
      expect(result.results[0]._rev).toBeDefined();
    });

    it('should handle conflict when server is newer', async () => {
      // Seed with server version
      mockRepository.seed([conflictScenarios.serverNewer.server]);

      const clientRequest: SyncRequest[] = [conflictScenarios.serverNewer.client];

      const result = await syncService.syncNotes(clientRequest);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].conflict).toBe(true);
      expect(result.results[0].server_doc).toBeDefined();
      expect(result.results[0].server_doc?.title).toBe('Server Version');
    });

    it('should update when client is newer', async () => {
      // Seed with server version
      mockRepository.seed([conflictScenarios.clientNewer.server]);

      const clientRequest: SyncRequest[] = [conflictScenarios.clientNewer.client];

      const result = await syncService.syncNotes(clientRequest);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].ok).toBe(true);
      expect(result.results[0].conflict).toBeFalsy();
    });

    it('should update when revisions match', async () => {
      const existingNote: Note = {
        _id: 'note:rev-match',
        _rev: '1-same',
        title: 'Original',
        content: 'Original content',
        key: 'test/original.md',
        workspace_id: 'test-workspace',
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z',
        deleted: false,
      };

      mockRepository.seed([existingNote]);

      const updateRequest: SyncRequest[] = [
        {
          _id: 'note:rev-match',
          _rev: '1-same',
          title: 'Updated',
          content: 'Updated content',
          key: 'test/updated.md',
          workspace_id: 'test-workspace',
          updated_at: '2025-01-01T11:00:00Z',
        },
      ];

      const result = await syncService.syncNotes(updateRequest);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].ok).toBe(true);
      expect(result.results[0].conflict).toBeFalsy();
    });
  });
});