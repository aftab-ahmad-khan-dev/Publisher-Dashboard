import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  notifyViaServiceWorker,
  requestNotificationPermission,
  subscribeSocket,
  simulateSocketPublish,
} from '../lib/notifications'
import { parseDatetimeLocal } from '../lib/scheduleUtils'
import { serializePostState, mergeDraftSave } from '../lib/draftUtils'
import { withDerivedConnectionFlags } from '../lib/connections'
import { mergeApiConfigWithEnv } from '../lib/envConfig'
import {
  testMetaConnection,
  testLinkedInConnection,
  testRedditConnection,
  testQuoraConnection,
  testGmailConnection,
  publishToPlatforms,
  scheduleToPlatforms,
  isLivePublishing,
} from '../lib/api'
import { STORAGE_KEYS } from '../lib/storage'
import {
  hasBackend,
  loadBootstrap,
  saveConfigRemote,
  saveLinkedInRemote,
  saveMetaRemote,
  saveRedditRemote,
  saveQuoraRemote,
  saveGmailRemote,
  saveDraftRemote,
  deleteDraftRemote,
  deleteScheduledRemote,
  scheduleBulkRemote,
  subscribeRealtime,
} from '../lib/backendApi'
import { compressImageFile, computeScheduleDate } from '../lib/bulkParse'
import {
  configFromServer,
  linkedinPayloadForSave,
  metaPayloadForSave,
  redditPayloadForSave,
  quoraPayloadForSave,
  gmailPayloadForSave,
  readLocalStoredConfig,
  needsMetaMigration,
  needsLinkedInMigration,
  metaMigrationPayload,
  linkedInMigrationPayload,
} from '../lib/configUtils'
import { validateCommunityPublish } from '../lib/contentPolicy'
import { sanitizePostState, sanitizePublishedText } from '../lib/contentSanitize'
import { showToast } from '../lib/toast'
import { useAuth } from './AuthContext'

const API_CONFIG_KEY = STORAGE_KEYS.apiConfig

const DEFAULT_API_CONFIG = {
  meta: { appId: '', appSecret: '', pageToken: '', connected: false },
  linkedin: {
    clientId: '',
    clientSecret: '',
    orgUrn: '',
    accessToken: '',
    connected: false,
  },
  reddit: {
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    subreddit: '',
    userAgent: 'PulsePublisher/1.0',
    connected: false,
  },
  quora: { profileUrl: '', defaultTopic: '', connected: false },
  gmail: {
    clientId: '',
    clientSecret: '',
    fromEmail: '',
    connected: false,
    sendReady: false,
  },
  webhookUrl: '',
  notificationsEnabled: true,
}

function loadApiConfigLocal() {
  try {
    const raw = localStorage.getItem(API_CONFIG_KEY)
    if (raw) {
      return withDerivedConnectionFlags(
        mergeApiConfigWithEnv(DEFAULT_API_CONFIG, JSON.parse(raw)),
      )
    }
  } catch {
    localStorage.removeItem(API_CONFIG_KEY)
  }
  return withDerivedConnectionFlags(mergeApiConfigWithEnv(DEFAULT_API_CONFIG))
}

const AppDataContext = createContext(null)

