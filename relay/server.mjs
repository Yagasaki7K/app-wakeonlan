import os from "node:os";
import dns from "node:dns/promises";
import dgram from "node:dgram";
import http from "node:http";
import { spawn } from "node:child_process";

const PORT = Number(process.env.PORT || 8787);
const SCAN_CIDR = process.env.SCAN_CIDR || "";
const WOL_PORT = Number(process.env.WOL_PORT || 9);
const ALLOWED_ORIGINS = new Set(
    (process.env.ALLOWED_ORIGINS || "https://appassets.androidplatform.net,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
);
const MAC_RE = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i;

function ipv4ToInt(ip) {
    return ip.split(".").reduce((n, part) => ((n << 8) | Number(part)) >>> 0, 0);
}
function intToIpv4(value) {
    return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
}
function maskPrefix(mask) {
    return mask.split(".").reduce((sum, part) => sum + Number(part).toString(2).replace(/0/g, "").length, 0);
}
function interfaces() {
    const found = [];
    for (const [name, entries] of Object.entries(os.networkInterfaces())) {
        for (const item of entries || []) {
            if (item.family === "IPv4" && !item.internal && !item.address.startsWith("169.254.")) found.push({ name, address: item.address, netmask: item.netmask });
        }
    }
    return found;
}
function networks() {
    const list = interfaces();
    if (SCAN_CIDR) {
        const match = SCAN_CIDR.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
        if (!match || Number(match[2]) < 1 || Number(match[2]) > 30) throw new Error("SCAN_CIDR must be an IPv4 CIDR between /1 and /30.");
        return [{ address: match[1], prefix: Number(match[2]) }];
    }
    return list.map((item) => ({ address: item.address, prefix: maskPrefix(item.netmask) }));
}
function targetAddresses() {
    const all = [];
    for (const net of networks()) {
        const prefix = Math.min(net.prefix, 23);
        const count = 2 ** (32 - prefix);
        const network = (ipv4ToInt(net.address) & (0xffffffff << (32 - prefix))) >>> 0;
        for (let offset = 1; offset < count - 1; offset++) {
            const ip = intToIpv4((network + offset) >>> 0);
            if (!interfaces().some((item) => item.address === ip)) all.push(ip);
        }
    }
    return [...new Set(all)].slice(0, 1022);
}
function run(command, args, timeout = 2500) {
    return new Promise((resolve) => {
        const child = spawn(command, args, { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
        let stdout = "";
        const timer = setTimeout(() => {
            child.kill();
            resolve(stdout);
        }, timeout);
        child.stdout.setEncoding("utf8").on("data", (chunk) => {
            stdout += chunk;
        });
        child.on("error", () => {
            clearTimeout(timer);
            resolve(stdout);
        });
        child.on("close", () => {
            clearTimeout(timer);
            resolve(stdout);
        });
    });
}
async function ping(ip) {
    const windows = process.platform === "win32";
    const output = await run(windows ? "ping.exe" : "ping", windows ? ["-n", "1", "-w", "700", ip] : ["-c", "1", "-W", "1", ip], 1800);
    return windows ? /TTL=/i.test(output) : /bytes from|1 received/i.test(output);
}
async function neighborTable() {
    const output = process.platform === "win32" ? await run("arp.exe", ["-a"], 3000) : await run("ip", ["neigh", "show"], 3000);
    const map = new Map();
    const regex = /(\d{1,3}(?:\.\d{1,3}){3}).{0,80}?(([0-9a-f]{2}[:-]){5}[0-9a-f]{2})/gi;
    for (const match of output.matchAll(regex)) map.set(match[1], match[2].replaceAll("-", ":").toLowerCase());
    return map;
}
async function reverseName(ip) {
    try {
        const names = await Promise.race([dns.reverse(ip), new Promise((_, reject) => setTimeout(() => reject(Error("timeout")), 1000))]);
        return names[0]?.replace(/\.$/, "") || "";
    } catch {
        return "";
    }
}
async function scan() {
    const targets = targetAddresses();
    let index = 0;
    const up = new Set();
    const worker = async () => {
        while (index < targets.length) {
            const ip = targets[index++];
            if (await ping(ip)) up.add(ip);
        }
    };
    await Promise.all(Array.from({ length: 32 }, worker));
    const neighbors = await neighborTable();
    return Promise.all(
        [...neighbors].map(async ([ip, mac]) => {
            if (!MAC_RE.test(mac) || mac === "00:00:00:00:00:00") return null;
            const localNames = interfaces();
            if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip) || localNames.some((item) => item.address === ip)) return null;
            const name = await reverseName(ip);
            return { ip, mac, name: name || undefined, vendor: undefined, online: up.has(ip) };
        }),
    ).then((items) => items.filter(Boolean).sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true })));
}
function sendMagicPacket(mac) {
    const bytes = Buffer.from(mac.split(":").map((part) => parseInt(part, 16)));
    const packet = Buffer.alloc(6 + 16 * bytes.length, 0xff);
    for (let offset = 6; offset < packet.length; offset += bytes.length) bytes.copy(packet, offset);
    return new Promise((resolve, reject) => {
        const socket = dgram.createSocket("udp4");
        socket.bind(() => {
            socket.setBroadcast(true);
            socket.send(packet, WOL_PORT, process.env.WOL_BROADCAST || "255.255.255.255", (error) => {
                socket.close();
                if (error) reject(error);
                else resolve();
            });
        });
        socket.on("error", (error) => {
            socket.close();
            reject(error);
        });
    });
}
function respond(response, status, body, origin = "") {
    response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": origin,
        Vary: "Origin",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    });
    response.end(JSON.stringify(body));
}
const server = http.createServer(async (request, response) => {
    const origin = request.headers.origin || "";
    const remote = request.socket.remoteAddress || "";
    const localClient = remote === "::1" || remote === "127.0.0.1" || remote === "::ffff:127.0.0.1";
    if (request.method === "OPTIONS") {
        if (!ALLOWED_ORIGINS.has(origin)) return respond(response, 403, { error: "Origin is not allowed." });
        return respond(response, 204, {}, origin);
    }
    if (origin && !ALLOWED_ORIGINS.has(origin)) return respond(response, 403, { error: "Origin is not allowed." });
    if (!origin && !localClient) return respond(response, 403, { error: "A trusted app origin is required." });
    if (request.url === "/health" && request.method === "GET") return respond(response, 200, { ok: true }, origin);
    if (request.url === "/api/devices" && request.method === "GET") {
        try {
            return respond(response, 200, { devices: await scan(), scannedAt: new Date().toISOString() }, origin);
        } catch (error) {
            return respond(response, 500, { error: error instanceof Error ? error.message : "Network scan failed." }, origin);
        }
    }
    if (request.url === "/api/wake" && request.method === "POST") {
        let raw = "";
        request.setEncoding("utf8");
        for await (const chunk of request) {
            raw += chunk;
            if (raw.length > 4096) {
                response.destroy();
                return;
            }
        }
        try {
            const payload = JSON.parse(raw);
            const mac = String(payload.mac || "")
                .toLowerCase()
                .replaceAll("-", ":");
            if (!MAC_RE.test(mac)) return respond(response, 400, { error: "A valid MAC address is required." }, origin);
            await sendMagicPacket(mac);
            return respond(response, 200, { ok: true, mac, port: WOL_PORT }, origin);
        } catch (error) {
            return respond(response, 400, { error: error instanceof Error ? error.message : "Invalid request." }, origin);
        }
    }
    return respond(response, 404, { error: "Not found." }, origin);
});
server.listen(PORT, "0.0.0.0", () => {
    const cidrs = networks()
        .map((net) => net.address + "/" + net.prefix)
        .join(", ");
    console.log("WakeOnLan relay listening on port " + PORT + (cidrs ? " · interfaces: " + cidrs : ""));
    console.log("Set SCAN_CIDR=192.168.1.0/24 to scan a specific LAN.");
});
