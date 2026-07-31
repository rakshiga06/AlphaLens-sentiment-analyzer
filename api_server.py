"""
api_server.py
--------------
Lightweight Flask API that serves sentiment analysis data as JSON
for the React frontend dashboard.

Run with:
    python api_server.py
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import sqlite3
from pathlib import Path

app = Flask(__name__)
CORS(app)

DATA_DIR = Path("data")
DB_PATH = DATA_DIR / "sentiment_analyzer.db"


def get_db_connection():
    return sqlite3.connect(DB_PATH)


def safe_read_db(table_name, query_str=None, params=None):
    """Query an SQLite table and return a DataFrame, or empty DataFrame on failure."""
    import numpy as np
    conn = get_db_connection()
    try:
        if query_str:
            df = pd.read_sql_query(query_str, conn, params=params)
        else:
            df = pd.read_sql_query(f"SELECT * FROM {table_name}", conn)
        return df.replace({np.nan: None})
    except Exception as e:
        print(f"Error reading SQLite table {table_name}: {e}")
        return pd.DataFrame()
    finally:
        conn.close()


@app.route("/api/tickers", methods=["GET"])
def get_tickers():
    """Return list of tickers grouped by sector."""
    try:
        from data_pipeline import SECTORS
        return jsonify(SECTORS)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/sentiment-summary", methods=["GET"])
def sentiment_summary():
    """Return call-level sentiment summary with optional ticker/sector filtering."""
    ticker = request.args.get("ticker")
    sector = request.args.get("sector")
    
    if ticker:
        df = safe_read_db("call_sentiment_summary", "SELECT * FROM call_sentiment_summary WHERE ticker = ?", params=(ticker.upper(),))
    elif sector:
        try:
            from data_pipeline import SECTORS
            if sector in SECTORS:
                placeholders = ",".join(["?"] * len(SECTORS[sector]))
                query = f"SELECT * FROM call_sentiment_summary WHERE ticker IN ({placeholders})"
                df = safe_read_db("call_sentiment_summary", query, params=SECTORS[sector])
            else:
                df = pd.DataFrame()
        except ImportError:
            df = pd.DataFrame()
    else:
        df = safe_read_db("call_sentiment_summary")
        
    if df.empty:
        return jsonify([])
    return jsonify(df.to_dict(orient="records"))


@app.route("/api/sector-comparison", methods=["GET"])
def sector_comparison():
    """Return sentiment summary records for peer companies in a sector."""
    sector = request.args.get("sector")
    try:
        from data_pipeline import SECTORS
        if sector and sector in SECTORS:
            placeholders = ",".join(["?"] * len(SECTORS[sector]))
            query = f"SELECT * FROM call_sentiment_summary WHERE ticker IN ({placeholders})"
            df = safe_read_db("call_sentiment_summary", query, params=SECTORS[sector])
        else:
            df = pd.DataFrame()
    except ImportError:
        df = pd.DataFrame()
        
    if df.empty:
        return jsonify([])
    return jsonify(df.to_dict(orient="records"))


@app.route("/api/regression-results", methods=["GET"])
def regression_results():
    """Fit econometric OLS regression and return statistical variables for predicting next day returns."""
    df = safe_read_db("merged_event_study")
    if df.empty or len(df) < 5:
        return jsonify({"error": "Not enough events in database to build regression model (need n >= 5)"}), 400
        
    import statsmodels.api as sm
    import numpy as np
    
    y = df["next_day_return_pct"]
    predictors = [
        "overall_sentiment", 
        "earnings_surprise_pct", 
        "market_adjusted_return_control", 
        "pre_earnings_momentum_pct", 
        "guidance_flag"
    ]
    X = df[predictors]
    X_with_const = sm.add_constant(X)
    
    try:
        model = sm.OLS(y, X_with_const).fit()
        
        coef = model.params.to_dict()
        pvalues = model.pvalues.to_dict()
        stderr = model.bse.to_dict()
        tvalues = model.tvalues.to_dict()
        
        conf_int = model.conf_int().to_dict(orient="index")
        ci_dict = {}
        for col, vals in conf_int.items():
            ci_dict[col] = [float(vals[0]), float(vals[1])]
            
        predicted = model.predict(X_with_const)
        actual_vs_predicted = []
        for idx, row in df.iterrows():
            actual_vs_predicted.append({
                "ticker": row["ticker"],
                "call_date": row["call_date"],
                "actual": float(row["next_day_return_pct"]),
                "predicted": float(predicted.iloc[idx]) if idx < len(predicted) else 0.0,
                "earnings_surprise_pct": float(row["earnings_surprise_pct"]),
                "overall_sentiment": float(row["overall_sentiment"]),
                "abnormal_return_pct": float(row["abnormal_return_pct"]),
                "pre_earnings_momentum_pct": float(row["pre_earnings_momentum_pct"]),
                "guidance_flag": int(row["guidance_flag"])
            })
            
        results = {
            "coef": {k: float(v) for k, v in coef.items()},
            "pvalues": {k: float(v) for k, v in pvalues.items()},
            "stderr": {k: float(v) for k, v in stderr.items()},
            "tvalues": {k: float(v) for k, v in tvalues.items()},
            "confidence_intervals": ci_dict,
            "rsquared": float(model.rsquared),
            "rsquared_adj": float(model.rsquared_adj),
            "nobs": int(model.nobs),
            "f_pvalue": float(model.f_pvalue) if not np.isnan(model.f_pvalue) else 0.0,
            "actual_vs_predicted": actual_vs_predicted
        }
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": f"Regression computation failed: {str(e)}"}), 500


@app.route("/api/analyze-ticker", methods=["POST"])
def analyze_ticker():
    """Trigger data pipeline fetching + scoring for a new user-selected stock ticker."""
    data = request.get_json() or {}
    ticker = data.get("ticker")
    if not ticker:
        return jsonify({"error": "Ticker is required"}), 400
        
    ticker = ticker.upper().strip()
    
    try:
        from data_pipeline import process_ticker_data, rebuild_merged_event_study
        success = process_ticker_data(ticker, force_reprocess=True, use_finbert=False)
        if success:
            rebuild_merged_event_study()
            return jsonify({
                "success": True,
                "message": f"Successfully completed event study analysis for {ticker}."
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Failed to download/calculate event returns for ticker {ticker}."
            }), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/sentences", methods=["GET"])
def sentences():
    """Return sentence-level scored data, optionally filtered by ticker and call_date."""
    ticker = request.args.get("ticker")
    call_date = request.args.get("call_date")
    
    if ticker and call_date:
        df = safe_read_db("sentences_scored", "SELECT * FROM sentences_scored WHERE ticker = ? AND call_date = ?", params=(ticker.upper(), call_date))
    elif ticker:
        df = safe_read_db("sentences_scored", "SELECT * FROM sentences_scored WHERE ticker = ?", params=(ticker.upper(),))
    else:
        df = safe_read_db("sentences_scored")
        
    if df.empty:
        return jsonify([])
    return jsonify(df.to_dict(orient="records"))


@app.route("/api/transcripts", methods=["GET"])
def transcripts():
    """Return available transcript metadata."""
    query = """
        SELECT ticker, call_date, COUNT(sentence) AS sentence_count, AVG(sentiment_score) AS avg_sentiment
        FROM sentences_scored
        GROUP BY ticker, call_date
    """
    df = safe_read_db("sentences_scored", query)
    if df.empty:
        return jsonify([])
        
    # Get speakers separately
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT ticker, call_date, speaker FROM sentences_scored WHERE speaker IS NOT NULL")
        speakers_rows = cursor.fetchall()
        speakers_by_call = {}
        for r in speakers_rows:
            key = (r[0], r[1])
            if key not in speakers_by_call:
                speakers_by_call[key] = []
            speakers_by_call[key].append(r[2])
    except Exception:
        speakers_by_call = {}
    finally:
        conn.close()
        
    records = []
    for _, row in df.iterrows():
        key = (row["ticker"], row["call_date"])
        records.append({
            "ticker": row["ticker"],
            "call_date": row["call_date"],
            "sentence_count": int(row["sentence_count"]),
            "avg_sentiment": float(row["avg_sentiment"]),
            "speakers": speakers_by_call.get(key, ["Unknown"])
        })
        
    return jsonify(records)


@app.route("/api/price-history", methods=["GET"])
def price_history():
    """Return OHLCV price data, optionally filtered by ticker."""
    ticker = request.args.get("ticker")
    if ticker:
        df = safe_read_db("price_history", "SELECT * FROM price_history WHERE ticker = ?", params=(ticker.upper(),))
    else:
        df = safe_read_db("price_history")
        
    if df.empty:
        return jsonify([])
        
    df = df.tail(120)
    return jsonify(df.to_dict(orient="records"))


@app.route("/api/scrape-links", methods=["GET"])
def scrape_links():
    """Trigger a live scrape of Seeking Alpha transcript listing page."""
    try:
        from scraper_transcripts import fetch_transcript_html, extract_seeking_alpha_links, SEEKING_ALPHA_TRANSCRIPTS_URL
        html = fetch_transcript_html(SEEKING_ALPHA_TRANSCRIPTS_URL)
        links = extract_seeking_alpha_links(html)
        return jsonify(links[:20])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("Starting Sentiment API server on http://localhost:5050")
    app.run(host="0.0.0.0", port=5050, debug=True)
