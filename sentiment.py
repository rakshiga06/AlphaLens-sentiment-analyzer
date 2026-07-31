"""
sentiment.py
------------
Runs FinBERT sentiment analysis on transcript sentences and aggregates
scores at the call level and section level (prepared remarks vs Q&A).

FinBERT outputs: positive / negative / neutral with confidence scores.
We convert this into a single continuous score in [-1, 1] for easier
downstream use (e.g., -1 = fully negative, +1 = fully positive).
"""

import pandas as pd
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
from pathlib import Path

DATA_DIR = Path("data")

MODEL_NAME = "ProsusAI/finbert"


def load_finbert():
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
    return pipeline("text-classification", model=model, tokenizer=tokenizer, top_k=None)


def score_to_scalar(scores: list) -> float:
    """
    Convert FinBERT's [{'label': 'positive', 'score': ...}, ...] output
    into a single scalar: positive_score - negative_score.
    """
    d = {s["label"].lower(): s["score"] for s in scores}
    return d.get("positive", 0.0) - d.get("negative", 0.0)


def score_sentences(df: pd.DataFrame, text_col: str = "sentence", batch_size: int = 16) -> pd.DataFrame:
    """
    Run FinBERT on every row of a sentence-level dataframe.
    Adds a `sentiment_score` column in range [-1, 1].
    """
    clf = load_finbert()
    texts = df[text_col].fillna("").tolist()

    scores = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        results = clf(batch, truncation=True, max_length=512)
        scores.extend([score_to_scalar(r) for r in results])

    df = df.copy()
    df["sentiment_score"] = scores
    return df


def aggregate_call_sentiment(df: pd.DataFrame) -> pd.DataFrame:
    """
    Roll sentence-level sentiment up to call level and section level.
    Produces a wide summary: overall score, prepared-remarks score,
    Q&A score, and the gap between them (a key novelty feature — see
    README for why this matters).
    """
    group_cols = ["ticker", "call_date"]

    overall = df.groupby(group_cols)["sentiment_score"].mean().rename("overall_sentiment")

    by_section = (
        df.groupby(group_cols + ["section"])["sentiment_score"]
        .mean()
        .unstack("section")
        .rename(columns={"prepared_remarks": "prepared_remarks_sentiment", "qa": "qa_sentiment"})
    )

    summary = pd.concat([overall, by_section], axis=1).reset_index()

    if "prepared_remarks_sentiment" in summary.columns and "qa_sentiment" in summary.columns:
        summary["tone_gap"] = summary["qa_sentiment"] - summary["prepared_remarks_sentiment"]

    return summary


if __name__ == "__main__":
    # Example run — expects a sentence-level CSV produced by scraper_transcripts.py
    input_path = DATA_DIR / "AAPL_2024-05-02_sentences.csv"

    if not input_path.exists():
        print(f"No input found at {input_path}. Run scraper_transcripts.py first.")
    else:
        df = pd.read_csv(input_path)
        scored = score_sentences(df)
        scored.to_csv(DATA_DIR / "sentences_scored.csv", index=False)

        summary = aggregate_call_sentiment(scored)
        summary.to_csv(DATA_DIR / "call_sentiment_summary.csv", index=False)
        print(summary.head())
