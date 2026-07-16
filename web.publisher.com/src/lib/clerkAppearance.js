/** Dark theme for Clerk UI — matched to Publisher Suite (DM Sans + indigo). */
export const clerkAppearance = {
  variables: {
    colorPrimary: '#6366f1',
    colorBackground: '#0b0e16',
    colorText: '#f1f5f9',
    colorTextSecondary: '#94a3b8',
    colorInputBackground: 'rgba(255,255,255,0.04)',
    colorInputText: '#f1f5f9',
    colorNeutral: '#94a3b8',
    borderRadius: '0.75rem',
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none',
    card: 'bg-transparent shadow-none border-0 p-0',
    headerTitle: 'text-white font-semibold',
    headerSubtitle: 'text-slate-400',
    socialButtonsBlockButton:
      'border border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]',
    dividerLine: 'bg-white/10',
    dividerText: 'text-slate-500',
    formFieldLabel: 'text-slate-300',
    formFieldInput:
      'bg-white/[0.04] border border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-400/50 focus:ring-indigo-500/20',
    formButtonPrimary:
      'bg-indigo-500 hover:bg-indigo-400 text-white normal-case shadow-lg shadow-indigo-500/20',
    footerActionLink: 'text-indigo-300 hover:text-indigo-200',
    footer: 'hidden',
    identityPreviewEditButton: 'text-indigo-300',
    organizationSwitcherTrigger:
      'text-slate-200 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
    userButtonPopoverCard: 'bg-[#0b0e16] border border-white/10',
    userButtonPopoverActionButton: 'text-slate-200 hover:bg-white/5',
  },
}
