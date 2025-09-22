import { Elysia } from 'elysia';
import { couch } from '../../src/couch';
import { container } from '../../src/utils/container';
import { errorHandler } from '../../src/middleware/errorHandler';

export class TestServer {
  private app: any;
  
  constructor() {
    this.app = new Elysia()
      .onError(({ error, set }) => {
        console.error('Test server error:', error);
        set.status = 500;
        return { error: 'Internal Server Error' };
      })
      .post('/notes', async ({ body, set }) => {
        const result = await container.syncController.createNote(body);
        set.status = 201;
        return result;
      })
      .put('/notes/:id', async ({ params: { id }, body }) => {
        return await container.syncController.updateNote(id, body);
      })
      .get('/notes/single/:id', async ({ params: { id } }) => {
        return await container.syncController.getNoteById(id);
      })
      .get('/notes/:workspaceId', async ({ params: { workspaceId } }) => {
        return await container.syncController.getNotesByWorkspace(workspaceId);
      })
      .post('/sync', async ({ body }) => {
        return await container.syncController.syncNotes(body);
      })
      .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }));
  }

  async start() {
    try {
      await couch.ensureDatabase();
    } catch (error) {
      console.warn('CouchDB not available for tests, using mock responses');
    }
    return this.app;
  }

  async stop() {
    // Cleanup if needed
  }

  getApp() {
    return this.app;
  }
}