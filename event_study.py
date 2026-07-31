"""
event_study.py
---------------
Merges sentiment summaries with stock return data and tests whether
sentiment predicts market reaction. This is the step that turns the
project from "I ran a sentiment model" into "I found a signal."
"""

import pandas as pd
from scipy import stats
import statsmodels.api as sm
from pathlib import Path

DATA_DIR = Path("data")


def merge_sentiment_and_returns(sentiment_df: pd.DataFrame, returns_df: pd.DataFrame) -> pd.DataFrame:
    """
    Join call-level sentiment scores with next-day / 3-day returns on
    ticker + date. Adjust date matching tolerance if call date and
    earnings_date don't align exactly.
    """
    sentiment_df = sentiment_df.copy()
    returns_df = returns_df.copy()

    sentiment_df["call_date"] = pd.to_datetime(sentiment_df["call_date"])
    returns_df["earnings_date"] = pd.to_datetime(returns_df["earnings_date"])

    merged = pd.merge(
        sentiment_df,
        returns_df,
        left_on=["ticker", "call_date"],
        right_on=["ticker", "earnings_date"],
        how="inner",
    )
    return merged


def correlation_test(merged_df: pd.DataFrame, sentiment_col: str = "overall_sentiment",
                      return_col: str = "next_day_return_pct"):
    """Pearson correlation between sentiment and forward return, with p-value."""
    clean = merged_df[[sentiment_col, return_col]].dropna()
    r, p = stats.pearsonr(clean[sentiment_col], clean[return_col])
    print(f"Correlation({sentiment_col}, {return_col}) = {r:.3f}  (p={p:.4f}, n={len(clean)})")
    return r, p


def regression_test(merged_df: pd.DataFrame, sentiment_col: str = "overall_sentiment",
                     return_col: str = "next_day_return_pct"):
    """
    Simple OLS regression: return ~ sentiment.
    Extend this with more predictors (tone_gap, volume, sector dummies) later.
    """
    clean = merged_df[[sentiment_col, return_col]].dropna()
    X = sm.add_constant(clean[sentiment_col])
    y = clean[return_col]
    model = sm.OLS(y, X).fit()
    print(model.summary())
    return model


if __name__ == "__main__":
    sentiment_path = DATA_DIR / "call_sentiment_summary.csv"
    returns_path = DATA_DIR / "event_returns.csv"

    if not (sentiment_path.exists() and returns_path.exists()):
        print("Missing input files. Run sentiment.py and scraper_financials.py first.")
    else:
        sentiment_df = pd.read_csv(sentiment_path)
        returns_df = pd.read_csv(returns_path)

        merged = merge_sentiment_and_returns(sentiment_df, returns_df)
        merged.to_csv(DATA_DIR / "merged_event_study.csv", index=False)

        if len(merged) > 2:
            correlation_test(merged)
            regression_test(merged)
        else:
            print("Not enough matched events yet — collect more transcripts/tickers.")
