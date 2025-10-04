from agentuity import AgentRequest, AgentResponse, AgentContext
from google import genai
import os

api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    raise ValueError("GOOGLE_API_KEY environment variable not set.")

client = genai.Client(api_key=api_key)

def welcome():
    return {
        "welcome": "Welcome to the Google AI Python Agent! I can help you build AI-powered applications using Gemini models.",
        "prompts": [
            {
                "data": "How do I implement streaming responses with Gemini models?",
                "contentType": "text/plain"
            },
            {
                "data": "What are the best practices for prompt engineering with Gemini?",
                "contentType": "text/plain"
            }
        ]
    }

async def run(request: AgentRequest, response: AgentResponse, context: AgentContext):
    try:
        # Get the input text
        data = await request.data()
        input_text = await data.text() or "Hello, Gemini"
        context.logger.info(f"Input text: {input_text}")
        
        # Generate content
        result = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=input_text
        )
        
        context.logger.info(f"Result type: {type(result)}")
        context.logger.info(f"Result text: {result.text}")
        
        return response.text(result.text)
    except Exception as e:
        context.logger.error(f"Error running agent: {e}")
        import traceback
        context.logger.error(f"Full traceback: {traceback.format_exc()}")

        return response.text("Sorry, there was an error processing your request.")