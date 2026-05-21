import { ApiConfig } from '../models/ApiConfig.js'
import { isMetaConfigured, isLinkedInConfigured, canPublishLinkedIn } from './platforms.js'

const DEFAULT_CONFIG = {
  meta: { appId: '', appSecret: '', pageToken: '', connected: false },
  linkedin: {
    clientId: '',
    clientSecret: '',
    orgUrn: '',
    accessToken: '',
    refreshToken: '',
    tokenExpiresAt: null,
    connected: false,
    publishReady: false,
  },
  webhookUrl: '',
  notificationsEnabled: true,
}

const META_SECRET_FIELDS = ['appSecret', 'pageToken']
const LINKEDIN_SECRET_FIELDS = ['clientSecret', 'accessToken', 'refreshToken']

export function withDerivedFlags(config) {
  const linkedinReady = isLinkedInConfigured(config.linkedin)
  return {
    ...config,
    meta: {
      ...config.meta,
      connected: isMetaConfigured(config.meta),
    },
    linkedin: {
      ...config.linkedin,
      connected: linkedinReady,
      publishReady: canPublishLinkedIn(config.linkedin),
    },
  }
}

function preserveSecrets(existing = {}, incoming = {}, fields) {
  const out = { ...incoming }
  for (const field of fields) {
    const next = incoming[field]
    const prev = existing[field]
    if ((next === undefined || next === null || String(next).trim() === '') && prev) {
      out[field] = prev
    }
  }
  return out
}

function mergeSection(existing, incoming, secretFields) {
  return preserveSecrets(existing, { ...existing, ...incoming }, secretFields)
}

export function envDefaults() {
  return {
    meta: {
      appId: process.env.META_APP_ID?.trim() || '',
      appSecret: process.env.META_APP_SECRET?.trim() || '',
      pageToken: process.env.META_PAGE_TOKEN?.trim() || '',
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID?.trim() || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET?.trim() || '',
      orgUrn: process.env.LINKEDIN_ORG_URN?.trim() || '',
      accessToken: process.env.LINKEDIN_ACCESS_TOKEN?.trim() || '',
      refreshToken: '',
      tokenExpiresAt: null,
    },
    webhookUrl: process.env.WEBHOOK_URL?.trim() || '',
  }
}

function docToConfig(doc) {
  if (!doc) return null
  return {
    meta: doc.meta || DEFAULT_CONFIG.meta,
    linkedin: doc.linkedin || DEFAULT_CONFIG.linkedin,
    webhookUrl: doc.webhookUrl ?? '',
    notificationsEnabled: doc.notificationsEnabled ?? true,
  }
}

function fillFromEnv(config) {
  const env = envDefaults()
  return {
    meta: {
      appId: config.meta.appId || env.meta.appId,
      appSecret: config.meta.appSecret || env.meta.appSecret,
      pageToken: config.meta.pageToken || env.meta.pageToken,
    },
    linkedin: {
      clientId: config.linkedin.clientId || env.linkedin.clientId,
      clientSecret: config.linkedin.clientSecret || env.linkedin.clientSecret,
      orgUrn: config.linkedin.orgUrn || env.linkedin.orgUrn,
      accessToken: config.linkedin.accessToken || env.linkedin.accessToken,
      refreshToken: config.linkedin.refreshToken || env.linkedin.refreshToken,
      tokenExpiresAt: config.linkedin.tokenExpiresAt || null,
    },
    webhookUrl: config.webhookUrl || env.webhookUrl,
    notificationsEnabled: config.notificationsEnabled,
  }
}

export async function getWorkspaceConfig(workspaceId) {
  const doc = await ApiConfig.findOne({ workspaceId }).lean()
  const base = docToConfig(doc) || { ...DEFAULT_CONFIG }
  return withDerivedFlags(fillFromEnv(base))
}

async function loadRawDoc(workspaceId) {
  return ApiConfig.findOne({ workspaceId })
}

export async function saveWorkspaceConfig(workspaceId, config) {
  const existing = (await loadRawDoc(workspaceId))?.toObject?.() || null
  const prev = docToConfig(existing) || DEFAULT_CONFIG

  const next = withDerivedFlags({
    meta: mergeSection(prev.meta, config.meta || {}, META_SECRET_FIELDS),
    linkedin: mergeSection(prev.linkedin, config.linkedin || {}, LINKEDIN_SECRET_FIELDS),
    webhookUrl: config.webhookUrl ?? prev.webhookUrl,
    notificationsEnabled: config.notificationsEnabled ?? prev.notificationsEnabled,
  })

  await ApiConfig.findOneAndUpdate(
    { workspaceId },
    {
      workspaceId,
      meta: next.meta,
      linkedin: next.linkedin,
      webhookUrl: next.webhookUrl,
      notificationsEnabled: next.notificationsEnabled,
    },
    { upsert: true, new: true },
  )

  return next
}

export async function saveLinkedInConfig(workspaceId, linkedinPatch) {
  const prev = await getWorkspaceConfig(workspaceId)
  return saveWorkspaceConfig(workspaceId, {
    ...prev,
    linkedin: { ...prev.linkedin, ...linkedinPatch },
  })
}

export async function saveMetaConfig(workspaceId, metaPatch) {
  const prev = await getWorkspaceConfig(workspaceId)
  return saveWorkspaceConfig(workspaceId, {
    ...prev,
    meta: { ...prev.meta, ...metaPatch },
  })
}

export async function saveLinkedInTokens(workspaceId, tokens) {
  return saveLinkedInConfig(workspaceId, tokens)
}

export function resolveConfig(stored, bodyConfig) {
  if (!bodyConfig) return stored
  return withDerivedFlags({
    meta: mergeSection(stored.meta, bodyConfig.meta || {}, META_SECRET_FIELDS),
    linkedin: mergeSection(stored.linkedin, bodyConfig.linkedin || {}, LINKEDIN_SECRET_FIELDS),
    webhookUrl: bodyConfig.webhookUrl ?? stored.webhookUrl,
    notificationsEnabled: bodyConfig.notificationsEnabled ?? stored.notificationsEnabled,
  })
}

/** Client view — never sends raw secrets; flags show what is stored in MongoDB */
export function toClientConfig(config) {
  return {
    webhookUrl: config.webhookUrl,
    notificationsEnabled: config.notificationsEnabled,
    meta: {
      appId: config.meta.appId || '',
      appSecret: '',
      pageToken: '',
      connected: config.meta.connected,
      hasAppSecret: Boolean(config.meta.appSecret?.trim()),
      hasPageToken: Boolean(config.meta.pageToken?.trim()),
    },
    linkedin: {
      clientId: config.linkedin.clientId || '',
      clientSecret: '',
      orgUrn: config.linkedin.orgUrn || '',
      accessToken: '',
      refreshToken: '',
      tokenExpiresAt: config.linkedin.tokenExpiresAt || null,
      connected: config.linkedin.connected,
      publishReady: config.linkedin.publishReady,
      hasClientSecret: Boolean(config.linkedin.clientSecret?.trim()),
      hasAccessToken: Boolean(config.linkedin.accessToken?.trim()),
    },
  }
}

export function stripPlaceholderSecrets(patch) {
  const clean = { ...patch }
  for (const key of ['appSecret', 'pageToken', 'clientSecret', 'accessToken', 'refreshToken']) {
    if (clean[key] === '••••••••' || clean[key] === '********') delete clean[key]
  }
  return clean
}
