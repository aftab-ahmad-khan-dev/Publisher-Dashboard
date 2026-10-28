import DocPage from '../../components/marketing/DocPage'

export default function PrivacyPage() {
  return (
    <DocPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="Your data belongs to you. This summary explains what we store and how it's protected. (Demo copy, replace with your reviewed policy before launch.)"
      sections={[
        { h: 'What we store', p: 'Account details handled by our authentication provider (Clerk), your workspace content (drafts, scheduled and published posts), and the platform tokens you connect, all scoped to your workspace.' },
        { h: 'How credentials are protected', p: 'Platform access tokens are stored against your workspace in the database and are never exposed to other tenants. Authentication and passwords are managed by Clerk, not stored by us.' },
        { h: 'Third-party platforms', p: 'When you connect LinkedIn, Meta, Reddit, or Gmail, your use of those services is also governed by their respective privacy policies.' },
        { h: 'Data deletion', p: 'You can disconnect any platform or delete your workspace content at any time. Contact us to request full account deletion.' },
      ]}
    />
  )
}
