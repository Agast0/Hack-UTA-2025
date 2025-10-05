"""
Agent-specific routes for AI agent interactions
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Any
import os
import logging
from agentuity_agents.my_agent.agent import run
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["agent"])

class TestCase(BaseModel):
    what_to_test: str
    expected_output: Optional[str] = None

class AgentRequestModel(BaseModel):
    url: str
    content_type: Optional[str] = "text/plain"
    team_id: str
    test_cases: Optional[List[TestCase]] = None

class AgentResponseModel(BaseModel):
    response: Any
    success: bool
    error: Optional[str] = None

@router.post("/", response_model=AgentResponseModel)
async def run_agent(request: AgentRequestModel):
    """Run the agent with the provided text input"""
    try:
        # Check if GOOGLE_API_KEY is set
        if not os.getenv("GOOGLE_API_KEY"):
            return AgentResponseModel(
                response="",
                success=False,
                error="GOOGLE_API_KEY environment variable is not set. Please set it with: export GOOGLE_API_KEY='your-api-key-here'"
            )
        
        # Create FastAPI-compatible request/response objects
        class FastAPIRequest:
            def __init__(self, url: str, content_type: str = "text/plain", tester_user_id: str = None, test_cases: list = None):
                self.content_type = content_type
                self.url = url
                self.team_id = tester_user_id
                self.test_cases = test_cases
                
                # Create a proper data object with both url and test_cases
                class RequestData:
                    def __init__(self, url, test_cases, tester_user_id):
                        self.url = url
                        self.test_cases = test_cases
                        self.team_id = tester_user_id
                
                self.data = RequestData(url, test_cases, tester_user_id)
        
        class FastAPIResponse:
            def __init__(self):
                self._response = None
            
            def text(self, response_text: str):
                self._response = response_text
                return self
            
            def json(self, data):
                self._response = data
                return self
            
            def get_response(self):
                return self._response
        
        class FastAPIContext:
            def __init__(self):
                self.logger = logger
        
        # Create FastAPI-compatible objects
        fastapi_request = FastAPIRequest(request.url, request.content_type, request.team_id, request.test_cases)
        fastapi_response = FastAPIResponse()
        fastapi_context = FastAPIContext()

        # print fields here for debuging
        print(f"URL: {request.url}")
        print(f"Content type: {request.content_type}")
        print(f"Tester user ID: {request.team_id}")
        print(f"Test cases: {request.test_cases}")
        
        # Run the agent with FastAPI-compatible objects
        await run(fastapi_request, fastapi_response, fastapi_context)
        
        response_text = fastapi_response.get_response()
        if response_text is None:
            response_text = "Agent execution was skipped (debugging mode)"
        
        return AgentResponseModel(
            response=response_text,
            success=True
        )
        
    except Exception as e:
        logger.error(f"Error running agent: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return AgentResponseModel(
            response="",
            success=False,
            error=f"Agent execution failed: {str(e)}"
        )

@router.get("/status")
async def agent_status():
    """Get agent status and configuration"""
    api_key_configured = bool(os.getenv("GOOGLE_API_KEY"))
    
    return {
        "status": "operational" if api_key_configured else "misconfigured",
        "api_key_configured": api_key_configured,
        "model": "gemini-2.0-flash",
        "endpoints": {
            "run_agent": "POST /agent/",
            "status": "GET /agent/status"
        }
    }
