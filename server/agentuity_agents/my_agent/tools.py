"""
Tool definitions and utility functions for the Web Browser Automation Agent.
"""

import re
from urllib.parse import urlparse
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def validate_url(url: str) -> tuple[bool, str]:
    """
    Validate if the provided string is a well-formed URL.
    
    Args:
        url (str): The URL string to validate
        
    Returns:
        tuple[bool, str]: (is_valid, error_message)
    """
    if not url or not isinstance(url, str):
        return False, "URL cannot be empty or non-string"
    
    # Add protocol if missing
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    try:
        result = urlparse(url)
        if not all([result.scheme, result.netloc]):
            return False, "Invalid URL format - missing scheme or netloc"
        
        # Basic domain validation - very permissive
        if not result.netloc or len(result.netloc) < 1:
            return False, "Invalid domain name format"
            
        return True, ""
    except Exception as e:
        return False, f"URL parsing error: {str(e)}"


def setup_chrome_driver(keep_open: bool = False) -> webdriver.Chrome:
    """
    Setup and configure Chrome driver for browsing.
    This version relies on the integrated Selenium Manager.
    """
    chrome_options = Options()
    
    # Browser configuration
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    # Enable WebGL and hardware acceleration
    chrome_options.add_argument("--enable-webgl")
    chrome_options.add_argument("--enable-accelerated-2d-canvas")
    chrome_options.add_argument("--enable-gpu-rasterization")
    
    # Keep browser open for dev inspection if requested
    if keep_open:
        chrome_options.add_experimental_option("detach", True)
    
    # Use Selenium Manager to automatically handle Chrome driver
    driver = webdriver.Chrome(options=chrome_options)
    driver.set_page_load_timeout(30)
    
    return driver


def get_scroll_progress(driver: webdriver.Chrome) -> dict:
    """
    Get scroll progress information for the current page.
    
    Args:
        driver (webdriver.Chrome): The Chrome driver instance
        
    Returns:
        dict: Scroll progress information including position, percentage, and content metrics
    """
    try:
        # Get scroll information using JavaScript
        scroll_data = driver.execute_script("""
            return {
                scrollTop: window.pageYOffset || document.documentElement.scrollTop,
                scrollLeft: window.pageXOffset || document.documentElement.scrollLeft,
                scrollHeight: document.documentElement.scrollHeight,
                scrollWidth: document.documentElement.scrollWidth,
                clientHeight: window.innerHeight,
                clientWidth: window.innerWidth,
                documentHeight: document.body.scrollHeight,
                documentWidth: document.body.scrollWidth
            };
        """)
        
        # Calculate scroll percentages
        vertical_percentage = (scroll_data['scrollTop'] / max(scroll_data['scrollHeight'] - scroll_data['clientHeight'], 1)) * 100
        horizontal_percentage = (scroll_data['scrollLeft'] / max(scroll_data['scrollWidth'] - scroll_data['clientWidth'], 1)) * 100
        
        # Determine if there's more content
        has_more_vertical = scroll_data['scrollTop'] < (scroll_data['scrollHeight'] - scroll_data['clientHeight'])
        has_more_horizontal = scroll_data['scrollLeft'] < (scroll_data['scrollWidth'] - scroll_data['clientWidth'])
        
        # Calculate content metrics
        total_content_height = scroll_data['scrollHeight']
        visible_height = scroll_data['clientHeight']
        content_ratio = total_content_height / visible_height if visible_height > 0 else 1
        
        result = {
            "current_position": {
                "vertical": scroll_data['scrollTop'],
                "horizontal": scroll_data['scrollLeft']
            },
            "scroll_percentage": {
                "vertical": round(vertical_percentage, 1),
                "horizontal": round(horizontal_percentage, 1)
            },
            "page_dimensions": {
                "total_height": scroll_data['scrollHeight'],
                "total_width": scroll_data['scrollWidth'],
                "visible_height": scroll_data['clientHeight'],
                "visible_width": scroll_data['clientWidth']
            },
            "content_metrics": {
                "content_ratio": round(content_ratio, 2),
                "has_more_vertical": has_more_vertical,
                "has_more_horizontal": has_more_horizontal,
                "is_scrollable": content_ratio > 1
            },
            "scroll_status": {
                "at_top": scroll_data['scrollTop'] == 0,
                "at_bottom": not has_more_vertical,
                "at_left": scroll_data['scrollLeft'] == 0,
                "at_right": not has_more_horizontal
            }
        }
        
        return result
        
    except Exception as e:
        return {
            "error": f"Failed to get scroll progress: {str(e)}",
            "current_position": {"vertical": 0, "horizontal": 0},
            "scroll_percentage": {"vertical": 0, "horizontal": 0},
            "page_dimensions": {"total_height": 0, "total_width": 0, "visible_height": 0, "visible_width": 0},
            "content_metrics": {"content_ratio": 1, "has_more_vertical": False, "has_more_horizontal": False, "is_scrollable": False},
            "scroll_status": {"at_top": True, "at_bottom": True, "at_left": True, "at_right": True}
        }


