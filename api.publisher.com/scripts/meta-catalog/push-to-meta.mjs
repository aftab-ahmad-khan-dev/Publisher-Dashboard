#!/usr/bin/env node
/**
 * Push products into a Meta Commerce Catalog via Graph API.
 *
 * Prerequisites:
 *   1. Run upload-to-cloudinary-and-build.mjs first
 *   2. Create a catalog in Commerce Manager (accepts Catalog ToS) OR have Catalog ID
 *   3. Access token with catalog_management (+ business_management)
 *
 * Usage:
 *   META_CATALOG_ID=123 META_CATALOG_TOKEN=... node scripts/meta-catalog/push-to-meta.mjs
 *
 * Falls back to META_ACCESS_TOKEN from .env if META_CATALOG_TOKEN is unset.
 * Current PAGE token is missing catalog_management — use a User/System User token.
 *
 * Optional:
 *   META_BUSINESS_ID=3645347732229756  (create catalog if META_CATALOG_ID unset)
 *   META_WABA_ID=...                   (link catalog to WhatsApp after upload)
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API = 'https://graph.facebook.com/v21.0'
const token = process.env.META_CATALOG_TOKEN || process.env.META_ACCESS_TOKEN
const businessId = process.env.META_BUSINESS_ID || '3645347732229756'
const wabaId = process.env.META_WABA_ID || ''

if (!token) {
  console.error('Missing META_CATALOG_TOKEN / META_ACCESS_TOKEN')
  process.exit(1)
}

const productsPath = path.join(__dirname, 'products.with-images.json')
if (!fs.existsSync(productsPath)) {
  console.error('Run upload-to-cloudinary-and-build.mjs first')
  process.exit(1)
}
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'))

async function graph(method, edge, body) {
  const url = new URL(`${API}/${edge}`)
  const opts = { method }
  if (method === 'GET') {
    url.searchParams.set('access_token', token)
    if (body) {
      for (const [k, v] of Object.entries(body)) url.searchParams.set(k, v)
    }
  } else {
    const form = new URLSearchParams()
    form.set('access_token', token)
    if (body) {
      for (const [k, v] of Object.entries(body)) {
        if (v !== undefined && v !== null) form.set(k, String(v))
      }
    }
    opts.body = form
  }
  const res = await fetch(url, opts)
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok && !data.error, status: res.status, data }
}

async function ensureCatalog() {
  if (process.env.META_CATALOG_ID) return process.env.META_CATALOG_ID

  console.log('Creating catalog on business', businessId, '…')
  const { ok, data } = await graph('POST', `${businessId}/owned_product_catalogs`, {
    name: 'Publisher Dashboard Catalogues',
    vertical: 'commerce',
  })
  if (!ok) {
    console.error('Could not create catalog:', JSON.stringify(data, null, 2))
    console.error(
      '\nFix: create a catalog in Commerce Manager, then re-run with META_CATALOG_ID=...\n' +
        'Also ensure the token includes catalog_management.',
    )
    process.exit(1)
  }
  console.log('Created catalog', data.id)
  return data.id
}

async function upsertProduct(catalogId, p) {
  return graph('POST', `${catalogId}/products`, {
    retailer_id: p.id,
    name: p.name.slice(0, 200),
    description: p.meta_description || p.description,
    availability: 'in stock',
    condition: 'new',
    price: Math.round((p.price_amount ?? 0) * 100), // cents
    currency: p.currency || 'USD',
    url: p.url,
    image_url: p.image_url,
    brand: 'AK Catalogues',
    allow_upsert: true,
  })
}

async function linkWhatsApp(catalogId) {
  if (!wabaId) return
  console.log(`Linking catalog ${catalogId} → WABA ${wabaId}…`)
  const { ok, data } = await graph('POST', `${wabaId}/product_catalogs`, {
    catalog_id: catalogId,
  })
  console.log(ok ? 'Linked to WhatsApp.' : `Link failed: ${JSON.stringify(data)}`)
}

async function main() {
  console.log(`Products: ${products.length}`)
  const catalogId = await ensureCatalog()
  console.log('Catalog ID:', catalogId)

  let okCount = 0
  let failCount = 0
  const failures = []

  for (const [i, p] of products.entries()) {
    process.stdout.write(`  [${i + 1}/${products.length}] ${p.name} … `)
    const { ok, data } = await upsertProduct(catalogId, p)
    if (ok) {
      okCount++
      console.log(data.id || 'ok')
    } else {
      failCount++
      failures.push({ id: p.id, name: p.name, error: data.error || data })
      console.log('FAIL', data.error?.message || JSON.stringify(data))
    }
  }

  await linkWhatsApp(catalogId)

  const summary = {
    catalogId,
    okCount,
    failCount,
    failures,
    at: new Date().toISOString(),
  }
  fs.writeFileSync(
    path.join(__dirname, 'push-result.json'),
    JSON.stringify(summary, null, 2),
  )
  console.log(`\nDone: ${okCount} ok, ${failCount} failed. Catalog ${catalogId}`)
  if (failCount) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
