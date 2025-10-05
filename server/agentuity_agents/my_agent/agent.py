from agentuity import AgentRequest, AgentResponse, AgentContext
from google import genai
from google.genai import types
import os
import json
import base64
import traceback

# Import from separated modules (ensure these paths are correct in your environment)
from agentuity_agents.my_agent.prompts.system_prompt import SYSTEM_PROMPT, AGENT_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES
from agentuity_agents.my_agent.prompts.bug_hunting_prompt import BUG_HUNTING_PROMPT
from agentuity_agents.my_agent.prompts.test_case_prompt import TEST_CASE_PROMPT

from agentuity_agents.my_agent.tools import (
    validate_url, setup_chrome_driver, navigate_to_url, discover_page_elements, 
    take_annotated_screenshot, remove_annotations, click_element, scroll_page, 
    extract_element_info, fill_input_field, select_dropdown_option, check_checkbox,
    hover_element, press_key, open_link_in_current_tab, BROWSER_TOOLS
)

# --- API and Client Initialization ---
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY environment variable not set.")

client = genai.Client(api_key=api_key)

# --- Tool Dispatcher ---
AVAILABLE_TOOLS = {
    "click_element": click_element,
    "fill_input_field": fill_input_field,
    "scroll_page": scroll_page,
    "open_link_in_current_tab": open_link_in_current_tab,
}

def convert_screenshots_to_base64(bug_report: dict) -> dict:
    """
    Convert screenshot paths in bug report to base64 encoded images.
    
    Args:
        bug_report (dict): Bug report with screenshot paths
        
    Returns:
        dict: Bug report with base64 encoded images
    """
    print(f"🔍 Current working directory: {os.getcwd()}")
    if 'reproduction_steps' in bug_report:
        for step in bug_report['reproduction_steps']:
            if 'image_url' in step:
                image_path = step['image_url']
                
                # Check if it's a screenshot path (not already base64)
                if not image_path.startswith('data:image'):
                    # Look for the screenshot file
                    screenshot_path = None
                    
                    # Normalize the image path - add .png extension if no extension
                    original_path = image_path
                    if not any(image_path.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp']):
                        image_path = image_path + '.png'
                        print(f"🔧 Normalized path: '{original_path}' -> '{image_path}'")
                    
                    # Check in bug_screenshots directory first
                    bug_screenshots_dir = os.path.join(os.getcwd(), "bug_screenshots")
                    if os.path.exists(bug_screenshots_dir):
                        full_path = os.path.join(bug_screenshots_dir, image_path)
                        if os.path.exists(full_path):
                            screenshot_path = full_path
                    
                    # If not found, try server/bug_screenshots directory
                    if not screenshot_path:
                        server_bug_screenshots_dir = os.path.join(os.getcwd(), "server", "bug_screenshots")
                        if os.path.exists(server_bug_screenshots_dir):
                            full_path = os.path.join(server_bug_screenshots_dir, image_path)
                            if os.path.exists(full_path):
                                screenshot_path = full_path
                    
                    # If not found, try current directory
                    if not screenshot_path:
                        full_path = os.path.join(os.getcwd(), image_path)
                        if os.path.exists(full_path):
                            screenshot_path = full_path
                    
                    # Convert to base64 if found
                    if screenshot_path and os.path.exists(screenshot_path):
                        try:
                            with open(screenshot_path, 'rb') as f:
                                image_data = f.read()
                                base64_data = base64.b64encode(image_data).decode('utf-8')
                                step['image_url'] = f"data:image/png;base64,{base64_data}"
                                print(f"✅ Successfully converted screenshot: {screenshot_path}")
                        except Exception as e:
                            print(f"❌ Error converting screenshot {screenshot_path}: {e}")
                            step['image_url'] = "data:image/png;base64,"  # Empty base64
                    else:
                        # Screenshot not found, use empty base64
                        print(f"❌ Screenshot not found: {image_path}")
                        step['image_url'] = "data:image/png;base64,"
    
    return bug_report

def cleanup_screenshots():
    """
    Delete all screenshot files after they've been converted to base64.
    """
    import glob
    
    print(f"🧹 Starting cleanup from directory: {os.getcwd()}")
    
    # Clean up bug screenshots directory - check both possible locations
    bug_screenshots_dirs = [
        os.path.join(os.getcwd(), "bug_screenshots"),  # Current directory
        os.path.join(os.getcwd(), "server", "bug_screenshots"),  # Server subdirectory
        os.path.join(os.path.dirname(os.getcwd()), "server", "bug_screenshots")  # Parent/server
    ]
    
    for bug_screenshots_dir in bug_screenshots_dirs:
        if os.path.exists(bug_screenshots_dir):
            print(f"🔍 Found bug screenshots directory: {bug_screenshots_dir}")
            screenshot_files = glob.glob(os.path.join(bug_screenshots_dir, "*.png"))
            for file_path in screenshot_files:
                try:
                    os.remove(file_path)
                    print(f"🗑️ Deleted: {file_path}")
                except Exception as e:
                    print(f"❌ Error deleting {file_path}: {e}")
    
    # Clean up annotated page screenshots - check multiple locations
    server_dirs = [
        os.getcwd(),  # Current directory
        os.path.join(os.getcwd(), "server"),  # Server subdirectory
        os.path.join(os.path.dirname(os.getcwd()), "server")  # Parent/server
    ]
    
    for server_dir in server_dirs:
        if os.path.exists(server_dir):
            annotated_files = glob.glob(os.path.join(server_dir, "annotated_page_*.png"))
            for file_path in annotated_files:
                try:
                    os.remove(file_path)
                    print(f"🗑️ Deleted: {file_path}")
                except Exception as e:
                    print(f"❌ Error deleting {file_path}: {e}")

# Define tool declarations for Gemini API
click_element_function = {
    "name": "click_element",
    "description": "Click on a discovered element by its label (e.g., 'button_1', 'link_3')",
    "parameters": {
        "type": "object",
        "properties": {
            "element_label": {
                "type": "string",
                "description": "The label of the element to click (from discovered elements)"
            }
        },
        "required": ["element_label"]
    }
}

scroll_page_function = {
    "name": "scroll_page",
    "description": "Scroll the page in a specified direction",
    "parameters": {
        "type": "object",
        "properties": {
            "direction": {
                "type": "string",
                "description": "Direction to scroll: 'down', 'up', 'left', 'right'"
            },
            "amount": {
                "type": "integer",
                "description": "Number of pixels to scroll (default: 500)"
            }
        },
        "required": ["direction"]
    }
}

open_link_in_current_tab_function = {
    "name": "open_link_in_current_tab",
    "description": "Navigate to a specific URL in the current browser tab. Use this for direct navigation to websites, especially when testing external links or specific pages.",
    "parameters": {
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "description": "The URL to navigate to (must include http:// or https://)"
            }
        },
        "required": ["url"]
    }
}