def navigate_to_url(driver: webdriver.Chrome, url: str) -> dict:
    """
    Navigate to a URL and return page information.
    
    Args:
        driver (webdriver.Chrome): The Chrome driver instance
        url (str): The URL to navigate to
        
    Returns:
        dict: Page information including title, current_url, source length, and scroll metrics
    """
    driver.get(url)
    
    # Wait for page to load
    WebDriverWait(driver, 10).until(
        lambda d: d.execute_script("return document.readyState") == "complete"
    )
    
    # Get scroll information
    scroll_info = get_scroll_progress(driver)
    
    return {
        "title": driver.title,
        "current_url": driver.current_url,
        "source_length": len(driver.page_source),
        "status": "success",
        "scroll_info": scroll_info
    }


def discover_page_elements(driver: webdriver.Chrome) -> dict:
    """
    Discover all interactive elements on the current page.
    
    Args:
        driver (webdriver.Chrome): The Chrome driver instance
        
    Returns:
        dict: Dictionary containing all discovered elements with labels
    """
    elements = {
        "buttons": [],
        "inputs": [],
        "links": [],
        "selects": [],
        "textareas": []
    }
    
    try:
        # Find buttons
        buttons = driver.find_elements("tag name", "button")
        for i, button in enumerate(buttons):
            if button.is_displayed() and button.is_enabled():
                elements["buttons"].append({
                    "element": button,
                    "label": f"button_{i+1}",
                    "text": button.text.strip(),
                    "id": button.get_attribute("id") or "",
                    "class": button.get_attribute("class") or "",
                    "type": button.get_attribute("type") or "button"
                })
        
        # Find inputs
        inputs = driver.find_elements("tag name", "input")
        for i, input_elem in enumerate(inputs):
            if input_elem.is_displayed():
                elements["inputs"].append({
                    "element": input_elem,
                    "label": f"input_{i+1}",
                    "type": input_elem.get_attribute("type") or "text",
                    "placeholder": input_elem.get_attribute("placeholder") or "",
                    "name": input_elem.get_attribute("name") or "",
                    "id": input_elem.get_attribute("id") or ""
                })
        
        # Find links
        links = driver.find_elements("tag name", "a")
        for i, link in enumerate(links):
            if link.is_displayed():
                elements["links"].append({
                    "element": link,
                    "label": f"link_{i+1}",
                    "text": link.text.strip(),
                    "href": link.get_attribute("href") or "",
                    "id": link.get_attribute("id") or ""
                })
        
        # Find selects
        selects = driver.find_elements("tag name", "select")
        for i, select in enumerate(selects):
            if select.is_displayed():
                elements["selects"].append({
                    "element": select,
                    "label": f"select_{i+1}",
                    "name": select.get_attribute("name") or "",
                    "id": select.get_attribute("id") or ""
                })
        
        # Find textareas
        textareas = driver.find_elements("tag name", "textarea")
        for i, textarea in enumerate(textareas):
            if textarea.is_displayed():
                elements["textareas"].append({
                    "element": textarea,
                    "label": f"textarea_{i+1}",
                    "placeholder": textarea.get_attribute("placeholder") or "",
                    "name": textarea.get_attribute("name") or "",
                    "id": textarea.get_attribute("id") or ""
                })
        
        return elements
        
    except Exception as e:
        return {"error": f"Failed to discover elements: {str(e)}"}


