"""
System and system information routes
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

router = APIRouter(tags=["system"])

@router.get("/")
async def root():
    """Root endpoint with basic server information"""
    return {
        "message": "Agentuity Agent API is running",
        "version": "1.0.0",
        "status": "operational"
    }

@router.get("/info")
async def server_info():
    """Get server information"""
    return {
        "service": "agentuity-agent-api",
        "version": "1.0.0",
        "status": "operational",
        "api_key_configured": bool(os.getenv("GOOGLE_API_KEY")),
        "endpoints": {
            "health": "/health/",
            "agent": "/agent/",
            "docs": "/docs"
        }
    }

@router.get("/welcome")
async def get_welcome():
    """Get welcome message and example prompts"""
    try:
        from agentuity_agents.my_agent.agent import welcome
        welcome_data = welcome()
        return JSONResponse(content=welcome_data)
    except Exception as e:
        return JSONResponse(
            content={"error": f"Failed to get welcome message: {str(e)}"},
            status_code=500
        )
