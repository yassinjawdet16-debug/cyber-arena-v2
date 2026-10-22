# Cyber Arena V2 — Xprinter LAN bridge

This small Windows-side helper sends the website's **plain-text receipt** to an Xprinter on the café LAN using raw TCP port **9100**. The browser itself cannot open a raw TCP printer socket.

## Safety first

- Keep the PC and printer on the same trusted Wi-Fi/LAN.
- Do **not** port-forward TCP 8787 from your router or expose this bridge to the internet.
- Allow Python through Windows Firewall on **Private networks only**.
- Use a long random secret (at least 16 characters); enter exactly the same secret in the website's **Settings → Network print bridge**.
- The bridge only accepts the configured website origin by default and only permits private LAN IPv4 printer addresses. It fixes the printer port at 9100.
- The response confirms that the text was sent to the printer's TCP socket. It cannot independently prove that paper physically came out.

## Start it on Windows

1. Install Python 3 if `py -3 --version` does not work.
2. Put `bridge.py` and `run_bridge.bat` in the same folder.
3. Double-click `run_bridge.bat`.
4. When prompted, enter a long random secret. Keep it private.
5. If Windows Firewall asks, allow access only on your **Private** network. Do not enable router port forwarding.

The bridge listens on port 8787. Its health check is:

```text
http://127.0.0.1:8787/health
```

From another device on the same network, use the PC's LAN IP instead, for example:

```text
http://192.168.1.122:8787/health
```

Replace `192.168.1.122` with the PC's actual LAN IPv4 address.

## Configure Cyber Arena

In the V2 website, open **Settings → Network print bridge** and enter:

- **Bridge URL:** `http://<PC-LAN-IP>:8787/print` — use the PC's LAN IP, not `127.0.0.1`, when the website is open on an iPhone.
- **Bridge secret:** exactly the secret entered when starting the bridge.
- **Xprinter IP:** `192.168.1.41` (the user's confirmed printer address).

Save settings, then try printing a test bill. Keep the bill in the unprinted queue if the bridge does not confirm acceptance.

## HTTPS browser limitation

A website loaded from HTTPS may be prevented by browser mixed-content or local-network security rules from calling an HTTP bridge. If the app reports that it cannot reach the bridge even though the `/health` address opens, this may be the reason. Use a properly trusted HTTPS bridge or a secure local printing app/agent; do not disable browser security or install an untrusted certificate. The bridge code alone cannot override browser security restrictions.

## Troubleshooting

- **401:** website secret and `BRIDGE_TOKEN` do not match.
- **403 / CORS:** the request origin is not in `ALLOWED_ORIGINS`. Only change it to an exact trusted website origin.
- **502 / connection refused:** verify printer IP, Ethernet cable, printer power, and TCP 9100 reachability.
- **Timeout / failed fetch:** verify the bridge is running, Windows Firewall allows private-network access, the iPhone and PC are on the same network, and the HTTPS limitation above does not apply.
- **Wrong characters on paper:** printer code-page/font settings may not support UTF-8 or Arabic. This requires a printer-specific code-page configuration and a real paper test.

Default allowed website origin: `https://yassinjawdet16-debug.github.io`. Override it only if your V2 website uses a different trusted origin, for example by setting `ALLOWED_ORIGINS` before starting the bridge.
