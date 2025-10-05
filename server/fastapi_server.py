from fastapi import FastAPI
import logging
from dotenv import load_dotenv

# Import route modules
from routes.system import router as system_router
from routes.health import router as health_router
from routes.agent import router as agent_router
from main import app as core_app

# Load environment variables from .env file
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Agentuity Agent API",
    description="FastAPI endpoint for the Agentuity agent with separated routes",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Include routers
app.include_router(system_router)
app.include_router(health_router)
app.include_router(agent_router)

# Merge routes from the main FastAPI app (users/teams/bugs endpoints)
for route in core_app.router.routes:
    app.router.routes.append(route)

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Check for required environment variables
    if not os.getenv("GOOGLE_API_KEY"):
        logger.error("GOOGLE_API_KEY environment variable is required")
        exit(1)
    
    # Run the server
    uvicorn.run(
        "fastapi_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
