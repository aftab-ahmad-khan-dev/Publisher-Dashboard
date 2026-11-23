/** Maroon / daylight theme for Clerk UI. */
export const clerkAppearance = {
  variables: {
    colorPrimary: '#6D0808',
    colorBackground: '#FFFFFF',
    colorText: '#1A1A1A',
    colorTextSecondary: '#5C5650',
    colorInputBackground: '#F4F3F0',
    colorInputText: '#1A1A1A',
    colorNeutral: '#5C5650',
    borderRadius: '0.25rem',
    fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none',
    card: 'bg-transparent shadow-none border-0 p-0',
    headerTitle: 'text-[#1A1A1A] font-semibold',
    headerSubtitle: 'text-[#5C5650]',
    socialButtonsBlockButton:
      'border border-[#6B7268]/35 bg-white text-[#1A1A1A] hover:bg-[#F4F3F0]',
    dividerLine: 'bg-[#6B7268]/30',
    dividerText: 'text-[#5C5650]',
    formFieldLabel: 'text-[#2E2A28]',
    formFieldInput:
      'bg-[#F4F3F0] border border-[#6B7268]/35 text-[#1A1A1A] placeholder:text-[#5C5650] focus:border-[#6D0808] focus:ring-[#6D0808]/15',
    formButtonPrimary:
      'bg-[#6D0808] hover:bg-[#520606] text-white normal-case shadow-sm',
    footerActionLink: 'text-[#6D0808] hover:text-[#1A1A1A]',
    footer: 'hidden',
    identityPreviewEditButton: 'text-[#5C5650]',
    userButtonBox: 'flex items-center',
    userButtonTrigger:
      'rounded-full focus:shadow-none focus:ring-2 focus:ring-[#6D0808]/25',
    userButtonAvatarBox:
      'h-8 w-8 rounded-full ring-1 ring-[#6B7268]/40 overflow-hidden bg-[#F4F3F0]',
    userButtonAvatarImage: 'h-full w-full object-cover',
    avatarBox: 'h-8 w-8 rounded-full overflow-hidden',
    avatarImage: 'h-full w-full object-cover',
    userButtonPopoverCard: 'bg-white border border-[#6B7268]/30 shadow-lg',
    userButtonPopoverActionButton: 'text-[#1A1A1A] hover:bg-[#F4F3F0]',
    userButtonPopoverActionButtonText: 'text-[#1A1A1A]',
    userButtonPopoverFooter: 'hidden',
  },
}
