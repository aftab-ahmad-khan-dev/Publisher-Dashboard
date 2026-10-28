import { getBillingMe } from '../lib/subscription.js'
import { planAllows } from '../lib/plans.js'

/**
 * Reject mutating requests when the workspace plan does not include `feature`.
 * Admins always pass. Read-only GETs should not use this.
 */
export function requirePlanFeature(feature) {
  return async (req, res, next) => {
    try {
      if (!req.workspaceId) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' })
      }
      const me = await getBillingMe(req)
      if (me.isAdmin || planAllows(me.plan, feature)) {
        req.subscription = me
        return next()
      }
      return res.status(403).json({
        ok: false,
        error: `Upgrade required to use ${feature}. Open Billing to choose a plan.`,
        code: 'PLAN_REQUIRED',
        feature,
        plan: me.plan,
      })
    } catch (err) {
      next(err)
    }
  }
}
