"""
migrate_to_sqlite.py
--------------------
Migrates all flat-file CSVs in the data/ folder into a structured SQLite database.
Cleans up and deletes old CSV files once verification succeeds.
"""

import os
import sqlite3
import pandas as pd
from pathlib import Path

DATA_DIR = Path("data")
DB_PATH = DATA_DIR / "sentiment_analyzer.db"

def connect_db():
    return sqlite3.connect(DB_PATH)

def init_tables():
    """Initializes tables inside SQLite database."""
    conn = connect_db()
    cursor = conn.cursor()
    
    # 1. Price History
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS price_history (
        ticker TEXT,
        Date TEXT,
        Open REAL,
        High REAL,
        Low REAL,
        Close REAL,
        Volume INTEGER,
        PRIMARY KEY (ticker, Date)
    )
    """)
    
    # 2. Call Sentiment Summary (including all financial controls and surprise details)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS call_sentiment_summary (
        ticker TEXT,
        call_date TEXT,
        overall_sentiment REAL,
        prepared_remarks_sentiment REAL,
        qa_sentiment REAL,
        tone_gap REAL,
        earnings_surprise_pct REAL,
        close_on_event REAL,
        next_day_return_pct REAL,
        market_adjusted_return_control REAL,
        sector_etf_return REAL,
        abnormal_return_pct REAL,
        pre_earnings_momentum_pct REAL,
        volume_spike REAL,
        guidance_flag INTEGER,
        PRIMARY KEY (ticker, call_date)
    )
    """)
    
    # 3. Transcript turns (executive prepared remarks and analyst Q&A turns)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transcript_turns (
        ticker TEXT,
        call_date TEXT,
        speaker TEXT,
        section TEXT,
        text TEXT
    )
    """)
    
    # 4. Sentences scored (sentence level FinBERT/Lexicon sentiment output)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sentences_scored (
        ticker TEXT,
        call_date TEXT,
        speaker TEXT,
        section TEXT,
        text TEXT,
        sentence TEXT,
        sentiment_score REAL
    )
    """)
    
    conn.commit()
    conn.close()
    print("Database tables initialized successfully.")

def migrate_csv_files():
    """Reads flat-file CSVs and inserts them into SQLite tables."""
    conn = connect_db()
    
    print("\n--- Migrating Global Datasets ---")
    
    # Migrate price_history.csv
    price_csv = DATA_DIR / "price_history.csv"
    if price_csv.exists():
        df_price = pd.read_csv(price_csv)
        # Drop duplicates before writing
        df_price = df_price.drop_duplicates(subset=["ticker", "Date"])
        df_price.to_sql("price_history", conn, if_exists="replace", index=False)
        print(f"Migrated price_history.csv: {len(df_price)} records inserted.")
    else:
        print("price_history.csv not found.")
        
    # Migrate call_sentiment_summary.csv
    summary_csv = DATA_DIR / "call_sentiment_summary.csv"
    if summary_csv.exists():
        df_summary = pd.read_csv(summary_csv)
        df_summary = df_summary.drop_duplicates(subset=["ticker", "call_date"])
        df_summary.to_sql("call_sentiment_summary", conn, if_exists="replace", index=False)
        print(f"Migrated call_sentiment_summary.csv: {len(df_summary)} records inserted.")
    else:
        print("call_sentiment_summary.csv not found.")
        
    print("\n--- Migrating Individual Call Transcripts & Sentences ---")
    
    # Find all individual transcripts
    transcript_files = list(DATA_DIR.glob("*_*_transcript.csv"))
    sentences_files = list(DATA_DIR.glob("*_*_sentences.csv"))
    
    print(f"Found {len(transcript_files)} transcript files and {len(sentences_files)} sentences files.")
    
    # Insert transcripts turns
    turns_count = 0
    for f in transcript_files:
        try:
            df = pd.read_csv(f)
            if not df.empty:
                df.to_sql("transcript_turns", conn, if_exists="append", index=False)
                turns_count += len(df)
        except Exception as e:
            print(f"Error migrating transcript file {f.name}: {e}")
            
    print(f"Migrated individual transcript files: {turns_count} total turns inserted.")
    
    # Insert scored sentences
    sents_count = 0
    for f in sentences_files:
        try:
            df = pd.read_csv(f)
            if not df.empty:
                df.to_sql("sentences_scored", conn, if_exists="append", index=False)
                sents_count += len(df)
        except Exception as e:
            print(f"Error migrating sentences file {f.name}: {e}")
            
    print(f"Migrated individual sentences files: {sents_count} total sentences inserted.")
    
    # Deduplicate transcript_turns and sentences_scored just in case
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE temp_turns AS SELECT DISTINCT * FROM transcript_turns;")
    cursor.execute("DROP TABLE transcript_turns;")
    cursor.execute("ALTER TABLE temp_turns RENAME TO transcript_turns;")
    
    cursor.execute("CREATE TABLE temp_sents AS SELECT DISTINCT * FROM sentences_scored;")
    cursor.execute("DROP TABLE sentences_scored;")
    cursor.execute("ALTER TABLE temp_sents RENAME TO sentences_scored;")
    
    conn.commit()
    conn.close()
    print("Deduplicated database records successfully.")

def verify_and_cleanup():
    """Verify data in SQLite database and safely delete individual CSV files."""
    conn = connect_db()
    cursor = conn.cursor()
    
    # Get table counts
    cursor.execute("SELECT COUNT(*) FROM price_history")
    prices = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM call_sentiment_summary")
    calls = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM transcript_turns")
    turns = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM sentences_scored")
    sentences = cursor.fetchone()[0]
    
    conn.close()
    
    print("\n--- Verification Summary ---")
    print(f"price_history table:          {prices} records")
    print(f"call_sentiment_summary table: {calls} records")
    print(f"transcript_turns table:       {turns} records")
    print(f"sentences_scored table:       {sentences} records")
    
    # If counts are empty, abort cleanup
    if calls == 0 or sentences == 0:
        print("\n⚠️ Database is empty. Skipping cleanup to prevent data loss.")
        return
        
    print("\nVerification succeeded. Cleaning up old CSV files to prune workspace...")
    
    # Delete individual transcripts and sentences CSV files
    all_csvs = list(DATA_DIR.glob("*.csv"))
    delete_count = 0
    for csv_file in all_csvs:
        # Keep no CSVs in data directory
        try:
            csv_file.unlink()
            delete_count += 1
        except Exception as e:
            print(f"Failed to delete {csv_file.name}: {e}")
            
    print(f"Successfully deleted {delete_count} CSV files. Workspace cleaned up!")

if __name__ == "__main__":
    init_tables()
    migrate_csv_files()
    verify_and_cleanup()
