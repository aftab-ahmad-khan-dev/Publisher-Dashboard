# Publisher Dashboard — LinkedIn Export (Chrome MV3)

Compliant helper: exports **visible** LinkedIn profile or search-result contacts from the page you already opened while logged in. It does **not** mass-scrape LinkedIn or find emails like Apollo.

## Install (Chrome / Edge / Brave)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder: `extensions/linkedin-export`.
4. Pin the extension.

## Use

1. Open a LinkedIn **profile** (`/in/...`) or a **search / people results** page.
2. Click the extension icon → **Scan page & download CSV**.
3. In Publisher Dashboard → **Mail Box → Campaigns**, upload the CSV as a lead source (columns: Name, Email, Company, Designation, Location, LinkedIn).

Email is left blank when LinkedIn does not show it — fill emails in the sheet or enrich separately with consented data.

## Notes

- Only reads the current tab’s DOM.
- Re-scan after scrolling to load more search results.
- Do not automate or use for unauthorized harvesting.
