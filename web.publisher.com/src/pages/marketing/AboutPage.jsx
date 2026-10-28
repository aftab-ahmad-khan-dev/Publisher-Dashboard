import DocPage from '../../components/marketing/DocPage'

export default function AboutPage() {
  return (
    <DocPage
      eyebrow="About"
      title="One workspace for everywhere you publish."
      intro="Publisher Suite started from a simple frustration: posting the same idea to LinkedIn, Facebook, Instagram, Reddit, and email meant five tools, five logins, and five formats. We built one composer that speaks every network's language."
      sections={[
        { h: 'Our mission', p: 'Give creators and teams back the hours lost to copy-pasting and tab-switching, so they can focus on the message, not the mechanics of distribution.' },
        { h: 'How it works', p: 'Compose once and preview natively for each platform, schedule or auto-publish, and run email campaigns, all from a single, tenant-isolated workspace built for teams.' },
        { h: 'Who it’s for', p: 'Solo creators, marketing teams, and agencies managing multiple brands. Every workspace keeps its connections, drafts, and history completely separate.' },
      ]}
    />
  )
}
