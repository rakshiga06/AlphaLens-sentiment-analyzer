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
  ReferenceLine,
  Cell,
} from 'recharts'
import { Settings, Calculator, Activity, HelpCircle, Sliders, FileText } from 'lucide-react'

const CustomPredictTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload
  return (
    <div className="custom-tooltip">
      <div className="label" style={{ fontWeight: 700 }}>
        {data.ticker} ({data.call_date})
      </div>
      <div style={{ marginTop: 4, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
        <div>Actual Return: <span style={{ color: data.actual >= 0 ? 'var(--accent-positive)' : 'var(--accent-negative)', fontWeight: 600 }}>{data.actual.toFixed(2)}%</span></div>
        <div>Predicted Return: <span style={{ color: data.predicted >= 0 ? 'var(--accent-positive)' : 'var(--accent-negative)', fontWeight: 600 }}>{data.predicted.toFixed(2)}%</span></div>
        <div>Sentiment: <span>{data.overall_sentiment.toFixed(3)}</span></div>
        <div>Surprise: <span>{data.earnings_surprise_pct.toFixed(1)}%</span></div>
      </div>
    </div>
  )
}

export default function PredictiveModel() {
  const [modelData, setModelData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Simulator Inputs
  const [simSentiment, setSimSentiment] = useState(0.2)
  const [simSurprise, setSimSurprise] = useState(4.0)
  const [simMarketReturn, setSimMarketReturn] = useState(0.5)
  const [simMomentum, setSimMomentum] = useState(2.0)
  const [simGuidance, setSimGuidance] = useState(1) // 1 = Raising, 0 = Maintaining, -1 = Lowering

  useEffect(() => {
    async function fetchModelData() {
      setLoading(true)
      try {
        const res = await fetch('/api/regression-results')
        const data = await res.json()
        if (data.error) {
          setError(data.error)
        } else {
          setModelData(data)
        }
      } catch (err) {
        console.error('Failed to load model results:', err)
        setError('Failed to load model results from server.')
      } finally {
        setLoading(false)
      }
    }
    fetchModelData()
  }, [])

  // Predict return based on inputs and coefficients
  const getPredictedReturn = () => {
    if (!modelData || !modelData.coef) return 0
    const coef = modelData.coef
    
    // Y = const + c1*sentiment + c2*surprise + c3*market + c4*momentum + c5*guidance
    const intercept = coef['const'] || 0
    const sentimentTerm = simSentiment * (coef['overall_sentiment'] || 0)
    const surpriseTerm = simSurprise * (coef['earnings_surprise_pct'] || 0)
    const marketTerm = simMarketReturn * (coef['market_adjusted_return_control'] || 0)
    const momentumTerm = simMomentum * (coef['pre_earnings_momentum_pct'] || 0)
    const guidanceTerm = simGuidance * (coef['guidance_flag'] || 0)
    
    return intercept + sentimentTerm + surpriseTerm + marketTerm + momentumTerm + guidanceTerm
  }

  const predictionVal = getPredictedReturn()

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="card skeleton" style={{ height: 120 }} />
        <div className="charts-grid">
          <div className="card skeleton" style={{ height: 350 }} />
          <div className="card skeleton" style={{ height: 350 }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card animate-in" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
        <h3>Model Error</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8, maxWidth: 400, margin: '8px auto' }}>
          {error}
        </p>
      </div>
    )
  }

  // Format coefficients for charting
  const coefData = [
    { name: 'Sentiment Score', value: modelData.coef['overall_sentiment'] || 0, pval: modelData.pvalues['overall_sentiment'] || 0 },
    { name: 'Earnings Surprise (%)', value: modelData.coef['earnings_surprise_pct'] || 0, pval: modelData.pvalues['earnings_surprise_pct'] || 0 },
    { name: 'S&P 500 Return (%)', value: modelData.coef['market_adjusted_return_control'] || 0, pval: modelData.pvalues['market_adjusted_return_control'] || 0 },
    { name: 'Pre-Earnings Mom (%)', value: modelData.coef['pre_earnings_momentum_pct'] || 0, pval: modelData.pvalues['pre_earnings_momentum_pct'] || 0 },
    { name: 'Guidance Direction', value: modelData.coef['guidance_flag'] || 0, pval: modelData.pvalues['guidance_flag'] || 0 },
  ].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))

  // Find min/max values for plots
  const actuals = modelData.actual_vs_predicted.map(d => d.actual)
  const predicteds = modelData.actual_vs_predicted.map(d => d.predicted)
  const minVal = Math.min(...actuals, ...predicteds, -5) * 1.1
  const maxVal = Math.max(...actuals, ...predicteds, 5) * 1.1

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 40 }}>
      
      {/* Top statistics overview */}
      <div className="card" style={{ padding: '24px 28px', display: 'flex', gap: 32, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calculator className="accent-neutral" /> forward Return Predictor Model
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4, maxWidth: 500 }}>
            econometric multi-variable OLS regression predicting the next-day price reaction based on text sentiment and fundamental surprise triggers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 24, fontFamily: 'var(--font-mono)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-neutral)' }}>
              {modelData.rsquared.toFixed(3)}
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>R-Squared</span>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid var(--glass-border)', paddingLeft: 24 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {modelData.nobs}
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Observations</span>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid var(--glass-border)', paddingLeft: 24 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-positive)' }}>
              {modelData.f_pvalue < 0.001 ? '< 0.001' : modelData.f_pvalue.toFixed(3)}
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Prob (F-stat)</span>
          </div>
        </div>
      </div>

      {/* Interactive Simulator & Predictor */}
      <div className="charts-grid" style={{ gridTemplateColumns: '1.1fr 0.9fr' }}>
        
        {/* Sliders Panel */}
        <div className="card animate-in" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Sliders size={18} className="accent-neutral" />
            <span className="card-title">Interactive Scenario Simulator</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Sentiment Score */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>Call Sentiment Score:</span>
                <span className="font-mono text-secondary">{simSentiment.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={simSentiment}
                onChange={e => setSimSentiment(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                <span>Bearish (-1.0)</span>
                <span>Neutral (0.0)</span>
                <span>Bullish (+1.0)</span>
              </div>
            </div>

            {/* Earnings Surprise */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>Earnings Surprise (%):</span>
                <span className="font-mono text-secondary">{simSurprise >= 0 ? '+' : ''}{simSurprise.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={simSurprise}
                onChange={e => setSimSurprise(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                <span>Miss (-15%)</span>
                <span>Consensus (0%)</span>
                <span>Beat (+15%)</span>
              </div>
            </div>

            {/* S&P 500 Return */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>S&P 500 Same-Day Return (%):</span>
                <span className="font-mono text-secondary">{simMarketReturn >= 0 ? '+' : ''}{simMarketReturn.toFixed(2)}%</span>
              </div>
              <input
                type="range"
                min="-3"
                max="3"
                step="0.1"
                value={simMarketReturn}
                onChange={e => setSimMarketReturn(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                <span>Market Down (-3%)</span>
                <span>Flat (0%)</span>
                <span>Market Up (+3%)</span>
              </div>
            </div>

            {/* Pre-earnings momentum */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>Pre-Earnings Momentum (10d):</span>
                <span className="font-mono text-secondary">{simMomentum >= 0 ? '+' : ''}{simMomentum.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={simMomentum}
                onChange={e => setSimMomentum(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                <span>Sell-off (-15%)</span>
                <span>Flat (0%)</span>
                <span>Run-up (+15%)</span>
              </div>
            </div>

            {/* Guidance Selection */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>Forward Management Guidance:</span>
              </div>
              <select
                value={simGuidance}
                onChange={e => setSimGuidance(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none',
                  fontSize: '0.85rem'
                }}
              >
                <option value="1">Raising Outlook (+1)</option>
                <option value="0">Reaffirming / Maintaining Outlook (0)</option>
                <option value="-1">Lowering Outlook (-1)</option>
              </select>
            </div>

          </div>
        </div>

        {/* Prediction Output Display Card */}
        <div className="card animate-in" style={{ padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '2px dashed var(--glass-border)', textAlign: 'center', background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.04), transparent)' }}>
          <div style={{ padding: 12, borderRadius: '50%', backgroundColor: 'var(--accent-neutral-dim)', color: 'var(--accent-primary)', marginBottom: 12 }}>
            <Calculator size={28} />
          </div>
          <span style={{ fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Model Return Forecast
          </span>
          <div style={{
            fontSize: '3rem',
            fontWeight: 800,
            margin: '12px 0',
            fontFamily: 'var(--font-mono)',
            color: predictionVal >= 0 ? 'var(--accent-positive)' : 'var(--accent-negative)',
            textShadow: predictionVal >= 0 ? '0 0 30px rgba(16, 185, 129, 0.2)' : '0 0 30px rgba(244, 63, 94, 0.2)'
          }}>
            {predictionVal >= 0 ? '+' : ''}{predictionVal.toFixed(2)}%
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: 280 }}>
            Predicted raw stock return on the day immediately following the earnings call release.
          </p>

          <div style={{ width: '100%', borderTop: '1px solid var(--glass-border)', marginTop: 24, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.7rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Formula intercept:</span>
              <span className="font-mono">{(modelData.coef['const'] || 0).toFixed(4)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sentiment effect:</span>
              <span className="font-mono">{(simSentiment * (modelData.coef['overall_sentiment'] || 0)).toFixed(4)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Earnings surprise effect:</span>
              <span className="font-mono">{(simSurprise * (modelData.coef['earnings_surprise_pct'] || 0)).toFixed(4)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Market return control effect:</span>
              <span className="font-mono">{(simMarketReturn * (modelData.coef['market_adjusted_return_control'] || 0)).toFixed(4)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Regression Details Graphs */}
      <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))' }}>
        
        {/* Regression Weights */}
        <div className="card animate-in" style={{ padding: 24 }}>
          <span className="card-title">OLS Regression Coefficients (Weights)</span>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
            relative weight/impact of each driver on the stock return. Larger bar sizes represent larger price reactions.
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={coefData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={v => v.toFixed(1)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={120} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--glass-border)', borderRadius: 'var(--radius-sm)' }}
                formatter={v => [`Impact: ${v.toFixed(4)}`, 'Coefficient']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {coefData.map((entry, index) => {
                  const color = entry.value >= 0 ? 'var(--accent-positive)' : 'var(--accent-negative)'
                  return <Cell key={`cell-${index}`} fill={color} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Actual vs Predicted Plot */}
        <div className="card animate-in" style={{ padding: 24 }}>
          <span className="card-title">Model Actual vs. Predicted Returns Fit</span>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
            scatter plot comparing historical returns against returns predicted by our model. Closer to diagonal represents tighter fit.
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="predicted"
                name="Predicted Return"
                domain={[minVal, maxVal]}
                tickFormatter={v => `${v.toFixed(0)}%`}
                tick={{ fontSize: 9 }}
              />
              <YAxis
                type="number"
                dataKey="actual"
                name="Actual Return"
                domain={[minVal, maxVal]}
                tickFormatter={v => `${v.toFixed(0)}%`}
                tick={{ fontSize: 9 }}
              />
              <Tooltip content={<CustomPredictTooltip />} />
              <ReferenceLine segment={[{ x: minVal, y: minVal }, { x: maxVal, y: maxVal }]} stroke="var(--text-muted)" strokeDasharray="5 5" />
              <Scatter name="Fitted Calls" data={modelData.actual_vs_predicted} fill="var(--accent-neutral)">
                {modelData.actual_vs_predicted.map((entry, index) => {
                  return <Cell key={`cell-${index}`} fill="var(--accent-neutral)" opacity={0.6} r={5} />
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

      </div>

    </div>
  )
}
