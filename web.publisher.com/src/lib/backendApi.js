import { isLivePublishing } from "./api";
import { getApiBaseUrl } from "./apiBaseUrl.js";
import { isPlatformAdmin } from "./admin.js";

const API_BASE = getApiBaseUrl();

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

/** Local API without CLERK_SECRET_KEY uses these headers for identity. */
function getIdentityHeaders() {
  try {
    const email = window.Clerk?.user?.primaryEmailAddress?.emailAddress;
    if (!email) return {};
    const headers = { "X-User-Email": email };
    if (isPlatformAdmin(email)) {
      headers["X-Admin-Email"] = email;
    }
    return headers;
  } catch {
    return {};
  }
}

export function hasBackend() {
  return isLivePublishing();
}

export async function apiFetch(path, { method = "GET", body } = {}) {
  if (!API_BASE) throw new Error("VITE_API_BASE_URL is not set (dev defaults to http://localhost:3001/api)");
  const token = await getClerkToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...getIdentityHeaders(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 413) {
      throw new Error("Request payload too large (413). Images are sent in smaller batches automatically — retry the schedule.");
    }
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

export async function saveDefaultsRemote(defaults) {
  return apiFetch("/config/defaults", { method: "PUT", body: { defaults } });
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

export async function saveEmailTemplateDraft(subject, body, extra = {}) {
  return apiFetch("/email/template-draft", {
    method: "PUT",
    body: { subject, body, ...extra },
  });
}

export async function listEmailCampaigns(params = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.status) qs.set("status", params.status);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return apiFetch(`/email/campaigns${q ? `?${q}` : ""}`);
}

export async function getEmailCampaign(id) {
  return apiFetch(`/email/campaigns/${id}`);
}

export async function createEmailCampaign(payload) {
  return apiFetch("/email/campaigns", { method: "POST", body: payload });
}

export async function sendEmailCampaign(id, body = {}) {
  return apiFetch(`/email/campaigns/${id}/send`, { method: "POST", body });
}

export async function pauseEmailCampaign(id) {
  return apiFetch(`/email/campaigns/${id}/pause`, { method: "POST" });
}

export async function resumeEmailCampaign(id) {
  return apiFetch(`/email/campaigns/${id}/resume`, { method: "POST" });
}

export async function cancelEmailCampaign(id) {
  return apiFetch(`/email/campaigns/${id}/cancel`, { method: "POST" });
}

export async function deleteEmailCampaign(id) {
  return apiFetch(`/email/campaigns/${id}`, { method: "DELETE" });
}

export async function moveMailboxToJunk(id) {
  return apiFetch(`/email/mailbox/${id}/junk`, { method: "POST", body: {} });
}

export async function restoreMailboxFromJunk(id) {
  return apiFetch(`/email/mailbox/${id}/restore`, { method: "POST", body: {} });
}

export async function deleteMailboxForever(id) {
  return apiFetch(`/email/mailbox/${id}`, { method: "DELETE" });
}

export async function bulkMailboxAction({ ids, action }) {
  return apiFetch("/email/mailbox/bulk", {
    method: "POST",
    body: { ids, action },
  });
}

export async function fetchEmailMailbox(params = {}) {
  const qs = new URLSearchParams();
  if (params.folder) qs.set("folder", params.folder);
  if (params.q) qs.set("q", params.q);
  if (params.campaignId) qs.set("campaignId", params.campaignId);
  if (params.meetingStatus) qs.set("meetingStatus", params.meetingStatus);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return apiFetch(`/email/mailbox${q ? `?${q}` : ""}`);
}

export async function fetchEmailMailboxMessage(id) {
  return apiFetch(`/email/mailbox/${id}`);
}

export async function uploadLeadWorkbook({ dataBase64, fileName, sheetNames, skipAlreadyEmailed, dedupe }) {
  return apiFetch("/email/leads/upload", {
    method: "POST",
    body: { dataBase64, fileName, sheetNames, skipAlreadyEmailed, dedupe },
  });
}

export async function importLeadGoogleSheet({ url, sheetNames, skipAlreadyEmailed, dedupe }) {
  return apiFetch("/email/leads/sheets", {
    method: "POST",
    body: { url, sheetNames, skipAlreadyEmailed, dedupe },
  });
}

export async function listLeadSources() {
  return apiFetch("/email/leads");
}

export async function reparseLeadSource(id, body = {}) {
  return apiFetch(`/email/leads/${id}/reparse`, { method: "POST", body });
}

export function leadSourceExportUrl(id) {
  return `${API_BASE}/email/leads/${id}/export`;
}

export async function downloadLeadSourceExport(id, fileName = 'leads-updated.xlsx') {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not set');
  const token = await getClerkToken();
  const res = await fetch(`${API_BASE}/email/leads/${id}/export`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...getIdentityHeaders(),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true };
}

export async function createCalendarInvite(payload) {
  return apiFetch("/email/calendar/invite", { method: "POST", body: payload });
}

export async function syncEmailCalendar() {
  return apiFetch("/email/calendar/sync", { method: "POST", body: {} });
}

export async function saveCalendarSettings(body) {
  return apiFetch("/email/settings/calendar", { method: "PUT", body });
}

export async function saveEmailNudgeSettings(body) {
  return apiFetch("/email/settings/nudges", { method: "PUT", body });
}

export async function getEmailSettings() {
  return apiFetch("/email/settings");
}

export async function listEmailTemplates(params = {}) {
  const qs = new URLSearchParams();
  if (params.type) qs.set("type", params.type);
  if (params.meetingLink) qs.set("meetingLink", params.meetingLink);
  const q = qs.toString();
  return apiFetch(`/email/templates${q ? `?${q}` : ""}`);
}

export async function listProcessedEmails(params = {}) {
  const qs = new URLSearchParams();
  if (params.campaignId) qs.set("campaignId", params.campaignId);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.page) qs.set("page", String(params.page));
  if (params.q) qs.set("q", params.q);
  if (params.status) qs.set("status", params.status);
  if (params.meetingStatus) qs.set("meetingStatus", params.meetingStatus);
  if (params.engagement) qs.set("engagement", params.engagement);
  const q = qs.toString();
  return apiFetch(`/email/processed${q ? `?${q}` : ""}`);
}

