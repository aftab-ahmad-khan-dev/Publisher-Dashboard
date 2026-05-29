/** Dark theme for Clerk's hosted UI components, tuned to the Publisher Suite palette. */
export const clerkAppearance = {
  variables: {
    colorPrimary: '#a855f7',
    colorBackground: '#0b0d16',
    colorText: '#e8edf5',
    colorTextSecondary: '#94a3b8',
    colorInputBackground: 'rgba(255,255,255,0.04)',
    colorInputText: '#e8edf5',
    colorNeutral: '#94a3b8',
    borderRadius: '0.85rem',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none',
    card: 'bg-transparent shadow-none border-0 p-0',
    headerTitle: 'text-white',
    headerSubtitle: 'text-slate-400',
    socialButtonsBlockButton:
      'border border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]',
    dividerLine: 'bg-white/10',
    dividerText: 'text-slate-500',
    formFieldLabel: 'text-slate-300',
    formFieldInput:
      'bg-white/[0.04] border border-white/10 text-white placeholder:text-slate-600',
    formButtonPrimary:
      'bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:opacity-90 text-white normal-case',
    footerActionLink: 'text-violet-400 hover:text-violet-300',
    footer: 'hidden',
    identityPreviewEditButton: 'text-violet-400',
    organizationSwitcherTrigger:
      'text-slate-200 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
    userButtonPopoverCard: 'bg-[#0b0d16] border border-white/10',
    userButtonPopoverActionButton: 'text-slate-200 hover:bg-white/5',
  },
}
