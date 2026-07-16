import { useState } from 'react'
import Modal from './Modal'

/**
 * Confirmation modal for destructive or important actions. `onConfirm` may be
 * async; the confirm button shows a busy state until it resolves.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
}) {
  const [busy, setBusy] = useState(false)

  const handleConfirm = async () => {
    setBusy(true)
    try {
      await onConfirm?.()
      onClose?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={title}
      maxWidth="max-w-md"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={
              destructive
                ? 'btn-danger px-5 py-2.5 disabled:pointer-events-none disabled:opacity-60'
                : 'btn-primary px-5 py-2.5'
            }
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      {message && <p className="text-sm leading-relaxed text-slate-300">{message}</p>}
    </Modal>
  )
}
