function csvEscape(value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(rows) {
  const headers = ['Name', 'Email', 'Company', 'Designation', 'Location', 'LinkedIn']
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.name),
        csvEscape(r.email),
        csvEscape(r.company),
        csvEscape(r.designation),
        csvEscape(r.location),
        csvEscape(r.linkedin),
      ].join(','),
    )
  }
  return lines.join('\n')
}

function setStatus(text) {
  document.getElementById('status').textContent = text
}

let lastCsv = ''

async function scanActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !/linkedin\.com/i.test(tab.url || '')) {
    throw new Error('Open a LinkedIn profile or search page first.')
  }

  const res = await chrome.tabs.sendMessage(tab.id, { type: 'EXPORT_CONTACTS' })
  if (!res?.ok) throw new Error(res?.error || 'Could not read this page.')
  if (!res.contacts?.length) {
    throw new Error('No visible contacts found. Open a profile or scroll search results into view.')
  }
  return res.contacts
}

function downloadCsv(csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `linkedin-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

document.getElementById('exportBtn').addEventListener('click', async () => {
  const btn = document.getElementById('exportBtn')
  const copyBtn = document.getElementById('copyBtn')
  btn.disabled = true
  setStatus('Scanning visible page…')
  try {
    const contacts = await scanActiveTab()
    lastCsv = toCsv(contacts)
    downloadCsv(lastCsv)
    copyBtn.disabled = false
    setStatus(`Exported ${contacts.length} contact(s). Upload the CSV in Mail Box → Campaigns.`)
  } catch (err) {
    setStatus(err.message || 'Export failed')
  } finally {
    btn.disabled = false
  }
})

document.getElementById('copyBtn').addEventListener('click', async () => {
  if (!lastCsv) return
  try {
    await navigator.clipboard.writeText(lastCsv)
    setStatus('CSV copied to clipboard.')
  } catch {
    setStatus('Could not copy — use the downloaded file instead.')
  }
})
