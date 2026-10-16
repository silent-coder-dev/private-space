// Production server: serves the built website (dist/) and the real-time relay (/ws) on one port.
//
//   npm run build && npm start
//
// Environment variables (all optional):
//   PORT              port to listen on (default 8080)
//   HOST              host to bind (default 0.0.0.0)
//   USSPACE_DATA_DIR  save encrypted rooms to this folder (default: memory only — nothing is written to disk)
//   ALLOWED_ORIGINS   comma-separated list of sites allowed to connect to /ws (default: same site only)
//   TRUST_PROXY       set to "1" behind a proxy/load balancer so rate limits use the real client IP

import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import http from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { listMusic } from "./music.mjs";
import { createRelay } from "./relay.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const port = Number(process.env.PORT) || 8080;
const host = process.env.HOST || "0.0.0.0";

if (!existsSync(join(dist, "index.html"))) {
  console.error("[usspace] dist/ not found. Run `npm run build` first.");
  process.exit(1);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".opus": "audio/ogg",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".webm": "audio/webm",
  ".webmanifest": "application/manifest+json",
};
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".svg", ".txt", ".webmanifest"]);
const gzipCache = new Map();

const securityHeaders = (/** @type {http.IncomingMessage} */ req) => {
  const host = req.headers.host ?? "";
  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "media-src 'self' data: blob:",
      `connect-src 'self' ws://${host} wss://${host}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    // Camera + microphone are allowed for this site only (photos, videos and calls).
    "Permissions-Policy": "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-Frame-Options": "DENY",
    ...(req.headers["x-forwarded-proto"] === "https" ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {}),
  };
};

/** Map a URL to a file inside dist/, or null. Blocks "../" tricks. */
const resolveFile = (/** @type {string} */ urlPath) => {
  let pathname;
  try {
    pathname = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const file = normalize(join(dist, pathname));
  if (file !== dist && !file.startsWith(dist + sep)) return null;
  try {
    return statSync(file).isFile() ? file : null;
  } catch {
    return null;
  }
};

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  if (pathname === "/music/manifest.json") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-cache" }).end(JSON.stringify(listMusic(join(dist, "music"))));
    return;
  }
  if (pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" }).end("ok");
    return;
  }

  // Unknown paths fall back to index.html so the app's own router can show the page (or its 404).
  const file = resolveFile(pathname) ?? join(dist, "index.html");
  const ext = extname(file);
  const headers = {
    ...securityHeaders(req),
    "Content-Type": MIME[ext] ?? "application/octet-stream",
    "Cache-Control": pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
    Vary: "Accept-Encoding",
  };

  const acceptsGzip = /\bgzip\b/.test(String(req.headers["accept-encoding"] ?? ""));
  if (acceptsGzip && COMPRESSIBLE.has(ext)) {
    let body = gzipCache.get(file);
    if (!body) {
      body = gzipSync(readFileSync(file));
      gzipCache.set(file, body);
    }
    res.writeHead(200, { ...headers, "Content-Encoding": "gzip", "Content-Length": body.length });
    res.end(req.method === "HEAD" ? undefined : body);
    return;
  }

  // Range requests let the music player seek and let phones stream big audio files.
  const size = statSync(file).size;
  const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ""));
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      res.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
      return;
    }
    res.writeHead(206, { ...headers, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
    if (req.method === "HEAD") res.end();
    else createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, "Accept-Ranges": "bytes", "Content-Length": size });
  if (req.method === "HEAD") res.end();
  else createReadStream(file).pipe(res);
});

const relay = createRelay({
  // Memory only unless you ask for a folder: when a room is closed (or the server restarts) nothing is left behind.
  dataDir: process.env.USSPACE_DATA_DIR || null,
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  trustProxy: process.env.TRUST_PROXY === "1",
});

server.on("upgrade", (req, socket, head) => {
  if (!relay.handleUpgrade(req, socket, head)) socket.destroy();
});

server.listen(port, host, () => {
  console.log(`[usspace] ready on http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
});

const shutdown = () => {
  relay.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
