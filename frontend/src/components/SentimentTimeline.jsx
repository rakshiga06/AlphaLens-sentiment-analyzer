import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  const val = payload[0].value
  const color = val > 0.05 ? 'var(--accent-positive)' : val < -0.05 ? 'var(--accent-negative)' : 'var(--accent-neutral)'

  return (
    <div className="custom-tooltip">
      <div className="label">Sentence #{label + 1}</div>
      <div className="value" style={{ color }}>
        {val.toFixed(4)}
      </div>
      {payload[0].payload.speaker && (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginTop: 2 }}>
          {payload[0].payload.speaker}
        </div>
      )}
    </div>
  )
}

export default function SentimentTimeline({ sentences }) {
  if (!sentences || sentences.length === 0) {
    return (
      <div className="card animate-in">
        <div className="card-header">
          <span className="card-title">Sentiment Timeline</span>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📉</div>
          <div className="empty-state-title">No Data</div>
          <div className="empty-state-desc">Run the pipeline to see sentence-level sentiment.</div>
        </div>
      </div>
    )
  }

  const data = sentences.map((s, i) => ({
    index: i,
    score: s.sentiment_score,
    speaker: s.speaker,
    sentence: s.sentence?.slice(0, 80),
  }))

  return (
    <div className="card animate-in" style={{ marginBottom: 24 }}>
      <div className="card-header">
        <span className="card-title">Sentiment Timeline</span>
        <span className="card-badge neutral">{sentences.length} sentences</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sentGradientPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-positive)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent-positive)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="sentGradientNeg" x1="0" y1="1" x2="0" y2="0">
              <stop offset="5%" stopColor="var(--accent-negative)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent-negative)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="index"
            tick={{ fontSize: 10 }}
            tickFormatter={v => `#${v + 1}`}
          />
          <YAxis
            domain={[-1, 1]}
            tick={{ fontSize: 10 }}
            tickFormatter={v => v.toFixed(1)}
          />
          <ReferenceLine y={0} stroke="var(--glass-border)" strokeDasharray="4 4" />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--accent-primary)"
            strokeWidth={2}
            fill="url(#sentGradientPos)"
            dot={false}
            activeDot={{
              r: 5,
              strokeWidth: 2,
              stroke: 'var(--accent-primary)',
              fill: 'var(--bg-secondary)',
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
