import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { TestServer } from '../../helpers/testServer';
import { validNoteCreate, sampleNotes, keyValidationTests } from '../../fixtures/sampleData';

describe('Notes API Integration Tests', () => {
  let testServer: TestServer;
  let app: any;

  beforeAll(async () => {
    testServer = new TestServer();
    app = await testServer.start();
  });

  afterAll(async () => {
    await testServer.stop();
  });

  describe('POST /notes', () => {
    it('should create a new note with valid data', async () => {
      const response = await app.handle(
        new Request('http://localhost/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validNoteCreate),
        })
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toBeValidNote();
      expect(data.title).toBe(validNoteCreate.title);
      expect(data.key).toBe(validNoteCreate.key);
      expect(data._rev).toBeDefined();
    });

    it('should create note with custom ID', async () => {
      const noteWithId = {
        ...validNoteCreate,
        _id: 'note:custom-api-test',
        title: 'Custom ID Note',
        key: 'test/custom-api.md',
      };

      const response = await app.handle(
        new Request('http://localhost/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(noteWithId),
        })
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data._id).toBe('note:custom-api-test');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidNote = {
        content: 'Content without title',
        key: 'test/invalid.md',
      };

      const response = await app.handle(
        new Request('http://localhost/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidNote),
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation Error');
    });

    it('should return 400 for invalid key format', async () => {
      const invalidKeyNote = {
        ...validNoteCreate,
        key: 'invalid-key-format',
      };

      const response = await app.handle(
        new Request('http://localhost/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidKeyNote),
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation Error');
      expect(data.message).toContain('Key must be a valid file path ending with .md');
    });

    it('should validate various key formats', async () => {
      for (const test of keyValidationTests.slice(0, 5)) { // Test first 5 valid cases
        if (test.valid) {
          const noteData = {
            title: `Test ${test.key}`,
            content: 'Test content',
            key: test.key,
            workspace_id: 'test-workspace',
          };

          const response = await app.handle(
            new Request('http://localhost/notes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(noteData),
            })
          );

          expect(response.status).toBe(201);
        }
      }
    });
  });

  describe('GET /notes/single/:id', () => {
    let createdNoteId: string;

    beforeEach(async () => {
      // Create a note for testing retrieval
      const createResponse = await app.handle(
        new Request('http://localhost/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...validNoteCreate,
            title: 'Get Test Note',
            key: 'test/get-test.md',
          }),
        })
      );
      
      const createdNote = await createResponse.json();
      createdNoteId = createdNote._id;
    });

    it('should retrieve existing note by ID', async () => {
      const response = await app.handle(
        new Request(`http://localhost/notes/single/${createdNoteId}`)
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toBeValidNote();
      expect(data._id).toBe(createdNoteId);
      expect(data.title).toBe('Get Test Note');
    });

    it('should return 404 for non-existent note', async () => {
      const response = await app.handle(
        new Request('http://localhost/notes/single/note:non-existent')
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Not Found');
    });

    it('should return 400 for empty note ID', async () => {
      const response = await app.handle(
        new Request('http://localhost/notes/single/')
      );

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /notes/:id', () => {
    let createdNoteId: string;

    beforeEach(async () => {
      // Create a note for testing updates
      const createResponse = await app.handle(
        new Request('http://localhost/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...validNoteCreate,
            title: 'Update Test Note',
            key: 'test/update-test.md',
          }),
        })
      );
      
      const createdNote = await createResponse.json();
      createdNoteId = createdNote._id;
    });

    it('should update existing note', async () => {
      const updates = {
        title: 'Updated Title',
        content: 'Updated content',
        key: 'test/updated-file.md',
      };

      const response = await app.handle(
        new Request(`http://localhost/notes/${createdNoteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.title).toBe(updates.title);
      expect(data.content).toBe(updates.content);
      expect(data.key).toBe(updates.key);
      expect(data.updated_at).toBeDefined();
    });

    it('should handle partial updates', async () => {
      const updates = { title: 'Only Title Updated' };

      const response = await app.handle(
        new Request(`http://localhost/notes/${createdNoteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.title).toBe(updates.title);
      expect(data.content).toBe(validNoteCreate.content); // Should remain unchanged
    });

    it('should return 404 for non-existent note', async () => {
      const updates = { title: 'Update Non-existent' };

      const response = await app.handle(
        new Request('http://localhost/notes/note:non-existent', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
      );

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid key format', async () => {
      const updates = { key: 'invalid-key-format' };

      const response = await app.handle(
        new Request(`http://localhost/notes/${createdNoteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation Error');
    });

    it('should validate key format in updates', async () => {
      for (const test of keyValidationTests.slice(-5)) { // Test last 5 invalid cases
        if (!test.valid) {
          const updates = { key: test.key };

          const response = await app.handle(
            new Request(`http://localhost/notes/${createdNoteId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
            })
          );

          expect(response.status).toBe(400);
        }
      }
    });
  });

  describe('GET /notes/:workspaceId', () => {
    beforeEach(async () => {
      // Create test notes in different workspaces
      const notes = [
        {
          ...validNoteCreate,
          title: 'Workspace 1 Note 1',
          key: 'workspace1/note1.md',
          workspace_id: 'test-workspace-1',
        },
        {
          ...validNoteCreate,
          title: 'Workspace 1 Note 2',
          key: 'workspace1/note2.md',
          workspace_id: 'test-workspace-1',
        },
        {
          ...validNoteCreate,
          title: 'Workspace 2 Note 1',
          key: 'workspace2/note1.md',
          workspace_id: 'test-workspace-2',
        },
      ];

      for (const note of notes) {
        await app.handle(
          new Request('http://localhost/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(note),
          })
        );
      }
    });

    it('should return notes for specific workspace', async () => {
      const response = await app.handle(
        new Request('http://localhost/notes/test-workspace-1')
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(2);
      expect(data.every((note: any) => note.workspace_id === 'test-workspace-1')).toBe(true);
    });

    it('should return empty array for workspace with no notes', async () => {
      const response = await app.handle(
        new Request('http://localhost/notes/empty-workspace')
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('should return 400 for empty workspace ID', async () => {
      const response = await app.handle(
        new Request('http://localhost/notes/')
      );

      expect(response.status).toBe(400);
    });
  });
});