extract_element_info_function = {
    "name": "extract_element_info",
    "description": "Get detailed information about a discovered element",
    "parameters": {
        "type": "object",
        "properties": {
            "element_label": {
                "type": "string",
                "description": "The label of the element to inspect"
            }
        },
        "required": ["element_label"]
    }
}

fill_input_field_function = {
    "name": "fill_input_field",
    "description": "Fill an input field with text",
    "parameters": {
        "type": "object",
        "properties": {
            "element_label": {
                "type": "string",
                "description": "The label of the input element"
            },
            "text": {
                "type": "string",
                "description": "Text to fill in the input field"
            }
        },
        "required": ["element_label", "text"]
    }
}

select_dropdown_option_function = {
    "name": "select_dropdown_option",
    "description": "Select an option from a dropdown/select element",
    "parameters": {
        "type": "object",
        "properties": {
            "element_label": {
                "type": "string",
                "description": "The label of the select element"
            },
            "option_text": {
                "type": "string",
                "description": "Text of the option to select"
            }
        },
        "required": ["element_label", "option_text"]
    }
}

check_checkbox_function = {
    "name": "check_checkbox",
    "description": "Check or uncheck a checkbox",
    "parameters": {
        "type": "object",
        "properties": {
            "element_label": {
                "type": "string",
                "description": "The label of the checkbox element"
            }
        },
        "required": ["element_label"]
    }
}

hover_element_function = {
    "name": "hover_element",
    "description": "Hover over an element to trigger hover effects",
    "parameters": {
        "type": "object",
        "properties": {
            "element_label": {
                "type": "string",
                "description": "The label of the element to hover"
            }
        },
        "required": ["element_label"]
    }
}

press_key_function = {
    "name": "press_key",
    "description": "Press a key on the keyboard",
    "parameters": {
        "type": "object",
        "properties": {
            "key": {
                "type": "string",
                "description": "Key to press (e.g., 'Enter', 'Tab', 'Escape', 'ArrowDown', etc.)"
            }
        },
        "required": ["key"]
    }
}


