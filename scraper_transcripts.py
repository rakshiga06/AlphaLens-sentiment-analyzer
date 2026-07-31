"""
scraper_transcripts.py
------------------------
Fetches and structures earnings call transcripts from Seeking Alpha and other sources.

Target URL: https://seekingalpha.com/earnings/earnings-call-transcripts

IMPORTANT: Seeking Alpha enforces Cloudflare / anti-bot protection.
This script provides:
  1. `fetch_transcript_html()` with `curl_cffi` browser impersonation + headers,
     and support for reading local `.html` files (e.g., saved browser pages).
  2. `extract_seeking_alpha_links()` to find transcript article URLs from the main list.
  3. `parse_seeking_alpha_transcript()` to structure raw transcript HTML into turns:
     (ticker, call_date, speaker, section, text).
  4. `sentence_split()` to explode paragraph-level turns into sentence-level rows for FinBERT.
"""

import re
from pathlib import Path
import pandas as pd
from bs4 import BeautifulSoup

# Try importing curl_cffi for browser impersonation (bypasses basic TLS fingerprinting)
try:
    from curl_cffi import requests as cffi_requests
    HAS_CURL_CFFI = True
except ImportError:
    HAS_CURL_CFFI = False
    import requests

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

SEEKING_ALPHA_TRANSCRIPTS_URL = "https://seekingalpha.com/earnings/earnings-call-transcripts"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def fetch_transcript_html(url_or_path: str) -> str:
    """
    Fetch raw HTML for a transcript page or list page.
    Supports both HTTP URLs and local `.html` file paths.
    """
    path = Path(url_or_path)
    if path.exists() and path.is_file():
        print(f"Reading local HTML file: {url_or_path}")
        return path.read_text(encoding="utf-8", errors="ignore")

    print(f"Fetching URL: {url_or_path}")
    if HAS_CURL_CFFI:
        resp = cffi_requests.get(url_or_path, headers=HEADERS, impersonate="chrome120", timeout=20)
    else:
        resp = requests.get(url_or_path, headers=HEADERS, timeout=20)

    if resp.status_code == 403:
        raise RuntimeError(
            f"HTTP 403 Forbidden received from {url_or_path}.\n"
            "Seeking Alpha uses Cloudflare/anti-bot protection.\n"
            "Workarounds:\n"
            "  1. Open the page in your browser, save it as HTML (e.g. `data/transcript.html`), "
            "and pass the file path to `fetch_transcript_html('data/transcript.html')`.\n"
            "  2. Use browser automation (e.g. Playwright/Selenium) with active session cookies."
        )

    resp.raise_for_status()
    return resp.text


def extract_seeking_alpha_links(html: str) -> list:
    """
    Parse the Seeking Alpha earnings call transcripts index page HTML
    (e.g., https://seekingalpha.com/earnings/earnings-call-transcripts)
    to extract transcript article links and metadata.
    """
    soup = BeautifulSoup(html, "html.parser")
    links = []

    # Seeking Alpha article links usually contain /article/
    for a in soup.find_all("a", href=re.compile(r"/article/")):
        title = a.get_text(strip=True)
        href = a.get("href")
        if not href.startswith("http"):
            href = f"https://seekingalpha.com{href}"

        # Heuristic to filter earnings call transcript titles
        if "transcript" in title.lower() or "earnings call" in title.lower():
            # Extract ticker if present in title, e.g. (AAPL) or (NASDAQ:AAPL)
            ticker_match = re.search(r"\((?:[A-Z]+:)?([A-Z]{1,5})\)", title)
            ticker = ticker_match.group(1) if ticker_match else None

            links.append({
                "title": title,
                "url": href,
                "ticker": ticker
            })

    # Deduplicate links by URL
    seen = set()
    unique_links = []
    for item in links:
        if item["url"] not in seen:
            seen.add(item["url"])
            unique_links.append(item)

    return unique_links


