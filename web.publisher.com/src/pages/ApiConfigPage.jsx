import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppData } from "../contexts/AppDataContext";
import PageHeader from "../components/PageHeader";
import PageShell, { PageScroll } from "../components/PageShell";
import PlatformIcon, { MetaSuiteIcons } from "../components/PlatformIcon";
import { getConnectionSummary } from "../lib/connections";
import { isLivePublishing } from "../lib/api";
import { linkedInOAuthUrl, gmailOAuthUrl, fetchGmailOAuthSetup } from "../lib/backendApi";
import { showToast } from "../lib/toast";
import {
  linkedinPayloadForSave,
  metaPayloadForSave,
  redditPayloadForSave,
  quoraPayloadForSave,
  gmailPayloadForSave,
} from "../lib/configUtils";
import { STORAGE_KEYS, readJsonStorage, writeJsonStorage } from "../lib/storage";

const FORM_ID = "api-config-form";

export default function ApiConfigPage() {
  const {
    apiConfig,
    saveApiConfig,
    saveLinkedInConfig,
    saveMetaConfig,
    saveRedditConfig,
    saveQuoraConfig,
    saveGmailConfig,
    testPlatformConnection,
    requestNotificationPermission,
    refreshFromServer,
    syncing,
  } = useAppData();
  const live = isLivePublishing();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState(apiConfig);
  const [testing, setTesting] = useState(null);
  const [linkedInSave, setLinkedInSave] = useState("idle");
  const [metaSave, setMetaSave] = useState("idle");
  const linkedInTimer = useRef(null);
  const metaTimer = useRef(null);

  useEffect(() => {
    setForm(apiConfig);
  }, [apiConfig]);

  useEffect(() => {
    const saved = readJsonStorage(STORAGE_KEYS.platformTestStatus, {});
    const summaryNow = getConnectionSummary(apiConfig);
    setLastTest((prev) => ({
      ...saved,
      ...prev,
      ...(summaryNow.quoraReady ? { quora: "ok" } : {}),
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
      setSearchParams({}, { replace: true });
    } else if (status === "error") {
      alert(message || "Gmail connection failed");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, refreshFromServer, setSearchParams]);

  useEffect(() => {
    if (!live) return
    fetchGmailOAuthSetup()
      .then((data) => setGmailOAuthSetup(data))
      .catch(() => setGmailOAuthSetup(null))
  }, [live])

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

  const [lastTest, setLastTest] = useState({ meta: null, linkedin: null, reddit: null, quora: null, gmail: null })
  const [gmailOAuthSetup, setGmailOAuthSetup] = useState(null)
  const [redditSave, setRedditSave] = useState("idle")
  const [quoraSave, setQuoraSave] = useState("idle")
  const redditTimer = useRef(null)
  const quoraTimer = useRef(null)

  const testConnection = async (platform) => {
    setTesting(platform);
    const result = await testPlatformConnection(platform, form);
    setTesting(null);
    const status =
      result.ok === false ? "error" : result.needsToken ? "needsToken" : "ok";
    setLastTest((t) => {
      const next = { ...t, [platform]: status };
      writeJsonStorage(STORAGE_KEYS.platformTestStatus, next);
      return next;
    });
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

  useEffect(() => {
    if (!live) return undefined;
    if (quoraTimer.current) clearTimeout(quoraTimer.current);
    quoraTimer.current = setTimeout(() => {
      persistQuora(form.quora);
    }, 700);
    return () => clearTimeout(quoraTimer.current);
  }, [live, form.quora.profileUrl, form.quora.defaultTopic, persistQuora]);

  const metaStatus = getPlatformStatus("meta", form, summary, lastTest.meta);
  const linkedInStatus = getPlatformStatus("linkedin", form, summary, lastTest.linkedin);
  const redditStatus = getPlatformStatus("reddit", form, summary, lastTest.reddit);
  const quoraStatus = getPlatformStatus("quora", form, summary, lastTest.quora);

  const connectLinkedIn = () => {
    const url = linkedInOAuthUrl();
    if (url) window.location.href = url;
  };

  const connectGmail = async () => {
    const payload = gmailPayloadForSave(form.gmail);
    const hasId = Boolean(payload.clientId);
    const hasSecret = Boolean(form.gmail?.clientSecret?.trim()) || form.gmail?.hasClientSecret;

    if (!hasId) {
      showToast(
        "Paste Google Client ID (and Secret), click Save Gmail now, then Connect. Or set GMAIL_CLIENT_ID in api .env and restart the API.",
        "error",
      );
      return;
    }
    if (!hasSecret) {
      showToast("Client Secret is required before Connect Gmail.", "error");
      return;
    }

    if (live) {
      try {
        await saveGmailConfig(payload);
      } catch (err) {
        showToast(err.message || "Could not save Gmail config", "error");
        return;
      }
    }

    const url = gmailOAuthUrl();
    if (url) window.location.href = url;
    else showToast("Set VITE_API_BASE_URL so Connect Gmail can reach the API.", "error");
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
        title='API Configuration'
        subtitle='Meta · LinkedIn · Reddit · Quora (community = informational)'
        action={
          <div className='flex items-center gap-2'>
            <button
              type='submit'
              form={FORM_ID}
              className='btn-primary py-2 text-sm'
            >
              Save configuration
            </button>
            <span className='rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-slate-400'>
              {summary.connectedCount}/5 ready
              {syncing ? " · syncing…" : ""}
            </span>
          </div>
        }
      />

      <PageScroll>
        <div className='mx-auto space-y-3 pb-2'>
          <form id={FORM_ID} onSubmit={handleSave} className='space-y-3'>
            <div className='grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch'>
            <div className='flex min-h-full flex-col gap-3'>
            <section className='surface-panel flex min-h-[320px] flex-1 flex-col rounded-xl p-4'>
              <div className='flex items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <MetaSuiteIcons size='lg' />
                  <div>
                    <h3 className='text-sm font-semibold text-white'>Meta Suite</h3>
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
                />
                <SecretField
                  label='App Secret'
                  value={form.meta.appSecret}
                  hasStored={form.meta.hasAppSecret}
                  onChange={(v) => update("meta", "appSecret", v)}
                />
                <SecretField
                  label='Page Token'
                  value={form.meta.pageToken}
                  hasStored={form.meta.hasPageToken}
                  onChange={(v) => update("meta", "pageToken", v)}
                  className='sm:col-span-2'
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
            <section className='surface-panel flex min-h-[320px] flex-1 flex-col rounded-xl p-4'>
              <div className='flex items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <PlatformIcon platform='linkedin' size='lg' />
                  <div>
                    <h3 className='text-sm font-semibold text-white'>LinkedIn</h3>
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
                    summary.linkedInPublish ? "Live" : summary.linkedInReady ? "Connect" : "Setup"
                  }
                />
              </div>
              <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                <Field
                  label='Client ID'
                  value={form.linkedin.clientId}
                  onChange={(v) => update("linkedin", "clientId", v)}
                  placeholder='Client ID'
                />
                <SecretField
                  label='Client Secret'
                  value={form.linkedin.clientSecret}
                  hasStored={form.linkedin.hasClientSecret}
                  onChange={(v) => update("linkedin", "clientSecret", v)}
                />
                <Field
                  label='Org URN (company page only, optional)'
                  value={form.linkedin.orgUrn}
                  onChange={(v) => update("linkedin", "orgUrn", v)}
                  placeholder='urn:li:organization:12345678'
                  className='sm:col-span-2'
                />
                {form.linkedin.orgUrn?.trim() &&
                  (/^https?:\/\//i.test(form.linkedin.orgUrn) ||
                    form.linkedin.orgUrn.includes('linkedin.com')) && (
                    <p className='sm:col-span-2 text-[10px] text-rose-400/95'>
                      Org URN is not a URL. Clear this field for profile posts, or use{' '}
                      <code className='text-rose-300/90'>urn:li:organization:YOUR_ID</code>. Redirect
                      URI belongs in LinkedIn Developer app settings, not here.
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
                  Portal token needs <code className='text-violet-300/90'>w_member_social</code> for your
                  profile, or <code className='text-violet-300/90'>w_organization_social</code> for a company
                  page. Use Copy access token (full string). Placeholder org{' '}
                  <code className='text-slate-400'>urn:li:organization:12345</code> is ignored; profile is used
                  instead.
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
            <section className='surface-panel flex min-h-[280px] flex-1 flex-col rounded-xl p-4'>
              <div className='flex items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <PlatformIcon platform='reddit' size='lg' />
                  <div>
                    <h3 className='text-sm font-semibold text-white'>Reddit</h3>
                    <p className='text-[10px] text-slate-500'>Script app · self-posts · no promo tone</p>
                  </div>
                </div>
                <StatusDot connected={summary.redditReady} />
              </div>
              <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                <Field label='Client ID' value={form.reddit.clientId} onChange={(v) => update('reddit', 'clientId', v)} placeholder='Reddit app id' />
                <SecretField label='Client Secret' value={form.reddit.clientSecret} hasStored={form.reddit.hasClientSecret} onChange={(v) => update('reddit', 'clientSecret', v)} />
                <SecretField label='Refresh Token' value={form.reddit.refreshToken} hasStored={form.reddit.hasRefreshToken} onChange={(v) => update('reddit', 'refreshToken', v)} className='sm:col-span-2' />
                <Field label='Subreddit' value={form.reddit.subreddit} onChange={(v) => update('reddit', 'subreddit', v)} placeholder='yourcommunity (no r/)' />
                <Field label='User-Agent' value={form.reddit.userAgent} onChange={(v) => update('reddit', 'userAgent', v)} placeholder='PulsePublisher/1.0' />
              </div>
              <div className='flex-1' aria-hidden />
              <div className='mt-auto flex flex-wrap gap-2 pt-3'>
                <button type='button' onClick={() => testConnection('reddit')} disabled={testing === 'reddit'} className='btn-secondary px-3 py-1.5 text-xs'>
                  {testing === 'reddit' ? 'Testing…' : 'Test & save Reddit'}
                </button>
                {live && (
                  <button type='button' onClick={() => persistReddit(redditPayloadForSave(form.reddit))} className='btn-secondary px-3 py-1.5 text-xs'>
                    Save Reddit now
                  </button>
                )}
              </div>
            </section>
            <PlatformStatusCard status={redditStatus} platform='reddit' />
            </div>

            <div className='flex min-h-full flex-col gap-3'>
            <section className='surface-panel flex min-h-[280px] flex-1 flex-col rounded-xl p-4'>
              <div className='flex items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <PlatformIcon platform='quora' size='lg' />
                  <div>
                    <h3 className='text-sm font-semibold text-white'>Quora</h3>
                    <p className='text-[10px] text-slate-500'>Guided paste · expertise answers only</p>
                  </div>
                </div>
                <StatusDot connected={summary.quoraReady} />
              </div>
              <div className='mt-3 space-y-2'>
                <Field label='Profile URL' value={form.quora.profileUrl} onChange={(v) => update('quora', 'profileUrl', v)} placeholder='https://www.quora.com/profile/…' className='w-full' />
                <Field label='Default topic (optional)' value={form.quora.defaultTopic} onChange={(v) => update('quora', 'defaultTopic', v)} placeholder='e.g. Startup advice' className='w-full' />
              </div>
              <p className='mt-3 text-[11px] leading-relaxed text-amber-400/80'>
                Quora has no public posting API. Pulse formats your answer and copies it for you — write like you are helping someone, not selling.
              </p>
              <div className='flex-1' aria-hidden />
              <div className='mt-auto flex flex-wrap gap-2 pt-3'>
                <button type='button' onClick={() => testConnection('quora')} disabled={testing === 'quora'} className='btn-secondary px-3 py-1.5 text-xs'>
                  {testing === 'quora' ? 'Testing…' : summary.quoraReady ? 'Re-test & save Quora' : 'Test & save Quora'}
                </button>
                {live && (
                  <button type='button' onClick={() => persistQuora(quoraPayloadForSave(form.quora))} className='btn-secondary px-3 py-1.5 text-xs'>
                    Save Quora now
                  </button>
                )}
              </div>
            </section>
            <PlatformStatusCard status={quoraStatus} platform='quora' />
            </div>
            </div>

            <section className='surface-panel rounded-xl p-4'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA4335] text-lg font-bold text-white'>M</span>
                  <div>
                    <h3 className='text-sm font-semibold text-white'>Gmail (Mailsuite compatible)</h3>
                    <p className='text-[10px] text-slate-500'>
                      Bulk send from your inbox · opens in Pulse + Mailsuite extension in Gmail
                    </p>
                  </div>
                </div>
                <StatusDot connected={summary.gmailReady} label={summary.gmailReady ? 'Ready' : 'Setup'} />
              </div>
              <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                <Field label='Google Client ID' value={form.gmail?.clientId || ''} onChange={(v) => update('gmail', 'clientId', v)} placeholder='OAuth client ID' />
                <SecretField label='Client Secret' value={form.gmail?.clientSecret || ''} hasStored={form.gmail?.hasClientSecret} onChange={(v) => update('gmail', 'clientSecret', v)} />
              </div>
              <div className='mt-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-2.5 text-[11px] leading-relaxed text-slate-400'>
                <p className='font-medium text-amber-200/90'>Fix redirect_uri_mismatch in Google Cloud</p>
                <p className='mt-1'>
                  Same OAuth client as Client ID above → <strong className='text-slate-300'>Credentials</strong> →
                  your Web client → <strong className='text-slate-300'>Authorized redirect URIs</strong> (not
                  JavaScript origins). Add <em>exactly</em>:
                </p>
                <ul className='mt-1.5 list-inside list-disc space-y-0.5 font-mono text-[10px] text-violet-300/90'>
                  {(gmailOAuthSetup?.redirectUrisToRegister || [
                    'http://localhost:3001/api/auth/gmail/callback',
                    'http://127.0.0.1:3001/api/auth/gmail/callback',
                  ]).map((uri) => (
                    <li key={uri}>{uri}</li>
                  ))}
                </ul>
                <p className='mt-1.5 text-slate-500'>No trailing slash. Use http (not https) for local dev. Save in Google, wait ~1 min, then Connect again.</p>
              </div>
              <div className='mt-3 flex flex-wrap gap-2'>
                {live && (
                  <button type='button' onClick={connectGmail} className='btn-primary px-3 py-1.5 text-xs'>
                    Connect Gmail
                  </button>
                )}
                <button type='button' onClick={() => testConnection('gmail')} disabled={testing === 'gmail'} className='btn-secondary px-3 py-1.5 text-xs'>
                  {testing === 'gmail' ? 'Testing…' : 'Test Gmail'}
                </button>
                {live && (
                  <button type='button' onClick={() => saveGmailConfig(gmailPayloadForSave(form.gmail))} className='btn-secondary px-3 py-1.5 text-xs'>
                    Save Gmail now
                  </button>
                )}
              </div>
              {form.gmail?.fromEmail && (
                <p className='mt-2 text-[11px] text-emerald-400/90'>Sending as {form.gmail.fromEmail}</p>
              )}
            </section>

            <section className='surface-panel rounded-xl p-4'>
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
}) {
  return (
    <div className={className}>
      <label className='mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500'>
        {label}
      </label>
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

function SecretField({ label, value, onChange, hasStored, className = "" }) {
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
  return { ...status, alive };
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
        message: "Add Meta credentials above to enable Instagram & Facebook publishing.",
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
      return withAlive({
        tier: "idle",
        title: "Not connected",
        message: "Add Reddit app credentials. Posts must be informational — promotional tone may be removed by mods.",
      });
    }
    return withAlive({
      tier: lastTest === "ok" ? "functional" : "connected",
      title: lastTest === "ok" ? "Connected & functional" : "Connected",
      message:
        lastTest === "ok"
          ? "Reddit API verified. Self-posts publish to your subreddit."
          : "Credentials saved. Run “Test & save Reddit” to verify.",
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
        message: "Add your Quora profile for guided, informational answers (manual paste).",
      });
    }
    return withAlive({
      tier: "functional",
      title: "Ready for guided posts",
      message:
        "Quora profile saved. Publish copies expertise-style answers for you to paste — avoid promotional language. Re-test only if you change the profile URL.",
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
    if (!summary.gmailReady) {
      return withAlive({
        tier: "idle",
        title: "Not connected",
        message: "Save Google OAuth app credentials, then Connect Gmail.",
      });
    }
    return withAlive({
      tier: lastTest === "ok" ? "functional" : "connected",
      title: lastTest === "ok" ? "Ready to send bulk mail" : "Connected",
      message:
        lastTest === "ok"
          ? "Gmail API verified. Bulk sends appear in Sent — use Mailsuite in Gmail for extra tracking."
          : "OAuth connected. Test before your first campaign.",
    });
  }

  if (platform !== "linkedin") {
    return withAlive({ tier: "idle", title: "Unknown", message: "" });
  }

  if (lastTest === "error") {
    return withAlive({
      tier: "error",
      title: "LinkedIn connection failed",
      message: "Verify client ID, secret, and access token (org URN only for company pages).",
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
            className={`mt-2 text-[10px] font-medium uppercase tracking-wider ${status.alive ? "text-emerald-500/80" : "text-slate-500"}`}
          >
            {status.alive ? "Signal live" : "No signal · flatline"}
          </p>
        </div>
        <HeartbeatMonitor alive={status.alive} color={s.color} boxClass={s.monitor} />
      </div>
    </div>
  );
}

const ECG_ALIVE_PATH =
  "M4 16 H14 L18 8 L22 24 L26 12 L30 20 L34 16 H76";
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
