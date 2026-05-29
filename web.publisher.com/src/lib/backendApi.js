import { isLivePublishing } from "./api";

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, "") || "";

/**
 * The tenant is derived server-side from the verified Clerk session, so the
 * client just forwards its token. We read it from the global Clerk instance so
 * non-React modules (this one) can authenticate without prop-drilling.
 */
async function getClerkToken() {
  try {
    if (typeof window !== "undefined" && window.Clerk?.session) {
      return await window.Clerk.session.getToken();
    }
  } catch {
    /* not signed in / Clerk not ready */
  }
  return null;
}

export function hasBackend() {
  return isLivePublishing();
}

export async function apiFetch(path, { method = "GET", body } = {}) {
  if (!API_BASE) throw new Error("VITE_API_BASE_URL is not set");
  const token = await getClerkToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `API error ${res.status}`);
  }
  return data;
}

/** EventSource can't set headers, so the Clerk token rides along as a query param. */
export function subscribeRealtime(onEvent) {
  if (!API_BASE) return () => {};
  let source = null;
  let closed = false;

  getClerkToken().then((token) => {
    if (closed) return;
    const q = token ? `?__token=${encodeURIComponent(token)}` : "";
    source = new EventSource(`${API_BASE}/events${q}`);
    source.onmessage = (e) => {
      try {
        onEvent(JSON.parse(e.data));
      } catch {
        /* ignore */
      }
    };
    source.onerror = () => source?.close();
  });

  return () => {
    closed = true;
    source?.close();
  };
}

/** Build an OAuth-initiation URL with the Clerk token attached (browser navigation can't send headers). */
async function oauthUrl(path) {
  if (!API_BASE) return null;
  const token = await getClerkToken();
  const q = token ? `?__token=${encodeURIComponent(token)}` : "";
  return `${API_BASE}${path}${q}`;
}

export async function loadBootstrap() {
  return apiFetch("/bootstrap");
}

export async function saveConfigRemote(config) {
  return apiFetch("/config", { method: "PUT", body: { config } });
}

export async function saveLinkedInRemote(linkedin) {
  return apiFetch("/config/linkedin", { method: "PUT", body: { linkedin } });
}

export async function saveMetaRemote(meta) {
  return apiFetch("/config/meta", { method: "PUT", body: { meta } });
}

export async function saveRedditRemote(reddit) {
  return apiFetch("/config/reddit", { method: "PUT", body: { reddit } });
}

export async function saveQuoraRemote(quora) {
  return apiFetch("/config/quora", { method: "PUT", body: { quora } });
}

export async function savePinterestRemote(pinterest) {
  return apiFetch("/config/pinterest", { method: "PUT", body: { pinterest } });
}

export async function saveThreadsRemote(threads) {
  return apiFetch("/config/threads", { method: "PUT", body: { threads } });
}

export function linkedInOAuthUrl() {
  return oauthUrl("/auth/linkedin");
}

export function gmailOAuthUrl() {
  return oauthUrl("/auth/gmail");
}

export async function fetchGmailOAuthSetup() {
  return apiFetch("/auth/gmail/setup");
}

export async function fetchRedditSetup() {
  return apiFetch("/auth/reddit/setup");
}

export function redditOAuthUrl() {
  return oauthUrl("/auth/reddit");
}

export async function saveGmailRemote(gmail) {
  return apiFetch("/config/gmail", { method: "PUT", body: { gmail } });
}

export async function getEmailTemplateDraft() {
  return apiFetch("/email/template-draft");
}

export async function saveEmailTemplateDraft(subject, body) {
  return apiFetch("/email/template-draft", { method: "PUT", body: { subject, body } });
}

export async function listEmailCampaigns() {
  return apiFetch("/email/campaigns");
}

export async function getEmailCampaign(id) {
  return apiFetch(`/email/campaigns/${id}`);
}

export async function createEmailCampaign(payload) {
  return apiFetch("/email/campaigns", { method: "POST", body: payload });
}

export async function sendEmailCampaign(id) {
  return apiFetch(`/email/campaigns/${id}/send`, { method: "POST" });
}

export async function deleteEmailCampaign(id) {
  return apiFetch(`/email/campaigns/${id}`, { method: "DELETE" });
}

export async function saveDraftRemote(draft) {
  return apiFetch(`/drafts/${draft.id}`, { method: "PUT", body: { draft } });
}

export async function deleteDraftRemote(id) {
  return apiFetch(`/drafts/${id}`, { method: "DELETE" });
}

export async function deleteScheduledRemote(id) {
  return apiFetch(`/scheduled/${id}`, { method: "DELETE" });
}

export async function scheduleBulkRemote(payload) {
  return apiFetch("/bulk/schedule", { method: "POST", body: payload });
}