export function AppDataProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const live = hasBackend()

  const [queue, setQueue] = useState([])
  const [drafts, setDrafts] = useState([])
  const [published, setPublished] = useState([])
  const [apiConfig, setApiConfig] = useState(loadApiConfigLocal)
  const [publishStatus, setPublishStatus] = useState('idle')
  const [syncing, setSyncing] = useState(false)

  const applyConfigResponse = useCallback((serverConfig) => {
    const fromServer = configFromServer(serverConfig) || serverConfig
    const next = withDerivedConnectionFlags(
      mergeApiConfigWithEnv(DEFAULT_API_CONFIG, fromServer),
    )
    setApiConfig(next)
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(next))
    return next
  }, [])

  const applyBootstrap = useCallback((data) => {
    const fromServer = configFromServer(data.config) || {}
    const next = withDerivedConnectionFlags(
      mergeApiConfigWithEnv(DEFAULT_API_CONFIG, fromServer),
    )
    setApiConfig(next)
    setDrafts(data.drafts || [])
    setQueue(data.scheduled || [])
    setPublished(data.published || [])
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(next))
    return { next, serverConfig: data.config }
  }, [])

  const migrateLocalConfigToDb = useCallback(
    async (serverConfig) => {
      const local = readLocalStoredConfig()
      if (!local) return false

      let migrated = false

      if (needsMetaMigration(serverConfig, local)) {
        const res = await saveMetaRemote(metaMigrationPayload(serverConfig, local))
        applyConfigResponse(res.config)
        showToast('Meta configuration restored from this browser into MongoDB')
        migrated = true
      }

      if (needsLinkedInMigration(serverConfig, local)) {
        const res = await saveLinkedInRemote(linkedInMigrationPayload(serverConfig, local))
        applyConfigResponse(res.config)
        if (!migrated) {
          showToast('LinkedIn configuration restored from this browser into MongoDB')
        }
        migrated = true
      }

      return migrated
    },
    [applyConfigResponse, showToast],
  )

  const refreshFromServer = useCallback(async () => {
    if (!live || !isAuthenticated) return
    setSyncing(true)
    try {
      let data = await loadBootstrap()
      let migrated = await migrateLocalConfigToDb(data.config)
      if (migrated) {
        data = await loadBootstrap()
      }
      applyBootstrap(data)
    } catch (err) {
      showToast(err.message || 'Could not sync with API', 'error')
    } finally {
      setSyncing(false)
    }
  }, [live, isAuthenticated, showToast, migrateLocalConfigToDb, applyBootstrap])

  useEffect(() => {
    if (isAuthenticated) refreshFromServer()
  }, [isAuthenticated, refreshFromServer])

  useEffect(() => {
    if (!live || !isAuthenticated) return undefined
    return subscribeRealtime((event) => {
      if (event.type === 'POST_PUBLISHED') {
        simulateSocketPublish({
          type: 'POST_PUBLISHED',
          title: event.title || 'Post Published',
          body: event.body,
          tag: event.id,
          platforms: event.platforms,
        })
        refreshFromServer()
      }
      if (event.type === 'POST_SCHEDULED' || event.type === 'POST_FAILED') {
        refreshFromServer()
      }
    })
  }, [live, isAuthenticated, refreshFromServer])

  const saveApiConfig = useCallback(
    async (config) => {
      const next = withDerivedConnectionFlags(config)
      setApiConfig(next)
      localStorage.setItem(API_CONFIG_KEY, JSON.stringify(next))
      if (live) {
        try {
          const res = await saveConfigRemote({
            meta: metaPayloadForSave(config.meta),
            linkedin: linkedinPayloadForSave(config.linkedin),
            webhookUrl: config.webhookUrl,
            notificationsEnabled: config.notificationsEnabled,
          })
          applyConfigResponse(res.config)
          showToast('API configuration saved to database')
          return
        } catch (err) {
          showToast(err.message, 'error')
          return
        }
      }
      showToast('API configuration saved locally')
    },
    [live, showToast, applyConfigResponse],
  )

  const saveLinkedInConfig = useCallback(
    async (linkedin) => {
      if (!live) {
        setApiConfig((c) =>
          withDerivedConnectionFlags({ ...c, linkedin: { ...c.linkedin, ...linkedin } }),
        )
        return { ok: true }
      }
      try {
        const res = await saveLinkedInRemote(linkedinPayloadForSave(linkedin))
        applyConfigResponse(res.config)
        return res
      } catch (err) {
        showToast(err.message, 'error')
        throw err
      }
    },
    [live, applyConfigResponse, showToast],
  )

  const saveMetaConfig = useCallback(
    async (meta) => {
      if (!live) {
        setApiConfig((c) => withDerivedConnectionFlags({ ...c, meta: { ...c.meta, ...meta } }))
        return { ok: true }
      }
      try {
        const res = await saveMetaRemote(metaPayloadForSave(meta))
        applyConfigResponse(res.config)
        return res
      } catch (err) {
        showToast(err.message, 'error')
        throw err
      }
    },
    [live, applyConfigResponse, showToast],
  )

  const saveRedditConfig = useCallback(
    async (reddit) => {
      if (!live) {
        setApiConfig((c) => withDerivedConnectionFlags({ ...c, reddit: { ...c.reddit, ...reddit } }))
        return { ok: true }
      }
      try {
        const res = await saveRedditRemote(redditPayloadForSave(reddit))
        applyConfigResponse(res.config)
        return res
      } catch (err) {
        showToast(err.message, 'error')
        throw err
      }
    },
    [live, applyConfigResponse, showToast],
  )

  const saveQuoraConfig = useCallback(
    async (quora) => {
      if (!live) {
        setApiConfig((c) => withDerivedConnectionFlags({ ...c, quora: { ...c.quora, ...quora } }))
        return { ok: true }
      }
      try {
        const res = await saveQuoraRemote(quoraPayloadForSave(quora))
        applyConfigResponse(res.config)
        return res
      } catch (err) {
        showToast(err.message, 'error')
        throw err
      }
    },
    [live, applyConfigResponse, showToast],
  )

  const saveGmailConfig = useCallback(
    async (gmail) => {
      if (!live) {
        setApiConfig((c) => withDerivedConnectionFlags({ ...c, gmail: { ...c.gmail, ...gmail } }))
        return { ok: true }
      }
      try {
        const res = await saveGmailRemote(gmailPayloadForSave(gmail))
        applyConfigResponse(res.config)
        return res
      } catch (err) {
        showToast(err.message, 'error')
        throw err
      }
    },
    [live, applyConfigResponse, showToast],
  )

  const testPlatformConnection = useCallback(
    async (platform, config) => {
      const result =
        platform === 'meta'
          ? await testMetaConnection(config.meta)
          : platform === 'reddit'
            ? await testRedditConnection(config.reddit)
            : platform === 'quora'
              ? await testQuoraConnection(config.quora)
              : platform === 'gmail'
                ? await testGmailConnection(config.gmail)
                : await testLinkedInConnection(config.linkedin)

      if (result.ok) {
        if (platform === 'linkedin') {
          await saveLinkedInConfig(config.linkedin)
        } else if (platform === 'reddit') {
          await saveRedditConfig(config.reddit)
        } else if (platform === 'quora') {
          await saveQuoraConfig(config.quora)
        } else if (platform === 'gmail') {
          await saveGmailConfig(config.gmail)
        } else {
          await saveMetaConfig(config.meta)
        }
        if (result.saved) await refreshFromServer()
        showToast(
          result.message || `${platform} saved & verified`,
          result.needsToken ? 'error' : 'success',
        )
      } else {
        showToast(result.error, 'error')
      }
      return result
    },
    [
      saveLinkedInConfig,
      saveMetaConfig,
      saveRedditConfig,
      saveQuoraConfig,
      saveGmailConfig,
      refreshFromServer,
      showToast,
    ],
  )

  const pushNotification = useCallback(
    async (payload) => {
      if (!apiConfig.notificationsEnabled) return
      await notifyViaServiceWorker(payload)
    },
    [apiConfig.notificationsEnabled],
  )

  useEffect(() => {
    return subscribeSocket(async (detail) => {
      if (detail.type === 'POST_PUBLISHED') {
        await pushNotification({
          title: detail.title || 'Post Published',
          body: detail.body,
          tag: detail.tag,
        })
      }
    })
  }, [pushNotification])

  const publishNow = useCallback(
    async (rawState) => {
      const postState = sanitizePostState(rawState)
      const enabled = Object.entries(postState.platforms)
        .filter(([, on]) => on)
        .map(([p]) => p)

      if (enabled.length === 0) {
        showToast('Enable at least one platform to publish.', 'error')
        return
      }
      if (!postState.body.trim()) {
        showToast('Write something before publishing.', 'error')
        return
      }

      const communityCheck = validateCommunityPublish(postState.body, enabled)
      if (!communityCheck.ok) {
        showToast(communityCheck.error, 'error')
        return
      }

      setPublishStatus('loading')
      const result = await publishToPlatforms(postState, apiConfig)

      if (!result.ok) {
        setPublishStatus('idle')
        showToast(result.error, 'error')
        return
      }

      const platformNames = enabled.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')

      if (result.simulated) {
        setPublishStatus('idle')
        showToast(
          `Demo only — nothing was posted to ${platformNames}. Set VITE_API_BASE_URL.`,
          'error',
        )
        return
      }

      if (result.warnings?.length) {
        showToast(
          `Published with warnings: ${result.warnings.map((w) => w.platform).join(', ')}`,
          'error',
        )
      }

      simulateSocketPublish({
        type: 'POST_PUBLISHED',
        title: 'Post Published Successfully',
        body: `Live on ${platformNames}.`,
        tag: result.id,
        platforms: enabled,
      })

      const quoraResult = result.platformResults?.find?.((r) => r.platform === 'quora' && r.copyText)
      if (quoraResult?.copyText) {
        try {
          await navigator.clipboard.writeText(quoraResult.copyText)
          showToast('Quora answer copied — paste it on Quora manually', 'success')
        } catch {
          showToast('Published — copy Quora answer from platform results', 'success')
        }
      } else {
        showToast(`Published to ${platformNames}`)
      }

      await refreshFromServer()
      setPublishStatus('success')
      setTimeout(() => setPublishStatus('idle'), 2500)
    },
    [apiConfig, showToast, refreshFromServer],
  )

  const schedulePost = useCallback(
    async (rawState) => {
      const postState = sanitizePostState(rawState)
      const enabled = Object.entries(postState.platforms)
        .filter(([, on]) => on)
        .map(([p]) => p)

      if (enabled.length === 0) {
        showToast('Enable at least one platform to schedule.', 'error')
        return { ok: false }
      }
      if (!postState.body.trim()) {
        showToast('Write something before scheduling.', 'error')
        return { ok: false }
      }
      if (!postState.scheduledAt) {
        showToast('Pick a date and time to schedule.', 'error')
        return { ok: false }
      }

      const communityCheck = validateCommunityPublish(postState.body, enabled)
      if (!communityCheck.ok) {
        showToast(communityCheck.error, 'error')
        return { ok: false }
      }

      const scheduled = parseDatetimeLocal(postState.scheduledAt)
      if (!scheduled || scheduled <= new Date()) {
        showToast('Scheduled time must be in the future.', 'error')
        return { ok: false }
      }

      setPublishStatus('loading')
      const result = await scheduleToPlatforms(postState, apiConfig)

      if (!result.ok) {
        setPublishStatus('idle')
        showToast(result.error, 'error')
        return { ok: false }
      }

      if (result.simulated) {
        const item = {
          id: crypto.randomUUID(),
          body: postState.body,
          platforms: enabled,
          scheduledAt: scheduled.toISOString(),
          timezone: postState.timezone,
          status: 'scheduled',
        }
        const nextQueue = [item, ...queue]
        setQueue(nextQueue)
        localStorage.setItem(STORAGE_KEYS.scheduledQueue, JSON.stringify(nextQueue))
        setPublishStatus('success')
        showToast(`Saved locally for ${scheduled.toLocaleString()}`, 'error')
        setTimeout(() => setPublishStatus('idle'), 2500)
        return { ok: true, item, queue: nextQueue }
      }

      await refreshFromServer()
      setPublishStatus('success')
      showToast(
        `Scheduled for ${scheduled.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', hour12: true })} — will publish automatically`,
      )
      setTimeout(() => setPublishStatus('idle'), 2500)
      return { ok: true }
    },
    [apiConfig, showToast, queue, refreshFromServer],
  )

  const scheduleBulkPosts = useCallback(
    async ({ posts, platforms, startDate, timezone }) => {
      if (!posts?.length) {
        showToast('No posts to schedule.', 'error')
        return { ok: false }
      }
      if (!platforms?.length) {
        showToast('Enable at least one platform.', 'error')
        return { ok: false }
      }

      setPublishStatus('loading')

      if (platforms.some((p) => p === 'reddit' || p === 'quora')) {
        for (const post of posts) {
          const check = validateCommunityPublish(post.body, platforms)
          if (!check.ok) {
            showToast(`Post ${post.postNum || post.dayNum}: ${check.error}`, 'error')
            setPublishStatus('idle')
            return { ok: false }
          }
        }
      }

      const payloadPosts = []
      for (const post of posts) {
        let imageDataUrl = null
        if (post.imageFile) {
          try {
            imageDataUrl = await compressImageFile(post.imageFile)
          } catch {
            showToast(`Could not process image for ${post.title}`, 'error')
          }
        }
        payloadPosts.push({
          postNum: post.postNum,
          dayNum: post.dayNum,
          title: post.title,
          body: sanitizePublishedText(post.body),
          imageDataUrl,
          imageMeta: post.imageFile
            ? { name: post.imageFile.name, type: post.imageFile.type }
            : null,
        })
      }

      if (live) {
        try {
          const result = await scheduleBulkRemote({
            posts: payloadPosts,
            platforms,
            startDate,
            timezone,
          })
          await refreshFromServer()
          setPublishStatus('success')
          showToast(`Scheduled ${result.count} posts — noon each day`)
          setTimeout(() => setPublishStatus('idle'), 2500)
          return { ok: true, count: result.count }
        } catch (err) {
          setPublishStatus('idle')
          const msg = err.message?.includes('503') || err.message?.includes('Database')
            ? 'Database unavailable — check API terminal and MongoDB connection.'
            : err.message
          showToast(msg, 'error')
          return { ok: false }
        }
      }

      const items = payloadPosts.map((post) => {
        const scheduled = computeScheduleDate(startDate, post.dayNum)
        return {
          id: crypto.randomUUID(),
          body: post.body,
          platforms,
          scheduledAt: scheduled.toISOString(),
          timezone,
          status: 'scheduled',
          bulkTitle: post.title,
          imagePreview: post.imageDataUrl,
        }
      })
      const nextQueue = [...items, ...queue]
      setQueue(nextQueue)
      localStorage.setItem(STORAGE_KEYS.scheduledQueue, JSON.stringify(nextQueue))
      setPublishStatus('success')
      showToast(`Saved ${items.length} posts locally (demo mode)`, 'error')
      setTimeout(() => setPublishStatus('idle'), 2500)
      return { ok: true, count: items.length }
    },
    [live, queue, showToast, refreshFromServer],
  )

  const cancelScheduled = useCallback(
    async (id) => {
      if (live) {
        try {
          await deleteScheduledRemote(id)
          await refreshFromServer()
          showToast('Scheduled post removed')
          return
        } catch (err) {
          showToast(err.message, 'error')
          return
        }
      }
      const next = queue.filter((item) => item.id !== id)
      setQueue(next)
      localStorage.setItem(STORAGE_KEYS.scheduledQueue, JSON.stringify(next))
      showToast('Scheduled post removed')
    },
    [live, queue, showToast, refreshFromServer],
  )

  const persistDrafts = useCallback(
    async (next) => {
      setDrafts(next)
      if (!live) {
        localStorage.setItem(STORAGE_KEYS.drafts, JSON.stringify(next))
      }
    },
    [live],
  )

  const saveDraft = useCallback(
    async (postState, editingDraftId = null) => {
      if (!postState.body.trim() && postState.hashtags.length === 0) {
        showToast('Add content before saving a draft.', 'error')
        return { ok: false }
      }
      const payload = serializePostState(postState, editingDraftId)
      if (live) {
        try {
          await saveDraftRemote(payload)
          await refreshFromServer()
          showToast(editingDraftId ? 'Draft updated' : 'Saved to drafts')
          return { ok: true, draft: payload }
        } catch (err) {
          showToast(err.message, 'error')
          return { ok: false }
        }
      }
      const next = mergeDraftSave(drafts, payload, editingDraftId)
      await persistDrafts(next)
      showToast(editingDraftId ? 'Draft updated' : 'Saved to drafts')
      return { ok: true, draft: next.find((d) => d.id === payload.id) }
    },
    [drafts, persistDrafts, showToast, live, refreshFromServer],
  )

  const deleteDraft = useCallback(
    async (id) => {
      if (live) {
        try {
          await deleteDraftRemote(id)
          await refreshFromServer()
          showToast('Draft deleted')
          return
        } catch (err) {
          showToast(err.message, 'error')
          return
        }
      }
      await persistDrafts(drafts.filter((d) => d.id !== id))
      showToast('Draft deleted')
    },
    [drafts, persistDrafts, showToast, live, refreshFromServer],
  )

  const getDraftById = useCallback((id) => drafts.find((d) => d.id === id), [drafts])

  return (
    <AppDataContext.Provider
      value={{
        queue,
        drafts,
        published,
        apiConfig,
        publishStatus,
        syncing,
        showToast,
        saveApiConfig,
        saveLinkedInConfig,
        saveMetaConfig,
        saveRedditConfig,
        saveQuoraConfig,
        saveGmailConfig,
        testPlatformConnection,
        publishNow,
        schedulePost,
        scheduleBulkPosts,
        cancelScheduled,
        saveDraft,
        deleteDraft,
        getDraftById,
        refreshFromServer,
        requestNotificationPermission,
        isLivePublishing,
        storageKeys: STORAGE_KEYS,
      }}
    >
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
