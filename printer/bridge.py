#!/usr/bin/env python3
"""Small authenticated raw-text bridge for the Cyber Arena V2 Xprinter.

Keep this service on the trusted café LAN. Do not configure router port forwarding.
"""
from __future__ import annotations

import hmac
import ipaddress
import json
import os
import re
import socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

HOST = os.environ.get("BRIDGE_HOST", "0.0.0.0")
PORT = int(os.environ.get("BRIDGE_PORT", "8787"))
TOKEN = os.environ.get("BRIDGE_TOKEN", "").strip()
MAX_BODY = 32 * 1024
PRINTER_PORT = 9100
PRIVATE_NETWORKS = tuple(ipaddress.ip_network(cidr) for cidr in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"))
DEFAULT_ORIGINS = "https://yassinjawdet16-debug.github.io"
ALLOWED_ORIGINS = {
    item.strip().rstrip("/")
    for item in os.environ.get("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",")
    if item.strip()
}


def json_bytes(payload: dict) -> bytes:
    return json.dumps(payload, ensure_ascii=False).encode("utf-8")


class Handler(BaseHTTPRequestHandler):
    server_version = "CyberArenaPrintBridge/1.0"

    def log_message(self, fmt: str, *args: object) -> None:
        # Never log authorization headers or receipt content.
        super().log_message(fmt, *args)

    def _send_json(self, status: int, payload: dict, extra_headers=None) -> None:
        body = json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for key, value in (extra_headers or {}).items():
            self.send_header(key, value)
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _cors_headers(self) -> None:
        origin = self.headers.get("Origin", "").rstrip("/")
        if origin and origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
            self.send_header("Access-Control-Max-Age", "600")

    def do_OPTIONS(self) -> None:
        origin = self.headers.get("Origin", "").rstrip("/")
        if origin not in ALLOWED_ORIGINS:
            self._send_json(403, {"accepted": False, "message": "Origin is not allowed."})
            return
        self.send_response(204)
        self._cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/health":
            self._send_json(200, {"ok": True, "service": "Cyber Arena print bridge"})
            return
        if path == "/print":
            self._send_json(405, {"accepted": False, "message": "Use POST for printing."}, {"Allow": "POST, OPTIONS"})
            return
        self._send_json(404, {"accepted": False, "message": "Not found."})

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/print":
            self._send_json(404, {"accepted": False, "message": "Not found."})
            return

        origin = self.headers.get("Origin", "").rstrip("/")
        if origin and origin not in ALLOWED_ORIGINS:
            self._send_json(403, {"accepted": False, "message": "Origin is not allowed."})
            return

        supplied = self.headers.get("Authorization", "")
        if not TOKEN or not supplied.startswith("Bearer ") or not hmac.compare_digest(
            supplied[7:].strip(), TOKEN
        ):
            self._send_json(401, {"accepted": False, "message": "Invalid bridge secret."})
            return

        content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        if content_type != "application/json":
            self._send_json(415, {"accepted": False, "message": "Send application/json."})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length < 1 or length > MAX_BODY:
            self._send_json(413, {"accepted": False, "message": "Request body is empty or too large."})
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(400, {"accepted": False, "message": "Invalid UTF-8 JSON."})
            return
        if not isinstance(payload, dict):
            self._send_json(400, {"accepted": False, "message": "Expected a JSON object."})
            return

        text = payload.get("text")
        bill_id = payload.get("billId")
        printer_ip = payload.get("printerIp")
        if not isinstance(text, str) or not text.strip() or len(text.encode("utf-8")) > MAX_BODY:
            self._send_json(400, {"accepted": False, "message": "Receipt text is missing or too large."})
            return
        if not isinstance(bill_id, str) or not bill_id.strip() or len(bill_id) > 100:
            self._send_json(400, {"accepted": False, "message": "Bill ID is invalid."})
            return

        try:
            address = ipaddress.ip_address(str(printer_ip))
        except ValueError:
            self._send_json(400, {"accepted": False, "message": "Printer IP address is invalid."})
            return
        if address.version != 4 or not any(address in network for network in PRIVATE_NETWORKS):
            self._send_json(400, {"accepted": False, "message": "Printer must use an RFC1918 private LAN IPv4 address."})
            return

        # Treat receipts as text only; do not allow embedded ESC/POS control commands.
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
        if not text.strip():
            self._send_json(400, {"accepted": False, "message": "Receipt text is empty after sanitization."})
            return

        # Never accept an arbitrary port from the browser: thermal printers use TCP 9100.
        try:
            with socket.create_connection((str(address), PRINTER_PORT), timeout=4) as printer:
                printer.settimeout(4)
                printer.sendall(text.replace("\r\n", "\n").encode("utf-8") + b"\n\n")
        except OSError as exc:
            self._send_json(502, {"accepted": False, "message": f"Could not send to printer {address}: {exc}."})
            return

        self._send_json(
            200,
            {
                "accepted": True,
                "status": "accepted",
                "billId": bill_id,
                "physicalOutputVerified": False,
                "message": "Text was sent to the printer's TCP socket; paper output was not independently verified.",
            },
        )


def main() -> None:
    if len(TOKEN) < 16:
        raise SystemExit(
            "Set BRIDGE_TOKEN to a random secret of at least 16 characters before starting the bridge."
        )
    if not 1 <= PORT <= 65535:
        raise SystemExit("BRIDGE_PORT must be between 1 and 65535.")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    server.daemon_threads = True
    print(f"Cyber Arena print bridge listening on {HOST}:{PORT}")
    print("Allowed browser origins:", ", ".join(sorted(ALLOWED_ORIGINS)))
    print("Keep Windows Firewall limited to Private networks; do not port-forward this service.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping print bridge...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
