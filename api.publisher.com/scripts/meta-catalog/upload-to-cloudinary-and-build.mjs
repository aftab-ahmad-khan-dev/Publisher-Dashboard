#!/usr/bin/env node
/**
 * 1) Upload catalogue PNGs to Cloudinary
 * 2) Write meta-commerce-catalog.csv (Commerce Manager upload)
 * 3) Write products.with-images.json (for Graph API upload)
 *
 * Usage (from api.publisher.com):
 *   node scripts/meta-catalog/upload-to-cloudinary-and-build.mjs
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { uploadReceiptToCloudinary } from '../../src/lib/cloudinary.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMAGES_DIR = path.resolve(
  __dirname,
  '../../../web.publisher.com/public/Catalouges',
)
const products = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8'),
)

const PAGE_FALLBACK = 'https://www.facebook.com/1813357902095424'
const CACHE_PATH = path.join(__dirname, 'cloudinary-cache.json')

function csvEscape(value) {
  const s = String(value ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function normalizeUrl(url) {
  if (!url || url.includes('.example')) return PAGE_FALLBACK
  return url
}

async function uploadImage(filename) {
  const filePath = path.join(IMAGES_DIR, filename)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing image: ${filename}`)
  }
  const buffer = fs.readFileSync(filePath)
  const result = await uploadReceiptToCloudinary({
    buffer,
    contentType: 'image/png',
    folder: 'whatsapp-catalogues',
  })
  if (!result.url) throw new Error(`No URL returned for ${filename}`)
  return result.url
}

async function main() {
  const cache = fs.existsSync(CACHE_PATH)
    ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
    : {}

  console.log(`Uploading ${products.length} catalogue images to Cloudinary…`)
  for (const [i, p] of products.entries()) {
    if (cache[p.image]) {
      console.log(`  [${i + 1}/${products.length}] cache hit: ${p.name}`)
      continue
    }
    process.stdout.write(`  [${i + 1}/${products.length}] ${p.name} … `)
    try {
      const url = await uploadImage(p.image)
      cache[p.image] = url
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))
      console.log('ok')
    } catch (err) {
      console.log(`FAIL: ${err.message}`)
      throw err
    }
  }

  const enriched = products.map((p) => {
    const description = `${p.description} Region: ${p.region}. ${p.price}.`
    return {
      ...p,
      url: normalizeUrl(p.url),
      image_url: cache[p.image],
      meta_description: description.slice(0, 9999),
      // Meta requires numeric price; contact pricing → 0.00 USD
      price_amount: 0,
      currency: 'USD',
    }
  })

  fs.writeFileSync(
    path.join(__dirname, 'products.with-images.json'),
    JSON.stringify(enriched, null, 2),
  )

  const headers = [
    'id',
    'title',
    'description',
    'availability',
    'condition',
    'price',
    'link',
    'image_link',
    'brand',
    'custom_label_0',
  ]
  const rows = [headers.join(',')]
  for (const p of enriched) {
    rows.push(
      [
        p.id,
        p.name,
        p.meta_description,
        'in stock',
        'new',
        '0.00 USD',
        p.url,
        p.image_url,
        'AK Catalogues',
        p.region,
      ]
        .map(csvEscape)
        .join(','),
    )
  }

  const csvPath = path.join(__dirname, 'meta-commerce-catalog.csv')
  fs.writeFileSync(csvPath, rows.join('\n'), 'utf8')

  console.log(`\nWrote ${enriched.length} products:`)
  console.log(`  ${csvPath}`)
  console.log(`  ${path.join(__dirname, 'products.with-images.json')}`)
  console.log(
    '\nNext: upload CSV in Commerce Manager, OR run push-to-meta.mjs with CATALOG_ID + token that has catalog_management.',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
