const express = require('express');
const { createNoteSchema, listNotesSchema } = require('../validation/noteSchema');
const Note = require('../models/Note');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// POST /api/notes - create note
router.post('/', async (req, res) => {
  try {
    const validatedData = createNoteSchema.parse(req.body);
    
    const note = new Note(validatedData);
    await note.save();
    
    logger.info({ noteId: note._id, action: 'note_created' });
    
    res.status(201).json({ 
      id: note._id,
      message: 'Note created successfully' 
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
      });
    }
    
    logger.error({ error: error.message, action: 'create_note_failed' });
    res.status(500).json({ 
      error: 'Internal server error', 
      details: ['Failed to create note'] 
    });
  }
});

// GET /api/notes - list notes (paginated)
router.get('/', async (req, res) => {
  try {
    const validatedQuery = listNotesSchema.parse(req.query);
    const { status, page } = validatedQuery;
    const limit = 20;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (status) {
      filter.status = status;
    }
    
    const [notes, total] = await Promise.all([
      Note.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Note.countDocuments(filter)
    ]);
    
    res.json({
      notes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
      });
    }
    
    logger.error({ error: error.message, action: 'list_notes_failed' });
    res.status(500).json({ 
      error: 'Internal server error', 
      details: ['Failed to list notes'] 
    });
  }
});

// POST /api/notes/:id/replay - requeue a note
router.post('/:id/replay', async (req, res) => {
  try {
    const { id } = req.params;
    
    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ 
        error: 'Not found', 
        details: ['Note not found'] 
      });
    }
    
    if (!['failed', 'dead'].includes(note.status)) {
      return res.status(400).json({ 
        error: 'Invalid operation', 
        details: ['Can only replay failed or dead notes'] 
      });
    }
    
    // Reset note to pending status
    note.status = 'pending';
    note.attempts = [];
    note.deliveredAt = null;
    await note.save();
    
    logger.info({ noteId: note._id, action: 'note_replayed' });
    
    res.json({ 
      message: 'Note requeued successfully',
      id: note._id 
    });
  } catch (error) {
    logger.error({ error: error.message, action: 'replay_note_failed' });
    res.status(500).json({ 
      error: 'Internal server error', 
      details: ['Failed to replay note'] 
    });
  }
});

module.exports = router;
