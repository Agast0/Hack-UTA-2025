from agentuity import AgentRequest, AgentResponse, AgentContext
from google import genai
import os

# Import from separated modules
from agentuity_agents.my_agent.prompts.system_prompt import SYSTEM_PROMPT, AGENT_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES
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
        
        # Step 1: Validate URL
        is_valid, error_msg = validate_url(input_url)
        if not is_valid:
            return False, f"{ERROR_MESSAGES['invalid_url']}\n\n{error_msg}", {}
        
        # Add protocol if missing
        if not input_url.startswith(('http://', 'https://')):
            input_url = 'https://' + input_url
        
        context.logger.info(f"URL validation successful: {input_url}")
        
        # Step 2: Setup Chrome driver
        try:
            driver = setup_chrome_driver()
        except Exception as e:
            return False, f"{ERROR_MESSAGES['driver_setup_failed']}\n\n{str(e)}", {}
        context.logger.info("Chrome driver setup successful")
        
        # Step 3: Navigate to URL
        navigation_result = navigate_to_url(driver, input_url)
        if navigation_result.get('status') != 'success':
            return False, f"{ERROR_MESSAGES['navigation_failed']}\n\n{navigation_result.get('error', 'Unknown navigation error')}", {}
        
        context.logger.info(f"Navigation successful: {navigation_result['current_url']}")
        
        # Step 4: Get page information
        page_info = {
            'url': navigation_result['current_url'],
            'title': navigation_result.get('title', 'Unknown'),
            'source_length': navigation_result.get('source_length', 0),
            'scroll_info': navigation_result.get('scroll_info', {}),
            'tester_user_id': getattr(context, 'tester_user_id', None)
        }
        
        # Return success with browser context
        return True, SUCCESS_MESSAGES['navigation_success'], {
            'driver': driver,
            'current_url': navigation_result['current_url'],
            'page_title': page_info['title'],
            'page_source_length': page_info['source_length'],
            'page_info': page_info,
            'keep_open': os.getenv('KEEP_BROWSER_OPEN', 'false').lower() == 'true'
        }
        
    except Exception as e:
        context.logger.error(f"Browser setup failed: {e}")
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
        # Get the input data - handle both FastAPI and Agentuity dynamically
        input_url = None
        tester_user_id = None
        test_cases = None
        
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
                    tester_user_id = data_obj.get('tester_user_id')
                    test_cases = data_obj.get('test_cases')
                else:
                    input_url = data_text
        except:
            pass
            
        if not input_url:
            try:
                # Pattern 2: FastAPI style - request attributes directly
                if hasattr(request, 'url'):
                    input_url = request.url
                    tester_user_id = getattr(request, 'tester_user_id', None)
                    test_cases = getattr(request, 'test_cases', None)
                elif hasattr(request.data, 'url'):
                    input_url = request.data.url
                    tester_user_id = getattr(request.data, 'tester_user_id', None)
                    test_cases = getattr(request.data, 'test_cases', None)
                elif isinstance(request.data, str):
                    input_url = request.data
                elif hasattr(request.data, 'get'):
                    input_url = request.data.get('url', request.data)
                    tester_user_id = request.data.get('tester_user_id')
                    test_cases = request.data.get('test_cases')
            except:
                pass
                
        if not input_url:
            try:
                # Pattern 3: JSON string format
                if isinstance(request.data, str) and request.data.startswith('{'):
                    import json
                    data_obj = json.loads(request.data)
                    input_url = data_obj.get('url', request.data)
                    tester_user_id = data_obj.get('tester_user_id')
                    test_cases = data_obj.get('test_cases')
            except:
                pass
                
        if not input_url:
            # Pattern 4: Final fallback
            input_url = str(request.data)
        
        # Validate required fields
        if not tester_user_id:
            return response.text("❌ Error: tester_user_id is required but not provided.")
        
        # STEP 1: Deterministic browser setup (no LLM involved)
        success, message, browser_context = deterministic_browser_setup(input_url, context)
        
        if not success:
            return response.text(message)
        
        # STEP 2: LLM Agent takes over with browser already open
        driver = browser_context["driver"]
        page_info = browser_context["page_info"]
        
        # Debug: Check if browser is still alive
        try:
            current_url = driver.current_url
            context.logger.info(f"Browser is alive, current URL: {current_url}")
        except Exception as e:
            context.logger.error(f"Browser appears to be closed: {e}")
            return response.text("❌ Browser closed unexpectedly during setup")
        
        # STEP 3: Discover and annotate page elements
        context.logger.info("Discovering page elements...")
        try:
            elements = discover_page_elements(driver)
            context.logger.info(f"Element discovery completed. Found {len(elements.get('elements', {}))} elements")
        except Exception as e:
            context.logger.error(f"Element discovery failed with exception: {e}")
            return response.text(f"❌ Failed to discover page elements: {str(e)}")
        
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
        
        # Import the appropriate prompt based on mode
        if test_cases and len(test_cases) > 0:
            # Test case mode - we'll run the agent multiple times
            from agentuity_agents.my_agent.prompts.test_case_prompt import TEST_CASE_PROMPT
            base_prompt = TEST_CASE_PROMPT
            mode = "test_cases"
        else:
            # General bug hunting mode
            from agentuity_agents.my_agent.prompts.bug_hunting_prompt import BUG_HUNTING_PROMPT
            base_prompt = BUG_HUNTING_PROMPT
            mode = "bug_hunting"
        
        # Execute based on mode
        if mode == "test_cases":
            # Test case mode - run agent multiple times, once per test case
            # Convert TestCase objects to dictionaries for compatibility
            test_cases_dict = []
            for test_case in test_cases:
                if hasattr(test_case, 'dict'):
                    # Pydantic model
                    test_cases_dict.append(test_case.dict())
                elif hasattr(test_case, '__dict__'):
                    # Regular object
                    test_cases_dict.append(test_case.__dict__)
                else:
                    # Already a dict
                    test_cases_dict.append(test_case)
            return await execute_test_cases(test_cases_dict, browser_context, driver, elements, screenshot_path, context, response)
        else:
            # Bug hunting mode - run agent with deterministic navigation count
            return await execute_bug_hunting(browser_context, driver, elements, screenshot_path, context, response)

    except Exception as e:
        context.logger.error(f"Error in main agent function: {e}")
        import traceback
        context.logger.error(f"Full traceback: {traceback.format_exc()}")
        return response.text(f"❌ Agent execution failed: {str(e)}")
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


