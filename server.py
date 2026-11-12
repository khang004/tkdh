from http.server import HTTPServer, SimpleHTTPRequestHandler
import sys

class CORSRequestHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        '': 'application/octet-stream',
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
    }
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('ngrok-skip-browser-warning', 'true')
        super().end_headers()

if __name__ == '__main__':
    port = 8000
    server = HTTPServer(('0.0.0.0', port), CORSRequestHandler)
    print(f"Serving HTTP on 0.0.0.0 port {port}...")
    server.serve_forever()
