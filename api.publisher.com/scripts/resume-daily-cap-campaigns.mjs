/**
 * One-shot: auto-resume campaigns paused on daily cap (if under cap again).
 * Usage: node scripts/resume-daily-cap-campaigns.mjs
 */
import 'dotenv/config'
import { ensureDbConnected } from '../src/lib/dbInit.js'
import { resumeDailyCapPausedCampaigns, countSentLast24h } from '../src/lib/emailWorker.js'
import { EmailCampaign } from '../src/models/EmailCampaign.js'

async function main() {
  await ensureDbConnected()
  const paused = await EmailCampaign.find({ status: 'paused' })
    .select('name workspaceId dailyCap error nextSendAt stats status')
    .lean()
  console.log('Paused campaigns:', paused.length)
  for (const c of paused) {
    const sent24h = await countSentLast24h(c.workspaceId)
    console.log({
      id: String(c._id),
      name: c.name,
      error: c.error,
      dailyCap: c.dailyCap,
      sent24h,
      nextSendAt: c.nextSendAt,
      sent: c.stats?.sent,
      total: c.stats?.total,
    })
  }
  const result = await resumeDailyCapPausedCampaigns()
  console.log('Auto-resume result:', result)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
