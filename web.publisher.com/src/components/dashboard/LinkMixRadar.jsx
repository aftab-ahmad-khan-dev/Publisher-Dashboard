import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

export default function LinkMixRadar({ links = {} }) {
  const peak = Math.max(links.calendar || 0, links.portfolio || 0, links.other || 0, 1)
  const data = [
    { subject: 'Calendar', value: links.calendar || 0, fullMark: peak },
    { subject: 'Portfolio', value: links.portfolio || 0, fullMark: peak },
    { subject: 'Other', value: links.other || 0, fullMark: peak },
  ]

  const empty = !links.total

  return (
    <section className="saas-content-card">
      <h3 className="saas-section-title">Clicks by destination</h3>
      <p className="saas-section-desc mb-2">Where curiosity is going</p>
      {empty ? (
        <div className="flex h-[200px] items-center justify-center">
          <p className="text-center text-xs text-slate-500">
            Link clicks will appear here once leads start exploring.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={data} cx="50%" cy="52%" outerRadius="72%">
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: '#0c101a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Radar
              name="Clicks"
              dataKey="value"
              stroke="#5eead4"
              fill="#14b8a6"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
