import { Toaster } from 'sonner'

export default function AppToaster() {
  return (
    <Toaster
      theme="dark"
      position="bottom-right"
      richColors
      closeButton
      duration={4500}
      toastOptions={{
        classNames: {
          toast:
            'group !rounded-2xl !border !border-white/10 !bg-[#12151f]/95 !text-slate-100 !shadow-2xl !backdrop-blur-xl',
          title: '!text-sm !font-medium',
          description: '!text-slate-400',
          closeButton: '!border-white/10 !bg-white/5 !text-slate-400 hover:!text-white',
        },
      }}
    />
  )
}
