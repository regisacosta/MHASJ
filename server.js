const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { processScreeningResponses, testClaudeAPI } = require('./claude');

// Load environment variables
dotenv.config();

// Check for API key
const apiKey = process.env.ANTHROPIC_API_KEY;
console.log("API Key configured:", apiKey ? "Yes (length: " + apiKey.length + ")" : "No");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('Created public directory');
}

// Serve static files
app.use(express.static(publicDir));

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY
  });
});

// API version
const API_VERSION = 'v1';

// Initialize screening sessions storage
// In production, use Redis or another persistent store
const screeningSessions = new Map();

// Test Claude API when server starts
app.once('ready', async () => {
  try {
    const apiStatus = await testClaudeAPI();
    console.log("Claude API connection test:", apiStatus ? "PASSED" : "FAILED");
  } catch (error) {
    console.error("Error testing Claude API:", error);
  }
});

/**
 * Start or continue a screening session
 * POST /api/v1/screening
 */
app.post(`/api/${API_VERSION}/screening`, async (req, res) => {
  try {
    console.log("Received screening request");
    const { sessionId, responses } = req.body;
    
    // Validate request data
    if (!responses || typeof responses !== 'object') {
      console.error("Invalid request: missing or invalid responses object");
      return res.status(400).json({
        success: false,
        message: 'Invalid request: responses object is required'
      });
    }
    
    console.log("Processing request with session ID:", sessionId || "new session");
    
    // Get or create session
    let session = { conversationHistory: [] };
    if (sessionId && screeningSessions.has(sessionId)) {
      session = screeningSessions.get(sessionId);
      console.log("Retrieved existing session with history length:", session.conversationHistory.length);
    }
    
    // Process responses through Claude AI
    console.log("Calling processScreeningResponses...");
    const result = await processScreeningResponses(responses, session.conversationHistory);
    console.log("Received result, conversation complete:", result.conversationComplete);
    
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
        console.log(`Session ${newSessionId} expired and removed`);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    // Send response
    res.json({
      success: true,
      sessionId: newSessionId,
      analysis: result.analysis,
      followUpQuestions: result.followUpQuestions,
      isComplete: result.conversationComplete,
      usingFallback: result.isUsingFallback
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
    console.log("Received legacy screening request");
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
 * API key test endpoint
 * GET /api/v1/test-claude
 */
app.get(`/api/${API_VERSION}/test-claude`, async (req, res) => {
  try {
    const result = await testClaudeAPI();
    res.json({
      success: result,
      message: result ? 'Claude API connection successful' : 'Claude API connection failed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing Claude API',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Generate a unique session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
  return 'session_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
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
 * Create a basic index.html file if it doesn't exist
 */
const indexHtmlPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  const basicHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mental Health Screening Tool</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Mental Health Screening Tool</h1>
        <p>API server is running. The screening tool interface will be loaded here.</p>
    </div>
    <script>
        // Verify server is working
        fetch('/health')
            .then(response => response.json())
            .then(data => {
                console.log('Server status:', data);
            })
            .catch(error => {
                console.error('Error checking server health:', error);
            });
    </script>
</body>
</html>
  `;
  
  fs.writeFileSync(indexHtmlPath, basicHtml);
  console.log('Created basic index.html file');
}

/**
 * Catch-all route for single-page application
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Get available port
const getAvailablePort = () => {
  const requested = parseInt(process.env.PORT) || 3000;
  return requested;
};

// Start server with error handling for EADDRINUSE
const server = app.listen(getAvailablePort(), () => {
  const actualPort = server.address().port;
  console.log(`Server running on port ${actualPort}`);
  console.log(`API version: ${API_VERSION}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Emit ready event to run API test
  app.emit('ready');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Exiting...`);
    // For Render specifically, we can exit and let the platform retry
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force close after 5 seconds
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 5000);
});

module.exports = app; // For testing purposes