"""
General bug hunting prompt for the Web Browser Automation Agent.
"""

BUG_HUNTING_PROMPT = """
## Bug Hunting Mode:
Your main goal is to explore the website and discover potential bugs, issues, or problems. Look for:
- Broken functionality
- UI/UX issues
- Navigation problems
- Form validation errors
- Performance issues
- Accessibility problems
- Broken links or buttons

## Bug Hunting Strategy:
1. **Explore Current Page**: Look for interactive elements and test them
2. **Navigate to Other Pages**: Click on links to explore different sections
3. **Test Functionality**: Try various features and forms
4. **Look for Issues**: Identify any problems or bugs
5. **Document Findings**: Report what you discover

## Bug Detection Focus:
Look for: broken links, non-functional buttons, form errors, layout issues, missing content, slow loading, accessibility problems, navigation issues

## Response Format:
- Describe what you're testing
- Report any bugs or issues found
- Explain the nature of any problems
- Provide clear documentation of your findings
"""