def parse_seeking_alpha_transcript(
    html: str, ticker: str = None, call_date: str = None
) -> pd.DataFrame:
    """
    Parse a Seeking Alpha transcript page into structured turns:
    (ticker, call_date, speaker, section, text).
    """
    soup = BeautifulSoup(html, "html.parser")

    # Extract ticker from page title if not provided
    if not ticker:
        title_text = soup.title.get_text() if soup.title else ""
        ticker_match = re.search(r"\((?:[A-Z]+:)?([A-Z]{1,5})\)", title_text)
        ticker = ticker_match.group(1) if ticker_match else "UNKNOWN"

    # Extract call date if available
    if not call_date:
        time_tag = soup.find("time")
        if time_tag and time_tag.get_text():
            call_date = time_tag.get_text(strip=True)[:10]
        else:
            call_date = "UNKNOWN"

    # Find main article content container
    content_div = (
        soup.find("div", {"data-test-id": "article-content"})
        or soup.find("div", class_=re.compile(r"article|content|sa-art"))
        or soup
    )

    paragraphs = content_div.find_all(["p", "h3", "h4"])

    rows = []
    current_speaker = "Unknown"
    current_section = "prepared_remarks"

    for element in paragraphs:
        text = element.get_text(strip=True)
        if not text:
            continue

        # Check for section transitions
        if re.search(r"question-and-answer|Q&A|Question-and-Answer Session", text, re.I):
            current_section = "qa"
            continue
        elif re.search(r"prepared remarks|executive remarks", text, re.I):
            current_section = "prepared_remarks"
            continue

        # Check if element has a strong tag (Seeking Alpha speaker headers)
        strong_tag = element.find(["strong", "b"])
        if strong_tag:
            speaker_candidate = strong_tag.get_text(strip=True).rstrip(":")
            # If the strong tag covers most of the paragraph text, treat as speaker header
            if len(speaker_candidate) > 2 and len(speaker_candidate) < 60:
                # Exclude section titles
                if not re.search(r"company participants|executives|analysts|call participants", speaker_candidate, re.I):
                    current_speaker = speaker_candidate
                    # Text remaining after speaker name
                    remaining_text = text[len(speaker_candidate):].strip().lstrip(":- ")
                    if remaining_text:
                        rows.append({
                            "ticker": ticker,
                            "call_date": call_date,
                            "speaker": current_speaker,
                            "section": current_section,
                            "text": remaining_text,
                        })
                    continue

        # Regex heuristic fallback for "Speaker Name: remark text"
        speaker_match = re.match(r"^([A-Z][a-zA-Z.\s]{2,40}):\s*(.*)", text)
        if speaker_match:
            current_speaker = speaker_match.group(1).strip()
            text = speaker_match.group(2).strip()

        if text:
            rows.append({
                "ticker": ticker,
                "call_date": call_date,
                "speaker": current_speaker,
                "section": current_section,
                "text": text,
            })

    return pd.DataFrame(rows)


def parse_transcript(html: str, ticker: str, call_date: str) -> pd.DataFrame:
    """Generic parser wrapper for backward compatibility."""
    return parse_seeking_alpha_transcript(html, ticker=ticker, call_date=call_date)


def sentence_split(df: pd.DataFrame) -> pd.DataFrame:
    """Explode paragraph-level rows into sentence-level rows for finer-grained sentiment."""
    import nltk
    try:
        nltk.data.find("tokenizers/punkt_tab")
    except LookupError:
        nltk.download("punkt_tab", quiet=True)

    from nltk.tokenize import sent_tokenize

    records = []
    for _, row in df.iterrows():
        for sent in sent_tokenize(str(row["text"])):
            r = row.to_dict()
            r["sentence"] = sent
            records.append(r)

    return pd.DataFrame(records)


if __name__ == "__main__":
    # --- Seeking Alpha Earnings Transcripts Scraper ---
    print(f"Target URL: {SEEKING_ALPHA_TRANSCRIPTS_URL}")
    ticker = "AAPL"
    call_date = "2024-05-02"

    try:
        html = fetch_transcript_html(SEEKING_ALPHA_TRANSCRIPTS_URL)
        print("Successfully fetched Seeking Alpha transcripts listing page HTML.")

        # Extract transcript article links from index
        transcript_links = extract_seeking_alpha_links(html)
        print(f"Found {len(transcript_links)} transcript article links.")
        for item in transcript_links[:3]:
            print(f" - [{item.get('ticker')}] {item.get('title')}: {item.get('url')}")

        if transcript_links:
            target_link = transcript_links[0]["url"]
            print(f"\nFetching top transcript: {target_link}")
            article_html = fetch_transcript_html(target_link)
            actual_ticker = transcript_links[0]["ticker"] or ticker
            df = parse_seeking_alpha_transcript(article_html, ticker=actual_ticker, call_date=call_date)
            df.to_csv(DATA_DIR / f"{actual_ticker}_{call_date}_transcript.csv", index=False)
            print(f"Saved {len(df)} turns to {DATA_DIR / f'{actual_ticker}_{call_date}_transcript.csv'}")

            sentences = sentence_split(df)
            sentences.to_csv(DATA_DIR / f"{actual_ticker}_{call_date}_sentences.csv", index=False)
            print(f"Saved {len(sentences)} sentences to {DATA_DIR / f'{actual_ticker}_{call_date}_sentences.csv'}")

    except Exception as e:
        print(f"\nNote on scraping Seeking Alpha: {e}")
        print("\nTip: If blocked by Cloudflare (403), save the transcript HTML locally into `data/sa_transcript.html` and parse it:")
        print("    html = fetch_transcript_html('data/sa_transcript.html')")
        print("    df = parse_seeking_alpha_transcript(html, ticker='AAPL', call_date='2024-05-02')")
