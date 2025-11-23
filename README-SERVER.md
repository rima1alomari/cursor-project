# Local Development Server

## Quick Start

To use the speech recognition feature, you need to run a local server (the browser requires HTTPS or localhost for security).

### Option 1: Using the Python Server (Recommended)

1. **Start the server:**
   ```bash
   cd /Users/rimaalomari/Desktop/webapp/Cursor-Project
   python3 server.py
   ```
   
   Or use the convenience script:
   ```bash
   ./start-server.sh
   ```

2. **Open your browser:**
   - Go to: `http://localhost:8000/slide-editor.html`
   - The speech recognition will now work!

### Option 2: Using Python's Built-in Server

```bash
cd /Users/rimaalomari/Desktop/webapp/Cursor-Project
python3 -m http.server 8000
```

Then open: `http://localhost:8000/slide-editor.html`

### Option 3: Using Node.js (if you have it)

```bash
cd /Users/rimaalomari/Desktop/webapp/Cursor-Project
npx http-server -p 8000
```

Then open: `http://localhost:8000/slide-editor.html`

## Important Notes

- **Always use `localhost` or `127.0.0.1`** - don't use `file://` protocol
- The server runs on port **8000** by default
- Press **Ctrl+C** to stop the server
- Make sure to allow microphone permissions when the browser asks

## Troubleshooting

- **Port already in use?** Change the PORT number in `server.py`
- **Python not found?** Install Python 3 from python.org
- **Still not working?** Check browser console (F12) for error messages

