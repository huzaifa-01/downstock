import { createRequestListener } from "@react-router/node";
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync, readFileSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "build", "client");
const LOG = join(__dirname, "server.log");

function log(msg) {
  const line = new Date().toISOString() + " " + msg + "\n";
  process.stdout.write(line);
  try { appendFileSync(LOG, line); } catch {}
}

log("=== DownStock starting ===");

try {
  const envContent = readFileSync(join(__dirname, ".env"), "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
  log("Env loaded.");
} catch (e) {
  log("No .env file: " + e.message);
}

const MIME = {
  ".js": "text/javascript", ".css": "text/css", ".html": "text/html",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".webp": "image/webp",
};

// This host has no Terminal/SSH access, so migrations can't be run by hand —
// apply any pending Prisma migrations on every boot instead. Idempotent: a
// no-op when the schema is already up to date, so restarts stay safe.
try {
  execSync("npx prisma migrate deploy", { cwd: __dirname, stdio: "pipe" });
  log("Prisma migrations applied (or already up to date).");
} catch (e) {
  log("[prisma] migrate deploy failed: " + (e.stderr?.toString() || e.message));
}

(async () => {
  log("Loading app build...");
  const build = await import("./build/server/index.js");
  log("Build loaded.");

  const appListener = createRequestListener({
    build: build.default ?? build,
    mode: "production",
  });

  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const filePath = join(CLIENT_DIR, url.pathname);
      if (existsSync(filePath) && statSync(filePath).isFile()) {
        const ext = url.pathname.slice(url.pathname.lastIndexOf("."));
        res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
        if ([".js", ".css", ".woff2"].includes(ext)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
        createReadStream(filePath).pipe(res);
        return;
      }
      appListener(req, res);
    } catch (err) {
      console.error("[server] Error:", err);
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  });

  const PORT = parseInt(process.env.PORT || "3002", 10);
  server.listen(PORT, () => log("Server running on port " + PORT));

  // Job queue poller — every 30s. No separate worker process: this app
  // runs as one Node process on shared hosting, same as CODsafe's cron.
  const { processJobQueue } = await import("./app/cron.server.js");
  let polling = false;
  setInterval(async () => {
    if (polling) return; // don't overlap runs if one poll takes >30s
    polling = true;
    try {
      const n = await processJobQueue();
      if (n > 0) log(`[jobs] processed ${n} job(s)`);
    } catch (e) {
      log("[jobs] poll error: " + e.message);
    } finally {
      polling = false;
    }
  }, 30 * 1000);
  log("Job queue poller started (30s interval).");
})();
