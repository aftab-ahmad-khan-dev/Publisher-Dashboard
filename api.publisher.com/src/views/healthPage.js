function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function badgeClass(tone) {
  if (tone === 'good') return 'badge badge-good'
  if (tone === 'warn') return 'badge badge-warn'
  if (tone === 'bad') return 'badge badge-bad'
  return 'badge badge-neutral'
}

export function renderHealthPage(s) {
  const dbTone = s.db.connected ? 'good' : 'bad'
  const statusLabel = s.db.connected ? 'ALL SYSTEMS OPERATIONAL' : 'DATABASE DISCONNECTED'
  const respTone = s.responseMs < 120 ? 'good' : s.responseMs < 400 ? 'warn' : 'bad'
  const respLabel = s.responseMs < 120 ? 'Optimal' : s.responseMs < 400 ? 'Acceptable' : 'Slow'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(s.title)} — Health</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      font-family: 'Inter', system-ui, sans-serif;
      background: radial-gradient(ellipse 80% 60% at 50% 0%, #1a2744 0%, #0a0e17 55%, #06080f 100%);
      color: #e8edf5;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .card {
      width: 100%;
      max-width: 920px;
      background: linear-gradient(165deg, rgba(22, 30, 48, 0.95) 0%, rgba(14, 18, 28, 0.98) 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 2.5rem 2rem 1.75rem;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
    }
    .hero { text-align: center; margin-bottom: 2rem; }
    .icon-wrap {
      width: 72px; height: 72px; margin: 0 auto 1.25rem;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: ${s.ok ? 'linear-gradient(135deg, #f5c842 0%, #d4a012 100%)' : 'linear-gradient(135deg, #64748b 0%, #475569 100%)'};
      box-shadow: 0 0 40px ${s.ok ? 'rgba(245, 200, 66, 0.35)' : 'rgba(100, 116, 139, 0.2)'};
    }
    .icon-wrap svg { width: 36px; height: 36px; color: #0f172a; }
    .status-pill {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.35rem 0.85rem; border-radius: 999px; font-size: 0.65rem;
      font-weight: 700; letter-spacing: 0.08em;
      background: ${s.ok ? 'rgba(245, 200, 66, 0.12)' : 'rgba(239, 68, 68, 0.12)'};
      color: ${s.ok ? '#f5c842' : '#f87171'};
      border: 1px solid ${s.ok ? 'rgba(245, 200, 66, 0.25)' : 'rgba(239, 68, 68, 0.25)'};
      margin-bottom: 1rem;
    }
    .status-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: currentColor;
      ${s.ok ? 'animation: pulse 2s ease infinite;' : ''}
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    h1 { font-size: 1.85rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.65rem; }
    .subtitle { color: #94a3b8; font-size: 0.9rem; line-height: 1.55; max-width: 520px; margin: 0 auto; }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    @media (max-width: 768px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    .metric {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 1rem 1.1rem;
    }
    .metric-label {
      font-size: 0.62rem; font-weight: 600; letter-spacing: 0.1em;
      color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem;
    }
    .metric-value { font-size: 1.35rem; font-weight: 700; margin-bottom: 0.55rem; }
    .badge {
      display: inline-block; font-size: 0.68rem; font-weight: 600;
      padding: 0.2rem 0.55rem; border-radius: 6px;
    }
    .badge-good { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
    .badge-warn { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .badge-bad { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .badge-neutral { background: rgba(148, 163, 184, 0.12); color: #94a3b8; }
    .sys-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      padding: 1.25rem 0;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      margin-bottom: 1.25rem;
    }
    @media (max-width: 640px) { .sys-row { grid-template-columns: repeat(2, 1fr); } }
    .sys-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #cbd5e1; }
    .sys-dot { width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; flex-shrink: 0; }
    .sys-key { color: #64748b; margin-right: 0.25rem; }
    .footer {
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 0.5rem;
      font-size: 0.72rem; color: #64748b;
    }
    .footer a { color: #60a5fa; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
    .refresh { margin-top: 1rem; text-align: center; }
    .refresh a {
      font-size: 0.75rem; color: #64748b; text-decoration: none;
      border: 1px solid rgba(255,255,255,0.08); padding: 0.35rem 0.75rem; border-radius: 8px;
    }
    .refresh a:hover { color: #94a3b8; border-color: rgba(255,255,255,0.15); }
  </style>
</head>
<body>
  <div class="card">
    <div class="hero">
      <div class="icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <polyline points="9 12 11 14 15 10"/>
        </svg>
      </div>
      <div class="status-pill"><span class="status-dot"></span>${esc(statusLabel)}</div>
      <h1>${esc(s.title)}</h1>
      <p class="subtitle">${esc(s.tagline)}</p>
    </div>

    <div class="grid">
      <div class="metric">
        <div class="metric-label">Uptime</div>
        <div class="metric-value">${esc(s.uptime)}</div>
        <span class="${badgeClass('good')}">Excellent</span>
      </div>
      <div class="metric">
        <div class="metric-label">Response Time</div>
        <div class="metric-value">${esc(s.responseMs)} ms</div>
        <span class="${badgeClass(respTone)}">${esc(respLabel)}</span>
      </div>
      <div class="metric">
        <div class="metric-label">Server Load</div>
        <div class="metric-value">${esc(s.load.label)}</div>
        <span class="${badgeClass(s.load.tone)}">Healthy</span>
      </div>
      <div class="metric">
        <div class="metric-label">Database</div>
        <div class="metric-value">${esc(s.db.label)}</div>
        <span class="${badgeClass(dbTone)}">${s.db.connected ? 'Connected' : 'Disconnected'}</span>
      </div>
    </div>

    <div class="sys-row">
      <div class="sys-item"><span class="sys-dot"></span><span><span class="sys-key">Environment</span>${esc(s.environment)}</span></div>
      <div class="sys-item"><span class="sys-dot"></span><span><span class="sys-key">Runtime</span>${esc(s.runtime)}</span></div>
      <div class="sys-item"><span class="sys-dot"></span><span><span class="sys-key">Framework</span>${esc(s.framework)}</span></div>
      <div class="sys-item"><span class="sys-dot"></span><span><span class="sys-key">Scheduler</span>${esc(s.scheduler)}</span></div>
    </div>

    <div class="footer">
      <span>Pulse Publisher · <a href="${esc(s.webUrl)}">Dashboard</a> · MongoDB ${esc(s.db.name || '—')}</span>
      <span>Last checked: ${esc(s.checkedAt)}</span>
    </div>
    <div class="refresh">
      <a href="/health">Refresh</a> · <a href="/api/health">JSON</a>
    </div>
  </div>
</body>
</html>`
}
