from fastapi import FastAPI
import logging
import os
from dotenv import load_dotenv
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

# Import route modules
from routes.system import router as system_router
from routes.health import router as health_router
from routes.agent import router as agent_router
from main import app as core_app
from models import User, BugReport, Team

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

# --- Database Connection ---
@app.on_event('startup')
async def startup_db_client():
    mongo_uri = os.getenv('MONGO_URI')
    db_name = os.getenv('DATABASE_NAME')
    if not mongo_uri or not db_name:
        logging.error(
            'MONGO_URI and DATABASE_NAME environment variables are required'
        )
        exit(1)
    client = AsyncIOMotorClient(mongo_uri)
    # Add the BugReport and Team models to the list for Beanie initialization
    await init_beanie(
        database=client[db_name], document_models=[User, BugReport, Team]
    )
    print('MongoDB connection established successfully!')

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