# Configure tools for Gemini API - Essential tools only
tools = types.Tool(function_declarations=[
    open_link_in_current_tab_function,
    click_element_function,
    fill_input_field_function,
    scroll_page_function
])
config = types.GenerateContentConfig(tools=[tools])

# --- Agent Functions ---

def welcome():
    # (This function is correct and remains unchanged)
    return {
        "welcome": f"Welcome to the {AGENT_CONFIG['name']}! {AGENT_CONFIG['description']}",
        "version": AGENT_CONFIG['version'],
        "capabilities": AGENT_CONFIG['capabilities'],
        "prompts": [
            {"data": "https://www.google.com", "contentType": "text/plain"},
            {"data": "https://github.com", "contentType": "text/plain"}
        ]
    }

def deterministic_browser_setup(input_url: str, context: AgentContext) -> tuple[bool, str, dict]:
    # (This function is correct and remains unchanged)
    driver = None
    try:
        context.logger.info(f"Starting deterministic browser setup for: {input_url}")
        is_valid, error_msg = validate_url(input_url)
        if not is_valid: return False, f"{ERROR_MESSAGES['invalid_url']}\n\n{error_msg}", {}
        if not input_url.startswith(('http://', 'https://')): input_url = 'https://' + input_url
        context.logger.info(f"URL validation successful: {input_url}")
        
        keep_browser_open = os.getenv("KEEP_BROWSER_OPEN", "false").lower() in ("true", "1", "yes")
        driver = setup_chrome_driver(keep_open=keep_browser_open)
        context.logger.info("Chrome driver setup successful")
        
        page_info = navigate_to_url(driver, input_url)
        context.logger.info(f"Navigation successful: {page_info['current_url']}")
        
        browser_context = {
            "driver": driver, "page_info": page_info, "input_url": input_url,
            "current_url": page_info["current_url"], "page_title": page_info["title"],
            "page_source_length": page_info["source_length"], "keep_open": keep_browser_open
        }
        return True, SUCCESS_MESSAGES['navigation_success'], browser_context
        
    except Exception as e:
        context.logger.error(f"Browser setup failed: {e}")
        if driver:
            try: driver.quit()
            except: pass
        return False, f"{ERROR_MESSAGES['navigation_failed']}\n\n**Error**: {str(e)}", {}

async def run(request: AgentRequest, response: AgentResponse, context: AgentContext):
    """
    Main agent entry point. Correctly handles routing to bug hunting or test case execution.
    """
    browser_context = None
    try:
        # --- ROBUST INPUT PARSING LOGIC ---
        input_url = None
        test_cases = None
        team_id = None

        # Pattern 1: Data is a pre-parsed object with attributes (most likely case based on logs)
        if hasattr(request.data, 'url'):
            input_url = request.data.url
            # Use getattr for safety; it returns None if the attribute doesn't exist
            test_cases = getattr(request.data, 'test_cases', None)
            team_id = getattr(request.data, 'team_id', None)
        
        # Pattern 2: Fallback for raw text/JSON payload
        elif hasattr(request.data, 'text'):
            data_text = await request.data.text()
            try:
                if data_text.startswith('{'):
                    data_obj = json.loads(data_text)
                    input_url = data_obj.get('url')
                    test_cases = data_obj.get('test_cases')
                    team_id = data_obj.get('team_id')
                else:
                    input_url = data_text
            except json.JSONDecodeError:
                input_url = data_text
        
        # Pattern 3: Final fallback
        else:
            input_url = str(request.data)
        
        if not input_url:
            return response.text("Could not determine the input URL from the request.")

        # --- END OF PARSING ---

        print(f"Tester user ID: {team_id}")


        success, message, browser_context = deterministic_browser_setup(input_url, context)
        if not success: return response.text(message)
        
        driver = browser_context["driver"]
        initial_elements = discover_page_elements(driver)
        if "error" in initial_elements: return response.text(f"❌ Failed to discover page elements: {initial_elements['error']}")
        
        initial_screenshot_path = take_annotated_screenshot(driver, initial_elements)
        if initial_screenshot_path.startswith("Failed"): return response.text(f"❌ Failed to create annotated screenshot: {initial_screenshot_path}")

        # --- CORRECTED LOGIC BRANCH ---
        # If test_cases were found (not None and not empty), run the test case executor.
        if test_cases and len(test_cases) > 0:
            context.logger.info(f"Detected {len(test_cases)} test cases. Starting test case execution.")
            return await execute_test_cases(
                test_cases=test_cases,
                browser_context=browser_context,
                driver=driver,
                initial_elements=initial_elements,
                initial_screenshot_path=initial_screenshot_path,
                context=context,
                response=response,
                team_id=team_id
            )
        # Otherwise, default to bug hunting mode.
        else:
            context.logger.info("No test cases detected. Starting bug hunting mode.")
            return await execute_bug_hunting(
                browser_context=browser_context,
                driver=driver,
                initial_elements=initial_elements,
                initial_screenshot_path=initial_screenshot_path,
                context=context,
                response=response,
                team_id=team_id
            )

    except Exception as e:
        context.logger.error(f"Error in main agent `run` function: {e}")
        context.logger.error(f"Full traceback: {traceback.format_exc()}")
        return response.text(f"❌ Agent execution failed unexpectedly: {str(e)}")
    finally:
        if browser_context and browser_context.get('driver') and not browser_context.get('keep_open', False):
            try:
                browser_context['driver'].quit()
                context.logger.info("Chrome driver closed successfully")
            except Exception as e:
                context.logger.error(f"Error closing driver: {e}")

