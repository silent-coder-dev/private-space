import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { listMusic } from "./server/music.mjs";
import { createRelay } from "./server/relay.mjs";

/** Runs the real-time room relay on the same port as the dev/preview server (at /ws). */
function roomRelay(): Plugin {
  const attach = (httpServer: import("node:http").Server | null | undefined) => {
    if (!httpServer) return;
    const relay = createRelay({ dataDir: null });
    httpServer.on("upgrade", (req, socket, head) => relay.handleUpgrade(req, socket, head));
    httpServer.on("close", () => relay.close());
  };
  return {
    name: "usspace-room-relay",
    configureServer: (server) => attach(server.httpServer as import("node:http").Server | null),
    configurePreviewServer: (server) => attach(server.httpServer as import("node:http").Server | null),
  };
}

/** Serves /music/manifest.json (the songs in public/music) and writes it into dist/ when building. */
function musicManifest(): Plugin {
  const serve = (dir: string) => (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, next: () => void) => {
    if (!req.url?.startsWith("/music/manifest.json")) return next();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache");
    res.end(JSON.stringify(listMusic(dir)));
  };
  return {
    name: "usspace-music-manifest",
    configureServer: (server) => void server.middlewares.use(serve(path.resolve(__dirname, "public/music"))),
    configurePreviewServer: (server) => void server.middlewares.use(serve(path.resolve(__dirname, "dist/music"))),
    closeBundle: () => {
      const out = path.resolve(__dirname, "dist/music");
      if (fs.existsSync(path.resolve(__dirname, "dist"))) {
        fs.mkdirSync(out, { recursive: true });
        fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(listMusic(out)));
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    port: 8080,
  },
  plugins: [react(), roomRelay(), musicManifest()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
          crypto: ["@noble/ciphers/chacha", "@noble/hashes/hkdf", "@noble/hashes/hmac", "@noble/hashes/sha2"],
        },
      },
    },
  },
});
