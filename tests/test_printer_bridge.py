import json
import os
import threading
import unittest
from types import SimpleNamespace
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from unittest.mock import Mock, patch

os.environ["BRIDGE_TOKEN"] = "test-secret-long-enough"
from printer import bridge


class FakePrinterSocket:
    def __init__(self):
        self.sent = b""
        self.timeout = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def settimeout(self, value):
        self.timeout = value

    def sendall(self, payload):
        self.sent += payload


class BridgeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = bridge.ThreadingHTTPServer(("127.0.0.1", 0), bridge.Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def request(self, path, payload=None, token=None, origin="https://yassinjawdet16-debug.github.io", method=None):
        body = None if payload is None else json.dumps(payload).encode("utf-8")
        headers = {}
        if token is not None:
            headers["Authorization"] = "Bearer " + token
        if origin is not None:
            headers["Origin"] = origin
        if body is not None:
            headers["Content-Type"] = "application/json"
        req = Request(self.base + path, data=body, headers=headers, method=method)
        try:
            with urlopen(req, timeout=3) as response:
                return response.status, response.headers, json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            raw = exc.read().decode("utf-8")
            return exc.code, exc.headers, json.loads(raw) if raw else {}

    def test_health_endpoint(self):
        status, _, payload = self.request("/health", origin=None)
        self.assertEqual(status, 200)
        self.assertTrue(payload["ok"])

    def test_print_endpoint_requires_secret(self):
        status, _, payload = self.request(
            "/print", {"text": "test receipt", "billId": "BILL-1", "printerIp": "192.168.1.44"}
        )
        self.assertEqual(status, 401)
        self.assertFalse(payload["accepted"])

    def test_print_endpoint_rejects_untrusted_origin(self):
        status, _, _ = self.request(
            "/print",
            {"text": "test receipt", "billId": "BILL-1", "printerIp": "192.168.1.44"},
            token=bridge.TOKEN,
            origin="https://evil.example",
        )
        self.assertEqual(status, 403)

    def test_get_print_is_post_only(self):
        status, headers, payload = self.request("/print", origin=None)
        self.assertEqual(status, 405)
        self.assertIn("POST", headers.get("Allow", ""))
        self.assertFalse(payload["accepted"])

    def test_success_sends_text_to_fixed_thermal_port(self):
        fake_socket = FakePrinterSocket()
        payload = {"text": "CYBER ARENA\x1b@\nBill: BILL-2", "billId": "BILL-2", "printerIp": "192.168.1.44", "port": 1234}
        connect = Mock(return_value=fake_socket)
        with patch.object(bridge, "socket", SimpleNamespace(create_connection=connect)):
            status, headers, result = self.request(
                "/print", payload, token=bridge.TOKEN
            )
        self.assertEqual(status, 200)
        self.assertTrue(result["accepted"])
        self.assertFalse(result["physicalOutputVerified"])
        connect.assert_called_once_with(("192.168.1.44", 9100), timeout=4)
        self.assertIn(b"CYBER ARENA", fake_socket.sent)
        self.assertIn(b"Bill: BILL-2", fake_socket.sent)
        self.assertNotIn(b"\x1b", fake_socket.sent)
        self.assertEqual(headers.get("Access-Control-Allow-Origin"), "https://yassinjawdet16-debug.github.io")

    def test_public_printer_ip_is_rejected(self):
        payload = {"text": "test receipt", "billId": "BILL-3", "printerIp": "8.8.8.8"}
        connect = Mock()
        with patch.object(bridge, "socket", SimpleNamespace(create_connection=connect)):
            status, _, result = self.request("/print", payload, token=bridge.TOKEN)
        self.assertEqual(status, 400)
        self.assertFalse(result["accepted"])
        connect.assert_not_called()


    def test_oversized_request_body_is_rejected_before_printer_connection(self):
        payload = {
            "text": "x" * bridge.MAX_BODY,
            "billId": "BILL-LARGE",
            "printerIp": "192.168.1.44",
        }
        connect = Mock()
        with patch.object(bridge, "socket", SimpleNamespace(create_connection=connect)):
            status, _, result = self.request(
                "/print", payload, token=bridge.TOKEN
            )
        self.assertEqual(status, 413)
        self.assertFalse(result["accepted"])
        connect.assert_not_called()

    def test_invalid_private_ip_is_rejected_before_printer_connection(self):
        for address in ("not-an-ip", "127.0.0.1", "169.254.1.10", "192.168.1.44"):
            with self.subTest(address=address):
                payload = {
                    "text": "test receipt",
                    "billId": "BILL-IP",
                    "printerIp": address,
                }
                connect = Mock()
                with patch.object(bridge, "socket", SimpleNamespace(create_connection=connect)):
                    status, _, result = self.request(
                        "/print", payload, token=bridge.TOKEN
                    )
                if address == "192.168.1.44":
                    self.assertEqual(status, 200)
                    self.assertTrue(result["accepted"])
                else:
                    self.assertEqual(status, 400)
                    self.assertFalse(result["accepted"])
                connect.assert_called_once_with((address, 9100), timeout=4) if address == "192.168.1.44" else connect.assert_not_called()


if __name__ == "__main__":
    unittest.main()
