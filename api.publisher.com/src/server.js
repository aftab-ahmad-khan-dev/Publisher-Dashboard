import "dotenv/config";
import express from "express";
import cors from "cors";
import { ensureDbConnected } from "./lib/dbInit.js";
import { workspaceMiddleware } from "./middleware/workspace.js";
import routes from "./routes.js";
import healthRoutes from "./routes/health.js";
import { startScheduler } from "./lib/scheduler.js";
import { collectHealthStatus } from "./lib/healthStatus.js";
import { recordEmailOpen, TRANSPARENT_GIF } from "./lib/emailWorker.js";
import { logger, requestLogger } from "./lib/logger.js";

const app = express();
const port = Number(process.env.PORT) || 3001;
const isVercel = Boolean(process.env.VERCEL);

app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));
app.use(requestLogger());

app.use(healthRoutes);

app.get("/api/health", async (req, res) => {
  const status = await collectHealthStatus();
  res.status(status.ok ? 200 : 503).json({
    ok: status.ok,
    service: status.service,
    db: status.db.connected ? "connected" : "disconnected",
    database: status.db.name,
    uptime: status.uptime,
    responseMs: status.responseMs,
    environment: status.environment,
    runtime: status.runtime,
    scheduler: status.scheduler,
    error: status.db.error || undefined,
  });
});

/** Open tracking pixel — no auth (email clients fetch this URL) */
app.get("/api/email/open/:trackingId.gif", async (req, res) => {
  try {
    await ensureDbConnected();
    await recordEmailOpen(req.params.trackingId);
  } catch {
    /* still return pixel */
  }
  res.set("Content-Type", "image/gif");
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.send(TRANSPARENT_GIF);
});

app.use("/api", async (req, res, next) => {
  try {
    await ensureDbConnected();
    next();
  } catch (err) {
    res.status(503).json({ ok: false, error: "Database unavailable" });
  }
});

app.use("/api", workspaceMiddleware, routes);

app.use((err, req, res, _next) => {
  logger.error(err.message || "Server error", {
    path: req.originalUrl,
    stack: process.env.LOG_LEVEL === "debug" ? err.stack : undefined,
  });
  res.status(500).json({ ok: false, error: err.message || "Server error" });
});

function listen() {
  app.listen(port, () => {
    logger.banner("Pulse Publisher API", [
      `http://localhost:${port}`,
      `Health  http://localhost:${port}/`,
    ]);
  });
}

process.on("unhandledRejection", (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logger.error("Unhandled promise rejection (API kept running)", {
    error: err.message,
  });
});

if (!isVercel) {
  ensureDbConnected()
    .then(() => {
      startScheduler();
      listen();
    })
    .catch((err) => {
      logger.warn("MongoDB unavailable, starting in degraded mode", {
        error: err.message,
      });
      logger.info(
        "Fix DATABASE in .env and Atlas IP allowlist. ETIMEOUT = DNS/SRV lookup failed.",
      );
      listen();
    });
}

export default app;
