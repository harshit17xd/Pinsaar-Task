const request = require('supertest');
const mongoose = require('mongoose');
const dayjs = require('dayjs');

// Mock fetch for HTTP requests
global.fetch = jest.fn();

describe('Note Delivery Integration', () => {
  let app;
  let server;
  
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/droplater-test');
    
    // Import and start the API server
    app = require('../../api/server');
    server = app.listen(0); // Use random port
  });

  afterAll(async () => {
    await server.close();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear database before each test
    await mongoose.connection.db.dropDatabase();
    
    // Reset fetch mock
    fetch.mockClear();
  });

  test('should create note and deliver to webhook', async () => {
    const adminToken = process.env.ADMIN_TOKEN || 'test-token';
    const pastTime = dayjs().subtract(1, 'minute').toISOString();
    
    // Mock successful webhook response
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'success' })
    });

    // Create a note with past release time
    const createResponse = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Note',
        body: 'This is a test note',
        releaseAt: pastTime,
        webhookUrl: 'http://localhost:4000/sink'
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.id).toBeDefined();

    // Wait for worker to process (simulate polling)
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Check that the note was delivered
    const listResponse = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listResponse.status).toBe(200);
    const notes = listResponse.body.notes;
    const createdNote = notes.find(note => note._id === createResponse.body.id);
    
    expect(createdNote).toBeDefined();
    expect(createdNote.status).toBe('delivered');
    expect(createdNote.attempts).toHaveLength(1);
    expect(createdNote.attempts[0].ok).toBe(true);
    expect(createdNote.attempts[0].statusCode).toBe(200);

    // Verify fetch was called with correct parameters
    expect(fetch).toHaveBeenCalledTimes(1);
    const fetchCall = fetch.mock.calls[0];
    expect(fetchCall[0]).toBe('http://localhost:4000/sink');
    expect(fetchCall[1].method).toBe('POST');
    expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
    expect(fetchCall[1].headers['X-Note-Id']).toBe(createResponse.body.id);
    expect(fetchCall[1].headers['X-Idempotency-Key']).toBeDefined();
  });

  test('should retry failed deliveries with exponential backoff', async () => {
    const adminToken = process.env.ADMIN_TOKEN || 'test-token';
    const pastTime = dayjs().subtract(1, 'minute').toISOString();
    
    // Mock failed webhook responses
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' })
    });
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' })
    });
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' })
    });

    // Create a note
    const createResponse = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Note - Will Fail',
        body: 'This note will fail delivery',
        releaseAt: pastTime,
        webhookUrl: 'http://localhost:4000/sink'
      });

    expect(createResponse.status).toBe(201);

    // Wait for all retry attempts (1s + 5s + 25s = ~31s, but we'll wait less for test)
    await new Promise(resolve => setTimeout(resolve, 35000));

    // Check that the note was marked as dead after max attempts
    const listResponse = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listResponse.status).toBe(200);
    const notes = listResponse.body.notes;
    const createdNote = notes.find(note => note._id === createResponse.body.id);
    
    expect(createdNote).toBeDefined();
    expect(createdNote.status).toBe('dead');
    expect(createdNote.attempts).toHaveLength(3);
    
    // All attempts should be failed
    createdNote.attempts.forEach(attempt => {
      expect(attempt.ok).toBe(false);
      expect(attempt.statusCode).toBe(500);
    });

    // Verify fetch was called 3 times
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  test('should replay dead notes successfully', async () => {
    const adminToken = process.env.ADMIN_TOKEN || 'test-token';
    const pastTime = dayjs().subtract(1, 'minute').toISOString();
    
    // First, create a note that will fail
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' })
    });
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' })
    });
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' })
    });

    const createResponse = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Note - Will Be Replayed',
        body: 'This note will be replayed',
        releaseAt: pastTime,
        webhookUrl: 'http://localhost:4000/sink'
      });

    // Wait for it to be marked as dead
    await new Promise(resolve => setTimeout(resolve, 35000));

    // Now mock a successful response for replay
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'success' })
    });

    // Replay the note
    const replayResponse = await request(app)
      .post(`/api/notes/${createResponse.body.id}/replay`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(replayResponse.status).toBe(200);

    // Wait for delivery
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Check that the note was delivered successfully
    const listResponse = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listResponse.status).toBe(200);
    const notes = listResponse.body.notes;
    const replayedNote = notes.find(note => note._id === createResponse.body.id);
    
    expect(replayedNote).toBeDefined();
    expect(replayedNote.status).toBe('delivered');
    expect(replayedNote.attempts).toHaveLength(1); // Should be reset
    expect(replayedNote.attempts[0].ok).toBe(true);
  });
});
