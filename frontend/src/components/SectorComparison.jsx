import { useState, useEffect } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
} from 'recharts'
import { BarChart3, TrendingUp, Award, Activity, Search } from 'lucide-react'

const CustomScatterTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload
  return (
    <div className="custom-tooltip">
      <div className="label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
        {data.ticker} ({data.call_date})
      </div>
      <div style={{ marginTop: 4, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
        <div>Sentiment: <span style={{ color: 'var(--accent-neutral)', fontWeight: 600 }}>{data.overall_sentiment.toFixed(4)}</span></div>
        <div>Surprise: <span style={{ color: data.earnings_surprise_pct >= 0 ? 'var(--accent-positive)' : 'var(--accent-negative)', fontWeight: 600 }}>{data.earnings_surprise_pct.toFixed(2)}%</span></div>
        <div>Abnormal Return: <span style={{ color: data.abnormal_return_pct >= 0 ? 'var(--accent-positive)' : 'var(--accent-negative)', fontWeight: 600 }}>{data.abnormal_return_pct.toFixed(2)}%</span></div>
        <div>Next-Day Return: <span style={{ color: data.next_day_return_pct >= 0 ? 'var(--accent-positive)' : 'var(--accent-negative)', fontWeight: 600 }}>{data.next_day_return_pct.toFixed(2)}%</span></div>
        <div>Momentum (10d): <span style={{ fontWeight: 600 }}>{data.pre_earnings_momentum_pct.toFixed(2)}%</span></div>
        <div>Volume Spike: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{data.volume_spike.toFixed(2)}x</span></div>
      </div>
    </div>
  )
}

export default function SectorComparison() {
  const [sectors, setSectors] = useState({})
  const [selectedSector, setSelectedSector] = useState('Technology')
  const [sectorData, setSectorData] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function fetchSectors() {
      try {
        const res = await fetch('/api/tickers')
        const data = await res.json()
        setSectors(data)
        if (Object.keys(data).length > 0) {
          const firstSector = Object.keys(data)[0]
          setSelectedSector(firstSector)
        }
      } catch (err) {
        console.error('Failed to load sectors:', err)
      }
    }
    fetchSectors()
  }, [])

  useEffect(() => {
    async function fetchSectorData() {
      if (!selectedSector) return
      setLoading(true)
      try {
        const res = await fetch(`/api/sector-comparison?sector=${selectedSector}`)
        const data = await res.json()
        setSectorData(data)
      } catch (err) {
        console.error('Failed to load sector data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSectorData()
  }, [selectedSector])

  // Filter out latest calls for each ticker for the Bar comparison
  const getLatestCalls = () => {
    const latest = {}
    sectorData.forEach(item => {
      if (!latest[item.ticker] || new Date(item.call_date) > new Date(latest[item.ticker].call_date)) {
        latest[item.ticker] = item
      }
    })
    return Object.values(latest)
  }

  const latestCalls = getLatestCalls()

  // Calculate sector metrics
  const avgSentiment = latestCalls.length > 0
    ? latestCalls.reduce((sum, item) => sum + item.overall_sentiment, 0) / latestCalls.length
    : 0

  const sentiments = latestCalls.map(item => item.overall_sentiment)
  const maxSentiment = sentiments.length > 0 ? Math.max(...sentiments) : 0
  const minSentiment = sentiments.length > 0 ? Math.min(...sentiments) : 0
  const sentimentDispersion = latestCalls.length > 0 ? (maxSentiment - minSentiment) : 0

  const mostBullish = latestCalls.reduce((max, item) => (item.overall_sentiment > (max?.overall_sentiment || -99) ? item : max), null)
  const mostBearish = latestCalls.reduce((min, item) => (item.overall_sentiment < (min?.overall_sentiment || 99) ? item : min), null)

  const filteredTableData = sectorData.filter(item =>
    item.ticker.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.call_date) - new Date(a.call_date))

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 40 }}>
      {/* Top Controller */}
      <div className="card" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 className="accent-neutral" /> Multi-Company Sector Comparison
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Compare sentiment trends, EPS surprises, abnormal returns, and macro momentum.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {Object.keys(sectors).map(sec => (
            <button
              key={sec}
              onClick={() => setSelectedSector(sec)}
              className={`button ${selectedSector === sec ? 'primary' : 'secondary'}`}
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: selectedSector === sec ? 'var(--accent-neutral)' : 'var(--bg-surface)',
                color: 'white',
                border: '1px solid var(--glass-border)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card skeleton skeleton-stat" style={{ height: 100 }} />
          ))}
        </div>
      ) : (
        <>
          {/* Sector Overview Stats */}
          <div className="stats-grid">
            <div className="card stat-card animate-in">
              <div className="stat-card-label">
                <Activity size={14} className="accent-neutral" />
                Sector Avg Sentiment
              </div>
              <div className={`stat-card-value ${avgSentiment > 0.05 ? 'positive' : avgSentiment < -0.05 ? 'negative' : 'neutral'}`}>
                {avgSentiment.toFixed(4)}
              </div>
              <div className="stat-card-change">Macro Industry Baseline</div>
            </div>

            <div className="card stat-card animate-in">
              <div className="stat-card-label">
                <Award size={14} className="positive" />
                Most Bullish peer
              </div>
              <div className="stat-card-value positive" style={{ fontSize: '1.4rem' }}>
                {mostBullish ? `${mostBullish.ticker}` : 'N/A'}
              </div>
              <div className="stat-card-change">
                {mostBullish ? `Score: ${mostBullish.overall_sentiment.toFixed(3)}` : ''}
              </div>
            </div>

            <div className="card stat-card animate-in">
              <div className="stat-card-label">
                <Award size={14} className="negative" />
                Most Bearish peer
              </div>
              <div className="stat-card-value negative" style={{ fontSize: '1.4rem' }}>
                {mostBearish ? `${mostBearish.ticker}` : 'N/A'}
              </div>
              <div className="stat-card-change">
                {mostBearish ? `Score: ${mostBearish.overall_sentiment.toFixed(3)}` : ''}
              </div>
            </div>

            <div className="card stat-card animate-in">
              <div className="stat-card-label">
                <TrendingUp size={14} className="neutral" />
                Sentiment Dispersion
              </div>
              <div className="stat-card-value neutral">
                {sentimentDispersion.toFixed(3)}
              </div>
              <div className="stat-card-change">Range of sentiment scores</div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))' }}>
            {/* Sentiment vs Abnormal Return Scatter */}
            <div className="card animate-in" style={{ padding: 24 }}>
              <span className="card-title">Sentiment vs. Abnormal Returns</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Dispersion showing stock outperformance (abnormal returns) against executive call sentiment.
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={true} />
                  <XAxis
                    type="number"
                    dataKey="overall_sentiment"
                    name="Sentiment Score"
                    domain={[-0.8, 0.8]}
                    tickFormatter={v => v.toFixed(1)}
                    label={{ value: 'Sentiment Score', position: 'insideBottom', offset: -5, fontSize: 10, fill: 'var(--text-secondary)' }}
                    tick={{ fontSize: 9 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="abnormal_return_pct"
                    name="Abnormal Return"
                    tickFormatter={v => `${v}%`}
                    label={{ value: 'Abnormal Return (%)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--text-secondary)' }}
                    tick={{ fontSize: 9 }}
                  />
                  <Tooltip content={<CustomScatterTooltip />} />
                  <Scatter name="Earnings Events" data={sectorData} fill="var(--accent-neutral)">
                    {sectorData.map((entry, index) => {
                      const color = entry.abnormal_return_pct >= 0 ? 'var(--accent-positive)' : 'var(--accent-negative)'
                      return <Cell key={`cell-${index}`} fill={color} opacity={0.7} r={6} />
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Peer Sentiment Comparison Bar Chart */}
            <div className="card animate-in" style={{ padding: 24 }}>
              <span className="card-title">Latest Earnings Call Sentiment by Ticker</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Compares the latest earnings call sentiment scores side-by-side across industry peers.
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={latestCalls} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="ticker" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={v => v.toFixed(1)} tick={{ fontSize: 10 }} domain={[-0.6, 0.6]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--glass-border)', borderRadius: 'var(--radius-sm)' }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                  />
                  <Bar dataKey="overall_sentiment" fill="var(--accent-neutral)" radius={[4, 4, 0, 0]}>
                    {latestCalls.map((entry, index) => {
                      const color = entry.overall_sentiment >= 0.05
                        ? 'var(--accent-positive)'
                        : entry.overall_sentiment <= -0.05
                          ? 'var(--accent-negative)'
                          : 'var(--accent-neutral)'
                      return <Cell key={`cell-${index}`} fill={color} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Peer Matrix Table */}
          <div className="card animate-in" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px 24px 16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span className="card-title">Cross-Company Peer Sentiment Matrix</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Historical record of earnings sentiment, EPS surprise, volume, and abnormal return reaction.
                </p>
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Search peers..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px 12px 6px 30px',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    width: 180,
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', backgroundColor: 'var(--bg-surface)' }}>
                    <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-secondary)' }}>Ticker</th>
                    <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-secondary)' }}>Call Date</th>
                    <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Sentiment</th>
                    <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Tone Gap (Q&A)</th>
                    <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Earnings Surprise</th>
                    <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Volume Spike</th>
                    <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Momentum</th>
                    <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Guidance</th>
                    <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Abnormal Return</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableData.map((row, i) => {
                    const sentClass = row.overall_sentiment > 0.05 ? 'positive' : row.overall_sentiment < -0.05 ? 'negative' : 'neutral'
                    const guideLabel = row.guidance_flag === 1 ? 'Raising' : row.guidance_flag === -1 ? 'Lowering' : 'Neutral'
                    const guideClass = row.guidance_flag === 1 ? 'positive' : row.guidance_flag === -1 ? 'negative' : 'neutral'
                    
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }} className="table-row-hover">
                        <td style={{ padding: '12px 24px', fontWeight: 700 }}>{row.ticker}</td>
                        <td style={{ padding: '12px 24px', color: 'var(--text-secondary)' }}>{row.call_date}</td>
                        <td style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }} className={sentClass}>
                          {row.overall_sentiment.toFixed(4)}
                        </td>
                        <td style={{ padding: '12px 24px', textAlign: 'right', color: row.tone_gap >= 0 ? 'var(--accent-positive)' : 'var(--accent-negative)' }}>
                          {row.tone_gap >= 0 ? '+' : ''}{row.tone_gap.toFixed(3)}
                        </td>
                        <td style={{ padding: '12px 24px', textAlign: 'right', color: row.earnings_surprise_pct >= 0 ? 'var(--accent-positive)' : 'var(--accent-negative)' }}>
                          {row.earnings_surprise_pct >= 0 ? '+' : ''}{row.earnings_surprise_pct.toFixed(2)}%
                        </td>
                        <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                          {row.volume_spike.toFixed(2)}x
                        </td>
                        <td style={{ padding: '12px 24px', textAlign: 'right', color: row.pre_earnings_momentum_pct >= 0 ? 'var(--accent-positive)' : 'var(--accent-negative)' }}>
                          {row.pre_earnings_momentum_pct >= 0 ? '+' : ''}{row.pre_earnings_momentum_pct.toFixed(2)}%
                        </td>
                        <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '20px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            backgroundColor: row.guidance_flag === 1 ? 'var(--accent-positive-dim)' : row.guidance_flag === -1 ? 'var(--accent-negative-dim)' : 'var(--accent-neutral-dim)',
                            color: row.guidance_flag === 1 ? 'var(--accent-positive)' : row.guidance_flag === -1 ? 'var(--accent-negative)' : 'var(--accent-neutral)'
                          }}>
                            {guideLabel}
                          </span>
                        </td>
                        <td style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 700, color: row.abnormal_return_pct >= 0 ? 'var(--accent-positive)' : 'var(--accent-negative)' }}>
                          {row.abnormal_return_pct >= 0 ? '+' : ''}{row.abnormal_return_pct.toFixed(2)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
