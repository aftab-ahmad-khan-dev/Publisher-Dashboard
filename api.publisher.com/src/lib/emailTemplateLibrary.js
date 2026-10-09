import { EmailTemplate } from '../models/EmailTemplate.js'

const STARTER = [
  {
    name: 'Direct hire',
    category: 'Direct',
    subject: '{{firstName}}, end-to-end product build for {{company}}',
    body: `{{greeting}},

{{fomoLine}}

I ship production software across web, mobile, and desktop. One senior engineer owns scope, milestones, and handoff.

If {{company}} needs that kind of ownership, I am happy to share relevant work.

Schedule a meeting: {{meetingLink}}`,
  },
  {
    name: 'CEO / founder',
    category: 'CEO/CTO',
    subject: 'For {{designation}} at {{company}} — delivery without the agency stack',
    body: `{{greeting}},

{{fomoLine}}

Most {{industry}} leaders need someone who can ship web, mobile, and desktop products — not another deck.

I can send a short case study relevant to {{company}}. If a quick call helps: {{meetingLink}}`,
  },
  {
    name: 'Product / SaaS',
    category: 'Product',
    subject: '{{company}}: product engineering partner',
    body: `{{greeting}},

{{fomoLine}}

I partner with teams on web platforms, mobile apps, and SaaS builds with clear milestones and handoff.

Happy to walk through approach and timeline: {{meetingLink}}`,
  },
]

function toClient(doc) {
  if (!doc) return null
  const id = String(doc._id)
  return {
    id,
    name: doc.name,
    category: doc.category || 'General',
    type: doc.category || 'General',
    subject: doc.subject,
    body: doc.body,
    textBody: doc.body,
    htmlBody: doc.htmlBody || '',
    isDefault: Boolean(doc.isDefault),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
  }
}

export async function listLibraryTemplates(workspaceId, { category } = {}) {
  const q = { workspaceId }
  if (category && category !== 'all') q.category = category
  const rows = await EmailTemplate.find(q).sort({ category: 1, name: 1 }).lean()
  return rows.map(toClient)
}

export async function listLibraryCategories(workspaceId) {
  const cats = await EmailTemplate.distinct('category', { workspaceId })
  return cats
    .map((c) => String(c || '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
}

export async function getLibraryTemplate(workspaceId, id) {
  const doc = await EmailTemplate.findOne({ _id: id, workspaceId }).lean()
  return toClient(doc)
}

export async function createLibraryTemplate(workspaceId, input) {
  const name = String(input?.name || '').trim().slice(0, 120)
  const category = String(input?.category || 'General').trim().slice(0, 80) || 'General'
  const subject = String(input?.subject || '').trim().slice(0, 500)
  const body = String(input?.body || '').slice(0, 50000)
  const htmlBody = String(input?.htmlBody || '').slice(0, 100000)
  if (!name) throw Object.assign(new Error('Name is required'), { status: 400 })
  if (!subject) throw Object.assign(new Error('Subject is required'), { status: 400 })
  if (!body.trim()) throw Object.assign(new Error('Body is required'), { status: 400 })

  if (input?.isDefault) {
    await EmailTemplate.updateMany({ workspaceId }, { $set: { isDefault: false } })
  }

  const doc = await EmailTemplate.create({
    workspaceId,
    name,
    category,
    subject,
    body,
    htmlBody,
    isDefault: Boolean(input?.isDefault),
  })
  return toClient(doc.toObject())
}

export async function updateLibraryTemplate(workspaceId, id, input) {
  const doc = await EmailTemplate.findOne({ _id: id, workspaceId })
  if (!doc) throw Object.assign(new Error('Template not found'), { status: 404 })

  if (input?.name != null) doc.name = String(input.name).trim().slice(0, 120)
  if (input?.category != null) {
    doc.category = String(input.category).trim().slice(0, 80) || 'General'
  }
  if (input?.subject != null) doc.subject = String(input.subject).trim().slice(0, 500)
  if (input?.body != null) doc.body = String(input.body).slice(0, 50000)
  if (input?.htmlBody != null) doc.htmlBody = String(input.htmlBody).slice(0, 100000)

  if (input?.isDefault === true) {
    await EmailTemplate.updateMany(
      { workspaceId, _id: { $ne: doc._id } },
      { $set: { isDefault: false } },
    )
    doc.isDefault = true
  } else if (input?.isDefault === false) {
    doc.isDefault = false
  }

  if (!doc.name) throw Object.assign(new Error('Name is required'), { status: 400 })
  if (!doc.subject) throw Object.assign(new Error('Subject is required'), { status: 400 })
  if (!String(doc.body || '').trim()) {
    throw Object.assign(new Error('Body is required'), { status: 400 })
  }

  await doc.save()
  return toClient(doc.toObject())
}

export async function deleteLibraryTemplate(workspaceId, id) {
  const res = await EmailTemplate.deleteOne({ _id: id, workspaceId })
  if (!res.deletedCount) throw Object.assign(new Error('Template not found'), { status: 404 })
  return true
}

/** Seed starter templates once when the library is empty. */
export async function seedLibraryIfEmpty(workspaceId) {
  const count = await EmailTemplate.countDocuments({ workspaceId })
  if (count > 0) {
    return { seeded: false, templates: await listLibraryTemplates(workspaceId) }
  }
  const created = []
  for (let i = 0; i < STARTER.length; i++) {
    const row = STARTER[i]
    const doc = await EmailTemplate.create({
      workspaceId,
      ...row,
      htmlBody: '',
      isDefault: i === 0,
    })
    created.push(toClient(doc.toObject()))
  }
  return { seeded: true, templates: created }
}
