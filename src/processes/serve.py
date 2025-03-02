from http.server import HTTPServer, SimpleHTTPRequestHandler

class CustomHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add the required security headers
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()

# Bind to localhost on port 8000
server_address = ("127.0.0.1", 8000)

httpd = HTTPServer(server_address, CustomHandler)
print("Serving on http://127.0.0.1:8000")
httpd.serve_forever()

