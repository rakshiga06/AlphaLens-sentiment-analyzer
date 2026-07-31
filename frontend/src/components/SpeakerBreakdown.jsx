import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload
  const color = d.avg > 0.05 ? 'var(--accent-positive)' : d.avg < -0.05 ? 'var(--accent-negative)' : 'var(--accent-neutral)'

  return (
    <div className="custom-tooltip">
      <div className="label">{d.speaker}</div>
      <div className="value" style={{ color }}>{d.avg.toFixed(4)}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginTop: 2 }}>
        {d.count} sentences
      </div>
    </div>
  )
}

export default function SpeakerBreakdown({ sentences }) {
  if (!sentences || sentences.length === 0) {
    return (
      <div className="card animate-in">
        <div className="card-header">
          <span className="card-title">Speaker Breakdown</span>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <div className="empty-state-title">No Speakers</div>
          <div className="empty-state-desc">No transcript data available.</div>
        </div>
      </div>
    )
  }

  // Group by speaker
  const speakerMap = {}
  sentences.forEach(s => {
    if (!speakerMap[s.speaker]) {
      speakerMap[s.speaker] = { total: 0, count: 0 }
    }
    speakerMap[s.speaker].total += s.sentiment_score
    speakerMap[s.speaker].count += 1
  })

  const data = Object.entries(speakerMap)
    .map(([speaker, val]) => ({
      speaker: speaker.length > 18 ? speaker.slice(0, 16) + '…' : speaker,
      avg: val.total / val.count,
      count: val.count,
    }))
    .sort((a, b) => b.avg - a.avg)

  const getColor = (val) => val > 0.05 ? 'var(--accent-positive)' : val < -0.05 ? 'var(--accent-negative)' : 'var(--accent-neutral)'

  return (
    <div className="card animate-in">
      <div className="card-header">
        <span className="card-title">Speaker Breakdown</span>
        <span className="card-badge neutral">{data.length} speakers</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[-0.5, 0.5]}
            tick={{ fontSize: 10 }}
            tickFormatter={v => v.toFixed(1)}
          />
          <YAxis
            type="category"
            dataKey="speaker"
            width={120}
            tick={{ fontSize: 11 }}
          />
          <ReferenceLine x={0} stroke="var(--glass-border)" strokeDasharray="4 4" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-surface)' }} />
          <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getColor(entry.avg)} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
