#!/bin/bash

# Agentuity Development Server Startup Script
# This script sets up the environment and starts Agentuity dev mode

echo "🚀 Starting Agentuity Development Server..."

# Set up environment variables (load from .env file)
echo "🔑 Loading environment variables from .env file..."
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "⚠️  Warning: .env file not found. Make sure to set GOOGLE_API_KEY manually."
fi

# Kill any existing Agentuity processes
echo "🧹 Cleaning up existing processes..."
pkill -f agentuity 2>/dev/null || true

# Wait a moment for processes to clean up
sleep 2

# Change to the server directory
cd /Users/zahaab/Documents/HackUTA/server

# Activate virtual environment
echo "🐍 Activating virtual environment..."
source .venv/bin/activate

# Start Agentuity dev mode
echo "🎯 Starting Agentuity dev mode on port 8001..."
agentuity dev
