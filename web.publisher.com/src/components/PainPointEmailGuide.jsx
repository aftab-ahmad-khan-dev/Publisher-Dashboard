import { analyzePainFocusedEmail } from '../lib/emailParse'

export default function PainPointEmailGuide({ subject, body }) {
  const analysis = analyzePainFocusedEmail(subject, body)

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-3 ring-1 ring-violet-500/10">
      <p className="text-xs font-semibold text-violet-200">Pain-first outreach (not a pitch about you)</p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
        Write one template. Each recipient gets their <strong className="font-medium text-slate-300">name</strong>,{' '}
        <strong className="font-medium text-slate-300">company</strong>, and{' '}
        <strong className="font-medium text-slate-300">niche</strong> merged in. Lead with a problem they
        likely feel in their business — not what you sell.
      </p>
      <ul className="mt-2 list-inside list-disc space-y-0.5 text-[11px] text-slate-500">
        <li>Name the pain in their world (slow leads, manual ops, churn…)</li>
        <li>Use their niche: “{'{{niche}}'} teams often…”</li>
        <li>Offer insight or a question, save your offer for a reply</li>
        <li>
          Vary copy per person with spintax:{' '}
          <code className="text-violet-300/90">{'{option A|option B}'}</code> (paragraphs shuffle too)
        </li>
      </ul>
      {analysis.issues.length > 0 && (
        <ul className="mt-2 space-y-1">
          {analysis.issues.map((issue, i) => (
            <li
              key={i}
              className={`text-[11px] ${
                issue.severity === 'error'
                  ? 'text-rose-400/95'
                  : issue.severity === 'warn'
                    ? 'text-amber-400/95'
                    : 'text-slate-500'
              }`}
            >
              {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
