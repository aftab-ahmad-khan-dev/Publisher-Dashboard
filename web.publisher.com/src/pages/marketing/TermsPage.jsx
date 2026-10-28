import DocPage from '../../components/marketing/DocPage'

export default function TermsPage() {
  return (
    <DocPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="By using Publisher Suite you agree to these terms. (Demo copy, replace with your reviewed terms before launch.)"
      sections={[
        { h: 'Using the service', p: 'You may use Publisher Suite to compose, schedule, and publish content to platforms you are authorized to post to. You are responsible for the content you publish and for complying with each platform’s rules.' },
        { h: 'Acceptable use', p: 'Do not use the service for spam, harassment, or any activity that violates the terms of connected platforms such as Reddit. Community-content checks are provided as guidance, not a guarantee.' },
        { h: 'Accounts & workspaces', p: 'You are responsible for activity within your workspace and for keeping your account credentials secure.' },
        { h: 'Availability', p: 'The service is provided “as is.” We work to keep scheduling and publishing reliable but do not guarantee uninterrupted availability.' },
      ]}
    />
  )
}
