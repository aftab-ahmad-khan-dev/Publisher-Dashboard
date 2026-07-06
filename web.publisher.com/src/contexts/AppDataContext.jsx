import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  notifyViaServiceWorker,
  requestNotificationPermission,
  subscribeSocket,
  simulateSocketPublish,
} from '../lib/notifications'
import { parseDatetimeLocal, datetimeLocalToISO } from '../lib/scheduleUtils'
import { serializePostState, mergeDraftSave } from '../lib/draftUtils'
import { withDerivedConnectionFlags } from '../lib/connections'
import { mergeApiConfigWithEnv } from '../lib/envConfig'
import {
  testMetaConnection,
  testLinkedInConnection,
  testRedditConnection,
  testQuoraConnection,
  testPinterestConnection,
  testThreadsConnection,
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
  savePinterestRemote,
  saveThreadsRemote,
  saveDefaultsRemote,
  saveGmailRemote,
  saveDraftRemote,
  deleteDraftRemote,
  deleteScheduledRemote,
  deleteAllScheduledRemote,
  updateScheduledRemote,
  scheduleBulkRemote,
  uploadMediaRemote,
  subscribeRealtime,
} from '../lib/backendApi'
import { compressImageFile, compressImageFileForUpload, computeScheduleDate } from '../lib/bulkParse'
import {
  configFromServer,
  linkedinPayloadForSave,
  metaPayloadForSave,
  redditPayloadForSave,
  quoraPayloadForSave,
  pinterestPayloadForSave,
  threadsPayloadForSave,
  defaultsPayloadForSave,
  gmailPayloadForSave,
  readLocalStoredConfig,
  needsMetaMigration,
  needsLinkedInMigration,
  metaMigrationPayload,
  linkedInMigrationPayload,
} from '../lib/configUtils'
import { validateCommunityPublish } from '../lib/contentPolicy'
import {
  sanitizePostState,
  sanitizePublishedText,
  postHasForbiddenDash,
  forbiddenDashMessage,
} from '../lib/contentSanitize'
import { formatPublishOutcome } from '../lib/publishOutcome'
import { validatePollClient, isPollEnabled } from '../lib/pollUtils'
import { getComposerPosts } from '../lib/composerPosts'
import { todayDateInputValue, ensureFutureBulkStartDate, computeScheduleFromDayN, formatScheduleDisplay } from '../lib/scheduleUtils'
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
  pinterest: { accessToken: '', boardId: '', connected: false },
  threads: { accessToken: '', userId: '', connected: false },
  gmail: {
    clientId: '',
    clientSecret: '',
    fromEmail: '',
    connected: false,
    sendReady: false,
  },
  webhookUrl: '',
  notificationsEnabled: true,
  defaults: { scheduleTime: '12:00' },
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
const BULK_SCHEDULE_CHUNK = 30

/**
 * Compress + optionally upload one image with progress reporting (schedule & publish).
 */
async function prepareImageForBackend(file, { live, reportProgress, step = 1, total = 1 }) {
  if (!file?.type?.startsWith('image/')) return {}

  const safeTotal = Math.max(total, 1)

  reportProgress?.({
    phase: 'compress',
    current: step,
    total: safeTotal,
    percent: Math.round(((step - 1) / safeTotal) * 100),
    label: safeTotal > 1 ? `Preparing file ${step} of ${safeTotal}` : 'Preparing image…',
    fileName: file.name,
  })

  const compressed = await compressImageFileForUpload(file)

  if (!live) {
    reportProgress?.({
      phase: 'compress',
      current: step,
      total: safeTotal,
      percent: Math.round((step / safeTotal) * 100),
      label: safeTotal > 1 ? `Processed file ${step} of ${safeTotal}` : 'Image ready',
      fileName: file.name,
    })
    return { image: file, imageDataUrl: compressed }
  }

  reportProgress?.({
    phase: 'upload',
    current: step,
    total: safeTotal,
    percent: Math.round(((step - 0.35) / safeTotal) * 100),
    label: safeTotal > 1 ? `Uploading file ${step} of ${safeTotal}` : 'Uploading image…',
    fileName: file.name,
  })

  const up = await uploadMediaRemote(compressed)

  reportProgress?.({
    phase: 'upload',
    current: step,
    total: safeTotal,
    percent: Math.round((step / safeTotal) * 100),
    label: safeTotal > 1 ? `Uploaded file ${step} of ${safeTotal}` : 'Image uploaded',
    fileName: file.name,
  })

  return { image: file, imageMediaId: up.id, imageUrl: up.url, imageDataUrl: compressed }
}

