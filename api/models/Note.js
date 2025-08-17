const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  at: { type: Date, required: true },
  statusCode: { type: Number, required: true },
  ok: { type: Boolean, required: true },
  error: { type: String }
}, { _id: false });

const noteSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  body: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000
  },
  releaseAt: { 
    type: Date, 
    required: true,
    index: true // Index for finding due notes quickly
  },
  webhookUrl: { 
    type: String, 
    required: true,
    trim: true
  },
  status: { 
    type: String, 
    enum: ['pending', 'delivered', 'failed', 'dead'],
    default: 'pending',
    index: true // Index for listing by status
  },
  attempts: [attemptSchema],
  deliveredAt: { 
    type: Date, 
    default: null 
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
noteSchema.index({ status: 1, releaseAt: 1 });

// Virtual for idempotency key
noteSchema.virtual('idempotencyKey').get(function() {
  const crypto = require('crypto');
  return crypto.createHash('sha256')
    .update(`${this._id}:${this.releaseAt.toISOString()}`)
    .digest('hex');
});

// Ensure virtuals are serialized
noteSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Note', noteSchema);
