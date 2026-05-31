import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import { ensureDbConnected } from "./lib/dbInit.js";
import { workspaceMiddleware, clerkEnabled } from "./middleware/workspace.js";
import routes from "./routes.js";
import healthRoutes from "./routes/health.js";
import { startScheduler } from "./lib/scheduler.js";
import { collectHealthStatus } from "./lib/healthStatus.js";
import { recordEmailOpen, TRANSPARENT_GIF } from "./lib/emailWorker.js";
import { Media } from "./models/Media.js";
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

/** Public image host for Instagram — IG's servers fetch image_url, so no auth. */
app.get("/api/media/:id", async (req, res) => {
  try {
    await ensureDbConnected();
    // No .lean(): a Mongoose doc returns `data` as a real Buffer. With .lean() it
    // comes back as a BSON Binary, which serializes to garbage and makes Instagram
    // reject the image as "Only photo or video can be accepted as media type".
    const media = await Media.findById(req.params.id);
    if (!media?.data?.length) return res.status(404).end();
    res.set("Content-Type", media.contentType || "image/jpeg");
    res.set("Cache-Control", "public, max-age=86400");
    return res.send(Buffer.from(media.data));
  } catch {
    return res.status(404).end();
  }
});

/**
 * SSE and OAuth-initiation routes are opened by browser navigation / EventSource
 * and can't set an Authorization header, so the client passes the Clerk session
 * token as `?__token=`. Promote it to a Bearer header before Clerk verifies it.
 */
function tokenFromQuery(req, _res, next) {
  if (!req.headers.authorization && typeof req.query.__token === "string") {
    req.headers.authorization = `Bearer ${req.query.__token}`;
  }
  next();
}

/**
 * Require a signed-in Clerk session for every /api route except those that are
 * legitimately unauthenticated: OAuth provider callbacks (verified via signed
 * `state`) and the Vercel cron endpoint (verified via CRON_SECRET).
 */
function requireApiAuth(req, res, next) {
  const p = req.path;
  if (p.startsWith("/cron/") || p.endsWith("/callback")) return next();
  return requireAuth()(req, res, next);
}

if (clerkEnabled) {
  app.use("/api", tokenFromQuery, clerkMiddleware());
} else {
  logger.warn(
    "CLERK_SECRET_KEY not set — API running in single-tenant fallback (no auth enforcement)",
  );
}

app.use("/api", async (req, res, next) => {
  try {
    await ensureDbConnected();
    next();
  } catch (err) {
    res.status(503).json({ ok: false, error: "Database unavailable" });
  }
});

if (clerkEnabled) {
  app.use("/api", requireApiAuth);
}

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
    logger.banner("Publisher Suite API", [
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