async def execute_test_cases(test_cases, browser_context, driver, elements, screenshot_path, context, response):
    """Execute test cases by running the agent multiple times, once per test case."""
    test_results = []
    action_log = []
    action_log.append(f"1. Navigate to: {browser_context['current_url']}")
    action_log.append(f"2. Page loaded: '{browser_context['page_title']}'")
    
    for i, test_case in enumerate(test_cases, 1):
        context.logger.info(f"Executing test case {i}/{len(test_cases)}: {test_case.get('what_to_test', 'N/A')}")
        
        # Create test case specific prompt
        from agentuity_agents.my_agent.prompts.test_case_prompt import TEST_CASE_PROMPT
        
        test_prompt = f"""
        {SYSTEM_PROMPT}
        
        {TEST_CASE_PROMPT}
        
        Browser Status: Successfully opened and navigated
        Current Page: {browser_context['page_title']}
        URL: {browser_context['current_url']}
        Page Size: {browser_context['page_source_length']} characters
        Tester User ID: {browser_context.get('tester_user_id', 'Not specified')}
        
        Current Test Case {i}/{len(test_cases)}:
        What to test: {test_case.get('what_to_test', 'N/A')}
        Expected output: {test_case.get('expected_output', 'No specific expectation provided')}
        
        Execute this test case and report the results.
        """
        
        # Run the agent for this test case
        result = await run_single_agent_iteration(test_prompt, driver, elements, screenshot_path, context)
        
        # Store test case result
        test_results.append({
            "test_case": i,
            "what_to_test": test_case.get('what_to_test', 'N/A'),
            "expected_output": test_case.get('expected_output', 'N/A'),
            "result": result
        })
        
        action_log.append(f"{len(action_log) + 1}. Test case {i} executed: {test_case.get('what_to_test', 'N/A')}")
    
    # Generate final response
    final_response = f"🎯 **TEST EXECUTION COMPLETED**: All {len(test_cases)} test cases have been executed!\n\n"
    final_response += "## 📊 **TEST RESULTS SUMMARY**\n"
    
    for result in test_results:
        final_response += f"\n**Test Case {result['test_case']}:**\n"
        final_response += f"- What to test: {result['what_to_test']}\n"
        final_response += f"- Expected output: {result['expected_output']}\n"
        final_response += f"- Result: {result['result']}\n"
    
    final_response += f"\n## 📋 **STEPS TO REPRODUCE**\n"
    for step in action_log:
        final_response += f"{step}\n"
    
    return response.text(final_response)


