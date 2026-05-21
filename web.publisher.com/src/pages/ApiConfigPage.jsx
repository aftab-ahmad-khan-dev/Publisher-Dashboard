import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppData } from "../contexts/AppDataContext";
import PageHeader from "../components/PageHeader";
import PageShell, { PageScroll } from "../components/PageShell";
import PlatformIcon, { MetaSuiteIcons } from "../components/PlatformIcon";
import { getConnectionSummary } from "../lib/connections";
import { isLivePublishing } from "../lib/api";
import { linkedInOAuthUrl } from "../lib/backendApi";
import { linkedinPayloadForSave, metaPayloadForSave } from "../lib/configUtils";

const FORM_ID = "api-config-form";

export default function ApiConfigPage() {
  const {
    apiConfig,
    saveApiConfig,
    saveLinkedInConfig,
    saveMetaConfig,
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

  const [lastTest, setLastTest] = useState({ meta: null, linkedin: null })

  const testConnection = async (platform) => {
    setTesting(platform);
    const result = await testPlatformConnection(platform, form);
    setTesting(null);
    setLastTest((t) => ({
      ...t,
      [platform]:
        result.ok === false
          ? "error"
          : result.needsToken
            ? "needsToken"
            : "ok",
    }));
  };

  const metaStatus = getPlatformStatus("meta", form, summary, lastTest.meta);
  const linkedInStatus = getPlatformStatus("linkedin", form, summary, lastTest.linkedin);

  const connectLinkedIn = () => {
    const url = linkedInOAuthUrl();
    if (url) window.location.href = url;
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
        subtitle='Connect Meta & LinkedIn'
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
              {summary.connectedCount}/2 ready
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
                  connected={summary.linkedInReady}
                  label={summary.linkedInPublish ? "Live" : "Setup"}
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
                  label='Org URN'
                  value={form.linkedin.orgUrn}
                  onChange={(v) => update("linkedin", "orgUrn", v)}
                  placeholder='urn:li:organization:…'
                  className='sm:col-span-2'
                />
                <SecretField
                  label='Access Token (optional if using OAuth)'
                  value={form.linkedin.accessToken || ""}
                  hasStored={form.linkedin.hasAccessToken}
                  onChange={(v) => update("linkedin", "accessToken", v)}
                  className='sm:col-span-2'
                />
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

  if (lastTest === "error") {
    return withAlive({
      tier: "error",
      title: "LinkedIn connection failed",
      message: "Verify client ID, secret, org URN, and access token.",
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
              <PlatformIcon platform='linkedin' size='sm' />
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
