import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Scrolls to the hash target when present (e.g. /#features from another page),
 *  otherwise resets to the top on route change. */
export default function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      // Wait a tick so the target section is mounted after navigation
      const id = setTimeout(() => {
        const el = document.querySelector(hash)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
      return () => clearTimeout(id)
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname, hash])

  return null
}
