import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listEmailLibrary,
  createEmailLibraryTemplate,
  updateEmailLibraryTemplate,
  deleteEmailLibraryTemplate,
  seedEmailLibrary,
} from '../../lib/backendApi'
import ConfirmDialog from '../ConfirmDialog'

const EMPTY_FORM = {
  id: null,
  name: '',
  category: 'Direct',
  subject: '',
  body: '',
  isDefault: false,
}

const SUGGESTED_CATEGORIES = ['Direct', 'CEO/CTO', 'Founder', 'Product', 'General']

export default function TemplateLibraryPanel({ live, showToast, onLibraryChange }) {
  const [templates, setTemplates] = useState([])
  const [categories, setCategories] = useState([])
  const [filterCategory, setFilterCategory] = useState('all')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [customCategory, setCustomCategory] = useState('')

  const load = useCallback(async () => {
    if (!live) return
    setLoading(true)
    try {
      const res = await listEmailLibrary({
        category: filterCategory !== 'all' ? filterCategory : undefined,
      })
      setTemplates(res.templates || [])
      setCategories(res.categories || [])
      onLibraryChange?.(res)
    } catch (err) {
      showToast?.(err.message || 'Failed to load templates', 'error')
    } finally {
      setLoading(false)
    }
  }, [live, filterCategory, showToast, onLibraryChange])

  useEffect(() => {
    load()
  }, [load])

  const categoryOptions = useMemo(() => {
    const set = new Set([...SUGGESTED_CATEGORIES, ...categories])
    if (form.category) set.add(form.category)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [categories, form.category])

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, category: filterCategory !== 'all' ? filterCategory : 'Direct' })
    setCustomCategory('')
    setEditing(true)
  }

  const openEdit = (t) => {
    setForm({
      id: t.id,
      name: t.name || '',
      category: t.category || 'General',
      subject: t.subject || '',
      body: t.body || t.textBody || '',
      isDefault: Boolean(t.isDefault),
    })
    setCustomCategory('')
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setForm(EMPTY_FORM)
    setCustomCategory('')
  }

  const save = async () => {
    const category = (customCategory.trim() || form.category || 'General').trim()
    const payload = {
      name: form.name.trim(),
      category,
      subject: form.subject.trim(),
      body: form.body,
      isDefault: form.isDefault,
    }
    if (!payload.name || !payload.subject || !payload.body.trim()) {
      showToast?.('Name, subject, and body are required', 'error')
      return
    }
    setSaving(true)
    try {
      if (form.id) {
        await updateEmailLibraryTemplate(form.id, payload)
        showToast?.('Template updated', 'success')
      } else {
        await createEmailLibraryTemplate(payload)
        showToast?.('Template created', 'success')
      }
      cancelEdit()
      await load()
    } catch (err) {
      showToast?.(err.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await deleteEmailLibraryTemplate(deleteId)
      showToast?.('Template deleted', 'success')
      setDeleteId(null)
      if (form.id === deleteId) cancelEdit()
      await load()
    } catch (err) {
      showToast?.(err.message || 'Delete failed', 'error')
    }
  }

  const seed = async () => {
    try {
      const res = await seedEmailLibrary()
      showToast?.(
        res.seeded ? 'Starter templates added' : 'Library already has templates',
        res.seeded ? 'success' : 'info',
      )
      setFilterCategory('all')
      await load()
    } catch (err) {
      showToast?.(err.message || 'Seed failed', 'error')
    }
  }

  if (!live) {
    return (
      <p className="rounded-md border border-white/[0.08] px-4 py-8 text-center text-sm text-zinc-500">
        Connect the API to manage your email templates.
      </p>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col rounded-md border border-white/[0.08] bg-[var(--bg-panel)] lg:w-72">
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5">
          <p className="text-sm font-medium text-zinc-100">Your templates</p>
          <button type="button" className="btn-primary px-2.5 py-1 text-xs" onClick={openCreate}>
            New
          </button>
        </div>
        <div className="border-b border-white/[0.06] px-3 py-2">
          <select
            className="saas-select w-full py-1.5 text-xs"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="saas-scroll min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="px-2 py-6 text-center text-xs text-zinc-500">Loading…</p>
          ) : templates.length === 0 ? (
            <div className="px-2 py-6 text-center">
              <p className="text-xs text-zinc-500">No templates in this category.</p>
              <button type="button" className="btn-secondary mt-3 px-3 py-1.5 text-xs" onClick={seed}>
                Add starters
              </button>
            </div>
          ) : (
            <ul className="space-y-1">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    className={`w-full rounded-md px-2.5 py-2 text-left transition ${
                      form.id === t.id
                        ? 'bg-white/[0.08] text-white'
                        : 'text-zinc-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <p className="truncate text-xs font-medium">{t.name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-zinc-500">{t.category}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <section className="saas-scroll min-h-0 flex-1 overflow-y-auto rounded-md border border-white/[0.08] bg-[var(--bg-panel)] p-4">
        {!editing ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-zinc-200">Template library</p>
            <p className="mt-1 max-w-sm text-xs text-zinc-500">
              Create categories like CEO/CTO, Direct, or Product. Use them for bulk campaigns and
              single sends.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={openCreate}>
                Create template
              </button>
              <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={seed}>
                Seed starters
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-zinc-100">
                {form.id ? 'Edit template' : 'New template'}
              </h3>
              <button type="button" className="text-xs text-zinc-500 hover:text-white" onClick={cancelEdit}>
                Cancel
              </button>
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-zinc-500">Name</span>
              <input
                className="saas-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. CEO cold outreach"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-zinc-500">Category</span>
                <select
                  className="saas-select w-full"
                  value={categoryOptions.includes(form.category) ? form.category : '__custom__'}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setCustomCategory(form.category || '')
                      return
                    }
                    setCustomCategory('')
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }}
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__custom__">Custom…</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-zinc-500">
                  Custom category
                </span>
                <input
                  className="saas-input"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. CTO / VP Eng"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-zinc-500">Subject</span>
              <input
                className="saas-input"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Supports {{firstName}}, {{company}}, …"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-zinc-500">Body</span>
              <textarea
                className="saas-input min-h-[220px] resize-y font-mono text-[12px] leading-relaxed"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Plain text body with merge tags"
              />
            </label>

            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              />
              Default for this workspace
            </label>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                className="btn-primary px-4 py-2 text-xs"
                disabled={saving}
                onClick={save}
              >
                {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create template'}
              </button>
              {form.id ? (
                <button
                  type="button"
                  className="btn-danger px-3 py-2 text-xs"
                  onClick={() => setDeleteId(form.id)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete template?"
        message="This removes the template from your library. Campaigns already queued keep their copied content."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  )
}
