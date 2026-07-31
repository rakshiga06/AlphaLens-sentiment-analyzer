import { useState, useEffect, useCallback } from 'react'
import {
  Activity,
  FileText,
  TrendingUp,
  Radio,
  RefreshCw,
  Sun,
  Moon,
  Layers,
  Calculator,
  Plus,
} from 'lucide-react'
import StatsCards from './components/StatsCards'
import SentimentGauge from './components/SentimentGauge'
import SentimentTimeline from './components/SentimentTimeline'
import SpeakerBreakdown from './components/SpeakerBreakdown'
import TranscriptTable from './components/TranscriptTable'
import PriceChart from './components/PriceChart'
import SectorComparison from './components/SectorComparison'
import PredictiveModel from './components/PredictiveModel'

const API_BASE = '/api'

const NAV_ITEMS = [
  { id: 'analysis', label: 'Sentiment Analysis', icon: Activity },
  { id: 'transcript', label: 'Transcript', icon: FileText },
  { id: 'market', label: 'Market Data', icon: TrendingUp },
  { id: 'sector', label: 'Sector Comparison', icon: Layers },
  { id: 'predictive', label: 'Predictive Model', icon: Calculator },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('analysis')
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })
  const [sentimentSummary, setSentimentSummary] = useState([])
  const [sentences, setSentences] = useState([])
  const [priceData, setPriceData] = useState([])
  const [transcripts, setTranscripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [ticker, setTicker] = useState('')
  const [availableTickers, setAvailableTickers] = useState([])
  const [customTicker, setCustomTicker] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  // Seeking Alpha Integration Modal states
  const [showSAModal, setShowSAModal] = useState(false)
  const [saLinks, setSaLinks] = useState([])
  const [saLoading, setSaLoading] = useState(false)
  const [saError, setSaError] = useState(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryRes, transcriptsRes] = await Promise.all([
        fetch(`${API_BASE}/sentiment-summary`),
        fetch(`${API_BASE}/transcripts`),
      ])

      const summaryData = await summaryRes.json()
      const transcriptsData = await transcriptsRes.json()

      setSentimentSummary(summaryData)
      setTranscripts(transcriptsData)

      const tickers = [...new Set(transcriptsData.map(t => t.ticker))].sort()
      setAvailableTickers(tickers)

      // Only default to first ticker if ticker is not set or not in list
      setTicker(prev => {
        if (prev && tickers.includes(prev)) {
          return prev
        }
        return tickers[0] || ''
      })
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Secondary effect to fetch ticker details when ticker shifts
  useEffect(() => {
    if (!ticker) return
    async function fetchTickerDetails() {
      try {
        const [sentRes, priceRes] = await Promise.all([
          fetch(`${API_BASE}/sentences?ticker=${ticker}`),
          fetch(`${API_BASE}/price-history?ticker=${ticker}`),
        ])
        setSentences(await sentRes.json())
        setPriceData(await priceRes.json())
      } catch (err) {
        console.error('Failed to load details for ticker:', ticker, err)
      }
    }
    fetchTickerDetails()
  }, [ticker])

  const handleAnalyzeCustomTicker = async (e) => {
    e.preventDefault()
    if (!customTicker) return
    const formatted = customTicker.toUpperCase().trim()
    setAnalyzing(true)
    try {
      const res = await fetch(`${API_BASE}/analyze-ticker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ticker: formatted })
      })
      const result = await res.json()
      if (result.success) {
        setCustomTicker('')
        // Refresh tickers lists
        await fetchData()
        // Select custom ticker
        setTicker(formatted)
      } else {
        alert(result.error || 'Failed to analyze ticker')
      }
    } catch (err) {
      console.error('Failed to run analysis:', err)
      alert('Network error when attempting ticker analysis.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleTickerChange = (newTicker) => {
    setTicker(newTicker)
  }

  const handleOpenSAModal = async () => {
    setShowSAModal(true)
    setSaLoading(true)
    setSaError(null)
    try {
      const res = await fetch(`${API_BASE}/scrape-links`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Cloudflare anti-bot verification active.`)
      }
      const data = await res.json()
      setSaLinks(data)
    } catch (err) {
      console.error('Failed to load Seeking Alpha links:', err)
      setSaError(err.message || 'Failed to fetch Seeking Alpha links.')
    } finally {
      setSaLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Compute stats from sentences
  const totalSentences = sentences.length
  const positiveCount = sentences.filter(s => s.sentiment_score > 0.05).length
  const negativeCount = sentences.filter(s => s.sentiment_score < -0.05).length
  const neutralCount = totalSentences - positiveCount - negativeCount
  const overallScore = totalSentences > 0
    ? sentences.reduce((sum, s) => sum + s.sentiment_score, 0) / totalSentences
    : 0
  const speakers = [...new Set(sentences.map(s => s.speaker))]

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">S</div>
          <span className="sidebar-logo-text">AlphaLens</span>
          <span className="sidebar-logo-badge">Beta</span>
        </div>

        <div className="sidebar-section-label">Dashboard</div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <div
              key={item.id}
              className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon />
              {item.label}
            </div>
          ))}
        </nav>

        <div className="sidebar-section-label">Live Feed</div>
        <nav className="sidebar-nav">
          <div className="sidebar-nav-item" onClick={fetchData}>
            <RefreshCw />
            Refresh Data
          </div>
          <div className="sidebar-nav-item" onClick={handleOpenSAModal}>
            <Radio />
            Seeking Alpha
          </div>
        </nav>

        <div className="sidebar-section-label">Preferences</div>
        <nav className="sidebar-nav">
          <div className="sidebar-nav-item" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun /> : <Moon />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="page-header">
          <div className="page-header-top">
            <div className="page-header-info">
              <h1 className="page-title">
                {activeTab === 'analysis' && '🧠 Sentiment Analysis'}
                {activeTab === 'transcript' && '📝 Transcript Explorer'}
                {activeTab === 'market' && '📈 Market Data'}
                {activeTab === 'sector' && '🏢 Sector Peer Comparison'}
                {activeTab === 'predictive' && '🔮 Forward Return Predictor'}
              </h1>
              <p className="page-subtitle">
                {ticker
                  ? `Analyzing ${ticker} earnings call sentiment — ${totalSentences} sentences scored`
                  : 'No data loaded yet. Enter a stock ticker to start.'}
              </p>
            </div>

            <div className="page-header-controls">
              <div className="header-control-group">
                <label className="header-control-label">Active Ticker</label>
                <div className="select-wrapper">
                  <select
                    value={ticker}
                    onChange={e => handleTickerChange(e.target.value)}
                    className="header-select"
                  >
                    {availableTickers.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <form onSubmit={handleAnalyzeCustomTicker} className="header-control-group header-form">
                <label className="header-control-label">Analyze Custom Stock</label>
                <div className="header-input-wrapper">
                  <input
                    type="text"
                    placeholder="e.g. NFLX"
                    value={customTicker}
                    onChange={e => setCustomTicker(e.target.value)}
                    disabled={analyzing}
                    className="header-input"
                  />
                  <button
                    type="submit"
                    disabled={analyzing || !customTicker}
                    className="header-btn"
                  >
                    {analyzing ? (
                      <RefreshCw className="spin" size={14} />
                    ) : (
                      <Plus size={14} />
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
          {analyzing && (
            <div className="analyzing-banner">
              <RefreshCw className="spin" size={12} />
              <span>Fetching market metrics & scoring transcripts for {customTicker.toUpperCase()}...</span>
            </div>
          )}
        </header>

        {loading ? (
          <div className="stats-grid">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="card skeleton skeleton-stat" />
            ))}
          </div>
        ) : (
          <>
            {/* Analysis Tab */}
            {activeTab === 'analysis' && (
              <>
                <StatsCards
                  overallScore={overallScore}
                  positiveCount={positiveCount}
                  negativeCount={negativeCount}
                  neutralCount={neutralCount}
                  totalSentences={totalSentences}
                  speakerCount={speakers.length}
                />
                <div className="charts-grid">
                  <SentimentGauge score={overallScore} />
                  <SpeakerBreakdown sentences={sentences} />
                </div>
                <SentimentTimeline sentences={sentences} />
              </>
            )}

            {/* Transcript Tab */}
            {activeTab === 'transcript' && (
              <TranscriptTable sentences={sentences} />
            )}

            {/* Market Tab */}
            {activeTab === 'market' && (
              <>
                <StatsCards
                  overallScore={overallScore}
                  positiveCount={positiveCount}
                  negativeCount={negativeCount}
                  neutralCount={neutralCount}
                  totalSentences={totalSentences}
                  speakerCount={speakers.length}
                />
                <PriceChart data={priceData} ticker={ticker} />
              </>
            )}

            {/* Sector Tab */}
            {activeTab === 'sector' && (
              <SectorComparison />
            )}

            {/* Predictive Tab */}
            {activeTab === 'predictive' && (
              <PredictiveModel />
            )}
          </>
        )}
      </main>

      {/* Seeking Alpha Info Modal */}
      {showSAModal && (
        <div className="modal-overlay" onClick={() => setShowSAModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Seeking Alpha Integration</h2>
              <button className="modal-close" onClick={() => setShowSAModal(false)}>&times;</button>
            </div>
            
            <div className="modal-body">
              <p className="modal-description">
                Seeking Alpha is a popular financial site hosting corporate earnings transcripts.
                Our backend includes scraping logic to extract speaker text and call dates.
              </p>

              {saLoading && (
                <div className="modal-status loading">
                  <RefreshCw className="spin" size={24} />
                  <p>Connecting to Seeking Alpha transcripts feed...</p>
                </div>
              )}

              {saError && (
                <div className="modal-status error-container">
                  <div className="error-badge">⚠️ Cloudflare Bot Protection Enabled</div>
                  <p className="error-text">
                    Seeking Alpha's security firewall prevents automated scripts from direct access.
                  </p>
                  <code className="error-code">{saError}</code>
                  
                  <div className="workaround-box">
                    <h4>How to analyze a new stock?</h4>
                    <p>
                      Instead of a live scrape, you can enter any stock ticker (e.g., <strong>NFLX</strong>, <strong>AAPL</strong>, <strong>GOOG</strong>, <strong>TSLA</strong>) in the <strong>"Analyze Custom Stock"</strong> input in the top header.
                    </p>
                    <p>
                      The system will automatically download historical stock price data and generate a high-fidelity synthetic transcript matching the earnings surprise of that quarter to simulate a live scrape, score it sentence-by-sentence, and add it to your dashboard!
                    </p>
                  </div>
                </div>
              )}

              {!saLoading && !saError && saLinks.length > 0 && (
                <div className="sa-links-list">
                  <h3>Available Transcripts from Seeking Alpha</h3>
                  <ul>
                    {saLinks.map((link, idx) => (
                      <li key={idx} className="sa-link-item">
                        <span className="sa-link-ticker">{link.ticker || 'N/A'}</span>
                        <div className="sa-link-info">
                          <span className="sa-link-title">{link.title}</span>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="sa-link-external">
                            View on SA &rarr;
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="modal-btn-close" onClick={() => setShowSAModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
