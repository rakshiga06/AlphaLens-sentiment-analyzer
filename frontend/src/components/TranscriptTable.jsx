import { useState } from 'react'

export default function TranscriptTable({ sentences }) {
  const [filter, setFilter] = useState('all') // all | positive | negative | neutral

  if (!sentences || sentences.length === 0) {
    return (
      <div className="card animate-in">
        <div className="card-header">
          <span className="card-title">Transcript Sentences</span>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-title">No Transcript</div>
          <div className="empty-state-desc">Run the scraper and sentiment pipeline to see results.</div>
        </div>
      </div>
    )
  }

  const classify = (score) => {
    if (score > 0.05) return 'positive'
    if (score < -0.05) return 'negative'
    return 'neutral'
  }

  const filtered = filter === 'all'
    ? sentences
    : sentences.filter(s => classify(s.sentiment_score) === filter)

  const filterButtons = [
    { key: 'all', label: 'All' },
    { key: 'positive', label: '✅ Positive' },
    { key: 'negative', label: '❌ Negative' },
    { key: 'neutral', label: '➖ Neutral' },
  ]

  return (
    <div className="card animate-in">
      <div className="card-header">
        <span className="card-title">Transcript Sentences</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {filterButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              style={{
                padding: '5px 12px',
                fontSize: '0.72rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: filter === btn.key ? 'var(--accent-primary)' : 'var(--glass-border)',
                background: filter === btn.key ? 'var(--accent-primary-dim)' : 'transparent',
                color: filter === btn.key ? 'var(--accent-primary)' : 'var(--text-muted)',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th style={{ width: 120 }}>Speaker</th>
              <th style={{ width: 80 }}>Section</th>
              <th>Sentence</th>
              <th style={{ width: 100 }}>Score</th>
              <th style={{ width: 80 }}>Sentiment</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => {
              const cls = classify(s.sentiment_score)
              const color = cls === 'positive' ? 'var(--accent-positive)' : cls === 'negative' ? 'var(--accent-negative)' : 'var(--accent-neutral)'
              const barWidth = Math.abs(s.sentiment_score) * 100
              return (
                <tr key={i}>
                  <td className="cell-mono" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.speaker}</td>
                  <td>
                    <span style={{
                      fontSize: '0.68rem',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: s.section === 'qa' ? 'var(--accent-primary-dim)' : 'var(--bg-surface)',
                      color: s.section === 'qa' ? 'var(--accent-primary)' : 'var(--text-muted)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}>
                      {s.section === 'prepared_remarks' ? 'Remarks' : 'Q&A'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', lineHeight: 1.5, maxWidth: 400 }}>
                    {s.sentence || s.text}
                  </td>
                  <td>
                    <span className="cell-mono" style={{ color }}>
                      {s.sentiment_score > 0 ? '+' : ''}{s.sentiment_score.toFixed(4)}
                    </span>
                    <div className="sentiment-bar-inline">
                      <div
                        className="sentiment-bar-fill"
                        style={{
                          width: `${Math.min(barWidth, 100)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    <span className={`sentiment-dot ${cls}`} />
                    <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color }}>
                      {cls}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
