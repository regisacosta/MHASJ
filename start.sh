#!/bin/bash

# Kill any processes that might be using port 10000
echo "Checking for processes using port 10000..."
lsof -i :10000 | grep LISTEN | awk '{print $2}' | xargs -r kill -9
echo "Starting server..."
node server.js
