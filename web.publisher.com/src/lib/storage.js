/** Browser localStorage keys used by the dashboard (no server DB). */

export const STORAGE_KEYS = {
  apiConfig: "pulse_api_config",
  scheduledQueue: "pulse_scheduled_queue",
  drafts: "pulse_drafts",
  /** Gmail / Reddit API Config test result (persists across visits) */
  gmailTestStatus: "pulse_gmail_test_status",
  redditTestStatus: "pulse_reddit_test_status",
  /** All-platform test status map: { meta|linkedin|reddit|quora|gmail: 'ok'|'error'|'needsToken' } */
  platformTestStatus: "pulse_platform_test_status",
};

export function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    localStorage.removeItem(key);
  }
  return fallback;
}

export function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
