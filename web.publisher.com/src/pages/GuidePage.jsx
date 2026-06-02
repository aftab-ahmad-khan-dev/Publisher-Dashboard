import PageHeader from "../components/PageHeader";
import PageShell, { PageScroll } from "../components/PageShell";
import PlatformIcon from "../components/PlatformIcon";

const GUIDES = [
  {
    key: "meta",
    title: "Meta — Facebook & Instagram",
    portal: ["Meta for Developers", "https://developers.facebook.com/apps"],
    fields: ["App ID", "App Secret", "Page Access Token"],
    fieldLinks: {
      "Page Access Token": "https://developers.facebook.com/tools/explorer",
    },
    steps: [
      "Create an app at developers.facebook.com (type: Business).",
      "Add the “Facebook Login” and “Pages” products.",
      "In Graph API Explorer, select your Page and generate a Page Access Token with pages_manage_posts + pages_read_engagement.",
      "Paste App ID, App Secret, and the Page Token into API Config → Meta, then Test & save.",
    ],
    note: "Instagram publishing requires a Business/Creator IG account linked to your Facebook Page.",
  },
  {
    key: "linkedin",
    title: "LinkedIn",
    portal: ["LinkedIn Developers", "https://www.linkedin.com/developers/apps"],
    fields: ["Client ID", "Client Secret", "Org URN (optional)"],
    redirect: "https://publisher-dashboard.vercel.app/api/auth/linkedin/callback",
    steps: [
      "Create an app and associate it with a Company Page.",
      "Request the “Share on LinkedIn” and “Sign In with LinkedIn” products.",
      "Add the redirect URL below under Auth → Authorized redirect URLs.",
      "Paste Client ID + Secret in API Config → LinkedIn, then click “Connect with LinkedIn” to authorize posting.",
    ],
  },
  {
    key: "reddit",
    title: "Reddit",
    portal: ["Reddit Apps", "https://www.reddit.com/prefs/apps"],
    fields: ["Client ID", "Client Secret", "Refresh Token", "Subreddit"],
    redirect: "https://publisher-dashboard.vercel.app/api/auth/reddit/callback",
    steps: [
      "Create a “web app” at reddit.com/prefs/apps.",
      "Set the redirect URI below.",
      "Copy the Client ID (under the app name) and Secret.",
      "In API Config → Reddit, paste them + your subreddit, then click “Connect Reddit” to get a refresh token.",
    ],
    note: "Keep posts informational — Reddit removes promotional/spammy self-posts.",
  },
  {
    key: "pinterest",
    title: "Pinterest",
    portal: ["Pinterest Developers", "https://developers.pinterest.com/apps/"],
    fields: ["Access Token", "Board ID"],
    fieldLinks: { "Board ID": "https://www.pinterest.com/" },
    steps: [
      "Create an app and generate an access token with boards:read, pins:read and pins:write scopes.",
      "Open the board you want to publish to; the Board ID is the long number in its URL.",
      "Paste the token + Board ID in API Config → Pinterest, then Test & save.",
    ],
    note: "Pins require an image — attach one in the composer before publishing.",
  },
  {
    key: "threads",
    title: "Threads",
    portal: ["Meta Threads API", "https://developers.facebook.com/docs/threads"],
    fields: ["Access Token", "Threads User ID"],
    steps: [
      "Create a Meta app and add the “Threads API” use case.",
      "Generate a Threads access token with threads_basic + threads_content_publish.",
      "Paste the token in API Config → Threads and click Test — it reports your Threads user ID.",
      "Save and you’re ready to publish text posts.",
    ],
  },
  {
    key: "gmail",
    title: "Gmail — Email campaigns",
    portal: [
      "Google Cloud Console",
      "https://console.cloud.google.com/apis/credentials",
    ],
    fields: ["OAuth Client ID", "Client Secret"],
    redirect: "https://publisher-dashboard.vercel.app/api/auth/gmail/callback",
    steps: [
      "Create an OAuth 2.0 Client ID (type: Web application).",
      "Add the redirect URL below as an authorized redirect URI.",
      "Enable the Gmail API for the project.",
      "Paste Client ID + Secret in API Config → Gmail, then click “Connect Gmail” to authorize sending.",
    ],
    note: "Open tracking needs the API reachable from the internet — set API_PUBLIC_URL on the server (a deploy URL or an ngrok/cloudflared tunnel). On localhost, opens stay 0.",
  },
];

function GuideCard({ g }) {
  return (
    <section className='surface-panel rounded-xl p-5'>
      <div className='flex items-center gap-3'>
        {g.key === "meta" ? (
          <PlatformIcon platform='facebook' size='lg' shape='squircle' />
        ) : g.key === "gmail" ? (
          <span className='flex h-10 w-10 items-center justify-center rounded-[28%] bg-[#EA4335] text-sm font-bold text-white'>
            M
          </span>
        ) : (
          <PlatformIcon platform={g.key} size='lg' shape='squircle' />
        )}
        <div className='min-w-0'>
          <h3 className='font-display text-base font-bold text-white'>{g.title}</h3>
          <a
            href={g.portal[1]}
            target='_blank'
            rel='noreferrer'
            className='text-xs text-violet-300 hover:text-violet-200'
          >
            {g.portal[0]} ↗
          </a>
        </div>
      </div>

      <div className='mt-3 flex flex-wrap gap-1.5'>
        {g.fields.map((f) => (
          <a
            key={f}
            href={g.fieldLinks?.[f] || g.portal[1]}
            target='_blank'
            rel='noreferrer'
            className='inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium text-violet-200 transition hover:bg-violet-500/20'
            title={`Where to get ${f}`}
          >
            {f}
            <span className='text-violet-400'>↗</span>
          </a>
        ))}
      </div>

      <ol className='mt-4 space-y-2'>
        {g.steps.map((s, i) => (
          <li
            key={i}
            className='flex gap-2.5 text-[13px] leading-relaxed text-slate-400'
          >
            <span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-300'>
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>

      {g.redirect && (
        <div className='mt-3'>
          <p className='text-[10px] font-medium uppercase tracking-wider text-slate-600'>
            Redirect URI
          </p>
          <code className='mt-1 block break-all rounded-lg bg-black/40 px-3 py-2 font-mono text-[11px] text-emerald-300/90'>
            {g.redirect}
          </code>
        </div>
      )}

      {g.note && (
        <p className='mt-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-200/80'>
          {g.note}
        </p>
      )}
    </section>
  );
}

export default function GuidePage() {
  return (
    <PageShell>
      <PageHeader
        title='Setup Guide'
        subtitle='Where to get every credential the API Config page needs — per platform'
      />
      <PageScroll className='space-y-4 pb-4'>
        <div className='rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4 text-sm text-slate-300'>
          Connect each platform once in{" "}
          <a
            href='/api-config'
            className='font-semibold text-violet-300 hover:text-violet-200'
          >
            API Config
          </a>
          . Tokens are stored encrypted against your workspace and never shared
          across tenants. Follow the steps below to obtain each value.
        </div>
        <div className='grid gap-4 lg:grid-cols-2'>
          {GUIDES.map((g) => (
            <GuideCard key={g.key} g={g} />
          ))}
        </div>
      </PageScroll>
    </PageShell>
  );
}
