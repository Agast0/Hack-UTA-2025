# Agentuity Agent FastAPI Server

A clean, production-ready FastAPI server that exposes your Agentuity agent through REST API endpoints.

## 🚀 Quick Start

1. **Set up your API key:**
   ```bash
   # Create .env file with your Google API key
   echo "GOOGLE_API_KEY=your-google-api-key-here" > .env
   ```

2. **Start the server:**
   ```bash
   ./run_server.sh
   ```

3. **Test the API:**
   - **Server:** http://localhost:8000
   - **Docs:** http://localhost:8000/docs
   - **Agent:** POST http://localhost:8000/agent

## 📁 Project Structure

```
server/
├── main.py                 # Main entry point
├── fastapi_server.py      # FastAPI application
├── run_server.sh          # Startup script
├── routes/                # Route modules
│   ├── __init__.py
│   ├── system.py          # System routes
│   ├── health.py          # Health check routes
│   └── agent.py           # Agent routes
├── agentuity_agents/       # Agent code
│   └── my_agent/
│       └── agent.py       # Your agent implementation
├── agentuity.yaml         # Agentuity configuration
├── pyproject.toml         # Dependencies
├── venv/                  # Virtual environment
└── .env                   # Environment variables (create this)
```

## 🔧 API Endpoints

### System Routes
- **GET** `/` - Server status
- **GET** `/info` - Server information
- **GET** `/welcome` - Welcome message

### Health Routes
- **GET** `/health/` - Health check
- **GET** `/health/ready` - Readiness check
- **GET** `/health/live` - Liveness check

### Agent Routes
- **POST** `/agent/` - Run the agent
- **GET** `/agent/status` - Agent status

## 📝 Example Usage

**Test with curl:**
```bash
# Test system endpoints
curl http://localhost:8000/
curl http://localhost:8000/health/
curl http://localhost:8000/agent/status

# Test agent endpoint
curl -X POST "http://localhost:8000/agent/" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, how are you?", "content_type": "text/plain"}'
```

**Test with Postman:**
- **System:** GET http://localhost:8000/
- **Health:** GET http://localhost:8000/health/
- **Agent:** POST http://localhost:8000/agent/
- **Body:** `{"text": "Your message", "content_type": "text/plain"}`

## 🔑 Getting API Keys

Get your Google API key from: https://makersuite.google.com/app/apikey
