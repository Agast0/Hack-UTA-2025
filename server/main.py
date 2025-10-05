import uvicorn
import os
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def main():
    """Start the FastAPI server for the Agentuity agent"""
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format="[%(levelname)-5.5s] %(message)s",
    )
    
    # Check for required environment variables
    if not os.getenv("GOOGLE_API_KEY"):
        print("\033[31m[ERROR] GOOGLE_API_KEY environment variable is required\033[0m")
        exit(1)
    
    print("Starting Agentuity Agent FastAPI server...")
    print("API Documentation available at: http://localhost:8000/docs")
    print("Agent endpoint: http://localhost:8000/agent")
    
    # Run the FastAPI server
    uvicorn.run(
        "fastapi_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )


if __name__ == "__main__":
    main()
