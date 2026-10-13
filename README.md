# Network Waker

A responsive React app that discovers devices through a local network relay and sends Wake-on-LAN packets. The browser and Android WebView cannot read ARP neighbors or send UDP broadcasts themselves, so the relay must run on a computer or always-on device connected to the same LAN.

## Requirements

- Bun
- Java Runtime Environment 8 or newer to sign the Android APK with Nitron

## Develop

Install dependencies from the project root:

```sh
bun install
```

Start the web app and relay in separate terminals:

```sh
bun run dev
bun run relay
```

Open the Vite URL shown by the dev server. The relay listens on port 8787 by default and scans the subnet of its host. Set `SCAN_CIDR` to select a subnet explicitly, for example:

```sh
SCAN_CIDR=192.168.1.0/24 bun run relay
```

In PowerShell, set the variable before starting the relay:

```powershell
$env:SCAN_CIDR = '192.168.1.0/24'
bun run relay
```

The scan uses ping and the host operating system's neighbor table. Devices that do not respond or are isolated by the router may not appear. Hostnames are resolved through reverse DNS when available. This project does not bundle a MAC OUI vendor database, so manufacturer names may be unknown.

## Android APK

Build the web assets and signed debug APK:

```sh
bun run build
```

Nitron writes the APK to `dist/app.apk`. Copy it to the Android device and install it, allowing installs from the file manager when prompted. The APK contains the web UI only; it does not run the Node/Bun relay.

On Android, open **Configure** in the app and enter the relay host's LAN address, for example `http://192.168.1.20:8787`. Both devices must be connected to the same network. Allow inbound TCP port 8787 on the relay host's firewall. The relay sends a 102-byte WoL packet to UDP port 9 by default.

## App behavior and limitations

- Favorites and the relay URL are stored in localStorage on the client.
- The relay uses built-in Node.js HTTP, DNS, child process, and UDP modules. Bun can run the relay script using the package script.
- Browsers and WebViews cannot perform LAN ARP discovery or raw UDP broadcasts directly.
- WoL also requires support from the target device's firmware, network adapter, and network.
- The relay is intended for a trusted local network. It has a narrow CORS origin allowlist but no authentication; do not expose it to the public internet.
- All app styles are in `src/HomeDetails.ts` using styled-components. No Tailwind is used.

## Scripts

- `bun run dev` — start the Vite development server
- `bun run build:web` — build the static web app
- `bun run build` — build the web app and package the Nitron APK
- `bun run relay` — start the local network relay
