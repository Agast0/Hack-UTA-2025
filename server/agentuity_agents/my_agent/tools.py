"""
Tool definitions and utility functions for the Web Browser Automation Agent.
"""

import re
from urllib.parse import urlparse
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
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
        
        # Basic domain validation
        domain_pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$'
        if not re.match(domain_pattern, result.netloc):
            return False, "Invalid domain name format"
            
        return True, ""
    except Exception as e:
        return False, f"URL parsing error: {str(e)}"


def setup_chrome_driver(keep_open: bool = False) -> webdriver.Chrome:
    """
    Setup and configure Chrome driver for browsing.
    
    Args:
        keep_open (bool): Whether to keep browser open after script ends (dev mode)
    
    Returns:
        webdriver.Chrome: Configured Chrome driver instance
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
    
    # Use webdriver-manager to automatically handle Chrome driver
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    driver.set_page_load_timeout(30)
    
    return driver


def navigate_to_url(driver: webdriver.Chrome, url: str) -> dict:
    """
    Navigate to a URL and return page information.
    
    Args:
        driver (webdriver.Chrome): The Chrome driver instance
        url (str): The URL to navigate to
        
    Returns:
        dict: Page information including title, current_url, and source length
    """
    driver.get(url)
    
    # Wait for page to load
    WebDriverWait(driver, 10).until(
        lambda d: d.execute_script("return document.readyState") == "complete"
    )
    
    return {
        "title": driver.title,
        "current_url": driver.current_url,
        "source_length": len(driver.page_source),
        "status": "success"
    }


# Future tool definitions (currently unused)
# These will be implemented when the agent needs them
BROWSER_TOOLS = {
    "click_element": {
        "name": "click_element",
        "description": "Click on a specified element",
        "parameters": {
            "selector": {"type": "string", "required": True, "description": "CSS selector or XPath for the element"},
            "by": {"type": "string", "required": False, "description": "Locator strategy (css, xpath, id, class_name)"}
        }
    },
    "fill_form": {
        "name": "fill_form_field", 
        "description": "Fill a form field with specified text",
        "parameters": {
            "selector": {"type": "string", "required": True, "description": "CSS selector for the form field"},
            "text": {"type": "string", "required": True, "description": "Text to fill in the field"}
        }
    },
    "extract_text": {
        "name": "extract_text",
        "description": "Extract text content from specified elements", 
        "parameters": {
            "selector": {"type": "string", "required": True, "description": "CSS selector for elements to extract text from"}
        }
    }
}
