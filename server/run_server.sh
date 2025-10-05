#!/bin/bash

# Activate virtual environment and run the FastAPI server
cd /Users/zahaab/Documents/HackUTA/server
source venv/bin/activate

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file with your Google API key:"
    echo "GOOGLE_API_KEY=your-google-api-key-here"
    echo "Get your API key from: https://makersuite.google.com/app/apikey"
    exit 1
fi

# Check if GOOGLE_API_KEY is set in .env file
if ! grep -q "GOOGLE_API_KEY=" .env || grep -q "GOOGLE_API_KEY=your-google-api-key-here" .env; then
    echo "❌ GOOGLE_API_KEY is not properly set in .env file!"
    echo "Please edit .env file and add your actual Google API key"
    echo "Get your API key from: https://makersuite.google.com/app/apikey"
    exit 1
fi

echo "🚀 Starting Agentuity Agent FastAPI server..."
echo "📖 API Documentation: http://localhost:8000/docs"
echo "🤖 Agent endpoint: http://localhost:8000/agent"
echo "🔑 Using API key from .env file"
echo ""

python main.py
