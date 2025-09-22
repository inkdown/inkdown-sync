import { beforeAll, afterAll, expect } from '@jest/globals';

// Set up test environment variables
process.env.COUCH_URL = 'http://localhost:5984';
process.env.COUCH_DB_NAME = 'inkdown-test';
process.env.PORT = '3001';
process.env.NODE_ENV = 'test';

// Global test setup
beforeAll(async () => {
  // Setup global test configuration
});

afterAll(async () => {
  // Cleanup after all tests
});

// Extend Jest matchers if needed
expect.extend({
  toBeValidNote(received) {
    const hasRequiredFields = received && 
      typeof received._id === 'string' &&
      typeof received.title === 'string' &&
      typeof received.content === 'string' &&
      typeof received.key === 'string' &&
      typeof received.workspace_id === 'string' &&
      typeof received.created_at === 'string' &&
      typeof received.updated_at === 'string';

    const hasValidKey = received.key && /^[\w\-\/]+\.md$/.test(received.key);

    if (hasRequiredFields && hasValidKey) {
      return {
        message: () => `expected ${received} not to be a valid note`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid note`,
        pass: false,
      };
    }
  },
});

declare module '@jest/expect' {
  interface Matchers<R> {
    toBeValidNote(): R;
  }
}