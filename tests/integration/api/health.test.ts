import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { TestServer } from '../../helpers/testServer';

describe('Health API Integration Tests', () => {
  let testServer: TestServer;
  let app: any;

  beforeAll(async () => {
    testServer = new TestServer();
    app = await testServer.start();
  });

  afterAll(async () => {
    await testServer.stop();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await app.handle(
        new Request('http://localhost/health')
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should return valid timestamp format', async () => {
      const response = await app.handle(
        new Request('http://localhost/health')
      );

      const data = await response.json();
      const timestamp = new Date(data.timestamp);
      expect(timestamp.toISOString()).toBe(data.timestamp);
    });

    it('should be accessible without authentication', async () => {
      // Health endpoint should always be accessible
      const response = await app.handle(
        new Request('http://localhost/health')
      );

      expect(response.status).toBe(200);
    });
  });
});