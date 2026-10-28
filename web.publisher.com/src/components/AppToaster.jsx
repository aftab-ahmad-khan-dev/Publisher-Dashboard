import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'

/**
 * Desktop: bottom-right toast.
 * Mobile / PWA: top banner (safe-area), swipe up or aside to dismiss.
 */
export default function AppToaster() {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return (
    <Toaster
      theme="dark"
      position={mobile ? 'top-center' : 'bottom-right'}
      richColors
      closeButton={!mobile}
      duration={mobile ? 5200 : 4500}
      visibleToasts={mobile ? 3 : 5}
      offset={mobile ? 'max(12px, env(safe-area-inset-top))' : 16}
      mobileOffset={16}
      toastOptions={{
        classNames: {
          toast: mobile
            ? 'mobile-toast-banner group !w-[calc(100vw-1.5rem)] !max-w-none !rounded-2xl !border !border-white/12 !bg-[#141824]/96 !text-slate-100 !shadow-[0_12px_40px_-8px_rgba(0,0,0,0.65)] !backdrop-blur-xl !px-4 !py-3.5'
            : 'group !rounded-2xl !border !border-white/10 !bg-[#12151f]/95 !text-slate-100 !shadow-2xl !backdrop-blur-xl',
          title: mobile ? '!text-[13px] !font-semibold !leading-snug' : '!text-sm !font-medium',
          description: '!text-slate-400',
          closeButton: '!border-white/10 !bg-white/5 !text-slate-400 hover:!text-white',
        },
      }}
    />
  )
}
