import { useEffect, useState } from 'react'

export default function SentimentGauge({ score }) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    // Animate from 0 to actual score
    const timeout = setTimeout(() => setAnimatedScore(score), 100)
    return () => clearTimeout(timeout)
  }, [score])

  // Gauge geometry
  const cx = 110
  const cy = 110
  const radius = 85
  const startAngle = Math.PI // 180 degrees (left)
  const endAngle = 0 // 0 degrees (right)
  const totalArc = Math.PI // 180 degrees

  // Score range: -1 to 1 → 0 to 1
  const normalized = (animatedScore + 1) / 2
  const scoreAngle = startAngle - normalized * totalArc

  // Arc path helper
  const arcPath = (startA, endA, r) => {
    const x1 = cx + r * Math.cos(startA)
    const y1 = cy - r * Math.sin(startA)
    const x2 = cx + r * Math.cos(endA)
    const y2 = cy - r * Math.sin(endA)
    const largeArc = Math.abs(startA - endA) > Math.PI ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
  }

  // Colors
  const scoreColor = score > 0.05
    ? 'var(--accent-positive)'
    : score < -0.05
    ? 'var(--accent-negative)'
    : 'var(--accent-neutral)'

  const bgTrack = arcPath(startAngle, endAngle, radius)
  const valuePath = arcPath(startAngle, scoreAngle, radius)

  // Needle tip position
  const needleX = cx + radius * Math.cos(scoreAngle)
  const needleY = cy - radius * Math.sin(scoreAngle)

  return (
    <div className="card animate-in">
      <div className="card-header">
        <span className="card-title">Sentiment Gauge</span>
        <span className={`card-badge ${score > 0.05 ? 'positive' : score < -0.05 ? 'negative' : 'neutral'}`}>
          {score > 0.05 ? 'Bullish' : score < -0.05 ? 'Bearish' : 'Neutral'}
        </span>
      </div>
      <div className="gauge-container">
        <svg viewBox="0 0 220 140" className="gauge-svg">
          {/* Gradient defs */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent-negative)" />
              <stop offset="50%" stopColor="var(--accent-neutral)" />
              <stop offset="100%" stopColor="var(--accent-positive)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <path
            d={bgTrack}
            fill="none"
            stroke="var(--glass-border)"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Color gradient track (subtle) */}
          <path
            d={bgTrack}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.15"
          />

          {/* Active value arc */}
          <path
            d={valuePath}
            fill="none"
            stroke={scoreColor}
            strokeWidth="14"
            strokeLinecap="round"
            filter="url(#glow)"
            style={{
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />

          {/* Needle dot */}
          <circle
            cx={needleX}
            cy={needleY}
            r="6"
            fill={scoreColor}
            filter="url(#glow)"
            style={{
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
          <circle
            cx={needleX}
            cy={needleY}
            r="3"
            fill="white"
            style={{
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />

          {/* Center value */}
          <text
            x={cx}
            y={cy + 5}
            textAnchor="middle"
            className="gauge-value-text"
            style={{ fill: scoreColor }}
          >
            {score.toFixed(4)}
          </text>

          {/* Labels */}
          <text x="18" y="120" fill="var(--accent-negative)" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">
            −1.0
          </text>
          <text x={cx} y="30" fill="var(--accent-neutral)" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600" textAnchor="middle">
            0.0
          </text>
          <text x="188" y="120" fill="var(--accent-positive)" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">
            +1.0
          </text>
        </svg>
        <div className="gauge-label">Overall Sentiment Score</div>
      </div>
    </div>
  )
}
