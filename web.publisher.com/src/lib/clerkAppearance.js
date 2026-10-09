/** Dark theme for Clerk UI — neutral zinc shell. */
export const clerkAppearance = {
  variables: {
    colorPrimary: '#fafafa',
    colorBackground: '#0c0c0e',
    colorText: '#fafafa',
    colorTextSecondary: '#a1a1aa',
    colorInputBackground: 'rgba(255,255,255,0.03)',
    colorInputText: '#fafafa',
    colorNeutral: '#a1a1aa',
    borderRadius: '0.5rem',
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none',
    card: 'bg-transparent shadow-none border-0 p-0',
    headerTitle: 'text-white font-semibold',
    headerSubtitle: 'text-zinc-400',
    socialButtonsBlockButton:
      'border border-white/10 bg-transparent text-zinc-200 hover:bg-white/[0.04]',
    dividerLine: 'bg-white/10',
    dividerText: 'text-zinc-500',
    formFieldLabel: 'text-zinc-300',
    formFieldInput:
      'bg-white/[0.03] border border-white/10 text-white placeholder:text-zinc-600 focus:border-white/20 focus:ring-white/10',
    formButtonPrimary:
      'bg-zinc-100 hover:bg-white text-zinc-950 normal-case shadow-none',
    footerActionLink: 'text-zinc-300 hover:text-white',
    footer: 'hidden',
    identityPreviewEditButton: 'text-zinc-300',
    organizationSwitcherTrigger:
      'text-zinc-200 border border-white/10 bg-transparent hover:bg-white/[0.04]',
    userButtonPopoverCard: 'bg-[#111113] border border-white/10',
    userButtonPopoverActionButton: 'text-zinc-200 hover:bg-white/5',
  },
}
