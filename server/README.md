# HackUTA Server

A FastAPI-based REST server for the HackUTA project.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints

- `GET /` - Root endpoint with welcome message
- `GET /health` - Health check endpoint

## Development

The server will be available at `http://localhost:8000`

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
