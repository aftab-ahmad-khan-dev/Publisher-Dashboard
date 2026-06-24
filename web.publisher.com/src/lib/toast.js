import { toast } from 'sonner'

/** @param {'success' | 'error' | 'warning'} type */
export function showToast(message, type = 'success') {
  if (!message) return
  if (type === 'error') toast.error(message)
  else if (type === 'warning') toast.warning(message)
  else toast.success(message)
}
