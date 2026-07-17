import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppData } from "../contexts/AppDataContext";
import PageHeader from "../components/PageHeader";
import PageShell, { PageScroll, PageStatsRow, PageStat } from "../components/PageShell";
import PlatformIcon, { MetaSuiteIcons } from "../components/PlatformIcon";
import { getConnectionSummary } from "../lib/connections";
import { isLivePublishing } from "../lib/api";
import {
  linkedInOAuthUrl,
  gmailOAuthUrl,
  fetchGmailOAuthSetup,
  fetchRedditSetup,
  redditOAuthUrl,
} from "../lib/backendApi";
import { showToast } from "../lib/toast";
import {
  linkedinPayloadForSave,
  metaPayloadForSave,
  redditPayloadForSave,
  quoraPayloadForSave,
  threadsPayloadForSave,
  gmailPayloadForSave,
} from "../lib/configUtils";
import { STORAGE_KEYS, readJsonStorage, writeJsonStorage } from "../lib/storage";

const FORM_ID = "api-config-form";
const INTEGRATION_TEST_PLATFORMS = ["meta", "linkedin", "reddit", "threads", "gmail"];

export default function ApiConfigPage() {
  const {
    apiConfig,
    saveApiConfig,
    saveLinkedInConfig,
    saveMetaConfig,
    saveRedditConfig,
    saveQuoraConfig,
    saveThreadsConfig,
    saveDefaultsConfig,
    saveGmailConfig,
    testPlatformConnection,
    requestNotificationPermission,
    refreshFromServer,
    processing,
    processingLabel,
    runWithLoading,
  } = useAppData();
  const live = isLivePublishing();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState(apiConfig);
  const [testing, setTesting] = useState(null);
  const [testingAll, setTestingAll] = useState(false);
  const [linkedInSave, setLinkedInSave] = useState("idle");
  const [metaSave, setMetaSave] = useState("idle");
  const [lastTest, setLastTest] = useState({
    meta: null,
    linkedin: null,
    reddit: null,
    quora: null,
    gmail: null,
  });
  const linkedInTimer = useRef(null);
  const metaTimer = useRef(null);

  useEffect(() => {
    setForm(apiConfig);
  }, [apiConfig]);

  useEffect(() => {
    const summaryNow = getConnectionSummary(apiConfig);
    const saved = readJsonStorage(STORAGE_KEYS.platformTestStatus, {}) || {};
    const savedGmail = saved.gmail ?? readJsonStorage(STORAGE_KEYS.gmailTestStatus, null);
    const savedReddit = saved.reddit ?? readJsonStorage(STORAGE_KEYS.redditTestStatus, null);
    const redditHasTokens =
      apiConfig?.reddit?.hasClientSecret &&
      apiConfig?.reddit?.hasRefreshToken &&
      Boolean(apiConfig?.reddit?.clientId?.trim()) &&
      Boolean(apiConfig?.reddit?.subreddit?.trim());
    setLastTest((prev) => ({
      ...prev,
      // Restore previously recorded status for meta / linkedin / quora so the
      // working / dead / needs-attention badge persists without re-testing.
      ...saved,
      gmail: summaryNow.gmailReady
        ? savedGmail === "error"
          ? "error"
          : "ok"
        : null,
      reddit: summaryNow.redditReady
        ? savedReddit === "error"
          ? "error"
          : savedReddit === "ok" || redditHasTokens
            ? "ok"
            : null
        : null,
    }));
  }, [apiConfig]);

  useEffect(() => {
    const status = searchParams.get("linkedin");
    const message = searchParams.get("message");
    if (status === "connected") {
      refreshFromServer();
      setSearchParams({}, { replace: true });
    } else if (status === "error") {
      alert(message || "LinkedIn connection failed");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, refreshFromServer, setSearchParams]);

  useEffect(() => {
    const status = searchParams.get("gmail");
    const message = searchParams.get("message");
    if (status === "connected") {
      refreshFromServer();
      setLastTest((t) => ({ ...t, gmail: "ok" }));
      writeJsonStorage(STORAGE_KEYS.gmailTestStatus, "ok");
      showToast("Gmail + Calendar connected — set your booking link in Mail Box → Meetings.", "success");
      setSearchParams({}, { replace: true });
    } else if (status === "error") {
      setLastTest((t) => ({ ...t, gmail: "error" }));
      writeJsonStorage(STORAGE_KEYS.gmailTestStatus, "error");
      showToast(message || "Gmail connection failed", "error");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, refreshFromServer, setSearchParams]);

  useEffect(() => {
    const status = searchParams.get("reddit");
    const message = searchParams.get("message");
    if (status === "connected") {
      refreshFromServer();
      setLastTest((t) => ({ ...t, reddit: "ok" }));
      writeJsonStorage(STORAGE_KEYS.redditTestStatus, "ok");
      showToast("Reddit connected — run Test Reddit to verify posting.", "success");
      setSearchParams({}, { replace: true });
    } else if (status === "error") {
      setLastTest((t) => ({ ...t, reddit: "error" }));
      writeJsonStorage(STORAGE_KEYS.redditTestStatus, "error");
      showToast(message || "Reddit connection failed", "error");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, refreshFromServer, setSearchParams]);

  useEffect(() => {
    if (!live) return;
    fetchGmailOAuthSetup()
      .then((data) => setGmailOAuthSetup(data))
      .catch(() => setGmailOAuthSetup(null));
    fetchRedditSetup()
      .then((data) => setRedditEnvSetup(data))
      .catch(() => setRedditEnvSetup(null));
  }, [live]);

  const summary = getConnectionSummary(form);

  const update = (section, field, value) => {
    setForm((f) => ({
      ...f,
      [section]: { ...f[section], [field]: value },
    }));
  };

  const persistLinkedIn = useCallback(
    async (linkedin) => {
      if (!live) return;
      setLinkedInSave("saving");
      try {
        await saveLinkedInConfig(linkedin);
        setLinkedInSave("saved");
        setTimeout(() => setLinkedInSave("idle"), 2000);
      } catch {
        setLinkedInSave("error");
      }
    },
    [live, saveLinkedInConfig],
  );

  const persistMeta = useCallback(
    async (meta) => {
      if (!live) return;
      setMetaSave("saving");
      try {
        await saveMetaConfig(meta);
        setMetaSave("saved");
        setTimeout(() => setMetaSave("idle"), 2000);
      } catch {
        setMetaSave("error");
      }
    },
    [live, saveMetaConfig],
  );

  useEffect(() => {
    if (!live) return undefined;
    if (linkedInTimer.current) clearTimeout(linkedInTimer.current);
    linkedInTimer.current = setTimeout(() => {
      persistLinkedIn(form.linkedin);
    }, 700);
    return () => clearTimeout(linkedInTimer.current);
  }, [
    live,
    form.linkedin.clientId,
    form.linkedin.clientSecret,
    form.linkedin.orgUrn,
    form.linkedin.accessToken,
    persistLinkedIn,
  ]);

  useEffect(() => {
    if (!live) return undefined;
    if (metaTimer.current) clearTimeout(metaTimer.current);
    metaTimer.current = setTimeout(() => {
      persistMeta(form.meta);
    }, 700);
    return () => clearTimeout(metaTimer.current);
  }, [live, form.meta.appId, form.meta.appSecret, form.meta.pageToken, persistMeta]);

  const handleSave = (e) => {
    e.preventDefault();
    saveApiConfig(form);
  };

  const [gmailOAuthSetup, setGmailOAuthSetup] = useState(null);
  const [redditEnvSetup, setRedditEnvSetup] = useState(null);
  const [redditSave, setRedditSave] = useState("idle");
  const [quoraSave, setQuoraSave] = useState("idle");
  const redditTimer = useRef(null);
  const quoraTimer = useRef(null);

  const applyTestResult = (platform, result) => {
    const status =
      result.ok === false ? "error" : result.needsToken ? "needsToken" : "ok";
    setLastTest((t) => {
      const next = { ...t, [platform]: status };
      writeJsonStorage(STORAGE_KEYS.platformTestStatus, next);
      if (platform === "gmail")
        writeJsonStorage(STORAGE_KEYS.gmailTestStatus, status);
      if (platform === "reddit")
        writeJsonStorage(STORAGE_KEYS.redditTestStatus, status);
      return next;
    });
    return status;
  };

  const testConnection = async (platform) => {
    setTesting(platform);
    const result = await testPlatformConnection(platform, form);
    applyTestResult(platform, result);
    setTesting(null);
    return result;
  };

  const testAllConfigurations = async () => {
    setTestingAll(true);
    let passed = 0;
    let needsToken = 0;
    let failed = 0;

    for (const platform of INTEGRATION_TEST_PLATFORMS) {
      setTesting(platform);
      const result = await testPlatformConnection(platform, form, { quiet: true });
      const status = applyTestResult(platform, result);
      if (status === "ok") passed += 1;
      else if (status === "needsToken") needsToken += 1;
      else failed += 1;
    }

    setTesting(null);
    setTestingAll(false);
    await refreshFromServer();

    const parts = [`${passed} verified`];
    if (needsToken) parts.push(`${needsToken} need OAuth`);
    if (failed) parts.push(`${failed} failed`);

    showToast(
      `Test complete — ${parts.join(", ")}`,
      failed || needsToken ? "error" : "success",
    );
  };

  const persistReddit = useCallback(
    async (reddit) => {
      if (!live) return;
      setRedditSave("saving");
      try {
        await saveRedditConfig(reddit);
        setRedditSave("saved");
        setTimeout(() => setRedditSave("idle"), 2000);
      } catch {
        setRedditSave("error");
      }
    },
    [live, saveRedditConfig],
  );

  const persistQuora = useCallback(
    async (quora) => {
      if (!live) return;
      setQuoraSave("saving");
      try {
        await saveQuoraConfig(quora);
        setQuoraSave("saved");
        setTimeout(() => setQuoraSave("idle"), 2000);
      } catch {
        setQuoraSave("error");
      }
    },
    [live, saveQuoraConfig],
  );

  useEffect(() => {
    if (!live) return undefined;
    if (redditTimer.current) clearTimeout(redditTimer.current);
    redditTimer.current = setTimeout(() => {
      persistReddit(form.reddit);
    }, 700);
    return () => clearTimeout(redditTimer.current);
  }, [
    live,
    form.reddit.clientId,
    form.reddit.subreddit,
    form.reddit.clientSecret,
    form.reddit.refreshToken,
    persistReddit,
  ]);

  const metaStatus = getPlatformStatus("meta", form, summary, lastTest.meta);
  const linkedInStatus = getPlatformStatus(
    "linkedin",
    form,
    summary,
    lastTest.linkedin,
  );
  const redditStatus = getPlatformStatus("reddit", form, summary, lastTest.reddit);
  const threadsStatus = getPlatformStatus("threads", form, summary, lastTest.threads);
  const gmailStatus = getPlatformStatus("gmail", form, summary, lastTest.gmail);

  const connectLinkedIn = async () => {
    const url = await linkedInOAuthUrl();
    if (url) window.location.href = url;
  };

  const connectGmail = async () => {
    const payload = gmailPayloadForSave(form.gmail);
    const typedSecret = Boolean(form.gmail?.clientSecret?.trim());
    const hasId = Boolean(payload.clientId) || gmailOAuthSetup?.clientIdConfigured;
    const hasSecret =
      typedSecret || form.gmail?.hasClientSecret || gmailOAuthSetup?.clientSecretConfigured;

    if (!hasId) {
      showToast(
        "Paste Google Client ID and Client Secret from the same Web client, then Save Gmail now.",
        "error",
      );
      return;
    }
    if (!hasSecret) {
      showToast(
        "Client Secret is required. Paste it from Google Cloud → the same Web client as the Client ID.",
        "error",
      );
      return;
    }

    if (live) {
      try {
        if (payload.clientId || typedSecret) {
          await saveGmailConfig(payload);
        }
      } catch (err) {
        showToast(err.message || "Could not save Gmail config", "error");
        return;
      }
    }

    const url = await gmailOAuthUrl();
    if (url) window.location.href = url;
    else
      showToast(
        "Set VITE_API_BASE_URL so Connect Gmail can reach the API.",
        "error",
      );
  };

  const connectReddit = async () => {
    const payload = redditPayloadForSave(form.reddit);
    const setup = redditEnvSetup;
    const hasId = Boolean(payload.clientId) || setup?.clientIdConfigured;
    const hasSecret =
      Boolean(form.reddit?.clientSecret?.trim()) ||
      form.reddit?.hasClientSecret ||
      setup?.clientSecretConfigured;
    const hasSub = Boolean(payload.subreddit) || setup?.subredditConfigured;

    if (!hasId || !hasSecret) {
      showToast(
        "Paste Reddit Client ID and Secret (under the app name at reddit.com/prefs/apps), Save Reddit now, or set REDDIT_* in api .env.",
        "error",
      );
      return;
    }
    if (!hasSub) {
      showToast("Subreddit is required before Connect Reddit (e.g. technology).", "error");
      return;
    }

    if (live) {
      try {
        await persistReddit(payload);
      } catch (err) {
        showToast(err.message || "Could not save Reddit config", "error");
        return;
      }
    }

    const url = await redditOAuthUrl();
    if (url) window.location.href = url;
    else showToast("Set VITE_API_BASE_URL so Connect Reddit can reach the API.", "error");
  };

  const enableNotifications = async () => {
    const perm = await requestNotificationPermission();
    if (perm === "granted") {
      setForm((f) => ({ ...f, notificationsEnabled: true }));
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Integrations"
        subtitle="Connect platforms · manage credentials · test publishing"
        action={
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={testAllConfigurations}
              disabled={testingAll || Boolean(testing)}
              className='btn-secondary py-2 text-sm'
            >
              {testingAll
                ? testing
                  ? `Testing ${testing}…`
                  : "Testing…"
                : "Test configuration"}
            </button>
            <button
              type='submit'
              form={FORM_ID}
              className='btn-primary py-2 text-sm'
            >
              Save configuration
            </button>
            <span className='saas-status-pill saas-status-pill--live hidden sm:inline-flex'>
              {summary.connectedCount}/5 ready
              {processing ? ` · ${processingLabel || "working…"}` : ""}
            </span>
          </div>
        }
      />

      <PageStatsRow>
        <PageStat label="Connected" value={`${summary.connectedCount}/5`} tone="emerald" />
        <PageStat label="Meta" value={summary.metaReady ? 'Live' : 'Setup'} tone={summary.metaReady ? 'emerald' : 'default'} />
        <PageStat label="LinkedIn" value={summary.linkedInPublish ? 'Live' : 'Setup'} tone={summary.linkedInPublish ? 'violet' : 'default'} />
        <PageStat label="Gmail" value={summary.gmailReady ? 'Live' : 'Off'} tone={summary.gmailReady ? 'amber' : 'default'} />
      </PageStatsRow>

      <PageScroll>
        <div className='mx-auto space-y-3 pb-2'>
          <form id={FORM_ID} onSubmit={handleSave} className='space-y-3'>
            <div className='grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch'>
              <div className='flex min-h-full flex-col gap-3'>
                <section className='saas-content-card flex min-h-[320px] flex-1 flex-col rounded-xl p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <div className='flex items-center gap-3'>
                      <MetaSuiteIcons size='lg' />
                      <div>
                        <h3 className='text-sm font-semibold text-white'>
                          Meta Suite
                        </h3>
                        <p className='text-[10px] text-slate-500'>
                          Instagram + Facebook
                        </p>
                      </div>
                    </div>
                    <StatusDot connected={summary.metaReady} />
                  </div>
                  <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                    <Field
                      label='App ID'
                      value={form.meta.appId}
                      onChange={(v) => update("meta", "appId", v)}
                      placeholder='Meta App ID'
                      help='https://developers.facebook.com/apps'
                    />
                    <SecretField
                      label='App Secret'
                      value={form.meta.appSecret}
                      hasStored={form.meta.hasAppSecret}
                      onChange={(v) => update("meta", "appSecret", v)}
                      help='https://developers.facebook.com/apps'
                    />
                    <SecretField
                      label='Page Token'
                      value={form.meta.pageToken}
                      hasStored={form.meta.hasPageToken}
                      onChange={(v) => update("meta", "pageToken", v)}
                      className='sm:col-span-2'
                      help='https://developers.facebook.com/tools/explorer'
                    />
                  </div>
                  <div className='flex-1' aria-hidden />
                  <div className='mt-auto flex flex-wrap gap-2 pt-3'>
                    <button
                      type='button'
                      onClick={() => testConnection("meta")}
                      disabled={testing === "meta"}
                      className='btn-secondary px-3 py-1.5 text-xs'
                    >
                      {testing === "meta" ? "Testing…" : "Test & save Meta"}
                    </button>
                    {live && (
                      <button
                        type='button'
                        onClick={() => persistMeta(metaPayloadForSave(form.meta))}
                        className='btn-secondary px-3 py-1.5 text-xs'
                      >
                        Save Meta now
                      </button>
                    )}
                  </div>
                </section>
                <PlatformStatusCard status={metaStatus} platform='meta' />
              </div>

              <div className='flex min-h-full flex-col gap-3'>
                <section className='saas-content-card flex min-h-[320px] flex-1 flex-col rounded-xl p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <div className='flex items-center gap-3'>
                      <PlatformIcon platform='linkedin' size='lg' />
                      <div>
                        <h3 className='text-sm font-semibold text-white'>
                          LinkedIn
                        </h3>
                        <p className='text-[10px] text-slate-500'>
                          {summary.linkedInPublish
                            ? "Ready to publish"
                            : "Saved to DB — connect OAuth to publish"}
                        </p>
                      </div>
                    </div>
                    <StatusDot
                      connected={summary.linkedInPublish}
                      label={
                        summary.linkedInPublish
                          ? "Live"
                          : summary.linkedInReady
                            ? "Connect"
                            : "Setup"
                      }
                    />
                  </div>
                  <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                    <Field
                      label='Client ID'
                      value={form.linkedin.clientId}
                      onChange={(v) => update("linkedin", "clientId", v)}
                      placeholder='Client ID'
                      help='https://www.linkedin.com/developers/apps'
                    />
                    <SecretField
                      label='Client Secret'
                      value={form.linkedin.clientSecret}
                      hasStored={form.linkedin.hasClientSecret}
                      onChange={(v) => update("linkedin", "clientSecret", v)}
                      help='https://www.linkedin.com/developers/apps'
                    />
                    <Field
                      label='Org URN (company page only, optional)'
                      value={form.linkedin.orgUrn}
                      onChange={(v) => update("linkedin", "orgUrn", v)}
                      help='https://www.linkedin.com/company/'
                      placeholder='urn:li:organization:12345678'
                      className='sm:col-span-2'
                    />
                    {form.linkedin.orgUrn?.trim() &&
                      (/^https?:\/\//i.test(form.linkedin.orgUrn) ||
                        form.linkedin.orgUrn.includes("linkedin.com")) && (
                        <p className='sm:col-span-2 text-[10px] text-rose-400/95'>
                          Org URN is not a URL. Clear this field for profile posts,
                          or use{" "}
                          <code className='text-rose-300/90'>
                            urn:li:organization:YOUR_ID
                          </code>
                          . Redirect URI belongs in LinkedIn Developer app settings,
                          not here.
                        </p>
                      )}
                    <SecretField
                      label='Access Token (optional if using OAuth)'
                      value={form.linkedin.accessToken || ""}
                      hasStored={form.linkedin.hasAccessToken}
                      onChange={(v) => update("linkedin", "accessToken", v)}
                      className='sm:col-span-2'
                    />
                    <p className='sm:col-span-2 text-[10px] leading-relaxed text-slate-500'>
                      Portal token needs{" "}
                      <code className='text-indigo-300/90'>w_member_social</code> for
                      your profile, or{" "}
                      <code className='text-indigo-300/90'>
                        w_organization_social
                      </code>{" "}
                      for a company page. Use Copy access token (full string).
                      Placeholder org{" "}
                      <code className='text-slate-400'>
                        urn:li:organization:12345
                      </code>{" "}
                      is ignored; profile is used instead.
                    </p>
                  </div>
                  <div className='flex-1' aria-hidden />
                  <div className='mt-auto flex flex-wrap gap-2 pt-3'>
                    {live && (
                      <button
                        type='button'
                        onClick={connectLinkedIn}
                        className='btn-primary px-3 py-1.5 text-xs'
                      >
                        Connect with LinkedIn
                      </button>
                    )}
                    <button
                      type='button'
                      onClick={() => testConnection("linkedin")}
                      disabled={testing === "linkedin"}
                      className='btn-secondary px-3 py-1.5 text-xs'
                    >
                      {testing === "linkedin" ? "Testing…" : "Test & save LinkedIn"}
                    </button>
                    {live && (
                      <button
                        type='button'
                        onClick={() =>
                          persistLinkedIn(linkedinPayloadForSave(form.linkedin))
                        }
                        className='btn-secondary px-3 py-1.5 text-xs'
                      >
                        Save LinkedIn now
                      </button>
                    )}
                  </div>
                </section>
                <PlatformStatusCard status={linkedInStatus} platform='linkedin' />
              </div>
            </div>

            <div className='grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch'>
              <div className='flex min-h-full flex-col gap-3'>
                <section className='saas-content-card flex min-h-[280px] flex-1 flex-col rounded-xl p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <div className='flex items-center gap-3'>
                      <PlatformIcon platform='reddit' size='lg' />
                      <div>
                        <h3 className='text-sm font-semibold text-white'>Reddit</h3>
                        <p className='text-[10px] text-slate-500'>
                          Script app · self-posts · no promo tone
                        </p>
                      </div>
                    </div>
                    <StatusDot
                      connected={summary.redditReady}
                      label={summary.redditReady ? "Ready" : "Setup"}
                    />
                  </div>
                  <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                    <Field
                      label='Client ID'
                      value={form.reddit.clientId}
                      onChange={(v) => update("reddit", "clientId", v)}
                      placeholder='Reddit app id'
                      help='https://www.reddit.com/prefs/apps'
                    />
                    <SecretField
                      label='Client Secret'
                      value={form.reddit.clientSecret}
                      hasStored={form.reddit.hasClientSecret}
                      onChange={(v) => update("reddit", "clientSecret", v)}
                      help='https://www.reddit.com/prefs/apps'
                    />
                    <SecretField
                      label='Refresh Token'
                      value={form.reddit.refreshToken}
                      hasStored={form.reddit.hasRefreshToken}
                      onChange={(v) => update("reddit", "refreshToken", v)}
                      help='https://www.reddit.com/prefs/apps'
                      className='sm:col-span-2'
                    />
                    <Field
                      label='Subreddit'
                      value={form.reddit.subreddit}
                      onChange={(v) => update("reddit", "subreddit", v)}
                      placeholder='yourcommunity (no r/)'
                    />
                    <Field
                      label='User-Agent'
                      value={form.reddit.userAgent}
                      onChange={(v) => update("reddit", "userAgent", v)}
                      placeholder='PulsePublisher/1.0 by u/yourname'
                    />
                  </div>
                  <div className='mt-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-2.5 text-[11px] leading-relaxed text-slate-400'>
                    <p className='font-medium text-amber-200/90'>Reddit app setup</p>
                    <p className='mt-1'>
                      <a
                        href={redditEnvSetup?.appsUrl || "https://www.reddit.com/prefs/apps"}
                        target='_blank'
                        rel='noreferrer'
                        className='text-indigo-300 underline'
                      >
                        reddit.com/prefs/apps
                      </a>{" "}
                      → web or script app. Redirect URI:
                    </p>
                    <code className='mt-1 block break-all font-mono text-[10px] text-emerald-300/90'>
                      {redditEnvSetup?.redirectUri ||
                        "http://127.0.0.1:3001/api/auth/reddit/callback"}
                    </code>
                    <p className='mt-1.5 text-slate-500'>
                      Client ID + secret → subreddit → Connect Reddit (or paste refresh token).
                    </p>
                  </div>
                  <div className='flex-1' aria-hidden />
                  <div className='mt-auto flex flex-wrap gap-2 pt-3'>
                    {live && (
                      <button
                        type='button'
                        onClick={connectReddit}
                        className='btn-primary px-3 py-1.5 text-xs'
                      >
                        Connect Reddit
                      </button>
                    )}
                    <button
                      type='button'
                      onClick={() => testConnection("reddit")}
                      disabled={testing === "reddit"}
                      className='btn-secondary px-3 py-1.5 text-xs'
                    >
                      {testing === "reddit" ? "Testing…" : "Test Reddit"}
                    </button>
                    {live && (
                      <button
                        type='button'
                        onClick={() =>
                          persistReddit(redditPayloadForSave(form.reddit))
                        }
                        className='btn-secondary px-3 py-1.5 text-xs'
                      >
                        Save Reddit now
                      </button>
                    )}
                  </div>
                </section>
                <PlatformStatusCard status={redditStatus} platform='reddit' />
              </div>

              <div className='flex min-h-full flex-col gap-3'>
                <section className='saas-content-card flex min-h-[280px] flex-1 flex-col rounded-xl p-4'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div className='flex items-center gap-3'>
                      <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EA4335] text-lg font-bold text-white'>
                        M
                      </span>
                      <div>
                        <h3 className='text-sm font-semibold text-white'>
                          Gmail (Mailsuite compatible)
                        </h3>
                        <p className='text-[10px] text-slate-500'>
                          Bulk send · Calendar Meet invites & sync · Sheets write-back
                        </p>
                      </div>
                    </div>
                    <StatusDot
                      connected={summary.gmailReady}
                      label={summary.gmailReady ? "Ready" : "Setup"}
                    />
                  </div>
                  <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                    <Field
                      label='Google Client ID'
                      value={form.gmail?.clientId || ""}
                      onChange={(v) => update("gmail", "clientId", v)}
                      placeholder='OAuth client ID'
                      help='https://console.cloud.google.com/apis/credentials'
                    />
                    <SecretField
                      label='Client Secret'
                      value={form.gmail?.clientSecret || ""}
                      hasStored={form.gmail?.hasClientSecret}
                      onChange={(v) => update("gmail", "clientSecret", v)}
                      help='Must be from the same Web client as Client ID. Google shows the secret only once — use Add secret if you lost it, then paste both and Connect Gmail.'
                    />
                  </div>
                  {form.gmail?.fromEmail && (
                    <p className='mt-1 text-[11px] text-emerald-400/90'>
                      Sending as {form.gmail.fromEmail}
                    </p>
                  )}
                  {(form.gmail?.hasRefreshToken || form.gmail?.calendarReady) && (
                    <p className='mt-1 text-[11px] text-indigo-300/90'>
                      Calendar scopes granted — use Mail Box → Meetings to save your booking URL,
                      Sync events, and Invite with Meet.
                      {form.gmail?.calendarBookingUrl
                        ? ` Booking link saved.`
                        : ''}
                    </p>
                  )}
                  <div className='flex-1' aria-hidden />
                  <div className='mt-auto flex flex-wrap gap-2 pt-3'>
                    {live && (
                      <button
                        type='button'
                        onClick={connectGmail}
                        className='btn-primary px-3 py-1.5 text-xs'
                      >
                        Connect Gmail
                      </button>
                    )}
                    <button
                      type='button'
                      onClick={() => testConnection("gmail")}
                      disabled={testing === "gmail"}
                      className='btn-secondary px-3 py-1.5 text-xs'
                    >
                      {testing === "gmail" ? "Testing…" : "Test Gmail"}
                    </button>
                    {live && (
                      <button
                        type='button'
                        onClick={() =>
                          saveGmailConfig(gmailPayloadForSave(form.gmail))
                        }
                        className='btn-secondary px-3 py-1.5 text-xs'
                      >
                        Save Gmail now
                      </button>
                    )}
                  </div>
                </section>
                <PlatformStatusCard status={gmailStatus} platform='gmail' />
              </div>
            </div>

            <div className='grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch'>
              {/* Threads */}
              <div className='flex min-h-full flex-col gap-3'>
                <section className='saas-content-card flex min-h-[240px] flex-1 flex-col rounded-xl p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <div className='flex items-center gap-3'>
                      <PlatformIcon platform='threads' size='lg' />
                      <div>
                        <h3 className='text-sm font-semibold text-white'>Threads</h3>
                        <p className='text-[10px] text-slate-500'>
                          Text posts · access token + user ID
                        </p>
                      </div>
                    </div>
                    <StatusDot
                      connected={summary.threadsReady}
                      label={summary.threadsReady ? "Ready" : "Setup"}
                    />
                  </div>
                  <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                    <SecretField
                      label='Access Token'
                      value={form.threads?.accessToken || ""}
                      hasStored={form.threads?.hasAccessToken}
                      onChange={(v) => update("threads", "accessToken", v)}
                      className='sm:col-span-2'
                      help='https://developers.facebook.com/docs/threads'
                    />
                    <Field
                      label='Threads User ID'
                      value={form.threads?.userId || ""}
                      onChange={(v) => update("threads", "userId", v)}
                      help='https://developers.facebook.com/docs/threads'
                      placeholder='Your Threads user ID'
                      className='sm:col-span-2'
                    />
                  </div>
                  <p className='mt-2 text-[11px] leading-relaxed text-slate-500'>
                    Create a token via{" "}
                    <a href='https://developers.facebook.com/docs/threads' target='_blank' rel='noreferrer' className='text-indigo-300 underline'>
                      Meta’s Threads API
                    </a>
                    . Test to auto-fill your user ID.
                  </p>
                  <div className='flex-1' aria-hidden />
                  <div className='mt-auto flex flex-wrap gap-2 pt-3'>
                    <button
                      type='button'
                      onClick={() => testConnection("threads")}
                      disabled={testing === "threads"}
                      className='btn-secondary px-3 py-1.5 text-xs'
                    >
                      {testing === "threads" ? "Testing…" : "Test & save Threads"}
                    </button>
                    {live && (
                      <button
                        type='button'
                        onClick={() => saveThreadsConfig(threadsPayloadForSave(form.threads))}
                        className='btn-secondary px-3 py-1.5 text-xs'
                      >
                        Save Threads now
                      </button>
                    )}
                  </div>
                </section>
                <PlatformStatusCard status={threadsStatus} platform='threads' />
              </div>
            </div>

            <section className='saas-content-card rounded-xl p-4'>
              <h3 className='text-sm font-semibold text-white'>Webhooks</h3>
              <div className='mt-3 space-y-2'>
                <Field
                  label='Webhook URL'
                  value={form.webhookUrl}
                  onChange={(v) => setForm((f) => ({ ...f, webhookUrl: v }))}
                  placeholder='https://your-api.com/webhooks'
                  className='w-full'
                />
                <label className='flex items-center justify-between rounded-lg border border-white/[0.06] px-3 py-2 text-xs'>
                  <span className='text-slate-300'>Notifications</span>
                  <input
                    type='checkbox'
                    checked={form.notificationsEnabled}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        notificationsEnabled: e.target.checked,
                      }))
                    }
                    className='h-4 w-4'
                  />
                </label>
                <button
                  type='button'
                  onClick={enableNotifications}
                  className='btn-secondary w-full py-1.5 text-xs'
                >
                  Request permission
                </button>
              </div>
            </section>

            <section className='saas-content-card rounded-xl p-4'>
              <h3 className='text-sm font-semibold text-white'>Scheduling defaults</h3>
              <p className='mt-1 text-[11px] text-slate-500'>
                Default time of day used for the next open slot and bulk uploads.
              </p>
              <div className='mt-3 space-y-2'>
                <Field
                  label='Default schedule time'
                  type='time'
                  value={form.defaults?.scheduleTime || '12:00'}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      defaults: { ...f.defaults, scheduleTime: v },
                    }))
                  }
                  className='w-full'
                />
                <button
                  type='button'
                  onClick={async () => {
                    await saveDefaultsConfig(form.defaults)
                    showToast('Scheduling defaults saved')
                  }}
                  className='btn-secondary w-full py-1.5 text-xs'
                >
                  Save defaults
                </button>
              </div>
            </section>
          </form>
        </div>
      </PageScroll>
    </PageShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  className = "",
  help,
}) {
  return (
    <div className={className}>
      <div className='mb-1 flex items-center justify-between gap-2'>
        <label className='block text-[10px] font-bold uppercase tracking-wider text-slate-500'>
          {label}
        </label>
        {help && (
          <a
            href={help}
            target='_blank'
            rel='noreferrer'
            className='shrink-0 text-[9px] font-semibold text-indigo-400 hover:text-indigo-300'
            title={`Where to get ${label}`}
          >
            Where to get it ↗
          </a>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className='input-premium w-full py-2 text-xs'
        autoComplete='off'
      />
    </div>
  );
}

function SecretField({ label, value, onChange, hasStored, className = "", help }) {
  const placeholder = hasStored
    ? "Saved in database — leave blank to keep"
    : "Enter value";
  return (
    <Field
      label={label}
      value={value}
      onChange={onChange}
      type='password'
      placeholder={placeholder}
      className={className}
      help={help}
    />
  );
}

function StatusDot({ connected, label }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${connected ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700/50 text-slate-400"}`}
    >
      {label || (connected ? "Ready" : "Setup")}
    </span>
  );
}

function withAlive(status) {
  const alive = status.tier === "functional" || status.tier === "connected";
  const signal =
    status.tier === "functional"
      ? { text: "Signal live", className: "text-emerald-500/80" }
      : status.tier === "connected"
        ? { text: "Saved · run test to verify", className: "text-amber-500/80" }
        : { text: "No signal · flatline", className: "text-slate-500" };
  return { ...status, alive, signal };
}

function getPlatformStatus(platform, form, summary, lastTest) {
  if (platform === "meta") {
    if (lastTest === "error") {
      return withAlive({
        tier: "error",
        title: "Meta connection failed",
        message: "Check App ID, secret, and page token, then test again.",
      });
    }
    if (!summary.metaReady) {
      return withAlive({
        tier: "idle",
        title: "Not connected",
        message:
          "Add Meta credentials above to enable Instagram & Facebook publishing.",
      });
    }
    const verified = lastTest === "ok";
    return withAlive({
      tier: verified ? "functional" : "connected",
      title: verified ? "Connected & functional" : "Connected",
      message: verified
        ? "Meta Graph API verified. Ready to publish to Instagram & Facebook."
        : "Credentials saved in MongoDB. Run “Test & save Meta” to verify.",
    });
  }

  if (platform === "reddit") {
    if (lastTest === "error") {
      return withAlive({
        tier: "error",
        title: "Reddit connection failed",
        message: "Check script app credentials, refresh token, and subreddit.",
      });
    }
    if (!summary.redditReady) {
      const hasPartial =
        Boolean(form.reddit?.clientId?.trim()) || form.reddit?.hasClientSecret;
      return withAlive({
        tier: "idle",
        title: "Not connected",
        message: hasPartial
          ? "Credentials saved — run Test Reddit to verify, or finish missing fields."
          : "Add Reddit script app credentials (or set REDDIT_* in api .env), then Test Reddit.",
      });
    }
    const redditVerified =
      lastTest === "ok" ||
      Boolean(
        form.reddit?.hasClientSecret &&
        form.reddit?.hasRefreshToken &&
        form.reddit?.clientId?.trim() &&
        form.reddit?.subreddit?.trim(),
      );
    if (redditVerified) {
      return withAlive({
        tier: "functional",
        title: "Ready to publish",
        message:
          "Reddit API ready. Self-posts publish to your subreddit — keep copy informational.",
      });
    }
    return withAlive({
      tier: "connected",
      title: "Connected",
      message: "Credentials saved. Run Test Reddit to verify before publishing.",
    });
  }

  if (platform === "quora") {
    if (lastTest === "error") {
      return withAlive({
        tier: "error",
        title: "Quora setup invalid",
        message: "Use a valid quora.com profile URL.",
      });
    }
    if (!summary.quoraReady) {
      return withAlive({
        tier: "idle",
        title: "Not connected",
        message:
          "Add your Quora profile for guided, informational answers (manual paste).",
      });
    }
    return withAlive({
      tier: lastTest === "ok" ? "functional" : "connected",
      title: "Ready for guided posts",
      message:
        lastTest === "ok"
          ? "Quora profile saved. Publish copies expertise-style answers for you to paste — avoid promotional language."
          : "Profile saved. Run “Test & save Quora” to confirm.",
    });
  }

  if (platform === "threads") {
    if (lastTest === "error") {
      return withAlive({
        tier: "error",
        title: "Threads connection failed",
        message: "Check your access token and Threads user ID, then test again.",
      });
    }
    if (!summary.threadsReady) {
      return withAlive({
        tier: "idle",
        title: "Not connected",
        message: "Add a Threads access token and user ID, then Test & save.",
      });
    }
    return withAlive({
      tier: lastTest === "ok" ? "functional" : "connected",
      title: lastTest === "ok" ? "Connected & functional" : "Connected",
      message:
        lastTest === "ok"
          ? "Threads API verified. Text posts publish to your account."
          : "Credentials saved. Run “Test & save Threads” to verify.",
    });
  }

  if (platform === "gmail") {
    if (lastTest === "error") {
      return withAlive({
        tier: "error",
        title: "Gmail connection failed",
        message: "Check OAuth client ID/secret and reconnect.",
      });
    }
    if (form.gmail?.smtpConfigured || form.gmail?.transport === "smtp" || form.gmail?.sendReady) {
      return withAlive({
        tier: "functional",
        title: "Ready to send (SMTP)",
        message:
          "SMTP is configured in api .env — Mail Box can send without Connect Gmail. OAuth is optional for Sheets write-back.",
      });
    }
    if (!summary.gmailReady) {
      const hasPartial =
        Boolean(form.gmail?.clientId?.trim()) || form.gmail?.hasClientSecret;
      return withAlive({
        tier: "idle",
        title: "Not connected",
        message: hasPartial
          ? "Credentials saved — click Connect Gmail to authorize sending."
          : "SMTP in .env or Gmail OAuth both work. Set SMTP_* or Connect Gmail.",
      });
    }
    const gmailVerified = lastTest === "ok" || Boolean(form.gmail?.hasRefreshToken);
    if (gmailVerified) {
      return withAlive({
        tier: "functional",
        title: "Ready to send from Mail Box",
        message:
          "Gmail OAuth active. Calendar Meet + sync available in Mail Box → Meetings.",
      });
    }
    return withAlive({
      tier: "connected",
      title: "Connected",
      message:
        "Credentials saved. Connect Gmail, then run Test Gmail before your first campaign.",
    });
  }

  if (platform !== "linkedin") {
    return withAlive({ tier: "idle", title: "Unknown", message: "" });
  }

  if (lastTest === "error") {
    return withAlive({
      tier: "error",
      title: "LinkedIn connection failed",
      message:
        "Verify client ID, secret, and access token (org URN only for company pages).",
    });
  }
  if (!summary.linkedInReady) {
    return withAlive({
      tier: "idle",
      title: "Not connected",
      message: "Add LinkedIn app credentials above, then connect via OAuth.",
    });
  }
  if (summary.linkedInPublish) {
    return withAlive({
      tier: "functional",
      title: "Connected & functional",
      message: "LinkedIn API ready. Posts will publish to your organization feed.",
    });
  }
  if (lastTest === "ok") {
    return withAlive({
      tier: "functional",
      title: "Connected & functional",
      message: "LinkedIn token validated. Ready to publish on LinkedIn.",
    });
  }
  if (lastTest === "needsToken") {
    return withAlive({
      tier: "connected",
      title: "Credentials saved",
      message:
        "LinkedIn app credentials saved. Add an Access Token to publish (OAuth required). Use “Connect with LinkedIn” or paste a token above.",
    });
  }
  return withAlive({
    tier: "connected",
    title: "Credentials saved",
    message:
      "LinkedIn app credentials saved in MongoDB. Connect with LinkedIn OAuth or add an access token to publish.",
  });
}

function PlatformStatusCard({ status, platform }) {
  const tierStyles = {
    functional: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/[0.07]",
      color: "#34d399",
      title: "text-emerald-300",
      monitor: "border-emerald-500/20 bg-emerald-500/10",
    },
    connected: {
      border: "border-amber-500/25",
      bg: "bg-amber-500/[0.06]",
      color: "#fbbf24",
      title: "text-amber-200",
      monitor: "border-amber-500/20 bg-amber-500/10",
    },
    error: {
      border: "border-red-500/30",
      bg: "bg-red-500/[0.07]",
      color: "#f87171",
      title: "text-red-300",
      monitor: "border-red-500/20 bg-red-500/5",
    },
    idle: {
      border: "border-white/[0.08]",
      bg: "bg-white/[0.02]",
      color: "#64748b",
      title: "text-slate-400",
      monitor: "border-white/[0.06] bg-white/[0.02]",
    },
  };
  const s = tierStyles[status.tier] || tierStyles.idle;

  return (
    <div
      className={`flex min-h-[7.5rem] shrink-0 flex-col rounded-xl border p-4 ${s.border} ${s.bg}`}
    >
      <div className='flex flex-1 items-stretch gap-3'>
        <div className='flex min-w-0 flex-1 flex-col justify-center'>
          <div className='flex items-center gap-2'>
            <p className={`text-sm font-semibold ${s.title}`}>{status.title}</p>
            {platform === "meta" ? (
              <MetaSuiteIcons size='sm' />
            ) : (
              <PlatformIcon platform={platform} size='sm' />
            )}
          </div>
          <p className='mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-slate-400'>
            {status.message}
          </p>
          <p
            className={`mt-2 text-[10px] font-medium uppercase tracking-wider ${status.signal.className}`}
          >
            {status.signal.text}
          </p>
        </div>
        <HeartbeatMonitor
          alive={status.alive}
          color={s.color}
          boxClass={s.monitor}
        />
      </div>
    </div>
  );
}

const ECG_ALIVE_PATH = "M4 16 H14 L18 8 L22 24 L26 12 L30 20 L34 16 H76";
const ECG_DEAD_PATH = "M4 16 H76";

function HeartbeatMonitor({ alive, color, boxClass }) {
  return (
    <div
      className={`relative flex h-[4.5rem] w-[5.5rem] shrink-0 items-center justify-center overflow-hidden rounded-lg border ${boxClass}`}
    >
      {alive && (
        <span
          className='pointer-events-none absolute inset-1 animate-heartbeat-ring rounded-md opacity-40'
          style={{
            background: `radial-gradient(circle at 50% 50%, ${color}55 0%, transparent 72%)`,
          }}
        />
      )}
      <svg
        viewBox='0 0 80 32'
        className='ecg-monitor-svg relative z-10 h-10 w-[4.75rem]'
        aria-hidden
      >
        {alive ? (
          <>
            <path d={ECG_ALIVE_PATH} className='ecg-line-alive' stroke={color} />
            <circle cx='22' cy='24' r='2.5' className='ecg-beat-dot' fill={color} />
          </>
        ) : (
          <path d={ECG_DEAD_PATH} className='ecg-line-dead' stroke={color} />
        )}
      </svg>
    </div>
  );
}
