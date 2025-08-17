// Test setup file
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/droplater-test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'test-admin-token';

// Increase timeout for all tests
jest.setTimeout(40000);
