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
    hover_element, press_key, BROWSER_TOOLS
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
}

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

        # Pattern 1: Data is a pre-parsed object with attributes (most likely case based on logs)
        if hasattr(request.data, 'url'):
            input_url = request.data.url
            # Use getattr for safety; it returns None if the attribute doesn't exist
            test_cases = getattr(request.data, 'test_cases', None)
        
        # Pattern 2: Fallback for raw text/JSON payload
        elif hasattr(request.data, 'text'):
            data_text = await request.data.text()
            try:
                if data_text.startswith('{'):
                    data_obj = json.loads(data_text)
                    input_url = data_obj.get('url')
                    test_cases = data_obj.get('test_cases')
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
                response=response
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
                response=response
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

async def execute_bug_hunting(browser_context, driver, initial_elements, initial_screenshot_path, context, response):
    # (This function is correct and remains unchanged)
    final_text_result, action_log = await run_agent_loop(
        task_prompt=BUG_HUNTING_PROMPT,
        driver=driver,
        initial_elements=initial_elements,
        initial_screenshot_path=initial_screenshot_path,
        context=context
    )
    
    final_response = f"### Bug Hunt Summary\n\n**Agent's Final Analysis:**\n{final_text_result}\n\n"
    final_response += "---\n### Steps Taken\n"
    for i, log in enumerate(action_log, 1):
        final_response += f"{i}. {log}\n"
        
    return response.text(final_response)

async def execute_test_cases(test_cases, browser_context, driver, initial_elements, initial_screenshot_path, context, response):
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
        
        # Close the current driver and start fresh for each test case
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
            context=context
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

    final_response = "### Test Case Execution Summary\n\n"
    for res in all_results:
        final_response += f"**Test Case {res['test_case']}: {res['objective']}**\n"
        final_response += f"**Result:** {res['result']}\n\n"
    
    final_response += "---\n### Combined Action Log\n"
    for i, log in enumerate(overall_action_log, 1):
        final_response += f"{i}. {log}\n"

    return response.text(final_response)

async def run_agent_loop(task_prompt: str, driver, initial_elements, initial_screenshot_path: str, context: AgentContext):
    # (This function is correct and remains unchanged)
    context.logger.info("🚀 Starting STATELESS agent loop...")
    
    action_log = []
    current_elements = initial_elements
    current_screenshot_path = initial_screenshot_path
    
    max_turns = 10
    for turn in range(max_turns):
        context.logger.info(f"--- Agent Turn {turn + 1}/{max_turns} ---")

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
                    continue  # Skip this turn and continue with the next one
                return "Agent received response with no parts", action_log
            
            part = response.candidates[0].content.parts[0]
            
        except Exception as e:
            context.logger.error(f"Error processing Gemini response: {e}")
            context.logger.error(f"Response object: {response if 'response' in locals() else 'No response'}")
            return f"Agent encountered error processing model response: {str(e)}", action_log

        if hasattr(part, 'function_call') and part.function_call:
            function_call = part.function_call
            tool_name = function_call.name
            tool_args = dict(function_call.args)
            
            context.logger.info(f"🤖 Agent requests tool: {tool_name}({tool_args})")
            
            if tool_name in AVAILABLE_TOOLS:
                tool_function = AVAILABLE_TOOLS[tool_name]
                tool_args.update({'driver': driver, 'elements': current_elements})
                
                try:
                    tool_output = tool_function(**tool_args)
                    context.logger.info(f"✅ Tool '{tool_name}' executed.")
                    action_log.append(f"Called tool `{tool_name}`. Result: {json.dumps(tool_output)}")

                    current_elements = discover_page_elements(driver)
                    current_screenshot_path = take_annotated_screenshot(driver, current_elements)

                except Exception as e:
                    context.logger.error(f"❌ Error executing tool '{tool_name}': {e}")
                    action_log.append(f"Error executing `{tool_name}`: {e}")
            else:
                context.logger.error(f"Model requested a non-existent tool: '{tool_name}'")
                action_log.append(f"Attempted to call unknown tool `{tool_name}`.")
        else:
            final_text = part.text
            context.logger.info(f"🏁 Agent finished loop with final text response.")
            action_log.append(f"Agent provided final summary: {final_text}")
            return final_text, action_log
            
    final_text = "Agent reached the maximum number of turns without providing a final summary."
    context.logger.warning(final_text)
    return final_text, action_log