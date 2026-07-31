import { TrendingUp, TrendingDown, Minus, Users, MessageSquare, Activity } from 'lucide-react'

export default function StatsCards({
  overallScore,
  positiveCount,
  negativeCount,
  neutralCount,
  totalSentences,
  speakerCount,
}) {
  const positivePct = totalSentences > 0 ? ((positiveCount / totalSentences) * 100).toFixed(1) : 0
  const negativePct = totalSentences > 0 ? ((negativeCount / totalSentences) * 100).toFixed(1) : 0
  const neutralPct = totalSentences > 0 ? ((neutralCount / totalSentences) * 100).toFixed(1) : 0

  const scoreClass = overallScore > 0.05 ? 'positive' : overallScore < -0.05 ? 'negative' : 'neutral'

  const cards = [
    {
      label: 'Overall Sentiment',
      value: overallScore.toFixed(4),
      valueClass: scoreClass,
      icon: Activity,
      sub: scoreClass === 'positive' ? 'Bullish Tone' : scoreClass === 'negative' ? 'Bearish Tone' : 'Neutral Tone',
    },
    {
      label: 'Positive',
      value: `${positivePct}%`,
      valueClass: 'positive',
      icon: TrendingUp,
      sub: `${positiveCount} sentences`,
    },
    {
      label: 'Negative',
      value: `${negativePct}%`,
      valueClass: 'negative',
      icon: TrendingDown,
      sub: `${negativeCount} sentences`,
    },
    {
      label: 'Neutral',
      value: `${neutralPct}%`,
      valueClass: 'neutral',
      icon: Minus,
      sub: `${neutralCount} sentences`,
    },
    {
      label: 'Speakers',
      value: speakerCount,
      valueClass: '',
      icon: Users,
      sub: `${totalSentences} total sentences`,
    },
  ]

  return (
    <div className="stats-grid">
      {cards.map((card, i) => (
        <div key={i} className="card stat-card animate-in">
          <div className="stat-card-label">
            <card.icon size={14} />
            {card.label}
          </div>
          <div className={`stat-card-value ${card.valueClass}`}>{card.value}</div>
          <div className="stat-card-change">{card.sub}</div>
        </div>
      ))}
    </div>
  )
}
