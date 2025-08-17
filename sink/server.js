require('dotenv').config();
const express = require('express');
const Redis = require('redis');
const logger = require('../api/utils/logger');

const app = express();
const PORT = process.env.SINK_PORT || 4000;

// Redis client for idempotency
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Sink connected to Redis');
});

// Connect to Redis
(async () => {
  await redisClient.connect();
})();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Webhook receiver endpoint
app.post('/sink', async (req, res) => {
  try {
    const idempotencyKey = req.headers['x-idempotency-key'];
    const noteId = req.headers['x-note-id'];
    
    if (!idempotencyKey) {
      logger.warn({ action: 'missing_idempotency_key', noteId });
      return res.status(400).json({ 
        error: 'Missing idempotency key',
        details: ['X-Idempotency-Key header is required']
      });
    }

    // Check for idempotency (exactly-once delivery)
    const idempotencyRedisKey = `idempotency:${idempotencyKey}`;
    const isDuplicate = await redisClient.set(idempotencyRedisKey, '1', {
      EX: 86400, // 24 hours
      NX: true // Only set if not exists
    });

    if (!isDuplicate) {
      // This is a duplicate request - return success without processing
      logger.info({ 
        action: 'duplicate_request_ignored', 
        noteId, 
        idempotencyKey 
      });
      return res.status(200).json({ 
        message: 'Already processed',
        noteId,
        idempotencyKey
      });
    }

    // Simulate failure based on environment variable
    const failureRate = parseFloat(process.env.SINK_FAILURE_RATE) || 0;
    if (Math.random() < failureRate) {
      logger.error({ 
        action: 'simulated_failure', 
        noteId, 
        failureRate 
      });
      return res.status(500).json({ 
        error: 'Simulated failure',
        details: ['Sink is configured to fail randomly']
      });
    }

    // Process the webhook payload
    const payload = req.body;
    
    logger.info({
      action: 'webhook_received',
      noteId: payload.id,
      title: payload.title,
      body: payload.body,
      releaseAt: payload.releaseAt,
      webhookUrl: payload.webhookUrl,
      idempotencyKey
    });

    // Return success response
    res.status(200).json({
      message: 'Webhook processed successfully',
      noteId: payload.id,
      receivedAt: new Date().toISOString(),
      payload: {
        title: payload.title,
        body: payload.body,
        releaseAt: payload.releaseAt
      }
    });

  } catch (error) {
    logger.error({ 
      error: error.message, 
      action: 'webhook_processing_failed',
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: ['Failed to process webhook']
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error({ error: err.message, stack: err.stack });
  res.status(500).json({ 
    error: 'Internal server error', 
    details: ['Something went wrong'] 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found', 
    details: ['Endpoint not found'] 
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Sink shutting down gracefully...');
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Sink shutting down gracefully...');
  await redisClient.quit();
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`Sink server running on port ${PORT}`);
  logger.info(`Failure rate: ${process.env.SINK_FAILURE_RATE || 0}`);
});
