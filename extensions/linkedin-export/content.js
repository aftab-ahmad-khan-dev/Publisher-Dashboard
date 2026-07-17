/**
 * Reads only the visible LinkedIn DOM on the current tab (profile or search).
 * Does not fetch LinkedIn APIs or scrape pages the user has not opened.
 */

function textOf(el) {
  return String(el?.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function absUrl(href) {
  if (!href) return ''
  try {
    return new URL(href, location.origin).href
  } catch {
    return href
  }
}

function scrapeProfile() {
  const name =
    textOf(document.querySelector('h1')) ||
    textOf(document.querySelector('.text-heading-xlarge')) ||
    textOf(document.querySelector('[data-anonymize="person-name"]'))

  const headline =
    textOf(document.querySelector('.text-body-medium.break-words')) ||
    textOf(document.querySelector('[data-generated-suggestion-target]')) ||
    textOf(document.querySelector('.pv-text-details__left-panel .text-body-medium'))

  const location =
    textOf(document.querySelector('.text-body-small.inline.t-black--light.break-words')) ||
    textOf(document.querySelector('span.text-body-small.inline'))

  let company = ''
  const exp =
    document.querySelector('#experience ~ div, section[id*="experience"] li') ||
    document.querySelector('[data-field="experience_company_logo"]')
  if (exp) {
    company =
      textOf(exp.querySelector('span[aria-hidden="true"]')) ||
      textOf(exp.querySelector('.hoverable-link-text')) ||
      textOf(exp)
  }

  const profileUrl = location.href.split('?')[0]

  if (!name) return []
  return [
    {
      name,
      designation: headline,
      company,
      location,
      linkedin: profileUrl,
      email: '',
    },
  ]
}

function scrapeSearchOrList() {
  const rows = []
  const cards = document.querySelectorAll(
    'li.reusable-search__result-container, div.entity-result, li.artdeco-list__item, div[data-chameleon-result-urn]',
  )

  cards.forEach((card) => {
    const link =
      card.querySelector('a[href*="/in/"]') ||
      card.querySelector('a.app-aware-link[href*="/in/"]')
    const name =
      textOf(card.querySelector('span[aria-hidden="true"]')) ||
      textOf(card.querySelector('.entity-result__title-text a')) ||
      textOf(link)
    if (!name || name.length < 2) return

    const designation =
      textOf(card.querySelector('.entity-result__primary-subtitle')) ||
      textOf(card.querySelector('.entity-result__summary')) ||
      textOf(card.querySelector('.linked-area .t-14'))

    const locationEl =
      card.querySelector('.entity-result__secondary-subtitle') ||
      card.querySelector('.entity-result__simple-insight')
    const location = textOf(locationEl)

    let company = ''
    const companyMatch = designation.match(/\bat\s+(.+)$/i)
    if (companyMatch) company = companyMatch[1].trim()

    rows.push({
      name: name.split('·')[0].trim(),
      designation,
      company,
      location,
      linkedin: absUrl(link?.getAttribute('href') || ''),
      email: '',
    })
  })

  // Dedupe by linkedin URL / name
  const seen = new Set()
  return rows.filter((r) => {
    const key = (r.linkedin || r.name).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function collectContacts() {
  const path = location.pathname || ''
  if (/\/in\//i.test(path)) return scrapeProfile()
  return scrapeSearchOrList()
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'EXPORT_CONTACTS') {
    try {
      const contacts = collectContacts()
      sendResponse({ ok: true, contacts, pageUrl: location.href })
    } catch (err) {
      sendResponse({ ok: false, error: err.message || 'Failed to read page' })
    }
    return true
  }
  return false
})