/**
 * The composer holds the image as a File, which JSON.stringify drops to `{}` on the
 * way to the API. Convert it to a compressed data URL the backend can actually post.
 */
async function withImageData(postState, imageFile = null, { useMediaUpload = false } = {}) {
  const file = imageFile ?? postState?.image
  if (!file || !file.type?.startsWith('image/')) return postState
  try {
    if (useMediaUpload) {
      const prepared = await prepareImageForBackend(file, { live: true })
      return { ...postState, ...prepared }
    }
    return { ...postState, image: file, imageDataUrl: await compressImageFile(file) }
  } catch (err) {
    throw new Error(err?.message || 'Image upload failed')
  }
}

export function AppDataProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const live = hasBackend()

  const [queue, setQueue] = useState([])
  const [drafts, setDrafts] = useState([])
  const [published, setPublished] = useState([])
  const [apiConfig, setApiConfig] = useState(loadApiConfigLocal)
  const [publishStatus, setPublishStatus] = useState('idle')
  const [uploadProgress, setUploadProgress] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const loadingIdRef = useRef(0)
  const [loadingStack, setLoadingStack] = useState([])

  const runWithLoading = useCallback(async (label, fn) => {
    let taskLabel = label
    let taskFn = fn
    if (typeof label === 'function') {
      taskFn = label
      taskLabel = 'Working…'
    }
    const id = ++loadingIdRef.current
    setLoadingStack((stack) => [...stack, { id, label: taskLabel || 'Working…' }])
    try {
      return await taskFn()
    } finally {
      setLoadingStack((stack) => stack.filter((item) => item.id !== id))
    }
  }, [])

  const processing = useMemo(
    () =>
      Boolean(
        uploadProgress ||
          syncing ||
          publishStatus === 'loading' ||
          loadingStack.length > 0,
      ),
    [uploadProgress, syncing, publishStatus, loadingStack.length],
  )

  const processingLabel = useMemo(() => {
    if (uploadProgress) return null
    if (loadingStack.length > 0) return loadingStack[loadingStack.length - 1].label
    if (publishStatus === 'loading') return 'Publishing…'
    if (syncing) return 'Syncing data…'
    return null
  }, [uploadProgress, loadingStack, publishStatus, syncing])

  const clearUploadProgress = useCallback(() => setUploadProgress(null), [])

  const reportUploadProgress = useCallback((patch) => {
    setUploadProgress((prev) => ({ ...prev, ...patch }))
  }, [])

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

  const savePinterestConfig = useCallback(
    async (pinterest) => {
      if (!live) {
        setApiConfig((c) => withDerivedConnectionFlags({ ...c, pinterest: { ...c.pinterest, ...pinterest } }))
        return { ok: true }
      }
      try {
        const res = await savePinterestRemote(pinterestPayloadForSave(pinterest))
        applyConfigResponse(res.config)
        return res
      } catch (err) {
        showToast(err.message, 'error')
        throw err
      }
    },
    [live, applyConfigResponse, showToast],
  )

  const saveThreadsConfig = useCallback(
    async (threads) => {
      if (!live) {
        setApiConfig((c) => withDerivedConnectionFlags({ ...c, threads: { ...c.threads, ...threads } }))
        return { ok: true }
      }
      try {
        const res = await saveThreadsRemote(threadsPayloadForSave(threads))
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

  const saveDefaultsConfig = useCallback(
    async (defaults) => {
      if (!live) {
        setApiConfig((c) => withDerivedConnectionFlags({ ...c, defaults: { ...c.defaults, ...defaults } }))
        return { ok: true }
      }
      try {
        const res = await saveDefaultsRemote(defaultsPayloadForSave(defaults))
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
    async (platform, config, { quiet = false } = {}) =>
      runWithLoading(`Testing ${platform}…`, async () => {
      const result =
        platform === 'meta'
          ? await testMetaConnection(config.meta)
          : platform === 'reddit'
            ? await testRedditConnection(config.reddit)
            : platform === 'quora'
              ? await testQuoraConnection(config.quora)
              : platform === 'pinterest'
                ? await testPinterestConnection(config.pinterest)
                : platform === 'threads'
                  ? await testThreadsConnection(config.threads)
                  : platform === 'gmail'
                    ? await testGmailConnection(config.gmail)
                    : await testLinkedInConnection(config.linkedin)

      if (result.ok) {
        if (platform === 'linkedin') {
          await saveLinkedInConfig(linkedinPayloadForSave(config.linkedin))
        } else if (platform === 'reddit') {
          await saveRedditConfig(config.reddit)
        } else if (platform === 'quora') {
          await saveQuoraConfig(config.quora)
        } else if (platform === 'pinterest') {
          await savePinterestConfig(config.pinterest)
        } else if (platform === 'threads') {
          await saveThreadsConfig(config.threads)
        } else if (platform === 'gmail') {
          await saveGmailConfig(config.gmail)
        } else {
          await saveMetaConfig(config.meta)
        }
        if (result.saved) await refreshFromServer()
        if (!quiet) {
          showToast(
            result.message || `${platform} saved & verified`,
            result.needsToken ? 'error' : 'success',
          )
        }
      } else if (!quiet) {
        showToast(result.error, 'error')
      }
      return result
      }),
    [
      runWithLoading,
      saveLinkedInConfig,
      saveMetaConfig,
      saveRedditConfig,
      saveQuoraConfig,
      savePinterestConfig,
      saveThreadsConfig,
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
      if (postHasForbiddenDash(rawState)) {
        showToast(forbiddenDashMessage(), 'error')
        return { ok: false }
      }

      const postState = sanitizePostState(rawState)
      const enabled = Object.entries(postState.platforms)
        .filter(([, on]) => on)
        .map(([p]) => p)

      if (enabled.length === 0) {
        showToast('Enable at least one platform to publish.', 'error')
        return { ok: false }
      }
      if (!postState.body.trim() && !isPollEnabled(postState)) {
        showToast('Write something before publishing.', 'error')
        return { ok: false }
      }

      const pollCheck = validatePollClient(postState)
      if (!pollCheck.ok) {
        showToast(pollCheck.error, 'error')
        return { ok: false }
      }

      const communityCheck = validateCommunityPublish(postState.body, enabled, postState)
      if (!communityCheck.ok) {
        showToast(communityCheck.error, 'error')
        return { ok: false }
      }

      const posts = getComposerPosts(postState)
      if (posts.length > 1) {
        for (const post of posts) {
          if (!post.body.trim() && !isPollEnabled(postState)) {
            showToast(`Post ${post.postNum}: add body text.`, 'error')
            return { ok: false }
          }
          const check = validateCommunityPublish(post.body, enabled, postState)
          if (!check.ok) {
            showToast(`Post ${post.postNum}: ${check.error}`, 'error')
            return { ok: false }
          }
        }
      }

      setPublishStatus('loading')

      const finishPublish = () => {
        setTimeout(() => {
          setPublishStatus('idle')
          clearUploadProgress()
        }, 2500)
      }

      try {
      if (posts.length > 1) {
        const imagePosts = posts.filter((p) => p.imageFile)
        const imageTotal = imagePosts.length
        let imageStep = 0
        let published = 0

        for (const post of posts) {
          let singleState = {
            ...postState,
            body: post.body,
            image: post.imageFile || null,
            mediaItems: [],
          }

          if (post.imageFile) {
            imageStep++
            try {
              const img = await prepareImageForBackend(post.imageFile, {
                live,
                reportProgress: reportUploadProgress,
                step: imageStep,
                total: imageTotal,
              })
              singleState = { ...singleState, ...img }
            } catch (err) {
              setPublishStatus('idle')
              clearUploadProgress()
              showToast(`Post ${post.postNum}: ${err.message}`, 'error')
              return { ok: false }
            }
          }

          reportUploadProgress({
            phase: 'publish',
            current: published + 1,
            total: posts.length,
            percent: Math.round(((published + 0.5) / posts.length) * 100),
            label: `Publishing post ${post.postNum} of ${posts.length}…`,
          })

          const result = await publishToPlatforms(singleState, apiConfig)
          if (!result.ok) {
            setPublishStatus('idle')
            clearUploadProgress()
            showToast(`Post ${post.postNum}: ${result.error}`, 'error')
            return { ok: false }
          }
          if (result.simulated) {
            setPublishStatus('idle')
            clearUploadProgress()
            showToast('Demo only — set VITE_API_BASE_URL for live publishing.', 'error')
            return { ok: false }
          }
          published++
        }

        reportUploadProgress({ phase: 'publish', percent: 100, label: 'Done!' })
        showToast(`Published ${published} posts`)
        await refreshFromServer()
        setPublishStatus('success')
        finishPublish()
        return { ok: true }
      }

      let stateToPublish = postState
      if (postState.image?.type?.startsWith('image/')) {
        try {
          const img = await prepareImageForBackend(postState.image, {
            live,
            reportProgress: reportUploadProgress,
          })
          stateToPublish = { ...postState, ...img }
        } catch (err) {
          setPublishStatus('idle')
          clearUploadProgress()
          showToast(err.message, 'error')
          return { ok: false }
        }
      } else {
        if (!live) {
          stateToPublish = await withImageData(postState, null, { useMediaUpload: false })
        }
        reportUploadProgress({
          phase: 'publish',
          percent: 40,
          label: 'Publishing to platforms…',
        })
      }

      reportUploadProgress({
        phase: 'publish',
        percent: 85,
        label: 'Publishing to platforms…',
      })

      const result = await publishToPlatforms(stateToPublish, apiConfig)

      if (!result.ok) {
        setPublishStatus('idle')
        clearUploadProgress()
        showToast(result.error, 'error')
        return { ok: false }
      }

      if (result.simulated) {
        setPublishStatus('idle')
        clearUploadProgress()
        const platformNames = enabled.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')
        showToast(
          `Demo only — nothing was posted to ${platformNames}. Set VITE_API_BASE_URL.`,
          'error',
        )
        return { ok: false }
      }

      reportUploadProgress({ phase: 'publish', percent: 100, label: 'Done!' })

      const outcome = formatPublishOutcome(result, enabled)
      showToast(outcome.message, outcome.type)

      simulateSocketPublish({
        type: 'POST_PUBLISHED',
        title: outcome.type === 'success' ? 'Post Published Successfully' : 'Post Partially Published',
        body: outcome.message,
        tag: result.id,
        platforms: (result.platformResults || []).map((r) => r.platform),
      })

      const quoraResult = result.platformResults?.find?.((r) => r.platform === 'quora' && r.copyText)
      if (quoraResult?.copyText) {
        try {
          await navigator.clipboard.writeText(quoraResult.copyText)
          window.open(quoraResult.openUrl || 'https://www.quora.com/', '_blank', 'noopener')
          showToast('Quora answer copied & Quora opened — paste and post', 'success')
        } catch {
          window.open(quoraResult.openUrl || 'https://www.quora.com/', '_blank', 'noopener')
          showToast('Quora opened — copy your answer from platform results and paste', 'success')
        }
      }

      await refreshFromServer()
      setPublishStatus('success')
      finishPublish()
      return { ok: true, partial: outcome.type !== 'success' }
      } catch (err) {
        setPublishStatus('idle')
        clearUploadProgress()
        showToast(err.message || 'Publish failed', 'error')
        return { ok: false }
      }
    },
    [apiConfig, showToast, refreshFromServer, live, reportUploadProgress, clearUploadProgress],
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
      if (!postState.body.trim() && !isPollEnabled(postState)) {
        showToast('Write something before scheduling.', 'error')
        return { ok: false }
      }

      const posts = getComposerPosts(postState)
      if (posts.length > 1) {
        for (const post of posts) {
          if (!post.body.trim() && !isPollEnabled(postState)) {
            showToast(`Post ${post.postNum}: add body text.`, 'error')
            return { ok: false }
          }
          const check = validateCommunityPublish(post.body, enabled, postState)
          if (!check.ok) {
            showToast(`Post ${post.postNum}: ${check.error}`, 'error')
            return { ok: false }
          }
        }

        const pollCheck = validatePollClient(postState)
        if (!pollCheck.ok) {
          showToast(pollCheck.error, 'error')
          return { ok: false }
        }

        return scheduleBulkPosts({
          posts,
          platforms: enabled,
          startDate: postState.scheduleStartDate || todayDateInputValue(),
          timezone: postState.timezone,
          composerMeta: {
            poll: postState.poll,
            hashtags: postState.hashtags,
            imageVisibility: postState.imageVisibility,
            cropHint: postState.cropHint,
            platforms: postState.platforms,
          },
        })
      }

      if (!postState.scheduledAt) {
        showToast('Pick a date and time to schedule.', 'error')
        return { ok: false }
      }

      const pollCheck = validatePollClient(postState)
      if (!pollCheck.ok) {
        showToast(pollCheck.error, 'error')
        return { ok: false }
      }

      const communityCheck = validateCommunityPublish(postState.body, enabled, postState)
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
      const result = await scheduleToPlatforms(
        await withImageData(postState, null, { useMediaUpload: live }),
        apiConfig,
      )

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
    async ({ posts, platforms, startDate, timezone, composerMeta }) => {
      if (!posts?.length) {
        showToast('No posts to schedule.', 'error')
        return { ok: false }
      }
      if (!platforms?.length) {
        showToast('Enable at least one platform.', 'error')
        return { ok: false }
      }

      setPublishStatus('loading')

      const defaultScheduleTime = apiConfig.defaults?.scheduleTime || '12:00'
      const rawStart = startDate || todayDateInputValue()
      const resolvedStart = ensureFutureBulkStartDate(rawStart, defaultScheduleTime)
      if (resolvedStart !== rawStart) {
        showToast(
          `Day 1 at ${defaultScheduleTime} already passed — series starts ${formatScheduleDisplay(
            computeScheduleFromDayN(resolvedStart, 1, defaultScheduleTime),
            { timezone, showRelative: true },
          )}`,
          'warning',
        )
      }

      const imagePosts = posts.filter((p) => p.imageFile)
      const imageTotal = imagePosts.length

      if (imageTotal > 0) {
        reportUploadProgress({
          phase: 'compress',
          current: 0,
          total: imageTotal,
          percent: 0,
          label: `Starting upload of ${imageTotal} file${imageTotal === 1 ? '' : 's'}…`,
        })
      }

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

      if (composerMeta?.poll?.enabled) {
        const pollCheck = validatePollClient({
          poll: composerMeta.poll,
          platforms: composerMeta.platforms || {},
          mediaItems: [],
          image: null,
          body: posts[0]?.body || '',
        })
        if (!pollCheck.ok) {
          showToast(pollCheck.error, 'error')
          setPublishStatus('idle')
          return { ok: false }
        }
      }

      const payloadPosts = []
      let imageStep = 0

      for (const post of posts) {
        let imageMediaId = null
        let imageUrl = null
        let imageDataUrl = null

        if (post.imageFile) {
          imageStep++
          try {
            reportUploadProgress({
              phase: 'compress',
              current: imageStep,
              total: imageTotal,
              percent: Math.round(((imageStep - 1) / Math.max(imageTotal, 1)) * 100),
              label: `Preparing file ${imageStep} of ${imageTotal}`,
              fileName: post.imageFile.name,
            })

            const compressed = await compressImageFileForUpload(post.imageFile)

            if (live) {
              reportUploadProgress({
                phase: 'upload',
                current: imageStep,
                total: imageTotal,
                percent: Math.round(((imageStep - 0.35) / Math.max(imageTotal, 1)) * 100),
                label: `Uploading file ${imageStep} of ${imageTotal}`,
                fileName: post.imageFile.name,
              })
              const up = await uploadMediaRemote(compressed)
              imageMediaId = up.id
              imageUrl = up.url
            } else {
              imageDataUrl = compressed
            }

            reportUploadProgress({
              phase: live ? 'upload' : 'compress',
              current: imageStep,
              total: imageTotal,
              percent: Math.round((imageStep / Math.max(imageTotal, 1)) * 100),
              label: live
                ? `Uploaded file ${imageStep} of ${imageTotal}`
                : `Processed file ${imageStep} of ${imageTotal}`,
              fileName: post.imageFile.name,
            })
          } catch (err) {
            setPublishStatus('idle')
            clearUploadProgress()
            showToast(
              `Image ${post.postNum || post.dayNum} (${post.imageFile.name}): ${err.message}`,
              'error',
            )
            return { ok: false }
          }
        }

        payloadPosts.push({
          postNum: post.postNum,
          dayNum: post.dayNum,
          title: post.title,
          body: sanitizePublishedText(post.body),
          imageMediaId,
          imageUrl,
          imageDataUrl,
          imageMeta: post.imageFile
            ? { name: post.imageFile.name, type: post.imageFile.type }
            : null,
          poll: composerMeta?.poll?.enabled ? composerMeta.poll : null,
          hashtags: composerMeta?.hashtags || [],
          imageVisibility: composerMeta?.imageVisibility || null,
          cropHint: composerMeta?.cropHint || null,
        })
      }

      if (live) {
        try {
          reportUploadProgress({
            phase: 'schedule',
            current: payloadPosts.length,
            total: payloadPosts.length,
            percent: 92,
            label: `Scheduling ${payloadPosts.length} post${payloadPosts.length === 1 ? '' : 's'}…`,
          })

          let totalCount = 0
          for (let i = 0; i < payloadPosts.length; i += BULK_SCHEDULE_CHUNK) {
            const chunk = payloadPosts.slice(i, i + BULK_SCHEDULE_CHUNK)
            const result = await scheduleBulkRemote({
              posts: chunk,
              platforms,
              startDate: resolvedStart,
              timezone,
            })
            totalCount += result.count ?? chunk.length
            reportUploadProgress({
              phase: 'schedule',
              percent: 92 + Math.round(((i + chunk.length) / payloadPosts.length) * 8),
              label: `Scheduled ${totalCount} of ${payloadPosts.length} posts…`,
            })
          }
          reportUploadProgress({ phase: 'schedule', percent: 100, label: 'Done!' })
          await refreshFromServer()
          setPublishStatus('success')
          showToast(`Scheduled ${totalCount} posts`)
          setTimeout(() => {
            setPublishStatus('idle')
            clearUploadProgress()
          }, 2500)
          return { ok: true, count: totalCount }
        } catch (err) {
          setPublishStatus('idle')
          clearUploadProgress()
          const msg =
            err.message?.includes('413') || /too large/i.test(err.message)
              ? 'Images were too large for one upload. Try fewer posts at a time or use smaller images.'
              : err.message?.includes('503') || err.message?.includes('Database')
                ? 'Database unavailable — check API terminal and MongoDB connection.'
                : err.message
          showToast(msg, 'error')
          return { ok: false }
        }
      }

      const [defHour, defMinute] = (apiConfig.defaults?.scheduleTime || '12:00').split(':').map(Number)
      reportUploadProgress({
        phase: 'schedule',
        percent: 95,
        label: `Saving ${payloadPosts.length} posts locally…`,
      })
      const items = payloadPosts.map((post) => {
        const scheduled = computeScheduleDate(resolvedStart, post.dayNum, defHour, defMinute)
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
      setTimeout(() => {
        setPublishStatus('idle')
        clearUploadProgress()
      }, 2500)
      return { ok: true, count: items.length }
    },
    [live, queue, showToast, refreshFromServer, reportUploadProgress, clearUploadProgress],
  )

  const cancelScheduled = useCallback(
    async (id) =>
      runWithLoading('Removing scheduled post…', async () => {
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
      }),
    [live, queue, showToast, refreshFromServer, runWithLoading],
  )

  const cancelAllScheduled = useCallback(
    async () =>
      runWithLoading('Removing scheduled posts…', async () => {
      if (live) {
        try {
          const result = await deleteAllScheduledRemote()
          await refreshFromServer()
          const count = result.removed ?? queue.length
          showToast(count ? `Removed ${count} scheduled posts` : 'No scheduled posts to remove')
          return { ok: true, removed: count }
        } catch (err) {
          showToast(err.message, 'error')
          return { ok: false, error: err.message }
        }
      }
      const count = queue.length
      setQueue([])
      localStorage.setItem(STORAGE_KEYS.scheduledQueue, JSON.stringify([]))
      showToast(count ? `Removed ${count} scheduled posts` : 'No scheduled posts to remove')
      return { ok: true, removed: count }
      }),
    [live, queue, showToast, refreshFromServer, runWithLoading],
  )

  const editScheduled = useCallback(
    async (id, { body, platforms, scheduledAt, timezone, imageFile, removeImage } = {}) =>
      runWithLoading(
        imageFile ? 'Uploading image…' : 'Saving scheduled post…',
        async () => {
      const iso = scheduledAt ? datetimeLocalToISO(scheduledAt) : undefined
      let imagePayload = {}

      if (removeImage) {
        imagePayload = { removeImage: true }
      } else if (imageFile) {
        try {
          const imageDataUrl = await compressImageFileForUpload(imageFile)
          if (live) {
            const up = await uploadMediaRemote(imageDataUrl)
            imagePayload = {
              imageMediaId: up.id,
              imageUrl: up.url,
              imageDataUrl,
            }
          } else {
            imagePayload = { imageDataUrl }
          }
        } catch (err) {
          showToast(err.message || 'Image upload failed', 'error')
          return { ok: false, error: err.message || 'Image upload failed' }
        }
      }

      if (live) {
        try {
          await updateScheduledRemote(id, {
            body,
            platforms,
            scheduledAt: iso,
            timezone,
            ...imagePayload,
          })
          await refreshFromServer()
          showToast('Scheduled post updated')
          return { ok: true }
        } catch (err) {
          showToast(err.message, 'error')
          return { ok: false, error: err.message }
        }
      }
      const next = queue.map((item) =>
        item.id === id
          ? {
              ...item,
              ...(body !== undefined ? { body } : {}),
              ...(platforms !== undefined ? { platforms } : {}),
              ...(iso ? { scheduledAt: iso } : {}),
              ...(timezone ? { timezone } : {}),
              ...(imagePayload.imageDataUrl
                ? {
                    imagePreview: imagePayload.imageDataUrl,
                    imagePreviewUrl: imagePayload.imageDataUrl,
                    imageMissing: false,
                  }
                : {}),
              ...(removeImage
                ? { imagePreview: null, imagePreviewUrl: null, imageMissing: true }
                : {}),
            }
          : item,
      )
      setQueue(next)
      localStorage.setItem(STORAGE_KEYS.scheduledQueue, JSON.stringify(next))
      showToast('Scheduled post updated')
      return { ok: true }
      },
      ),
    [live, queue, showToast, refreshFromServer, runWithLoading],
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
    async (postState, editingDraftId = null) =>
      runWithLoading('Saving draft…', async () => {
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
      }),
    [drafts, persistDrafts, showToast, live, refreshFromServer, runWithLoading],
  )

  const deleteDraft = useCallback(
    async (id) =>
      runWithLoading('Deleting draft…', async () => {
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
      }),
    [drafts, persistDrafts, showToast, live, refreshFromServer, runWithLoading],
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
        uploadProgress,
        syncing,
        processing,
        processingLabel,
        runWithLoading,
        showToast,
        saveApiConfig,
        saveLinkedInConfig,
        saveMetaConfig,
        saveRedditConfig,
        saveQuoraConfig,
        savePinterestConfig,
        saveThreadsConfig,
        saveDefaultsConfig,
        saveGmailConfig,
        testPlatformConnection,
        publishNow,
        schedulePost,
        scheduleBulkPosts,
        cancelScheduled,
        cancelAllScheduled,
        editScheduled,
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