async def execute_bug_hunting(browser_context, driver, elements, screenshot_path, context, response):
    """Execute bug hunting - single agent run with automatic tool termination."""
    from agentuity_agents.my_agent.prompts.bug_hunting_prompt import BUG_HUNTING_PROMPT
    from agentuity_agents.my_agent.tools import reset_navigation_count, get_navigation_count
    
    # Reset navigation counter at start
    reset_navigation_count()
    
    # Create bug hunting prompt
    bug_prompt = f"""
    {SYSTEM_PROMPT}
    
    {BUG_HUNTING_PROMPT}
    
    Browser Status: Successfully opened and navigated
    Current Page: {browser_context['page_title']}
    URL: {browser_context['current_url']}
    Page Size: {browser_context['page_source_length']} characters
    Tester User ID: {browser_context.get('tester_user_id', 'Not specified')}
    
    Explore the website to find potential bugs or issues.
    Use available tools to navigate and test functionality.
    The tools will automatically stop after 20 navigation actions.
    """
    
    # Run the agent once - it will use multiple tool calls and terminate automatically
    result = await run_single_agent_iteration(bug_prompt, driver, elements, screenshot_path, context)
    
    # Generate final response
    final_nav_count = get_navigation_count()
    if "bug" in result.lower() and ("found" in result.lower() or "discovered" in result.lower()):
        final_response = f"🐛 **BUGS DISCOVERED**: Found potential issues during exploration!\n\n"
        final_response += f"## 🐛 **BUG FINDINGS**\n{result}\n\n"
    else:
        final_response = f"✅ **NO BUGS FOUND**: Completed {final_nav_count} navigations without discovering any issues.\n\n"
    
    final_response += f"## 📋 **EXPLORATION SUMMARY**\n"
    final_response += f"- Total navigations: {final_nav_count}\n"
    final_response += f"- Final page: {browser_context['current_url']}\n"
    final_response += f"- Agent response: {result}\n"
    
    return response.text(final_response)


async def run_single_agent_iteration(prompt, driver, elements, screenshot_path, context):
    """Run a single iteration of the agent with the given prompt."""
    try:
        # Generate AI response with screenshot
        import base64
        
        # Read the screenshot file and encode it
        screenshot_path_clean = screenshot_path.split(" (Size:")[0]  # Remove size info
        try:
            with open(screenshot_path_clean, "rb") as image_file:
                image_data = base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            context.logger.warning(f"Could not load screenshot: {e}")
            image_data = None
        
        # Create the prompt with image only - no text fallback
        if not image_data:
            context.logger.error("Screenshot not available - cannot proceed without image")
            return "Error: Screenshot not available. Cannot analyze page without visual context."
        
        contents = [
            {
                "parts": [
                    {
                        "text": prompt + f"\n\nLook at the annotated screenshot below. The colored boxes show all interactive elements with their labels. Analyze the page and provide your response based on what you see."
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
        
        # Generate AI response with tools for actual execution
        result = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=contents,
        )

        ai_response = result.text
        
        # Clean up the AI response formatting
        print("\n" + "="*80)
        print("🤖 LLM THINKING PROCESS")
        print("="*80)
        print(ai_response)
        print("="*80)
            
        
        
        return result.text
        
    except Exception as e:
        context.logger.error(f"Error in single agent iteration: {e}")
        return f"Error during agent execution: {str(e)}"


