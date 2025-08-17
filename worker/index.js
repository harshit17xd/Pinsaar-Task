require('dotenv').config();
const mongoose = require('mongoose');
const { Queue } = require('bullmq');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const logger = require('../api/utils/logger');

dayjs.extend(utc);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('Worker connected to MongoDB');
})
.catch((error) => {
  logger.error('Worker MongoDB connection error:', error);
  process.exit(1);
});

// Create Redis connection and queue
const connection = {
  host: process.env.REDIS_URL?.split('://')[1]?.split(':')[0] || 'localhost',
  port: process.env.REDIS_URL?.split(':')[2]?.split('/')[0] || 6379
};

const deliveryQueue = new Queue('note-delivery', { connection });

// Polyfill fetch for Node.js < 18
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

// Import Note model
const Note = require('../api/models/Note');

// Delivery logic with exponential backoff
const backoffDelays = [1000, 5000, 25000]; // 1s, 5s, 25s
const maxAttempts = 3;

async function deliverNote(note, attemptNumber = 0) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(note.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Note-Id': note._id.toString(),
        'X-Idempotency-Key': note.idempotencyKey
      },
      body: JSON.stringify({
        id: note._id,
        title: note.title,
        body: note.body,
        releaseAt: note.releaseAt,
        webhookUrl: note.webhookUrl
      })
    });

    const duration = Date.now() - startTime;
    const isSuccess = response.ok;
    
    // Record attempt
    const attempt = {
      at: new Date(),
      statusCode: response.status,
      ok: isSuccess,
      error: isSuccess ? null : `HTTP ${response.status}`
    };

    await Note.findByIdAndUpdate(note._id, {
      $push: { attempts: attempt }
    });

    logger.info({
      noteId: note._id,
      try: attemptNumber + 1,
      statusCode: response.status,
      ok: isSuccess,
      ms: duration,
      at: new Date().toISOString()
    });

    if (isSuccess) {
      // Mark as delivered
      await Note.findByIdAndUpdate(note._id, {
        status: 'delivered',
        deliveredAt: new Date()
      });
      logger.info({ noteId: note._id, action: 'note_delivered' });
      return true;
    } else {
      // Handle failure
      if (attemptNumber < maxAttempts - 1) {
        // Schedule retry with exponential backoff
        const delay = backoffDelays[attemptNumber];
        setTimeout(() => {
          deliverNote(note, attemptNumber + 1);
        }, delay);
        logger.info({ noteId: note._id, action: 'scheduling_retry', attempt: attemptNumber + 1, delay });
      } else {
        // Mark as dead after max attempts
        await Note.findByIdAndUpdate(note._id, {
          status: 'dead'
        });
        logger.error({ noteId: note._id, action: 'note_marked_dead' });
      }
      return false;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Record attempt
    const attempt = {
      at: new Date(),
      statusCode: 0,
      ok: false,
      error: error.message
    };

    await Note.findByIdAndUpdate(note._id, {
      $push: { attempts: attempt }
    });

    logger.error({
      noteId: note._id,
      try: attemptNumber + 1,
      statusCode: 0,
      ok: false,
      ms: duration,
      at: new Date().toISOString(),
      error: error.message
    });

    if (attemptNumber < maxAttempts - 1) {
      // Schedule retry with exponential backoff
      const delay = backoffDelays[attemptNumber];
      setTimeout(() => {
        deliverNote(note, attemptNumber + 1);
      }, delay);
      logger.info({ noteId: note._id, action: 'scheduling_retry', attempt: attemptNumber + 1, delay });
    } else {
      // Mark as dead after max attempts
      await Note.findByIdAndUpdate(note._id, {
        status: 'dead'
      });
      logger.error({ noteId: note._id, action: 'note_marked_dead' });
    }
    return false;
  }
}

// Polling function to find due notes
async function pollForDueNotes() {
  try {
    const now = dayjs.utc().toDate();
    
    // Find notes that are due and pending
    const dueNotes = await Note.find({
      status: 'pending',
      releaseAt: { $lte: now }
    }).limit(10); // Process in batches

    logger.info({ action: 'polling_due_notes', count: dueNotes.length });

    // Process each due note
    for (const note of dueNotes) {
      // Mark as failed initially to prevent double processing
      await Note.findByIdAndUpdate(note._id, { status: 'failed' });
      
      // Deliver the note
      deliverNote(note);
    }
  } catch (error) {
    logger.error({ error: error.message, action: 'polling_failed' });
  }
}

// Start polling every 5 seconds
const pollInterval = setInterval(pollForDueNotes, 5000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Worker shutting down gracefully...');
  clearInterval(pollInterval);
  await deliveryQueue.close();
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Worker shutting down gracefully...');
  clearInterval(pollInterval);
  await deliveryQueue.close();
  await mongoose.connection.close();
  process.exit(0);
});

logger.info('Worker started - polling for due notes every 5 seconds');
