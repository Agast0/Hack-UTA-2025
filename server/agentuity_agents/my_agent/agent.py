from agentuity import AgentRequest, AgentResponse, AgentContext
from google import genai
import os

# Import from separated modules
from .system_prompt import SYSTEM_PROMPT, AGENT_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES
from .tools import validate_url, setup_chrome_driver, navigate_to_url

api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    raise ValueError("GOOGLE_API_KEY environment variable not set.")

client = genai.Client(api_key=api_key)

# System prompt and tools are now imported from separate modules

def welcome():
    return {
        "welcome": f"Welcome to the {AGENT_CONFIG['name']}! {AGENT_CONFIG['description']}",
        "version": AGENT_CONFIG['version'],
        "capabilities": AGENT_CONFIG['capabilities'],
        "prompts": [
            {
                "data": "https://www.google.com",
                "contentType": "text/plain"
            },
            {
                "data": "https://github.com",
                "contentType": "text/plain"
            }
        ]
    }

def deterministic_browser_setup(input_url: str, context: AgentContext) -> tuple[bool, str, dict]:
    """
    Deterministic pre-processing: URL validation and browser navigation.
    This happens BEFORE the LLM agent gets involved.
    
    Returns:
        tuple[bool, str, dict]: (success, message, browser_context)
    """
    driver = None
    try:
        context.logger.info(f"Starting deterministic browser setup for: {input_url}")
        
        # Step 1: Validate URL (deterministic)
        if not input_url:
            return False, ERROR_MESSAGES["no_url"], {}
        
        is_valid, error_msg = validate_url(input_url)
        if not is_valid:
            context.logger.error(f"URL validation failed: {error_msg}")
            return False, ERROR_MESSAGES["invalid_url"].format(error_msg=error_msg), {}
        
        # Add protocol if missing
        if not input_url.startswith(('http://', 'https://')):
            input_url = 'https://' + input_url
        
        context.logger.info(f"URL validated: {input_url}")
        
        # Step 2: Setup browser (deterministic)
        # Check if we should keep browser open for dev inspection
        keep_browser_open = os.getenv("KEEP_BROWSER_OPEN", "false").lower() in ("true", "1", "yes")
        context.logger.info(f"Setting up Chrome driver... (keep_open: {keep_browser_open})")
        driver = setup_chrome_driver(keep_open=keep_browser_open)
        
        # Step 3: Navigate to URL (deterministic)
        context.logger.info(f"Navigating to: {input_url}")
        page_info = navigate_to_url(driver, input_url)
        
        context.logger.info(f"Successfully loaded page: {page_info['title']}")
        
        # Return browser context for the agent
        browser_context = {
            "driver": driver,
            "page_info": page_info,
            "input_url": input_url,
            "current_url": page_info["current_url"],
            "page_title": page_info["title"],
            "page_source_length": page_info["source_length"],
            "keep_open": keep_browser_open
        }
        
        return True, "Browser setup completed successfully", browser_context
        
    except Exception as e:
        context.logger.error(f"Error in deterministic browser setup: {e}")
        import traceback
        context.logger.error(f"Full traceback: {traceback.format_exc()}")
        
        if driver:
            try:
                driver.quit()
            except:
                pass
                
        return False, f"{ERROR_MESSAGES['navigation_failed']}\n\n**Error**: {str(e)}", {}


async def run(request: AgentRequest, response: AgentResponse, context: AgentContext):
    """
    Main agent function that processes URL input.
    First does deterministic browser setup, then LLM agent takes over.
    """
    try:
        # Get the input text (URL)
        data = await request.data()
        input_url = await data.text()
        
        # STEP 1: Deterministic browser setup (no LLM involved)
        success, message, browser_context = deterministic_browser_setup(input_url, context)
        
        if not success:
            return response.text(message)
        
        # STEP 2: LLM Agent takes over with browser already open
        driver = browser_context["driver"]
        page_info = browser_context["page_info"]
        
        # Generate AI response using the system prompt
        prompt = f"""
        {SYSTEM_PROMPT}
        
        Browser Status: Successfully opened and navigated
        Current Page: {browser_context['page_title']}
        URL: {browser_context['current_url']}
        Page Size: {browser_context['page_source_length']} characters
        
        The browser is now ready for your tools and interactions.
        Please provide a professional response about the successful setup and what you can do next.
        """
        
        result = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        
        # Format the response based on browser mode
        browser_status = ""
        if browser_context.get('keep_open', False):
            browser_status = f"""
🔍 **Browser Status**: Browser window is open and ready for manual inspection
   - You can inspect the page, console, and network tabs
   - Browser will stay open until you manually close it
   - Use the browser developer tools to debug and inspect"""
        else:
            browser_status = f"""
🔍 **Browser Status**: Browser will close automatically after response
   - Set KEEP_BROWSER_OPEN=true environment variable to keep it open for inspection"""
        
        # Format the response
        response_text = f"""{SUCCESS_MESSAGES['navigation_success']}

🌐 **URL**: {browser_context['current_url']}
📄 **Page Title**: {browser_context['page_title']}
📊 **Page Size**: {browser_context['page_source_length']:,} characters
🤖 **AI Analysis**: {result.text}

{SUCCESS_MESSAGES['ready_for_interaction']}
{browser_status}"""
        
        return response.text(response_text)
        
    except Exception as e:
        context.logger.error(f"Error running agent: {e}")
        import traceback
        context.logger.error(f"Full traceback: {traceback.format_exc()}")
        
        error_response = f"""{ERROR_MESSAGES['navigation_failed']}

**Error**: {str(e)}

**Troubleshooting**:
- Verify the URL is accessible
- Check your internet connection
- Ensure the website is not blocking automated browsers
- Try a different URL

**Status**: Browser automation failed"""
        
        return response.text(error_response)
        
    finally:
        # Handle browser cleanup based on environment setting
        if 'browser_context' in locals() and browser_context.get('driver'):
            if browser_context.get('keep_open', False):
                context.logger.info("Browser left open for manual inspection. Close it manually when done.")
                # Note: Not calling driver.quit() to keep browser open for inspection
            else:
                try:
                    browser_context['driver'].quit()
                    context.logger.info("Chrome driver closed successfully")
                except Exception as e:
                    context.logger.error(f"Error closing driver: {e}")