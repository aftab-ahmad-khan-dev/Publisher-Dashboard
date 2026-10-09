/** Dark theme for Clerk UI — graphite + teal Publisher Suite. */
export const clerkAppearance = {
  variables: {
    colorPrimary: '#14b8a6',
    colorBackground: '#141618',
    colorText: '#f4f4f5',
    colorTextSecondary: '#a1a1aa',
    colorInputBackground: 'rgba(255,255,255,0.04)',
    colorInputText: '#f4f4f5',
    colorNeutral: '#a1a1aa',
    borderRadius: '0.625rem',
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none',
    card: 'bg-transparent shadow-none border-0 p-0',
    headerTitle: 'text-white font-semibold',
    headerSubtitle: 'text-zinc-400',
    socialButtonsBlockButton:
      'border border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]',
    dividerLine: 'bg-white/10',
    dividerText: 'text-zinc-500',
    formFieldLabel: 'text-zinc-300',
    formFieldInput:
      'bg-white/[0.04] border border-white/10 text-white placeholder:text-zinc-600 focus:border-teal-400/50 focus:ring-teal-500/20',
    formButtonPrimary:
      'bg-teal-500 hover:bg-teal-400 text-teal-950 normal-case shadow-none',
    footerActionLink: 'text-teal-300 hover:text-teal-200',
    footer: 'hidden',
    identityPreviewEditButton: 'text-teal-300',
    organizationSwitcherTrigger:
      'text-zinc-200 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
    userButtonPopoverCard: 'bg-[#141618] border border-white/10',
    userButtonPopoverActionButton: 'text-zinc-200 hover:bg-white/5',
  },
}
