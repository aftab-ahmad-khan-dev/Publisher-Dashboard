import { Router } from "express";
import { ScheduledPost } from "../models/ScheduledPost.js";
import { PublishedPost } from "../models/PublishedPost.js";
import {
  getWorkspaceConfig,
  resolveConfig,
  saveLinkedInConfig,
  saveMetaConfig,
  saveRedditConfig,
  saveQuoraConfig,
  savePinterestConfig,
  saveThreadsConfig,
} from "../lib/configStore.js";
import { refreshLinkedInTokenIfNeeded } from "../lib/linkedinOAuth.js";
import {
  isMetaConfigured,
  isLinkedInConfigured,
  canPublishLinkedIn,
  isRedditConfigured,
  isQuoraConfigured,
  platformsFromState,
} from "../lib/platforms.js";
import { validateCommunityPublish } from "../lib/contentPolicy.js";
import { sanitizePostState } from "../lib/contentSanitize.js";
import { testMetaConnection } from "../lib/publishers/meta.js";
import { testLinkedInConnection } from "../lib/publishers/linkedin.js";
import { testRedditConnection } from "../lib/publishers/reddit.js";
import { testQuoraConnection } from "../lib/publishers/quora.js";
import { testPinterestConnection } from "../lib/publishers/pinterest.js";
import { testThreadsConnection } from "../lib/publishers/threads.js";
import { publishToAllPlatforms } from "../lib/publishers/index.js";
import { broadcastEvent } from "../lib/events.js";

const router = Router();

router.post("/connections/meta/test", async (req, res, next) => {
  try {
    if (req.body?.meta) {
      await saveMetaConfig(req.workspaceId, req.body.meta);
    }
    const config = await getWorkspaceConfig(req.workspaceId);
    if (!isMetaConfigured(config.meta)) {
      return res
        .status(400)
        .json({
          ok: false,
          error: "App ID, App Secret, and Page Access Token are required.",
        });
    }
    const result = await testMetaConnection(config.meta);
    if (!result.ok) return res.status(400).json(result);
    res.json({ ...result, saved: true });
  } catch (err) {
    next(err);
  }
});

router.post("/connections/reddit/test", async (req, res, next) => {
  try {
    if (req.body?.reddit) {
      await saveRedditConfig(req.workspaceId, req.body.reddit);
    }
    const config = await getWorkspaceConfig(req.workspaceId);
    if (!isRedditConfigured(config.reddit)) {
      return res.status(400).json({
        ok: false,
        error:
          "Client ID, Client Secret, Refresh Token, and Subreddit are required.",
      });
    }
    const result = await testRedditConnection(config.reddit);
    if (!result.ok) return res.status(400).json(result);
    res.json({ ...result, saved: true });
  } catch (err) {
    next(err);
  }
});

router.post("/connections/quora/test", async (req, res, next) => {
  try {
    if (req.body?.quora) {
      await saveQuoraConfig(req.workspaceId, req.body.quora);
    }
    const config = await getWorkspaceConfig(req.workspaceId);
    const result = await testQuoraConnection(config.quora);
    if (!result.ok) return res.status(400).json(result);
    res.json({ ...result, saved: true });
  } catch (err) {
    next(err);
  }
});

router.post("/connections/pinterest/test", async (req, res, next) => {
  try {
    if (req.body?.pinterest) {
      await savePinterestConfig(req.workspaceId, req.body.pinterest);
    }
    const config = await getWorkspaceConfig(req.workspaceId);
    const result = await testPinterestConnection(config.pinterest);
    if (!result.ok) return res.status(400).json(result);
    res.json({ ...result, saved: true });
  } catch (err) {
    next(err);
  }
});

router.post("/connections/threads/test", async (req, res, next) => {
  try {
    if (req.body?.threads) {
      await saveThreadsConfig(req.workspaceId, req.body.threads);
    }
    const config = await getWorkspaceConfig(req.workspaceId);
    const result = await testThreadsConnection(config.threads);
    if (!result.ok) return res.status(400).json(result);
    res.json({ ...result, saved: true });
  } catch (err) {
    next(err);
  }
});

router.post("/connections/linkedin/test", async (req, res, next) => {
  try {
    if (req.body?.linkedin) {
      await saveLinkedInConfig(req.workspaceId, req.body.linkedin);
    }
    let config = await getWorkspaceConfig(req.workspaceId);
    config = await refreshLinkedInTokenIfNeeded(req.workspaceId);
    if (!isLinkedInConfigured(config.linkedin)) {
      return res.status(400).json({
        ok: false,
        error:
          "Client ID and Client Secret are required (Org URN is optional for profile posts).",
      });
    }
    const result = await testLinkedInConnection(config.linkedin);
    if (!result.ok) return res.status(400).json(result);
    res.json({ ...result, saved: true });
  } catch (err) {
    next(err);
  }
});

