require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const notesRouter = require('./routes/notes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('Connected to MongoDB');
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60, // limit each IP to 60 requests per windowMs
  message: {
    error: 'Too many requests',
    details: ['Rate limit exceeded']
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// API routes
app.use('/api/notes', notesRouter);

// Serve admin UI
app.use('/admin', express.static(path.join(__dirname, '../admin/build')));

// Catch-all for admin routes (SPA)
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/build/index.html'));
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

app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`);
});
