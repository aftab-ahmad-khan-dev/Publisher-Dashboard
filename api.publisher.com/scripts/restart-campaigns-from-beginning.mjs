/**
 * Restart campaign(s) from the beginning (re-queue everyone, zero stats, start sending).
 *
 * Usage:
 *   node scripts/restart-campaigns-from-beginning.mjs
 *   node scripts/restart-campaigns-from-beginning.mjs <campaignId>
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { ensureDbConnected } from '../src/lib/dbInit.js'
import { resetCampaignSend } from '../src/lib/emailWorker.js'
import { EmailCampaign } from '../src/models/EmailCampaign.js'

async function main() {
  const onlyId = process.argv[2]
  await ensureDbConnected()

  const filter = onlyId
    ? { _id: onlyId }
    : { status: { $in: ['paused', 'failed', 'sending', 'completed', 'cancelled'] } }

  const campaigns = await EmailCampaign.find(filter)
    .select('_id name status workspaceId stats dailyCap error')
    .sort({ updatedAt: -1 })
    .limit(onlyId ? 1 : 30)

  if (!campaigns.length) {
    console.log('No campaigns found.')
    process.exit(0)
  }

  console.log(`Restarting ${campaigns.length} campaign(s) from beginning…`)
  for (const c of campaigns) {
    const result = await resetCampaignSend(c._id, c.workspaceId, { fromBeginning: true })
    console.log({
      id: String(c._id),
      name: c.name,
      was: c.status,
      now: result.campaign.status,
      queued: result.queued,
      sending: result.sending,
    })
  }

  // Keep process alive briefly so setImmediate send loops can start
  await new Promise((r) => setTimeout(r, 3000))
  await mongoose.disconnect()
  process.exit(0)
}

main().catch(async (err) => {
  console.error('FAILED:', err.message)
  try {
    await mongoose.disconnect()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