async def execute_bug_hunting(browser_context, driver, initial_elements, initial_screenshot_path, context, response, team_id=None):
    final_text_result, action_log = await run_agent_loop(
        task_prompt=BUG_HUNTING_PROMPT,
        driver=driver,
        initial_elements=initial_elements,
        initial_screenshot_path=initial_screenshot_path,
        context=context,
        team_id=team_id
    )
    
    # Try to parse the response as JSON bug reports
    try:
        # Clean the response to extract JSON
        import re
        json_match = re.search(r'\[.*\]', final_text_result, re.DOTALL)
        if json_match:
            import json
            bug_reports = json.loads(json_match.group())
            
            # Convert screenshot paths to base64 and add team_id
            for report in bug_reports:
                # Add team_id to each bug report
                report['team_id'] = team_id or 'automation_agent'
                
                for step in report.get('reproduction_steps', []):
                    if 'image_url' in step and step['image_url'].endswith('.png'):
                        try:
                            with open(step['image_url'], 'rb') as img_file:
                                img_data = img_file.read()
                                step['image_url'] = base64.b64encode(img_data).decode('utf-8')
                        except:
                            step['image_url'] = ""
            
            # Clean up screenshots before returning
            cleanup_screenshots()
            return response.json(bug_reports)
        else:
            # No JSON found, return empty array for successful testing
            cleanup_screenshots()
            return response.json([])
    except Exception as e:
        context.logger.error(f"Error parsing bug reports: {e}")
        # Clean up screenshots before returning error
        cleanup_screenshots()
        # Fallback to text response
        return response.text(f"Error parsing bug reports: {str(e)}\n\nRaw response: {final_text_result}")

