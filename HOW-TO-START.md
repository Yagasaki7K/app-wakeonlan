# WakeOnLan: LAN Setup Guide

This guide explains how to connect the app to a relay on your local network, scan for devices, and use Wake-on-LAN to turn supported devices on.

> **Current feature limit:** WakeOnLan can discover devices and send a Wake-on-LAN packet to turn a supported device on. It does not shut devices down. A router connection alone cannot provide a universal power-off command; shutdown requires a separate, device-specific remote-management feature.

## What you need

- The WakeOnLan app on your phone.
- A computer or other always-on device on the same local network to run the relay. The relay can run on Windows, macOS, or Linux with Bun installed.
- The target device's MAC address and Wake-on-LAN support enabled in its firmware and operating system.

The phone, relay host, and target should be on the same non-guest LAN/subnet. Being connected to the same router is not always enough: guest Wi-Fi, client/AP isolation, or separate VLANs can block discovery and Wake-on-LAN broadcasts.

## 1. Start the relay

On the computer that will run the relay, open a terminal in the project folder and install the dependencies once:

```sh
bun install
```

Start the relay:

```sh
bun run relay
```

It listens on TCP port `8787` by default. Keep this terminal and computer running while you use the app. The relay scans the subnet of the computer it runs on, so run it on the LAN where your devices are connected.

### Find the relay computer's LAN address

- **Windows:** run `ipconfig` and find the `IPv4 Address` under the active Wi-Fi or Ethernet adapter. It will look like `192.168.1.20`.
- **Linux:** run `hostname -I` and use the address for the active LAN interface, such as `192.168.1.20`.
- **macOS:** open **System Settings → Network**, select the active Wi-Fi or Ethernet connection, and note its IP address.

Use the address of the relay computer, not the router's gateway address and not the phone's address. A DHCP reservation in the router can keep the relay computer's address from changing.

### Allow access through the computer's firewall

Allow inbound **TCP port 8787** from devices on your trusted local network. On Windows, allow the relay/runtime through Windows Defender Firewall on **Private** networks. On Linux or other firewalls, add an equivalent LAN-only rule. Do not forward this port from the router to the public internet; the relay has no authentication.

## 2. Set the LAN Address in the app

1. Make sure the phone is connected to the same home Wi-Fi/LAN as the relay computer. Avoid guest Wi-Fi.
2. Open WakeOnLan and find the **Network relay** panel.
3. Tap **Configure**.
4. Enter the relay computer's address with the port, for example:

   ```text
   http://192.168.1.20:8787
   ```

   Replace `192.168.1.20` with the IPv4 address you found above. Keep the `http://` prefix and `:8787` suffix. Do not add `/api/devices` or another path.
5. Tap **Save**, then tap **Scan network**.

When the relay is reachable, the app shows devices it can identify. If you change the relay computer's IP address, update this setting.

## 3. Find devices on the LAN

The relay pings addresses on its subnet and reads the operating system's neighbor table to find IP and MAC addresses. This is best-effort discovery, not a guaranteed inventory:

- Some devices do not respond to ping, sleep deeply, or are isolated by the router, so they may not appear.
- A device may show an unknown name or manufacturer; names depend on reverse DNS, and the app does not include a vendor database.
- The relay scans the subnet of its own network interface. If it chooses the wrong interface or subnet, set `SCAN_CIDR` when starting it. Use the subnet in CIDR notation, for example `192.168.1.0/24`.

Linux/macOS:

```sh
SCAN_CIDR=192.168.1.0/24 bun run relay
```

PowerShell:

```powershell
$env:SCAN_CIDR = '192.168.1.0/24'
bun run relay
```

Use the actual subnet for your LAN. `192.168.1.0/24` is only an example.

## 4. Enable Wake-on-LAN on a target

Wake-on-LAN must be supported and enabled on each target device. Exact menu names vary by manufacturer and operating system. Common requirements include:

1. Enable **Wake on LAN**, **Wake on PCI-E**, or **Power on by network** in the device's BIOS/UEFI settings.
2. On a PC, enable wake by **Magic Packet** in the network adapter's operating-system settings and allow the adapter to wake the computer.
3. Prefer wired Ethernet for the target. Many Wi-Fi adapters cannot receive Wake-on-LAN while the device is asleep or powered off.
4. Keep the device connected to power and the network adapter powered while it is off. Some devices only support waking from sleep, not a full shutdown.

While the target is awake, run a scan so the relay can learn its MAC address. Then select it in the app and tap **Wake device**. The relay sends a Wake-on-LAN magic packet to UDP port `9` by default. The app can send that packet, but the device's firmware, adapter, operating system, and router determine whether it wakes.

## Troubleshooting

- **The app says it cannot reach the relay:** confirm the relay terminal is still running, recheck the relay computer's current IPv4 address, and verify that TCP port `8787` is allowed through its firewall.
- **The scan is empty or incomplete:** confirm the relay computer is on the expected LAN, not a guest network; disable client/AP isolation if appropriate; and check the `SCAN_CIDR` value.
- **A device appears, but does not wake:** verify its MAC address, BIOS/UEFI and adapter Wake-on-LAN settings, power state, Ethernet connection, and that the router allows local broadcasts. Try waking it from sleep first.
- **The phone and relay are on the same router but cannot communicate:** check for guest Wi-Fi, client isolation, VLAN separation, or a firewall rule blocking local devices.
- **You want to turn a device off:** this app currently has no shutdown command. Use that device's own supported remote-management or operating-system feature; the WakeOnLan relay cannot power it off.
