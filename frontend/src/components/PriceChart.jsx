import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: p.color,
          }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{p.name}:</span>
          <span className="value" style={{ color: p.color, fontSize: '0.82rem' }}>
            {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function PriceChart({ data, ticker }) {
  if (!data || data.length === 0) {
    return (
      <div className="card animate-in">
        <div className="card-header">
          <span className="card-title">Price History</span>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📈</div>
          <div className="empty-state-title">No Price Data</div>
          <div className="empty-state-desc">Run scraper_financials.py to fetch price history.</div>
        </div>
      </div>
    )
  }

  // Format data for chart
  const chartData = data.map(d => {
    const dateStr = d.Date ? d.Date.slice(0, 10) : ''
    return {
      date: dateStr,
      close: parseFloat(d.Close) || 0,
      volume: parseInt(d.Volume) || 0,
      high: parseFloat(d.High) || 0,
      low: parseFloat(d.Low) || 0,
    }
  })

  const minClose = Math.min(...chartData.map(d => d.low)) * 0.98
  const maxClose = Math.max(...chartData.map(d => d.high)) * 1.02

  // Price change
  const firstPrice = chartData[0]?.close || 0
  const lastPrice = chartData[chartData.length - 1]?.close || 0
  const change = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice * 100).toFixed(2) : 0
  const changeColor = change >= 0 ? 'var(--accent-positive)' : 'var(--accent-negative)'

  return (
    <div className="card animate-in" style={{ marginBottom: 24 }}>
      <div className="card-header">
        <div>
          <span className="card-title">Price History — {ticker}</span>
          <div style={{
            marginTop: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}>
            ${lastPrice.toFixed(2)}
            <span style={{
              marginLeft: 10,
              fontSize: '0.82rem',
              color: changeColor,
              fontWeight: 600,
            }}>
              {change >= 0 ? '+' : ''}{change}%
            </span>
          </div>
        </div>
        <span className={`card-badge ${change >= 0 ? 'positive' : 'negative'}`}>
          {chartData.length} days
        </span>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={changeColor} stopOpacity={0.2} />
              <stop offset="95%" stopColor={changeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9 }}
            tickFormatter={v => v.slice(5)}
            interval={Math.floor(chartData.length / 8)}
          />
          <YAxis
            domain={[minClose, maxClose]}
            tick={{ fontSize: 10 }}
            tickFormatter={v => `$${v.toFixed(0)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="close"
            stroke="transparent"
            fill="url(#priceGradient)"
          />
          <Line
            type="monotone"
            dataKey="close"
            stroke={changeColor}
            strokeWidth={2}
            dot={false}
            name="Close"
            activeDot={{
              r: 5,
              strokeWidth: 2,
              stroke: changeColor,
              fill: 'var(--bg-secondary)',
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
