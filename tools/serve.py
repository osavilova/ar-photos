# Local helper server for the tools pages.
# Serves the repo root and saves PUT uploads into tools/work/ (used by compile.html).
# Usage: python3 tools/serve.py /abs/path/to/ar-photos [port]
import http.server, os, sys
ROOT = os.path.abspath(sys.argv[1])
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8765
WORK = os.path.join(ROOT, 'tools', 'work')
os.makedirs(WORK, exist_ok=True)

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def do_PUT(self):
        name = os.path.basename(self.path.split('?')[0])
        data = self.rfile.read(int(self.headers['Content-Length']))
        with open(os.path.join(WORK, name), 'wb') as f:
            f.write(data)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'saved')

http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
