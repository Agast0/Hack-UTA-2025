"""
Health and system routes
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "agentuity-agent-api"}

@router.get("/ready")
async def readiness_check():
    """Readiness check endpoint"""
    return {"status": "ready", "service": "agentuity-agent-api"}

@router.get("/live")
async def liveness_check():
    """Liveness check endpoint"""
    return {"status": "alive", "service": "agentuity-agent-api"}
