from fastapi import FastAPI, Response
import logging
import os
from dotenv import load_dotenv
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.middleware.cors import CORSMiddleware

# Import route modules
from routes.system import router as system_router
from routes.health import router as health_router
from routes.agent import router as agent_router
from main import app as core_app
from models import User, BugReport, Team, TestCase, BugFinding, AgentRun

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

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Preflight catch-all to satisfy browsers for any route
@app.options('/{path:path}')
def cors_preflight(path: str):
    return Response(status_code=204)

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
    # Initialize Beanie with all document models used by the app
    await init_beanie(
        database=client[db_name],
        document_models=[User, Team, BugReport, TestCase, BugFinding, AgentRun],
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
    
    # Check for optional environment variables
    if not os.getenv("GOOGLE_API_KEY"):
        logger.warning("GOOGLE_API_KEY environment variable not set - AI agent features will be disabled")
    
    # Run the server
    uvicorn.run(
        "fastapi_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
