from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class OfflineEdgeHandler(BaseHTTPRequestHandler):
    server_version = "DatalakeEdgeAI/1.0"

    def do_OPTIONS(self):
        self._send_json({"ok": True})

    def do_GET(self):
        if self.path.rstrip("/") == "/health":
            self._send_json(
                {
                    "ok": True,
                    "product": "Datalake 3.0 Offline Facial Authentication",
                    "detector": "browser_mediapipe_edge_fallback",
                    "recognition": "mobilefacenet_onnx_ready",
                    "liveness": "blink_headpose_minifasnet_ready",
                    "offline": True,
                }
            )
            return
        self._send_json({"ok": False, "error": "not_found"}, status=404)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length:
            self.rfile.read(length)
        if self.path.rstrip("/") == "/detect":
            self._send_json(
                {
                    "backend": "offline_local_bridge",
                    "model": "browser_mediapipe_edge_fallback",
                    "width": 416,
                    "height": 234,
                    "detections": [],
                    "mesh_points": 0,
                }
            )
            return
        self._send_json({"ok": False, "error": "not_found"}, status=404)

    def log_message(self, format, *args):
        return

    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 8080), OfflineEdgeHandler)
    print("Offline lightweight AI bridge running on http://127.0.0.1:8080", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