def create_visual_annotations(driver: webdriver.Chrome, elements: dict) -> bool:
    """
    Create visual annotations (boxes and labels) around elements on the page.
    
    Args:
        driver (webdriver.Chrome): The Chrome driver instance
        elements (dict): Dictionary of discovered elements
        
    Returns:
        bool: True if annotations were created successfully
    """
    try:
        # Remove any existing annotations first
        driver.execute_script("document.querySelectorAll('.element-annotation').forEach(el => el.remove());")
        
        annotation_count = 0
        
        # Create annotations for each type of element
        for element_type, element_list in elements.items():
            if element_type == "error":
                continue
                
            for i, element_data in enumerate(element_list):
                try:
                    element = element_data["element"]
                    label = element_data["label"]
                    
                    # Get element position and size
                    rect = element.rect
                    
                    # Get color for this element type
                    color = get_color_for_type(element_type)
                    
                    # Create annotation using JavaScript
                    js_code = f"""
                    (function() {{
                        const annotation = document.createElement('div');
                        annotation.className = 'element-annotation';
                        annotation.style.cssText = `
                            position: absolute;
                            left: {rect['x']}px;
                            top: {rect['y']}px;
                            width: {rect['width']}px;
                            height: {rect['height']}px;
                            border: 3px solid {color};
                            background: {color}20;
                            z-index: 9999;
                            pointer-events: none;
                            box-sizing: border-box;
                        `;
                        
                        const labelDiv = document.createElement('div');
                        labelDiv.style.cssText = `
                            position: absolute;
                            top: -25px;
                            left: 0;
                            background: {color};
                            color: white;
                            padding: 2px 6px;
                            font-size: 12px;
                            font-weight: bold;
                            border-radius: 3px;
                            z-index: 10000;
                            white-space: nowrap;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        `;
                        labelDiv.textContent = '{label}';
                        
                        annotation.appendChild(labelDiv);
                        document.body.appendChild(annotation);
                    }})();
                    """
                    
                    driver.execute_script(js_code)
                    annotation_count += 1
                    
                except Exception as e:
                    continue
        
        return True
        
    except Exception as e:
        return False


def get_color_for_type(element_type: str) -> str:
    """Get color for element type annotation."""
    colors = {
        "buttons": "red",
        "inputs": "blue", 
        "links": "green",
        "selects": "orange",
        "textareas": "purple"
    }
    return colors.get(element_type, "gray")


def take_annotated_screenshot(driver: webdriver.Chrome, elements: dict, filename: str = None) -> str:
    """
    Take a screenshot with visual element annotations.
    
    Args:
        driver (webdriver.Chrome): The Chrome driver instance
        elements (dict): Dictionary of discovered elements
        filename (str, optional): Custom filename for the screenshot
        
    Returns:
        str: Path to the saved screenshot
    """
    try:
        # Create visual annotations
        create_visual_annotations(driver, elements)
        
        # Wait a moment for annotations to render
        import time
        time.sleep(2)  # Increased wait time for better rendering
        
        # Generate filename if not provided
        if not filename:
            import time
            timestamp = int(time.time())
            filename = f"annotated_page_{timestamp}.png"
        
        # Save to current directory instead of /tmp for easier access
        import os
        current_dir = os.getcwd()
        screenshot_path = os.path.join(current_dir, filename)
        
        # Take screenshot
        driver.save_screenshot(screenshot_path)
        
        # Verify the file was created
        if os.path.exists(screenshot_path):
            file_size = os.path.getsize(screenshot_path)
            return f"{screenshot_path} (Size: {file_size} bytes)"
        else:
            return f"Failed to create screenshot at {screenshot_path}"
        
    except Exception as e:
        return f"Failed to take annotated screenshot: {str(e)}"


def remove_annotations(driver: webdriver.Chrome) -> bool:
    """
    Remove all visual annotations from the page.
    
    Args:
        driver (webdriver.Chrome): The Chrome driver instance
        
    Returns:
        bool: True if annotations were removed successfully
    """
    try:
        driver.execute_script("document.querySelectorAll('.element-annotation').forEach(el => el.remove());")
        return True
    except Exception as e:
        print(f"Error removing annotations: {e}")
        return False


def click_element(driver: webdriver.Chrome, element_label: str, elements: dict) -> dict:
    """
    Click on a discovered element by its label.
    
    Args:
        driver (webdriver.Chrome): The Chrome driver instance
        element_label (str): The label of the element to click (e.g., "button_1", "link_3")
        elements (dict): Dictionary of discovered elements
        
    Returns:
        dict: Result of the click operation
    """
    try:
        # Find the element by label
        target_element = None
        element_type = None
        
        for elem_type, elem_list in elements.items():
            if elem_type == "error":
                continue
            for elem_data in elem_list:
                if elem_data["label"] == element_label:
                    target_element = elem_data["element"]
                    element_type = elem_type
                    break
            if target_element:
                break
        
        if not target_element:
            return {
                "success": False,
                "error": f"Element '{element_label}' not found in discovered elements",
                "available_elements": [elem["label"] for elem_list in elements.values() if isinstance(elem_list, list) for elem in elem_list]
            }
        
        # Scroll element into view
        driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", target_element)
        
        # Wait a moment for scroll to complete
        import time
        time.sleep(1)
        
        # Click the element
        target_element.click()
        
        # Get updated page info after click
        new_page_info = {
            "title": driver.title,
            "current_url": driver.current_url,
            "source_length": len(driver.page_source)
        }
        
        return {
            "success": True,
            "message": f"Successfully clicked {element_type} '{element_label}'",
            "new_page_info": new_page_info,
            "element_type": element_type
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to click element '{element_label}': {str(e)}"
        }


