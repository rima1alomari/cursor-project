#!/usr/bin/env python3
"""
Simple HTTP server for local development
Run this script to serve your webapp on localhost
"""

import http.server
import socketserver
import os
import sys
import json
import urllib.parse
import re

PORT = 8000

# Try to get OpenAI API key from environment variable or config.js
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', None)

# If not in environment, try to read from config.js
if not OPENAI_API_KEY:
    try:
        config_path = os.path.join(os.path.dirname(__file__), 'config.js')
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config_content = f.read()
                # Extract API key from config.js
                match = re.search(r"OPENAI_API_KEY\s*=\s*['\"]([^'\"]+)['\"]", config_content)
                if match:
                    OPENAI_API_KEY = match.group(1)
                    print(f"[Config] Successfully loaded API key from config.js (length: {len(OPENAI_API_KEY)})")
                else:
                    print("[Config] Warning: API key pattern not found in config.js")
        else:
            print(f"[Config] Warning: config.js not found at {config_path}")
    except Exception as e:
        print(f"[Config] Warning: Could not read API key from config.js: {e}")

# Print API key status (without exposing the key)
if OPENAI_API_KEY and OPENAI_API_KEY != 'YOUR_OPENAI_API_KEY_HERE':
    print(f"[Config] ✅ OpenAI API key is configured (starts with: {OPENAI_API_KEY[:10]}...)")
