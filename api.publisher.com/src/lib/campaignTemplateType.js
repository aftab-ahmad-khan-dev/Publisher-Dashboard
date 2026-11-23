/** Allowed EmailCampaign.templateType values (Mongoose enum). */
export const CAMPAIGN_TEMPLATE_TYPES = ['outreach', 'product', 'custom']

/**
 * Map library category labels (CEO/CTO, Direct, Product, …) to the campaign enum.
 * The UI historically sent category as templateType, which caused HTTP 500 validation errors.
 */
export function normalizeCampaignTemplateType(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return 'custom'
  const lower = s.toLowerCase()
  if (CAMPAIGN_TEMPLATE_TYPES.includes(lower)) return lower

  if (lower === 'product' || lower.startsWith('product')) return 'product'

  if (
    lower === 'direct' ||
    lower === 'direct hire' ||
    lower === 'ceo/cto' ||
    lower.includes('ceo') ||
    lower.includes('cto') ||
    lower === 'founder' ||
    lower.includes('founder') ||
    lower === 'general'
  ) {
    return 'outreach'
  }

  return 'custom'
}
