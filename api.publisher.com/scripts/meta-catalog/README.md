# Meta / WhatsApp catalogue sync

54 products prepared from `web.publisher.com/public/Catalouges`.

## Files

| File | Purpose |
|------|---------|
| `products.json` | Source list (name, description, URL, image filename) |
| `cloudinary-cache.json` | Public Cloudinary image URLs |
| `products.with-images.json` | Enriched list ready for Graph API |
| `meta-commerce-catalog.csv` | **Upload this in Commerce Manager** |
| `upload-to-cloudinary-and-build.mjs` | Rebuild CSV + images |
| `push-to-meta.mjs` | API upsert into a Meta catalog |

## Fast path (recommended): CSV → WhatsApp

1. Open [Meta Commerce Manager](https://business.facebook.com/commerce)
2. Select business **Mr Designer** (or create a catalog → vertical **Commerce**)
3. **Add items → Upload** → choose `meta-commerce-catalog.csv`
4. In WhatsApp Manager → **Catalog** → connect that catalog (or Settings → Catalog)
5. Wait for Meta sync (often a few minutes)

Prices are `0.00 USD` because all items are “Contact for pricing” (WhatsApp still requires a numeric price).

## API path (needs extra permission)

Your current `.env` `META_ACCESS_TOKEN` is a **Page** token. It has WhatsApp/ads scopes but **not** `catalog_management`, so create/list catalog APIs return *Missing Permission*.

1. In Meta App Dashboard → add **Catalog** product / request `catalog_management`
2. Generate a **User** or **System User** token with `catalog_management` + `business_management`
3. Create a catalog once in Commerce Manager (accepts ToS; required before API)
4. Run:

```bash
cd api.publisher.com
META_CATALOG_ID=<your_catalog_id> \
META_CATALOG_TOKEN=<token_with_catalog_management> \
META_WABA_ID=<optional_whatsapp_business_account_id> \
node scripts/meta-catalog/push-to-meta.mjs
```

Business ID already known for this Page: `3645347732229756`.
