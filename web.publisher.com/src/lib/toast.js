import { toast } from 'sonner'

/** @param {'success' | 'error'} type */
export function showToast(message, type = 'success') {
  if (!message) return
  if (type === 'error') toast.error(message)
  else toast.success(message)
}
