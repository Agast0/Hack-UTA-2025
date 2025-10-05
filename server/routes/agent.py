"""
Agent-specific routes for AI agent interactions
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import logging
from agentuity_agents.my_agent.agent import run
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["agent"])

class AgentRequestModel(BaseModel):
    text: str
    content_type: Optional[str] = "text/plain"

class AgentResponseModel(BaseModel):
    response: str
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
        
        # Create mock AgentRequest and AgentResponse objects
        class MockAgentRequest:
            def __init__(self, text: str, content_type: str = "text/plain"):
                self._text = text
                self._content_type = content_type
            
            async def data(self):
                class MockData:
                    def __init__(self, text: str, content_type: str):
                        self._text = text
                        self._content_type = content_type
                    
                    async def text(self):
                        return self._text
                    
                    def content_type(self):
                        return self._content_type
                
                return MockData(self._text, self._content_type)
        
        class MockAgentResponse:
            def __init__(self):
                self._response = None
            
            def text(self, response_text: str):
                self._response = response_text
                return self
            
            def get_response(self):
                return self._response
        
        class MockAgentContext:
            def __init__(self):
                self.logger = logger
        
        # Create mock objects
        mock_request = MockAgentRequest(request.text, request.content_type)
        mock_response = MockAgentResponse()
        mock_context = MockAgentContext()
        
        # Run the agent
        await run(mock_request, mock_response, mock_context)
        
        response_text = mock_response.get_response()
        
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
