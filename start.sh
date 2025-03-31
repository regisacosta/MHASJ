#!/bin/bash

# Print environment information
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Current directory: $(pwd)"

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "WARNING: ANTHROPIC_API_KEY environment variable is not set"
  echo "Fallback responses will be used instead of AI-powered analysis"
else
  echo "ANTHROPIC_API_KEY is configured (length: ${#ANTHROPIC_API_KEY})"
fi

# Kill any processes that might be using port 10000
echo "Checking for processes using port 10000..."
lsof -i :10000 | grep LISTEN | awk '{print $2}' | xargs -r kill -9

# Wait a moment for ports to be released
sleep 2

# Create required directories
mkdir -p public

# Start server
echo "Starting server..."
node server.js