async def execute_test_cases(test_cases, browser_context, driver, initial_elements, initial_screenshot_path, context, response, team_id=None):
    all_results = []
    overall_action_log = []

    # Make sure test_cases are dicts, not objects, for consistent access
    test_cases_as_dicts = []
    for tc in test_cases:
        if hasattr(tc, '__dict__'):
            test_cases_as_dicts.append(tc.__dict__)
        else:
            test_cases_as_dicts.append(tc) # Assume it's already a dict

    # Get the original URL from browser_context
    original_url = browser_context.get('input_url', 'https://hackuta.org')

    for i, test_case in enumerate(test_cases_as_dicts, 1):
        context.logger.info(f"--- Running Test Case {i}/{len(test_cases_as_dicts)}: {test_case.get('what_to_test')} ---")
        
        # For the first test case, use the existing browser setup
        if i == 1:
            fresh_driver = driver
            fresh_initial_elements = initial_elements
            fresh_initial_screenshot_path = initial_screenshot_path
        else:
            # Close the current driver and start fresh for subsequent test cases
            try:
                driver.quit()
                context.logger.info("Closed previous browser instance")
            except:
                pass
        
        # Setup fresh browser for this test case
        success, message, fresh_browser_context = deterministic_browser_setup(original_url, context)
        if not success:
            all_results.append({
                "test_case": i,
                "objective": test_case.get('what_to_test'),
                "result": f"Failed to setup fresh browser: {message}"
            })
            continue
        
        fresh_driver = fresh_browser_context["driver"]
        fresh_initial_elements = discover_page_elements(fresh_driver)
        if "error" in fresh_initial_elements:
            all_results.append({
                "test_case": i,
                "objective": test_case.get('what_to_test'),
                "result": f"Failed to discover page elements: {fresh_initial_elements['error']}"
            })
            fresh_driver.quit()
            continue
        
        fresh_initial_screenshot_path = take_annotated_screenshot(fresh_driver, fresh_initial_elements)
        if fresh_initial_screenshot_path.startswith("Failed"):
            all_results.append({
                "test_case": i,
                "objective": test_case.get('what_to_test'),
                "result": f"Failed to create screenshot: {fresh_initial_screenshot_path}"
            })
            fresh_driver.quit()
            continue
        
        specific_task_prompt = f"""
        {TEST_CASE_PROMPT}

        --- CURRENT TEST CASE ---
        - **Objective**: {test_case.get('what_to_test', 'Not specified')}
        - **Expected Outcome**: {test_case.get('expected_output', 'Not specified')}
        """

        result_text, action_log_for_this_test = await run_agent_loop(
            task_prompt=specific_task_prompt,
            driver=fresh_driver,
            initial_elements=fresh_initial_elements,
            initial_screenshot_path=fresh_initial_screenshot_path,
            context=context,
            team_id=team_id
        )
        
        all_results.append({
            "test_case": i,
            "objective": test_case.get('what_to_test'),
            "result": result_text
        })
        overall_action_log.extend(action_log_for_this_test)
        
        # Close the browser for this test case
        try:
            fresh_driver.quit()
            context.logger.info(f"Closed browser for test case {i}")
        except:
            pass

    # Parse results to extract bug reports
    all_bug_reports = []
    
    for res in all_results:
        result_text = res['result']
        
        # Try to parse JSON from the result
        try:
            import re
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                bug_report = json.loads(json_match.group())
                if isinstance(bug_report, dict) and bug_report.get('title'):
                    # Convert screenshot paths to base64
                    bug_report = convert_screenshots_to_base64(bug_report)
                    # Add team_id to the bug report
                    bug_report['team_id'] = team_id or 'automation_agent'
                    all_bug_reports.append(bug_report)
            else:
                # No JSON found - no bugs reported
                continue
        except (json.JSONDecodeError, KeyError):
            # JSON parsing failed - no bugs reported
            continue
    
    # Clean up screenshots before returning
    cleanup_screenshots()
    
    # Return JSON response
    if all_bug_reports:
        return response.json(all_bug_reports)
    else:
        # No bugs found - return empty array
        return response.json([])

