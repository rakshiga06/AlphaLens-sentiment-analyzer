# Earnings Call Sentiment Analyzer

NLP pipeline that scrapes earnings call transcripts and financial data,
scores sentiment with FinBERT, and tests whether sentiment predicts
market reaction.

## Pipeline

```
scraper_financials.py   → price history + earnings dates + event returns
scraper_transcripts.py  → raw transcripts → structured sentence-level data
sentiment.py             → FinBERT scoring + call-level aggregation
event_study.py           → merge sentiment + returns, correlation/regression
dashboard.py              → Streamlit visualization
```

## Setup

```bash
python -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

## Run order

```bash
python scraper_financials.py     # produces data/price_history.csv, data/event_returns.csv
python scraper_transcripts.py    # edit example_url first — produces data/*_sentences.csv
python sentiment.py              # produces data/call_sentiment_summary.csv
python event_study.py            # produces data/merged_event_study.csv + stats
streamlit run dashboard.py       # view results
```

## Where to add novelty (see project roadmap for details)

- [ ] Prepared-remarks vs. Q&A tone gap (already scaffolded in `sentiment.py` as `tone_gap`)
- [ ] Multi-ticker / sector comparison
- [ ] LLM-based claim extraction layer on top of FinBERT scores
- [ ] Sentiment vs. subsequent guidance accuracy (needs 2+ quarters of data)
- [ ] Backtested long/short strategy with transaction costs + Sharpe ratio
- [ ] SHAP/attention-based explainability for which phrases drove the score

## Notes on transcript sourcing

Free transcript sources vary in ToS. Check `robots.txt` and terms before
scraping any specific site. Company investor-relations pages and official
SEC filings (`sec-edgar-downloader`) are the safest sources. Adjust the
parsing selectors in `scraper_transcripts.py` to match your chosen source's
HTML structure.
