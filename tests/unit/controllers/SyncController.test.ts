import { describe, it, expect, beforeEach } from '@jest/globals';
import { SyncController } from '../../../src/controllers/SyncController';
import type { SyncService } from '../../../src/services/SyncService';
import { ValidationError, NotFoundError } from '../../../src/types/errors';
import { validNoteCreate, invalidNoteCreates, sampleNotes, keyValidationTests } from '../../fixtures/sampleData';

// Mock SyncService
class MockSyncService implements Partial<SyncService> {
  async createNote(noteData: any) {
    return {
      _id: 'note:mock-created',
      _rev: '1-mock',
      title: noteData.title,
      content: noteData.content,
      key: noteData.key,
      workspace_id: noteData.workspace_id,
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z',
      deleted: false,
    };
  }

  async updateNote(id: string, updates: any) {
    if (id === 'note:not-found') {
      throw new NotFoundError('Note not found');
    }
    return {
      _id: id,
      _rev: '2-mock-updated',
      title: updates.title || 'Original Title',
      content: updates.content || 'Original content',
      key: updates.key || 'test/original.md',
      workspace_id: updates.workspace_id || 'test-workspace',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T11:00:00Z',
      deleted: updates.deleted || false,
    };
  }

  async getNoteById(id: string) {
    if (id === 'note:not-found') {
      return null;
    }
    return sampleNotes[0];
  }

  async getNotesByWorkspace(workspaceId: string) {
    return sampleNotes.filter(note => note.workspace_id === workspaceId);
  }

  async syncNotes(requests: any[]) {
    return {
      results: requests.map(req => ({
        _id: req._id,
        ok: true,
        _rev: '1-synced',
        conflict: false,
      })),
    };
  }
}

describe('SyncController', () => {
  let syncController: SyncController;
  let mockSyncService: MockSyncService;

  beforeEach(() => {
    mockSyncService = new MockSyncService();
    syncController = new SyncController(mockSyncService as any);
  });

  describe('createNote', () => {
    it('should create note with valid data', async () => {
      const result = await syncController.createNote(validNoteCreate);

      expect(result._id).toBe('note:mock-created');
      expect(result.title).toBe(validNoteCreate.title);
      expect(result.key).toBe(validNoteCreate.key);
    });

    it('should throw ValidationError for missing title', async () => {
      await expect(
        syncController.createNote(invalidNoteCreates[0])
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid key format', async () => {
      await expect(
        syncController.createNote(invalidNoteCreates[1])
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing workspace_id', async () => {
      await expect(
        syncController.createNote(invalidNoteCreates[2])
      ).rejects.toThrow(ValidationError);
    });

    it('should validate key patterns correctly', async () => {
      for (const test of keyValidationTests) {
        const noteData = {
          title: 'Test Note',
          content: 'Test content',
          key: test.key,
          workspace_id: 'test-workspace',
        };

        if (test.valid) {
          await expect(syncController.createNote(noteData)).resolves.toBeDefined();
        } else {
          await expect(syncController.createNote(noteData)).rejects.toThrow(ValidationError);
        }
      }
    });

    it('should throw ValidationError for null body', async () => {
      await expect(
        syncController.createNote(null)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for non-object body', async () => {
      await expect(
        syncController.createNote('invalid')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateNote', () => {
    it('should update note with valid data', async () => {
      const updates = {
        title: 'Updated Title',
        content: 'Updated content',
        key: 'test/updated.md',
      };

      const result = await syncController.updateNote('note:test-1', updates);

      expect(result._id).toBe('note:test-1');
      expect(result.title).toBe(updates.title);
      expect(result.key).toBe(updates.key);
      expect(result._rev).toBe('2-mock-updated');
    });

    it('should throw ValidationError for empty note ID', async () => {
      await expect(
        syncController.updateNote('', { title: 'New Title' })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid key format', async () => {
      const updates = {
        key: 'invalid-key-format',
      };

      await expect(
        syncController.updateNote('note:test-1', updates)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle partial updates', async () => {
      const updates = { title: 'Only Title Update' };

      const result = await syncController.updateNote('note:test-1', updates);

      expect(result.title).toBe(updates.title);
      expect(result.content).toBe('Original content');
    });

    it('should propagate NotFoundError from service', async () => {
      await expect(
        syncController.updateNote('note:not-found', { title: 'Update' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should validate all key patterns in updates', async () => {
      for (const test of keyValidationTests) {
        const updates = { key: test.key };

        if (test.valid) {
          await expect(syncController.updateNote('note:test-1', updates)).resolves.toBeDefined();
        } else {
          await expect(syncController.updateNote('note:test-1', updates)).rejects.toThrow(ValidationError);
        }
      }
    });
  });

  describe('getNoteById', () => {
    it('should return note for valid ID', async () => {
      const result = await syncController.getNoteById('note:test-1');

      expect(result).toEqual(sampleNotes[0]);
    });

    it('should throw ValidationError for empty ID', async () => {
      await expect(
        syncController.getNoteById('')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent note', async () => {
      await expect(
        syncController.getNoteById('note:not-found')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getNotesByWorkspace', () => {
    it('should return notes for valid workspace ID', async () => {
      const result = await syncController.getNotesByWorkspace('workspace-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result.every(note => note.workspace_id === 'workspace-1')).toBe(true);
    });

    it('should throw ValidationError for empty workspace ID', async () => {
      await expect(
        syncController.getNotesByWorkspace('')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('syncNotes', () => {
    it('should sync valid note requests', async () => {
      const syncRequests = [
        {
          _id: 'note:sync-1',
          title: 'Sync Note 1',
          content: 'Sync content 1',
          key: 'sync/note1.md',
          workspace_id: 'sync-workspace',
          updated_at: '2025-01-01T10:00:00Z',
        },
        {
          _id: 'note:sync-2',
          title: 'Sync Note 2',
          content: 'Sync content 2',
          key: 'sync/note2.md',
          workspace_id: 'sync-workspace',
          updated_at: '2025-01-01T11:00:00Z',
        },
      ];

      const result = await syncController.syncNotes(syncRequests);

      expect(result.results).toHaveLength(2);
      expect(result.results.every(r => r.ok === true)).toBe(true);
    });

    it('should throw ValidationError for invalid sync request', async () => {
      const invalidRequests = [
        {
          _id: 'note:invalid',
          // Missing updated_at
          title: 'Invalid Note',
        },
      ];

      await expect(
        syncController.syncNotes(invalidRequests)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for non-array input', async () => {
      await expect(
        syncController.syncNotes({ not: 'an array' })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for null input', async () => {
      await expect(
        syncController.syncNotes(null)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate key formats in sync requests', async () => {
      const invalidKeyRequest = [
        {
          _id: 'note:invalid-key',
          title: 'Invalid Key',
          content: 'Content',
          key: 'invalid-format',
          workspace_id: 'test-workspace',
          updated_at: '2025-01-01T10:00:00Z',
        },
      ];

      await expect(
        syncController.syncNotes(invalidKeyRequest)
      ).rejects.toThrow(ValidationError);
    });
  });
});