else:
    print("[Config] ❌ OpenAI API key is NOT configured!")

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        """Handle GET requests - serve static files"""
        super().do_GET()

    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/ai/slide-command':
            self.handle_slide_command()
        else:
            self.send_response(404)
            self.end_headers()

    def handle_slide_command(self):
        """Handle AI slide command endpoint"""
        try:
            print(f"[AI Slide Command] Received POST request to {self.path}")
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                print("[AI Slide Command] Error: Empty request body")
                self.send_error_response(400, 'Empty request body')
                return

            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            command = data.get('command', '')
            slide_context = data.get('slideContext', {})
            
            print(f"[AI Slide Command] Command: {command}")
            print(f"[AI Slide Command] Slide context: {json.dumps(slide_context, indent=2)}")

            if not command:
                print("[AI Slide Command] Error: Command is required")
                self.send_error_response(400, 'Command is required')
                return

            # Call OpenAI API to interpret the command
            print("[AI Slide Command] Calling OpenAI API...")
            modification = self.interpret_command_with_ai(command, slide_context)
            print(f"[AI Slide Command] OpenAI returned: {json.dumps(modification, indent=2) if modification else 'null'}")
            
            # Always return a response, even if modification is None (null)
            # This allows the client to fall back to normal AI chat
            response_data = {'modification': modification}
            self.send_json_response(200, response_data)
            print("[AI Slide Command] Response sent successfully")
                
        except json.JSONDecodeError:
            self.send_error_response(400, 'Invalid JSON')
        except Exception as e:
            print(f"Error handling slide command: {e}")
            self.send_error_response(500, f'Server error: {str(e)}')

    def interpret_command_with_ai(self, command, slide_context):
        """Use OpenAI API to interpret the command and return structured modification JSON"""
        if not OPENAI_API_KEY or OPENAI_API_KEY == 'YOUR_OPENAI_API_KEY_HERE':
            print("[OpenAI] ❌ Warning: OpenAI API key not configured. Returning null modification.")
            return None
        
        print(f"[OpenAI] 🔑 Using API key: {OPENAI_API_KEY[:15]}...")

        try:
            import urllib.request
            import urllib.error

            # Build the prompt
            context_str = json.dumps(slide_context, indent=2)
            prompt = f"""You are an AI assistant that interprets user commands for a slide editor and returns structured JSON modifications.

Current slide context:
{context_str}

User command: "{command}"

Interpret this command and return a JSON object with the following structure based on the action needed:

Available actions (comprehensive list):

SLIDE OPERATIONS:
1. "add_slide" - Add a new slide
   {{"action": "add_slide", "title": "Slide Title", "backgroundColor": "#ffffff", "elements": [...]}}

2. "delete_slide" - Delete a slide
   {{"action": "delete_slide", "slideIndex": 2}} or {{"action": "delete_slide", "target": 3}}

3. "duplicate_slide" - Duplicate a slide
   {{"action": "duplicate_slide", "slideIndex": 1, "insertAfter": 2}}

4. "move_slide" - Move/reorder slides
   {{"action": "move_slide", "fromIndex": 1, "toIndex": 3}}

5. "navigate_to_slide" - Navigate to a specific slide
   {{"action": "navigate_to_slide", "slideIndex": 2}}

TEXT OPERATIONS:
6. "update_text" - Update existing text element
   {{"action": "update_text", "target": "current_slide", "content": "New text", "fontSize": 24, "color": "#000000"}}

7. "add_text" - Add new text element
   {{"action": "add_text", "target": "current_slide", "content": "Text content", "left": 40, "top": 40, "fontSize": 16}}

8. "add_bullets" - Add bullet points
   {{"action": "add_bullets", "target": "current_slide", "bullets": ["Point 1", "Point 2", "Point 3"]}}

9. "update_font" - Change font properties
   {{"action": "update_font", "fontFamily": "Arial", "fontSize": 20, "color": "#ff0000"}}

10. "update_text_style" - Change text styling
    {{"action": "update_text_style", "bold": true, "italic": false, "align": "center"}}

ELEMENT OPERATIONS:
11. "remove_element" - Remove an element
    {{"action": "remove_element", "target": "current_slide", "elementId": "element-id"}}

12. "move_element" - Move element position
    {{"action": "move_element", "elementId": "element-id", "left": 100, "top": 200}}

13. "resize_element" - Resize an element
    {{"action": "resize_element", "elementId": "element-id", "width": 500, "height": 300}}

14. "update_element" - Update any element property
    {{"action": "update_element", "elementId": "element-id", "opacity": 0.8, "color": "#0000ff"}}

15. "select_element" - Select an element
    {{"action": "select_element", "elementId": "element-id"}}

16. "reorder_element" - Change element z-order (bring to front/back)
    {{"action": "reorder_element", "elementId": "element-id", "position": "front"}}

MEDIA OPERATIONS:
17. "add_image" - Add an image
    {{"action": "add_image", "target": "current_slide", "src": "https://example.com/image.jpg", "left": 100, "top": 100, "width": 400}}

18. "add_shape" - Add a shape
    {{"action": "add_shape", "target": "current_slide", "shape": "rectangle", "fill": "#3b82f6", "left": 160, "top": 120}}

19. "add_chart" - Add a chart
    {{"action": "add_chart", "target": "current_slide", "chartType": "bar", "data": {{"labels": ["A", "B"], "datasets": [{{"data": [10, 20]}}]}}}}

SLIDE PROPERTIES:
20. "update_background" - Change slide background
    {{"action": "update_background", "target": "current_slide", "backgroundColor": "#f0f0f0"}}

21. "change_layout" - Change layout alignment
    {{"action": "change_layout", "target": "current_slide", "layout": "center"}}

22. "replace_content" - Replace all slide content
    {{"action": "replace_content", "target": "current_slide", "elements": [...], "backgroundColor": "#ffffff"}}

ANIMATION:
23. "update_animation" - Update slide or element animation
    {{"action": "update_animation", "animationTarget": "slide", "animationType": "fade", "duration": 800}}
    {{"action": "update_animation", "animationTarget": "element", "elementId": "element-id", "animationType": "slide"}}

CRITICAL REQUIREMENTS:
- You MUST return a valid JSON object with an "action" field
- Return ONLY the JSON object directly, no markdown, no code blocks, no wrapping
- The JSON should be parseable directly with json.loads()
- Use "current_slide" as target unless user specifies a slide number
- For text updates, if no elementId is specified, update the first text element or create one
- Be specific with values (e.g., exact colors, font sizes, positions)
- For element operations, try to identify elements by content or position if elementId not available
- If the command is unclear or not a slide editor command, return: {{"action": null}}
- Support natural language commands like "make text bigger", "move to center", "change color to blue", etc.

Example valid response:
{{"action": "add_slide", "title": "New Slide", "backgroundColor": "#ffffff"}}

Return ONLY the JSON object (no other text):"""

            # Call OpenAI API
            api_url = 'https://api.openai.com/v1/chat/completions'
            request_data = {
                'model': 'gpt-3.5-turbo',
                'messages': [
                    {
                        'role': 'system',
                        'content': 'You are a slide editor command interpreter. You MUST return a valid JSON object with an "action" field. Always return valid JSON only, no markdown formatting, no code blocks. The JSON should directly contain the modification object.'
                    },
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                'temperature': 0.7,
                'max_tokens': 1500,
                'response_format': {'type': 'json_object'}
            }

            req = urllib.request.Request(
                api_url,
                data=json.dumps(request_data).encode('utf-8'),
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {OPENAI_API_KEY}'
                }
            )

            with urllib.request.urlopen(req, timeout=30) as response:
                response_data = json.loads(response.read().decode('utf-8'))
                
                if 'choices' in response_data and len(response_data['choices']) > 0:
                    content = response_data['choices'][0]['message']['content'].strip()
                    print(f"[OpenAI Response] Raw content length: {len(content)}")
                    print(f"[OpenAI Response] Raw content preview: {content[:300]}...")
                    
                    # Try to parse JSON from response
                    try:
                        # When using response_format: {'type': 'json_object'}, OpenAI should return pure JSON
                        # But sometimes it might still have markdown, so clean it
                        content = re.sub(r'^```json\s*', '', content, flags=re.MULTILINE)
                        content = re.sub(r'^```\s*', '', content, flags=re.MULTILINE)
                        content = content.strip()
                        
                        # Try to extract JSON object if wrapped in text
                        json_match = re.search(r'\{[\s\S]*\}', content)
                        if json_match:
                            content = json_match.group(0)
                        
                        modification = json.loads(content)
                        
                        # If the response is wrapped in another object, extract the modification
                        if 'modification' in modification:
                            modification = modification['modification']
                        elif 'action' not in modification and len(modification) == 1:
                            # If it's wrapped in a single key, unwrap it
                            modification = list(modification.values())[0]
                        
                        # Validate that we have an action
                        if 'action' not in modification:
                            print(f"[OpenAI Response] Warning: No 'action' field in modification: {modification}")
                            return None
                        
                        print(f"[OpenAI Response] ✅ Successfully parsed modification: {json.dumps(modification, indent=2)}")
                        return modification
                    except json.JSONDecodeError as e:
                        print(f"[OpenAI Response] ❌ Failed to parse JSON: {e}")
                        print(f"[OpenAI Response] Content that failed: {content}")
                        return None
                    except Exception as e:
                        print(f"[OpenAI Response] ❌ Unexpected error parsing response: {e}")
                        print(f"[OpenAI Response] Content: {content}")
                        return None
                else:
                    print(f"[OpenAI Response] ❌ Unexpected format: {json.dumps(response_data, indent=2)}")
                    return None

        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            print(f"OpenAI API HTTP error {e.code}: {error_body}")
            return None
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            return None

    def send_json_response(self, status_code, data):
        """Send JSON response"""
        response_json = json.dumps(data)
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(response_json.encode('utf-8'))

    def send_error_response(self, status_code, message):
        """Send error response"""
        error_data = {'error': message}
        self.send_json_response(status_code, error_data)

    def end_headers(self):
        # Add CORS headers if needed
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def log_message(self, format, *args):
        # Custom log format
        sys.stderr.write("%s - - [%s] %s\n" %
                        (self.address_string(),
                         self.log_date_time_string(),
                         format%args))

def main():
    # Change to the directory where this script is located
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    Handler = MyHTTPRequestHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("=" * 60)
        print(f"Server running at http://localhost:{PORT}/")
        print(f"Open http://localhost:{PORT}/slide-editor.html in your browser")
        print("=" * 60)
        print("Press Ctrl+C to stop the server")
        print("=" * 60)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nServer stopped.")
            sys.exit(0)

if __name__ == "__main__":
    main()

