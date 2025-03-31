const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { processScreeningResponses } = require('./claude');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


// Enhanced middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API version
const API_VERSION = 'v1';

// Initialize screening sessions storage
// In production, use Redis or another persistent store
const screeningSessions = new Map();

/**
 * Start or continue a screening session
 * POST /api/v1/screening
 */
app.post(`/api/${API_VERSION}/screening`, async (req, res) => {
  try {
    const { sessionId, responses } = req.body;
    
    // Validate request data
    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: responses object is required'
      });
    }
    
    // Get or create session
    let session = { conversationHistory: [] };
    if (sessionId && screeningSessions.has(sessionId)) {
      session = screeningSessions.get(sessionId);
    }
    
    // Process responses through Claude AI
    const result = await processScreeningResponses(responses, session.conversationHistory);
    
    // Generate new session ID if needed
    const newSessionId = sessionId || generateSessionId();
    
    // Update session data
    screeningSessions.set(newSessionId, {
      conversationHistory: result.conversationHistory,
      lastUpdated: new Date(),
      isComplete: result.conversationComplete
    });
    
    // Set session expiry (clear old sessions periodically)
    setTimeout(() => {
      if (screeningSessions.has(newSessionId)) {
        screeningSessions.delete(newSessionId);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    // Send response
    res.json({
      success: true,
      sessionId: newSessionId,
      analysis: result.analysis,
      followUpQuestions: result.followUpQuestions,
      isComplete: result.conversationComplete
    });
  } catch (error) {
    console.error('Screening processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing screening',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get screening session status
 * GET /api/v1/screening/:sessionId
 */
app.get(`/api/${API_VERSION}/screening/:sessionId`, (req, res) => {
  const { sessionId } = req.params;
  
  if (!screeningSessions.has(sessionId)) {
    return res.status(404).json({
      success: false,
      message: 'Session not found or expired'
    });
  }
  
  const session = screeningSessions.get(sessionId);
  
  res.json({
    success: true,
    sessionId,
    isComplete: session.isComplete,
    lastUpdated: session.lastUpdated
  });
});

/**
 * Legacy endpoint for backward compatibility
 * POST /submit-screening
 */
app.post('/submit-screening', async (req, res) => {
  try {
    const { responses, conversationHistory = [] } = req.body;
    
    // Process with claude.js
    const result = await processScreeningResponses(responses, conversationHistory);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Legacy screening processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing screening'
    });
  }
});

/**
 * Generate a unique session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 12);
}

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/**
 * Catch-all route for single-page application
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API version: ${API_VERSION}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  // Close server and any database connections here
  process.exit(0);
});

module.exports = app; // For testing purposes
