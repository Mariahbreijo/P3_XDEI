#!/usr/bin/env python3
"""Simple mock for Orion-LD NGSI-LD endpoints.

Supports:
- GET /version
- GET /ngsi-ld/v1/entities
- POST /ngsi-ld/v1/entities
- PATCH /ngsi-ld/v1/entities/<id>/attrs
- PUT /ngsi-ld/v1/entities/<id>/attrs

Stores entity attributes in memory so the simulator can PATCH and get 204 responses.
"""
from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

STORE: dict[str, dict] = {}


class OrionMockHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send(self, code: int, data: dict | None = None):
        body = b""
        if data is not None:
            body = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/ld+json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_GET(self):
        p = urlparse(self.path)
        if p.path == "/version":
            return self._send(200, {"orion": "mock", "version": "0.0.1"})
        if p.path == "/ngsi-ld/v1/entities":
            # return full entities so dashboards can read attribute values
            entities = list(STORE.values())
            return self._send(200, entities)
        self._send(404, {"error": "not_found"})

    def do_POST(self):
        p = urlparse(self.path)
        if p.path == "/ngsi-ld/v1/entities":
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length) if length else b"{}"
            try:
                entity = json.loads(body)
            except Exception:
                return self._send(400, {"error": "invalid_json"})
            eid = entity.get("id")
            if not eid:
                return self._send(400, {"error": "missing id"})
            if eid in STORE:
                # conflict
                return self._send(409, {"error": "conflict"})
            STORE[eid] = entity
            return self._send(201, {"status": "created"})
        self._send(404, {"error": "not_found"})

    def do_PATCH(self):
        # PATCH to /ngsi-ld/v1/entities/<id>/attrs
        p = urlparse(self.path)
        parts = p.path.split("/")
        if len(parts) >= 6 and parts[1] == "ngsi-ld" and parts[2] == "v1" and parts[3] == "entities" and parts[5] == "attrs":
            eid = unquote(parts[4])
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length) if length else b"{}"
            try:
                attrs = json.loads(body)
            except Exception:
                return self._send(400, {"error": "invalid_json"})
            entity = STORE.setdefault(eid, {})
            # merge attrs
            for k, v in attrs.items():
                entity[k] = v
            # NGSI-LD PATCH should return 204 No Content
            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        self._send(404, {"error": "not_found"})

    def do_PUT(self):
        # PUT to /ngsi-ld/v1/entities/<id>/attrs -> replace or upsert
        p = urlparse(self.path)
        parts = p.path.split("/")
        if len(parts) >= 6 and parts[1] == "ngsi-ld" and parts[2] == "v1" and parts[3] == "entities" and parts[5] == "attrs":
            eid = unquote(parts[4])
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length) if length else b"{}"
            try:
                attrs = json.loads(body)
            except Exception:
                return self._send(400, {"error": "invalid_json"})
            entity = STORE.setdefault(eid, {})
            entity.update(attrs)
            return self._send(204, None)
        self._send(404, {"error": "not_found"})


def run(host: str = "0.0.0.0", port: int = 1026):
    server = ThreadingHTTPServer((host, port), OrionMockHandler)
    print(f"Mock Orion-LD listening on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Shutting down mock")
        server.shutdown()


if __name__ == "__main__":
    run()