def scroll_page(driver: webdriver.Chrome, direction: str = "down", amount: int = 500) -> dict:
    """
    Scroll the page in a specified direction.
    
    Args:
        driver (webdriver.Chrome): The Chrome driver instance
        direction (str): Direction to scroll ("down", "up", "left", "right")
        amount (int): Number of pixels to scroll
        
    Returns:
        dict: Result of the scroll operation
    """
    try:
        if direction == "down":
            driver.execute_script(f"window.scrollBy(0, {amount});")
        elif direction == "up":
            driver.execute_script(f"window.scrollBy(0, -{amount});")
        elif direction == "right":
            driver.execute_script(f"window.scrollBy({amount}, 0);")
        elif direction == "left":
            driver.execute_script(f"window.scrollBy(-{amount}, 0);")
        else:
            return {
                "success": False,
                "error": f"Invalid direction '{direction}'. Use 'down', 'up', 'left', or 'right'"
            }
        
        # Wait for scroll to complete
        import time
        time.sleep(1)
        
        # Get updated scroll progress
        scroll_info = get_scroll_progress(driver)
        
        return {
            "success": True,
            "message": f"Successfully scrolled {direction} by {amount}px",
            "new_scroll_info": scroll_info
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to scroll {direction}: {str(e)}"
        }


def extract_element_info(driver: webdriver.Chrome, element_label: str, elements: dict) -> dict:
    """
    Extract detailed information about a discovered element.
    
    Args:
        driver (webdriver.Chrome): The Chrome driver instance
        element_label (str): The label of the element to inspect
        elements (dict): Dictionary of discovered elements
        
    Returns:
        dict: Detailed information about the element
    """
    try:
        # Find the element by label
        target_element = None
        element_type = None
        
        for elem_type, elem_list in elements.items():
            if elem_type == "error":
                continue
            for elem_data in elem_list:
                if elem_data["label"] == element_label:
                    target_element = elem_data["element"]
                    element_type = elem_type
                    break
            if target_element:
                break
        
        if not target_element:
            return {
                "success": False,
                "error": f"Element '{element_label}' not found in discovered elements"
            }
        
        # Extract element information
        element_info = {
            "label": element_label,
            "type": element_type,
            "text": target_element.text.strip(),
            "tag_name": target_element.tag_name,
            "is_displayed": target_element.is_displayed(),
            "is_enabled": target_element.is_enabled(),
            "location": target_element.location,
            "size": target_element.size,
            "attributes": {}
        }
        
        # Get common attributes
        common_attrs = ["id", "class", "href", "type", "name", "value", "placeholder", "title", "alt"]
        for attr in common_attrs:
            try:
                value = target_element.get_attribute(attr)
                if value:
                    element_info["attributes"][attr] = value
            except:
                pass
        
        return {
            "success": True,
            "element_info": element_info
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to extract element info: {str(e)}"
        }


# Browser tools available to the agent
BROWSER_TOOLS = {
    "click_element": {
        "name": "click_element",
        "description": "Click on a discovered element by its label (e.g., 'button_1', 'link_3')",
        "parameters": {
            "element_label": {"type": "string", "required": True, "description": "The label of the element to click (from discovered elements)"}
        }
    },
    "scroll_page": {
        "name": "scroll_page",
        "description": "Scroll the page in a specified direction",
        "parameters": {
            "direction": {"type": "string", "required": True, "description": "Direction to scroll: 'down', 'up', 'left', 'right'"},
            "amount": {"type": "integer", "required": False, "description": "Number of pixels to scroll (default: 500)"}
        }
    },
    "extract_element_info": {
        "name": "extract_element_info",
        "description": "Get detailed information about a discovered element",
        "parameters": {
            "element_label": {"type": "string", "required": True, "description": "The label of the element to inspect"}
        }
    }
}