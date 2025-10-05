from agentuity import AgentRequest, AgentResponse, AgentContext
from google import genai
import os

# Import from separated modules
from agentuity_agents.my_agent.system_prompt import SYSTEM_PROMPT, AGENT_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES
from agentuity_agents.my_agent.tools import (
    validate_url, setup_chrome_driver, navigate_to_url, discover_page_elements, 
    take_annotated_screenshot, remove_annotations, click_element, scroll_page, 
    extract_element_info, BROWSER_TOOLS
)

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
        # Get the input text (URL) - handle both FastAPI and Agentuity dynamically
        input_url = None
        
        # Try different data access patterns
        try:
            # Pattern 1: Agentuity style - request.data.text()
            if hasattr(request.data, 'text'):
                data_text = await request.data.text()
                # Handle JSON format from Agentuity
                if data_text.startswith('{') and 'url' in data_text:
                    import json
                    data_obj = json.loads(data_text)
                    input_url = data_obj.get('url', data_text)
                else:
                    input_url = data_text
        except:
            pass
            
        if not input_url:
            try:
                # Pattern 2: FastAPI style - request.data directly
                if hasattr(request.data, 'url'):
                    input_url = request.data.url
                elif isinstance(request.data, str):
                    input_url = request.data
                elif hasattr(request.data, 'get'):
                    input_url = request.data.get('url', request.data)
            except:
                pass
                
        if not input_url:
            try:
                # Pattern 3: JSON string format
                if isinstance(request.data, str) and request.data.startswith('{'):
                    import json
                    data_obj = json.loads(request.data)
                    input_url = data_obj.get('url', request.data)
            except:
                pass
                
        if not input_url:
            # Pattern 4: Final fallback
            input_url = str(request.data)
        
        # STEP 1: Deterministic browser setup (no LLM involved)
        success, message, browser_context = deterministic_browser_setup(input_url, context)
        
        if not success:
            return response.text(message)
        
        # STEP 2: LLM Agent takes over with browser already open
        driver = browser_context["driver"]
        page_info = browser_context["page_info"]
        
        # STEP 3: Discover and annotate page elements
        context.logger.info("Discovering page elements...")
        elements = discover_page_elements(driver)
        
        if "error" in elements:
            context.logger.error(f"Element discovery failed: {elements['error']}")
            return response.text(f"❌ Failed to discover page elements: {elements['error']}")
        
        # STEP 4: Create annotated screenshot
        context.logger.info("Creating annotated screenshot...")
        screenshot_path = take_annotated_screenshot(driver, elements)
        
        if screenshot_path.startswith("Failed"):
            context.logger.error(f"Screenshot failed: {screenshot_path}")
            return response.text(f"❌ Failed to create annotated screenshot: {screenshot_path}")
        
        # Keep annotations visible for inspection if browser is staying open
        if browser_context.get('keep_open', False):
            context.logger.info("Annotations will remain visible in browser for inspection")
        else:
            # Remove annotations if browser will close
            context.logger.info("Removing annotations before browser closes...")
            remove_annotations(driver)
        
        # Count discovered elements
        element_counts = {
            "buttons": len(elements.get("buttons", [])),
            "inputs": len(elements.get("inputs", [])),
            "links": len(elements.get("links", [])),
            "selects": len(elements.get("selects", [])),
            "textareas": len(elements.get("textareas", []))
        }
        
        # Get scroll progress information
        scroll_info = browser_context['page_info'].get('scroll_info', {})
        
        # Format scroll progress information
        scroll_status = ""
        if scroll_info and 'error' not in scroll_info:
            scroll_percentage = scroll_info.get('scroll_percentage', {})
            content_metrics = scroll_info.get('content_metrics', {})
            scroll_status_info = scroll_info.get('scroll_status', {})
            
            # Determine current view status
            if scroll_status_info.get('at_top', True):
                view_status = "🔝 **At Top of Page**"
            elif scroll_status_info.get('at_bottom', False):
                view_status = "🔚 **At Bottom of Page**"
            else:
                view_status = f"📍 **Scrolled {scroll_percentage.get('vertical', 0)}% down**"
            
            # Content availability
            has_more_content = content_metrics.get('has_more_vertical', False)
            content_ratio = content_metrics.get('content_ratio', 1)
            
            if has_more_content:
                content_status = f"📄 **More Content Available**: {content_ratio:.1f}x more content below"
            else:
                content_status = "📄 **All Content Visible**: No more content to scroll"
            
            scroll_status = f"""
{view_status}
{content_status}
📊 **Page Metrics**: {scroll_info.get('page_dimensions', {}).get('total_height', 0)}px total height, {scroll_info.get('page_dimensions', {}).get('visible_height', 0)}px visible"""
        else:
            scroll_status = "📊 **Scroll Status**: Unable to determine scroll position"
        
        # Generate AI response using the system prompt
        prompt = f"""
        {SYSTEM_PROMPT}
        
        Browser Status: Successfully opened and navigated
        Current Page: {browser_context['page_title']}
        URL: {browser_context['current_url']}
        Page Size: {browser_context['page_source_length']} characters
        
        {scroll_status}
        
        Discovered Interactive Elements:
        - Buttons: {element_counts['buttons']} (labeled as button_1, button_2, etc.)
        - Inputs: {element_counts['inputs']} (labeled as input_1, input_2, etc.)
        - Links: {element_counts['links']} (labeled as link_1, link_2, etc.)
        - Selects: {element_counts['selects']} (labeled as select_1, select_2, etc.)
        - Textareas: {element_counts['textareas']} (labeled as textarea_1, textarea_2, etc.)
        
        An annotated screenshot has been created showing all interactive elements with colored boxes and labels.
        Available Browser Tools:
        - click_element(element_label): Click on discovered elements (e.g., "link_1", "button_2")
        - scroll_page(direction, amount): Scroll page ("down", "up", "left", "right")
        - extract_element_info(element_label): Get detailed info about elements
        
        Your task is to find and navigate to the login page. Analyze the current page for login-related elements and use the available tools to navigate there.
        """
        
        # Start the iterative loop for finding login page
        max_iterations = 5
        current_iteration = 0
        goal_achieved = False
        ai_response = ""
        
        # Action tracking for bug reproduction
        action_log = []
        action_log.append(f"1. Navigate to: {browser_context['current_url']}")
        action_log.append(f"2. Page loaded: '{browser_context['page_title']}'")
        
        while current_iteration < max_iterations and not goal_achieved:
            current_iteration += 1
            print(f"\n🔄 ITERATION {current_iteration}/{max_iterations}")
            print("="*60)
            
            # Generate AI response with screenshot
            import base64
            
            # Read the screenshot file and encode it
            screenshot_path_clean = screenshot_path.split(" (Size:")[0]  # Remove size info
            try:
                with open(screenshot_path_clean, "rb") as image_file:
                    image_data = base64.b64encode(image_file.read()).decode('utf-8')
            except Exception as e:
                print(f"Warning: Could not load screenshot: {e}")
                image_data = None
            
            # Create the prompt with both text and image
            if image_data:
                # Use the correct format for Google Gemini API based on docs
                # The API expects a list with text and image parts
                contents = [
                    {
                        "parts": [
                            {
                                "text": prompt + f"\n\nLook at the annotated screenshot below. The colored boxes show all interactive elements with their labels. Look for elements that might be login-related (buttons, links, or text that contains 'login', 'sign in', 'auth', etc.).\n\nIteration {current_iteration}: Analyze the current page and determine your next action."
                            },
                            {
                                "inline_data": {
                                    "mime_type": "image/png",
                                    "data": image_data
                                }
                            }
                        ]
                    }
                ]
            else:
                # Fallback to text-only if image can't be loaded
                contents = [
                    {
                        "parts": [
                            {
                                "text": prompt + f"\n\nIteration {current_iteration}: Analyze the current page and determine your next action."
                            }
                        ]
                    }
                ]
            
            # Generate AI response
            result = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=contents
            )
            
            # Get AI response and format it nicely
            ai_response = result.text
            
            # Clean up the AI response formatting
            print("\n" + "="*80)
            print("🤖 LLM THINKING PROCESS")
            print("="*80)
            print(ai_response)
            print("="*80)
            
            # Simple tool execution based on AI response
            tool_actions = []
            page_changed = False
            
            # Look for tool usage in the AI response
            if "click_element" in ai_response.lower() or "click" in ai_response.lower():
                # Extract element label from response (simple pattern matching)
                import re
                element_matches = re.findall(r'(link_\d+|button_\d+|input_\d+)', ai_response)
                if element_matches:
                    element_label = element_matches[0]
                    print(f"\n🖱️ EXECUTING: Clicking {element_label}")
                    
                    # Log the action for bug reproduction
                    action_log.append(f"{len(action_log) + 1}. Click on element: {element_label}")
                    
                    click_result = click_element(driver, element_label, elements)
                    tool_actions.append(f"🖱️ Clicked {element_label}: {click_result.get('message', 'Success')}")
                    
                    # Update page info after click
                    if click_result.get('success'):
                        browser_context['page_info'].update(click_result.get('new_page_info', {}))
                        page_changed = True
                        
                        # Log the page change
                        new_url = click_result.get('new_page_info', {}).get('current_url', '')
                        new_title = click_result.get('new_page_info', {}).get('title', '')
                        action_log.append(f"{len(action_log) + 1}. Page changed to: '{new_title}' ({new_url})")
                        
                        # Check if we've reached a login page
                        if any(keyword in new_url.lower() or keyword in new_title.lower() 
                               for keyword in ['login', 'signin', 'auth', 'sign-in', 'log-in']):
                            goal_achieved = True
                            print(f"\n🎯 GOAL ACHIEVED! Found login page: {new_title}")
                            action_log.append(f"{len(action_log) + 1}. ✅ SUCCESS: Reached login page")
                            
                            # Take final screenshot of the login page
                            print(f"\n📸 Taking final screenshot of login page...")
                            final_elements = discover_page_elements(driver)
                            if "error" not in final_elements:
                                final_screenshot = take_annotated_screenshot(driver, final_elements)
                                print(f"📸 Final login page screenshot: {final_screenshot}")
                                action_log.append(f"{len(action_log) + 1}. Screenshot saved: {final_screenshot}")
                            else:
                                print(f"⚠️ Could not take final screenshot: {final_elements['error']}")
                            
                            break
            
            if "scroll" in ai_response.lower():
                # Determine scroll direction
                if "down" in ai_response.lower():
                    print(f"\n📜 EXECUTING: Scrolling down")
                    action_log.append(f"{len(action_log) + 1}. Scroll down the page")
                    scroll_result = scroll_page(driver, "down", 500)
                    tool_actions.append(f"📜 Scrolled down: {scroll_result.get('message', 'Success')}")
                elif "up" in ai_response.lower():
                    print(f"\n📜 EXECUTING: Scrolling up")
                    action_log.append(f"{len(action_log) + 1}. Scroll up the page")
                    scroll_result = scroll_page(driver, "up", 500)
                    tool_actions.append(f"📜 Scrolled up: {scroll_result.get('message', 'Success')}")
            
            # Add tool actions to the response if any were executed
            if tool_actions:
                print(f"\n✅ ACTIONS COMPLETED:")
                for action in tool_actions:
                    print(f"   {action}")
                ai_response += f"\n\n**Actions Taken:**\n" + "\n".join(tool_actions)
            
            # If page changed, take a new screenshot and discover new elements
            if page_changed:
                print(f"\n📸 Taking new screenshot after page change...")
                # Discover new elements on the new page
                elements = discover_page_elements(driver)
                if "error" not in elements:
                    # Create new annotated screenshot
                    screenshot_path = take_annotated_screenshot(driver, elements)
                    print(f"📸 New screenshot: {screenshot_path}")
                else:
                    print(f"❌ Failed to discover elements on new page: {elements['error']}")
                    break
            
            # Check if we should continue or if we've achieved the goal
            if "login" in ai_response.lower() and ("found" in ai_response.lower() or "reached" in ai_response.lower()):
                goal_achieved = True
                print(f"\n🎯 GOAL ACHIEVED! LLM indicates login page found.")
                break
                
            if current_iteration >= max_iterations:
                print(f"\n⏰ MAX ITERATIONS REACHED. Stopping search.")
                break
        
        # Final response
        if goal_achieved:
            ai_response += f"\n\n🎯 **MISSION ACCOMPLISHED**: Successfully found and navigated to the login page!"
        else:
            ai_response += f"\n\n❌ **SEARCH INCOMPLETE**: Could not find login page after {max_iterations} iterations."
        
        # Add action log for bug reproduction
        ai_response += f"\n\n## 📋 **STEPS TO REPRODUCE**\n"
        for step in action_log:
            ai_response += f"{step}\n"
        
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

{scroll_status}

🎯 **Discovered Elements**:
🔴 **Buttons**: {element_counts['buttons']} (button_1, button_2, etc.)
🔵 **Inputs**: {element_counts['inputs']} (input_1, input_2, etc.)
🟢 **Links**: {element_counts['links']} (link_1, link_2, etc.)
🟠 **Selects**: {element_counts['selects']} (select_1, select_2, etc.)
🟣 **Textareas**: {element_counts['textareas']} (textarea_1, textarea_2, etc.)

📸 **Annotated Screenshot**: {screenshot_path}
   - All interactive elements are highlighted with colored boxes and labels
   - You can now reference elements by their labels (e.g., "click button_1")

🤖 **AI Analysis**: {ai_response}

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