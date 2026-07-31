"""
scraper_financials.py
----------------------
Pulls stock price history and basic fundamentals for a ticker using yfinance.
This gives you the "market reaction" side of the pipeline (returns around
earnings dates), which you'll later merge with sentiment scores.

Usage:
    python scraper_financials.py
"""

import yfinance as yf
import pandas as pd
from pathlib import Path

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)


def get_price_history(ticker: str, period: str = "2y") -> pd.DataFrame:
    """Download daily OHLCV data for a ticker."""
    stock = yf.Ticker(ticker)
    hist = stock.history(period=period)
    hist = hist.reset_index()
    hist["ticker"] = ticker
    return hist


def get_earnings_dates(ticker: str) -> pd.DataFrame:
    """Get historical + upcoming earnings call dates for a ticker."""
    stock = yf.Ticker(ticker)
    try:
        earnings = stock.get_earnings_dates(limit=20)
        earnings = earnings.reset_index()
        earnings["ticker"] = ticker
        return earnings
    except Exception as e:
        print(f"Could not fetch earnings dates for {ticker}: {e}")
        return pd.DataFrame()


def compute_event_returns(price_df: pd.DataFrame, earnings_df: pd.DataFrame) -> pd.DataFrame:
    """
    For each earnings date, compute next-day and 3-day forward returns.
    This becomes your target variable for the event study later.
    """
    price_df = price_df.copy()
    price_df["Date"] = pd.to_datetime(price_df["Date"]).dt.tz_localize(None)
    price_df = price_df.sort_values("Date").reset_index(drop=True)

    results = []
    for _, row in earnings_df.iterrows():
        event_date = pd.to_datetime(row["Earnings Date"]).tz_localize(None)
        # find the closest trading day on/after the earnings date
        future_prices = price_df[price_df["Date"] >= event_date]
        if len(future_prices) < 4:
            continue

        p0 = future_prices.iloc[0]["Close"]
        p1 = future_prices.iloc[1]["Close"] if len(future_prices) > 1 else None
        p3 = future_prices.iloc[3]["Close"] if len(future_prices) > 3 else None

        results.append({
            "ticker": row["ticker"],
            "earnings_date": event_date,
            "close_on_event": p0,
            "next_day_return_pct": ((p1 - p0) / p0 * 100) if p1 else None,
            "three_day_return_pct": ((p3 - p0) / p0 * 100) if p3 else None,
        })

    return pd.DataFrame(results)


if __name__ == "__main__":
    # --- Example: run for a handful of tickers ---
    TICKERS = ["AAPL", "MSFT", "JPM"]  # <-- customize this list

    all_prices = []
    all_events = []

    for t in TICKERS:
        print(f"Fetching data for {t}...")
        prices = get_price_history(t)
        earnings = get_earnings_dates(t)

        all_prices.append(prices)
        if not earnings.empty:
            event_returns = compute_event_returns(prices, earnings)
            all_events.append(event_returns)

    price_df = pd.concat(all_prices, ignore_index=True)
    price_df.to_csv(DATA_DIR / "price_history.csv", index=False)

    if all_events:
        event_df = pd.concat(all_events, ignore_index=True)
        event_df.to_csv(DATA_DIR / "event_returns.csv", index=False)
        print(event_df.head())

    print("Done. Saved to data/price_history.csv and data/event_returns.csv")
