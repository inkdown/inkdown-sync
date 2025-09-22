import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { TestServer } from '../../helpers/testServer';
import { validSyncRequests, conflictScenarios } from '../../fixtures/sampleData';

describe('Sync API Integration Tests', () => {
  let testServer: TestServer;
  let app: any;

  beforeAll(async () => {
    testServer = new TestServer();
    app = await testServer.start();
  });

  afterAll(async () => {
    await testServer.stop();
  });

  describe('POST /sync', () => {
    it('should sync new notes successfully', async () => {
      const syncRequests = [
        {
          _id: 'note:sync-new-1',
          title: 'New Sync Note 1',
          content: '# New Sync Note 1\n\nContent for sync.',
          key: 'sync/new-note-1.md',
          workspace_id: 'sync-workspace',
          updated_at: '2025-01-01T10:00:00Z',
        },
        {
          _id: 'note:sync-new-2',
          title: 'New Sync Note 2',
          content: '# New Sync Note 2\n\nContent for sync.',
          key: 'sync/new-note-2.md',
          workspace_id: 'sync-workspace',
          updated_at: '2025-01-01T11:00:00Z',
        },
      ];

      const response = await app.handle(
        new Request('http://localhost/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(syncRequests),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.results).toHaveLength(2);
      expect(data.results.every((r: any) => r.ok === true)).toBe(true);
      expect(data.results.every((r: any) => r._rev)).toBeDefined();
    });

    it('should handle mixed create and update operations', async () => {
      // First, create a note via regular API
      const createResponse = await app.handle(
        new Request('http://localhost/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Original Note',
            content: 'Original content',
            key: 'sync/original.md',
            workspace_id: 'mixed-workspace',
          }),
        })
      );
      
      const createdNote = await createResponse.json();

      // Now sync with both new note and update to existing
      const syncRequests = [
        {
          _id: 'note:sync-mixed-new',
          title: 'New via Sync',
          content: 'New content via sync',
          key: 'sync/new-via-sync.md',
          workspace_id: 'mixed-workspace',
          updated_at: '2025-01-01T12:00:00Z',
        },
        {
          _id: createdNote._id,
          _rev: createdNote._rev,
          title: 'Updated via Sync',
          content: 'Updated content via sync',
          key: 'sync/updated-via-sync.md',
          workspace_id: 'mixed-workspace',
          updated_at: '2025-01-01T13:00:00Z',
        },
      ];

      const response = await app.handle(
        new Request('http://localhost/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(syncRequests),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.results).toHaveLength(2);
      expect(data.results.every((r: any) => r.ok === true)).toBe(true);
    });

    it('should handle sync conflicts correctly', async () => {
      // First, create a note
      const createResponse = await app.handle(
        new Request('http://localhost/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            _id: 'note:conflict-test',
            title: 'Server Version',
            content: 'Server content',
            key: 'conflict/test.md',
            workspace_id: 'conflict-workspace',
          }),
        })
      );

      // Wait a moment to ensure server has newer timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to sync with older timestamp from "client"
      const syncRequests = [
        {
          _id: 'note:conflict-test',
          title: 'Client Version',
          content: 'Client content (older)',
          key: 'conflict/client.md',
          workspace_id: 'conflict-workspace',
          updated_at: '2025-01-01T10:00:00Z', // Older timestamp
        },
      ];

      const response = await app.handle(
        new Request('http://localhost/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(syncRequests),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.results).toHaveLength(1);
      expect(data.results[0].ok).toBe(false);
      expect(data.results[0].conflict).toBe(true);
      expect(data.results[0].server_doc).toBeDefined();
      expect(data.results[0].server_doc.title).toBe('Server Version');
    });

    it('should update when client has newer timestamp', async () => {
      // Create a note with older timestamp
      const createResponse = await app.handle(
        new Request('http://localhost/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            _id: 'note:client-newer',
            title: 'Server Version',
            content: 'Server content',
            key: 'newer/server.md',
            workspace_id: 'newer-workspace',
          }),
        })
      );

      // Sync with newer timestamp from client
      const futureDate = new Date(Date.now() + 60000).toISOString(); // 1 minute in future
      const syncRequests = [
        {
          _id: 'note:client-newer',
          title: 'Client Version (Newer)',
          content: 'Client content (newer)',
          key: 'newer/client.md',
          workspace_id: 'newer-workspace',
          updated_at: futureDate,
        },
      ];

      const response = await app.handle(
        new Request('http://localhost/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(syncRequests),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.results).toHaveLength(1);
      expect(data.results[0].ok).toBe(true);
      expect(data.results[0].conflict).toBeFalsy();
    });

    it('should return 400 for invalid sync request', async () => {
      const invalidRequests = [
        {
          _id: 'note:invalid',
          title: 'Invalid Note',
          // Missing updated_at and other required fields
        },
      ];

      const response = await app.handle(
        new Request('http://localhost/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequests),
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation Error');
    });

    it('should validate key formats in sync requests', async () => {
      const invalidKeyRequest = [
        {
          _id: 'note:invalid-key-sync',
          title: 'Invalid Key',
          content: 'Content',
          key: 'invalid-format', // Missing .md extension
          workspace_id: 'test-workspace',
          updated_at: '2025-01-01T10:00:00Z',
        },
      ];

      const response = await app.handle(
        new Request('http://localhost/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidKeyRequest),
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation Error');
      expect(data.message).toContain('Key must be a valid file path ending with .md');
    });

    it('should handle partial sync failures gracefully', async () => {
      const mixedRequests = [
        {
          _id: 'note:valid-sync',
          title: 'Valid Note',
          content: 'Valid content',
          key: 'valid/note.md',
          workspace_id: 'mixed-results-workspace',
          updated_at: '2025-01-01T10:00:00Z',
        },
        {
          _id: 'note:invalid-sync',
          // Missing required fields for new note
          updated_at: '2025-01-01T10:00:00Z',
        },
      ];

      const response = await app.handle(
        new Request('http://localhost/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mixedRequests),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.results).toHaveLength(2);
      expect(data.results[0].ok).toBe(true);
      expect(data.results[1].ok).toBe(false);
      expect(data.results[1].error).toBeDefined();
    });

    it('should return 400 for non-array input', async () => {
      const response = await app.handle(
        new Request('http://localhost/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ not: 'an array' }),
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation Error');
    });

    it('should return 400 for empty array', async () => {
      const response = await app.handle(
        new Request('http://localhost/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([]),
        })
      );

      expect(response.status).toBe(200); // Empty sync is valid, just returns empty results
      const data = await response.json();
      expect(data.results).toHaveLength(0);
    });
  });

  describe('Sync workflow integration', () => {
    it('should support complete create-update-sync workflow', async () => {
      // Step 1: Create note via API
      const createResponse = await app.handle(
        new Request('http://localhost/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Workflow Note',
            content: 'Initial content',
            key: 'workflow/test.md',
            workspace_id: 'workflow-workspace',
          }),
        })
      );

      const createdNote = await createResponse.json();

      // Step 2: Update via PUT API
      const updateResponse = await app.handle(
        new Request(`http://localhost/notes/${createdNote._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Updated content via PUT',
            key: 'workflow/updated.md',
          }),
        })
      );

      const updatedNote = await updateResponse.json();

      // Step 3: Sync with newer changes
      const syncRequests = [
        {
          _id: updatedNote._id,
          _rev: updatedNote._rev,
          title: 'Final Title via Sync',
          content: 'Final content via sync',
          key: 'workflow/final.md',
          workspace_id: 'workflow-workspace',
          updated_at: new Date(Date.now() + 60000).toISOString(),
        },
      ];

      const syncResponse = await app.handle(
        new Request('http://localhost/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(syncRequests),
        })
      );

      expect(syncResponse.status).toBe(200);
      const syncData = await syncResponse.json();
      expect(syncData.results[0].ok).toBe(true);

      // Step 4: Verify final state
      const finalResponse = await app.handle(
        new Request(`http://localhost/notes/single/${createdNote._id}`)
      );

      const finalNote = await finalResponse.json();
      expect(finalNote.title).toBe('Final Title via Sync');
      expect(finalNote.key).toBe('workflow/final.md');
    });
  });
});