async def run_agent_loop(task_prompt: str, driver, initial_elements, initial_screenshot_path: str, context: AgentContext, team_id=None):
    # (This function is correct and remains unchanged)
    context.logger.info("🚀 Starting STATELESS agent loop...")
    
    action_log = []
    current_elements = initial_elements
    current_screenshot_path = initial_screenshot_path
    
    max_turns = 10
    malformed_call_count = 0
    bug_number = 1
    step_number = 1
    
    for turn in range(max_turns):
        context.logger.info(f"--- Agent Turn {turn + 1}/{max_turns} ---")
        
        # Rediscover elements at the start of each turn to get current page state
        current_elements = discover_page_elements(driver)
        if "error" in current_elements:
            context.logger.error(f"Failed to discover elements: {current_elements['error']}")
            action_log.append(f"Failed to discover elements: {current_elements['error']}")
            continue
        
        current_screenshot_path = take_annotated_screenshot(driver, current_elements, bug_number=bug_number, step_number=step_number)
        if current_screenshot_path.startswith("Failed"):
            context.logger.error(f"Failed to take screenshot: {current_screenshot_path}")
            action_log.append(f"Failed to take screenshot: {current_screenshot_path}")
            continue

        formatted_action_log = "\n".join(f"- {action}" for action in action_log) or "No actions taken yet."

        turn_prompt = f"""
        {SYSTEM_PROMPT}
        --- CURRENT TASK ---
        {task_prompt}
        --- PREVIOUS ACTIONS TAKEN ---
        {formatted_action_log}
        --- CURRENT PAGE STATE ---
        Title: {driver.title}
        URL: {driver.current_url}
        Elements Discovered: { {k: len(v) for k, v in current_elements.items() if k != "error"} }
        --- BUG TRACKING ---
        Current bug number: {bug_number}
        Current step number: {step_number}
        Use image_url format: "bug_{bug_number}_step_{{step_number}}_screenshot"
        --- YOUR INSTRUCTION ---
        Given the task, previous actions, and the current page state in the screenshot, decide the single next action to take using a tool. If the task is done, provide a final text answer.
        """
        
        with open(current_screenshot_path.split(" (Size:")[0], "rb") as image_file:
            image_data = image_file.read()

        contents = [{"parts": [{"text": turn_prompt}, {"inline_data": {"mime_type": "image/png", "data": image_data}}]}]

        try:
            response = client.models.generate_content(
                model="gemini-flash-latest",
                contents=contents,
                config=config
            )
            
            # Debug logging for response structure
            context.logger.info(f"Response type: {type(response)}")
            context.logger.info(f"Response candidates: {response.candidates if hasattr(response, 'candidates') else 'No candidates'}")
            
            if not response.candidates:
                context.logger.error("No candidates in response")
                return "Agent received empty response from model", action_log
            
            if not response.candidates[0]:
                context.logger.error("First candidate is None")
                return "Agent received invalid response from model", action_log
                
            if not response.candidates[0].content:
                context.logger.error("Content is None")
                return "Agent received response with no content", action_log
                
            if not response.candidates[0].content.parts:
                context.logger.error("Parts is None")
                # Check if this is a malformed function call error
                if response.candidates[0].finish_reason and "MALFORMED_FUNCTION_CALL" in str(response.candidates[0].finish_reason):
                    context.logger.error("Model made a malformed function call - continuing with next turn")
                    action_log.append("Model made a malformed function call - continuing with next turn")
                    malformed_call_count += 1
                    if malformed_call_count >= 5:
                        context.logger.error("❌ Too many malformed function calls. Stopping agent loop.")
                        return "Agent stopped due to repeated malformed function calls", action_log
                    continue  # Skip this turn and continue with the next one
                return "Agent received response with no parts", action_log
            
            parts = response.candidates[0].content.parts
            
        except Exception as e:
            context.logger.error(f"Error processing Gemini response: {e}")
            context.logger.error(f"Response object: {response if 'response' in locals() else 'No response'}")
            malformed_call_count += 1
            if malformed_call_count >= 3:
                context.logger.error("❌ Too many malformed function calls. Stopping agent loop.")
                return "Agent stopped due to repeated malformed function calls", action_log
            continue

        # Check all parts for function calls first
        function_call_found = False
        for part in parts:
            if hasattr(part, 'function_call') and part.function_call:
                function_call_found = True
                break
        
        if function_call_found:
            # Find the part with the function call
            for part in parts:
                if hasattr(part, 'function_call') and part.function_call:
                    function_call = part.function_call
                    tool_name = function_call.name
                    tool_args = dict(function_call.args)
                    
                    context.logger.info(f"🤖 Agent requests tool: {tool_name}({tool_args})")
                    
                    if tool_name in AVAILABLE_TOOLS:
                        tool_function = AVAILABLE_TOOLS[tool_name]
                        tool_args.update({'driver': driver})
                        
                        # Only add elements parameter to tools that need it
                        if tool_name in ['click_element', 'fill_input_field', 'extract_element_info']:
                            tool_args.update({'elements': current_elements})
                        
                        try:
                            tool_output = tool_function(**tool_args)
                            context.logger.info(f"✅ Tool '{tool_name}' executed.")
                            action_log.append(f"Called tool `{tool_name}`. Result: {json.dumps(tool_output)}")
                            malformed_call_count = 0  # Reset counter on successful tool call
                            step_number += 1  # Increment step number after successful tool execution

                        except Exception as e:
                            context.logger.error(f"❌ Error executing tool '{tool_name}': {e}")
                            action_log.append(f"Error executing `{tool_name}`: {e}")
                    else:
                        context.logger.error(f"Model requested a non-existent tool: '{tool_name}'")
                        action_log.append(f"Attempted to call unknown tool `{tool_name}`.")
                    break  # Only process the first function call
        else:
            # No function call found, look for text in any part
            final_text = ""
            for part in parts:
                if hasattr(part, 'text') and part.text:
                    final_text += part.text + "\n"
            
            if final_text.strip():
                context.logger.info(f"🏁 Agent finished loop with final text response.")
                action_log.append(f"Agent provided final summary: {final_text.strip()}")
                return final_text.strip(), action_log
            else:
                context.logger.warning("Agent provided no text or function call")
                action_log.append("Agent provided no text or function call")
                return "Agent provided no response", action_log
            
    final_text = "Agent reached the maximum number of turns without providing a final summary."
    context.logger.warning(final_text)
    return final_text, action_log