router.post("/publish", async (req, res, next) => {
  try {
    const { postState: rawState, enabled, apiConfig: bodyConfig } = req.body || {};
    const postState = sanitizePostState(rawState);
    const platforms = enabled || platformsFromState(postState);

    if (!platforms?.length) {
      return res.status(400).json({ ok: false, error: "No platforms selected." });
    }
    if (!postState?.body?.trim()) {
      return res.status(400).json({ ok: false, error: "Post body is required." });
    }

    let config = await getWorkspaceConfig(req.workspaceId);
    config = await refreshLinkedInTokenIfNeeded(req.workspaceId);
    config = resolveConfig(config, bodyConfig);

    const communityCheck = validateCommunityPublish(postState.body, platforms);
    if (!communityCheck.ok) {
      return res
        .status(400)
        .json({
          ok: false,
          error: communityCheck.error,
          analysis: communityCheck.analysis,
        });
    }

    const needsMeta = platforms.some((p) => p === "instagram" || p === "facebook");
    const needsLinkedIn = platforms.includes("linkedin");
    const needsReddit = platforms.includes("reddit");
    const needsQuora = platforms.includes("quora");

    if (needsMeta && !isMetaConfigured(config.meta)) {
      return res
        .status(400)
        .json({ ok: false, error: "Meta is not configured in database." });
    }
    if (needsLinkedIn && !canPublishLinkedIn(config.linkedin)) {
      return res.status(400).json({
        ok: false,
        error: "LinkedIn is not ready. Save credentials and connect via OAuth.",
      });
    }
    if (needsReddit && !isRedditConfigured(config.reddit)) {
      return res
        .status(400)
        .json({ ok: false, error: "Reddit is not configured in database." });
    }
    if (needsQuora && !isQuoraConfigured(config.quora)) {
      return res
        .status(400)
        .json({ ok: false, error: "Quora profile URL is required in API Config." });
    }

    const outcome = await publishToAllPlatforms({
      platforms,
      postState,
      config,
      workspaceId: req.workspaceId,
    });
    if (!outcome.ok) {
      return res.status(400).json(outcome);
    }

    const record = await PublishedPost.create({
      workspaceId: req.workspaceId,
      body: postState.body,
      platforms,
      publishedAt: new Date(),
      platformResults: outcome.results,
      status: outcome.errors?.length ? "partial" : "published",
    });

    const platformNames = platforms
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(", ");

    broadcastEvent("POST_PUBLISHED", {
      workspaceId: req.workspaceId,
      id: record._id.toString(),
      platforms,
      title: "Post Published Successfully",
      body: `Live on ${platformNames}.`,
      warnings: outcome.errors,
    });

    res.json({
      ok: true,
      id: record._id.toString(),
      platforms,
      publishedAt: record.publishedAt.toISOString(),
      platformResults: outcome.results,
      warnings: outcome.errors,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/schedule", async (req, res, next) => {
  try {
    const {
      postState: rawState,
      scheduledAt,
      enabled,
      apiConfig: bodyConfig,
      timezone,
    } = req.body || {};
    const postState = sanitizePostState(rawState);
    const platforms = enabled || platformsFromState(postState);

    if (!platforms?.length) {
      return res.status(400).json({ ok: false, error: "No platforms selected." });
    }
    if (!postState?.body?.trim()) {
      return res.status(400).json({ ok: false, error: "Post body is required." });
    }

    const when = new Date(scheduledAt || postState.scheduledAt);
    if (Number.isNaN(when.getTime()) || when <= new Date()) {
      return res
        .status(400)
        .json({ ok: false, error: "Scheduled time must be in the future." });
    }

    let config = await getWorkspaceConfig(req.workspaceId);
    config = await refreshLinkedInTokenIfNeeded(req.workspaceId);
    config = resolveConfig(config, bodyConfig);

    const communityCheck = validateCommunityPublish(postState.body, platforms);
    if (!communityCheck.ok) {
      return res
        .status(400)
        .json({
          ok: false,
          error: communityCheck.error,
          analysis: communityCheck.analysis,
        });
    }

    const needsMeta = platforms.some((p) => p === "instagram" || p === "facebook");
    const needsLinkedIn = platforms.includes("linkedin");
    const needsReddit = platforms.includes("reddit");
    const needsQuora = platforms.includes("quora");
    if (needsMeta && !isMetaConfigured(config.meta)) {
      return res
        .status(400)
        .json({ ok: false, error: "Meta is not configured in database." });
    }
    if (needsLinkedIn && !canPublishLinkedIn(config.linkedin)) {
      return res
        .status(400)
        .json({ ok: false, error: "LinkedIn is not ready for scheduled publish." });
    }
    if (needsReddit && !isRedditConfigured(config.reddit)) {
      return res
        .status(400)
        .json({ ok: false, error: "Reddit is not configured in database." });
    }
    if (needsQuora && !isQuoraConfigured(config.quora)) {
      return res
        .status(400)
        .json({ ok: false, error: "Quora profile URL is required in API Config." });
    }

    const doc = await ScheduledPost.create({
      workspaceId: req.workspaceId,
      body: postState.body,
      platforms,
      scheduledAt: when,
      timezone: timezone || postState.timezone,
      status: "scheduled",
      postState,
    });

    broadcastEvent("POST_SCHEDULED", {
      workspaceId: req.workspaceId,
      id: doc._id.toString(),
      platforms,
      scheduledAt: when.toISOString(),
    });

    res.json({
      ok: true,
      id: doc._id.toString(),
      platforms,
      scheduledAt: when.toISOString(),
      timezone: doc.timezone,
      status: "scheduled",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