export async function sendEmailNudge(id, type) {
  return apiFetch(`/email/recipients/${id}/nudge`, {
    method: "POST",
    body: { type },
  });
}

export async function listEmailMeetings(params = {}) {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.page) qs.set("page", String(params.page));
  if (params.q) qs.set("q", params.q);
  if (params.meetingStatus) qs.set("meetingStatus", params.meetingStatus);
  if (params.sync) qs.set("sync", "1");
  const q = qs.toString();
  return apiFetch(`/email/meetings${q ? `?${q}` : ""}`);
}

export async function updateEmailMeeting(id, body) {
  return apiFetch(`/email/meetings/${id}`, { method: "PATCH", body });
}

export async function removeEmailMeetings(ids) {
  return apiFetch("/email/meetings/remove", { method: "POST", body: { ids } });
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

export async function deleteAllScheduledRemote() {
  return apiFetch("/scheduled", { method: "DELETE" });
}

export async function fetchAdminUsers() {
  return apiFetch("/admin/users");
}

export async function fetchAdminSignups() {
  return apiFetch("/admin/signups");
}

export async function fetchAdminPayments(status = "") {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch(`/admin/payments${q}`);
}

export async function activateAdminPayment(id) {
  return apiFetch(`/admin/payments/${id}/activate`, { method: "POST", body: {} });
}

export async function rejectAdminPayment(id, reason = "") {
  return apiFetch(`/admin/payments/${id}/reject`, { method: "POST", body: { reason } });
}

export async function fetchBillingMe() {
  return apiFetch("/billing/me");
}

export async function fetchBillingBanks() {
  return apiFetch("/billing/banks");
}

export async function fetchBillingPayments() {
  return apiFetch("/billing/payments");
}

export async function uploadBillingReceipt(imageDataUrl) {
  return apiFetch("/billing/receipt", { method: "POST", body: { imageDataUrl } });
}

export async function activateBillingPayment(id) {
  return apiFetch(`/billing/payments/${id}/activate`, { method: "POST", body: {} });
}

export async function rejectBillingPayment(id, reason = "") {
  return apiFetch(`/billing/payments/${id}/reject`, { method: "POST", body: { reason } });
}

export async function submitBillingPayment(payload) {
  return apiFetch("/billing/submit", { method: "POST", body: payload });
}

export async function updateScheduledRemote(id, payload) {
  return apiFetch(`/scheduled/${id}`, { method: "PUT", body: payload });
}

export async function rescheduleMissedRemote(payload = {}) {
  return apiFetch("/scheduled/reschedule-missed", { method: "POST", body: payload });
}

export async function scheduleBulkRemote(payload) {
  return apiFetch("/bulk/schedule", { method: "POST", body: payload });
}

/** Upload one image at a time — avoids 413 on large multi-post schedules. */
export async function uploadMediaRemote(imageDataUrl) {
  return apiFetch("/media/upload", { method: "POST", body: { imageDataUrl } });
}
