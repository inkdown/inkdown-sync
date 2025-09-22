import { describe, it, expect } from '@jest/globals';
import { NoteModel } from '../../../src/models/Note';
import type { Note } from '../../../src/types/note';
import { sampleNotes } from '../../fixtures/sampleData';

describe('NoteModel', () => {
  describe('constructor', () => {
    it('should create a note with all required fields', () => {
      const noteData = {
        title: 'Test Note',
        content: 'Test content',
        key: 'test/note.md',
        workspace_id: 'workspace-1',
      };

      const note = new NoteModel(noteData);

      expect(note.title).toBe(noteData.title);
      expect(note.content).toBe(noteData.content);
      expect(note.key).toBe(noteData.key);
      expect(note.workspace_id).toBe(noteData.workspace_id);
      expect(note.deleted).toBe(false);
      expect(note._id).toMatch(/^note:\d+-[a-z0-9]+$/);
      expect(note.created_at).toBeDefined();
      expect(note.updated_at).toBeDefined();
      expect(note.created_at).toBe(note.updated_at);
    });

    it('should accept custom _id', () => {
      const noteData = {
        _id: 'note:custom-123',
        title: 'Test Note',
        content: 'Test content',
        key: 'test/custom.md',
        workspace_id: 'workspace-1',
      };

      const note = new NoteModel(noteData);

      expect(note._id).toBe('note:custom-123');
    });

    it('should set deleted flag when provided', () => {
      const noteData = {
        title: 'Test Note',
        content: 'Test content',
        key: 'test/deleted.md',
        workspace_id: 'workspace-1',
        deleted: true,
      };

      const note = new NoteModel(noteData);

      expect(note.deleted).toBe(true);
    });
  });

  describe('updateContent', () => {
    it('should update content and timestamp', () => {
      const note = new NoteModel({
        title: 'Test Note',
        content: 'Original content',
        key: 'test/update.md',
        workspace_id: 'workspace-1',
      });

      const originalUpdatedAt = note.updated_at;
      
      // Wait a moment to ensure timestamp difference
      setTimeout(() => {
        note.updateContent('Updated content');

        expect(note.content).toBe('Updated content');
        expect(note.updated_at).not.toBe(originalUpdatedAt);
      }, 1);
    });
  });

  describe('updateTitle', () => {
    it('should update title and timestamp', () => {
      const note = new NoteModel({
        title: 'Original Title',
        content: 'Test content',
        key: 'test/title.md',
        workspace_id: 'workspace-1',
      });

      const originalUpdatedAt = note.updated_at;
      
      setTimeout(() => {
        note.updateTitle('Updated Title');

        expect(note.title).toBe('Updated Title');
        expect(note.updated_at).not.toBe(originalUpdatedAt);
      }, 1);
    });
  });

  describe('updateKey', () => {
    it('should update key and timestamp', () => {
      const note = new NoteModel({
        title: 'Test Note',
        content: 'Test content',
        key: 'test/original.md',
        workspace_id: 'workspace-1',
      });

      const originalUpdatedAt = note.updated_at;
      
      setTimeout(() => {
        note.updateKey('test/updated.md');

        expect(note.key).toBe('test/updated.md');
        expect(note.updated_at).not.toBe(originalUpdatedAt);
      }, 1);
    });
  });

  describe('markAsDeleted', () => {
    it('should mark note as deleted and update timestamp', () => {
      const note = new NoteModel({
        title: 'Test Note',
        content: 'Test content',
        key: 'test/delete.md',
        workspace_id: 'workspace-1',
      });

      const originalUpdatedAt = note.updated_at;
      
      setTimeout(() => {
        note.markAsDeleted();

        expect(note.deleted).toBe(true);
        expect(note.updated_at).not.toBe(originalUpdatedAt);
      }, 1);
    });
  });

  describe('isNewer', () => {
    it('should return true when note is newer', () => {
      const olderNote: Note = {
        ...sampleNotes[0],
        updated_at: '2025-01-01T10:00:00Z',
      };

      const newerNote = new NoteModel({
        title: 'Newer Note',
        content: 'Newer content',
        key: 'test/newer.md',
        workspace_id: 'workspace-1',
      });

      // Set a later timestamp
      newerNote.updated_at = '2025-01-01T11:00:00Z';

      expect(newerNote.isNewer(olderNote)).toBe(true);
    });

    it('should return false when note is older', () => {
      const newerNote: Note = {
        ...sampleNotes[0],
        updated_at: '2025-01-01T11:00:00Z',
      };

      const olderNote = new NoteModel({
        title: 'Older Note',
        content: 'Older content',
        key: 'test/older.md',
        workspace_id: 'workspace-1',
      });

      // Set an earlier timestamp
      olderNote.updated_at = '2025-01-01T10:00:00Z';

      expect(olderNote.isNewer(newerNote)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should return a complete Note object', () => {
      const noteData = {
        _id: 'note:json-test',
        title: 'JSON Test',
        content: 'JSON content',
        key: 'test/json.md',
        workspace_id: 'workspace-1',
        deleted: true,
      };

      const note = new NoteModel(noteData);
      const json = note.toJSON();

      expect(json).toBeValidNote();
      expect(json._id).toBe(noteData._id);
      expect(json.title).toBe(noteData.title);
      expect(json.content).toBe(noteData.content);
      expect(json.key).toBe(noteData.key);
      expect(json.workspace_id).toBe(noteData.workspace_id);
      expect(json.deleted).toBe(noteData.deleted);
      expect(json.created_at).toBeDefined();
      expect(json.updated_at).toBeDefined();
    });
  });

  describe('fromCouchDoc', () => {
    it('should create NoteModel from CouchDB document', () => {
      const couchDoc = sampleNotes[0] as any;
      const note = NoteModel.fromCouchDoc(couchDoc);

      expect(note._id).toBe(couchDoc._id);
      expect(note._rev).toBe(couchDoc._rev);
      expect(note.title).toBe(couchDoc.title);
      expect(note.content).toBe(couchDoc.content);
      expect(note.key).toBe(couchDoc.key);
      expect(note.workspace_id).toBe(couchDoc.workspace_id);
      expect(note.created_at).toBe(couchDoc.created_at);
      expect(note.updated_at).toBe(couchDoc.updated_at);
      expect(note.deleted).toBe(couchDoc.deleted);
    });

    it('should handle documents without optional fields', () => {
      const couchDoc = {
        _id: 'note:minimal',
        title: 'Minimal Note',
        content: 'Minimal content',
        key: 'test/minimal.md',
        workspace_id: 'workspace-1',
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z',
      };

      const note = NoteModel.fromCouchDoc(couchDoc);

      expect(note._id).toBe(couchDoc._id);
      expect(note._rev).toBeUndefined();
      expect(note.deleted).toBe(false); // Should default to false even when not provided
    });
  });
});