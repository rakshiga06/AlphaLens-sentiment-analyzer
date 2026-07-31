# """
# dashboard.py
# ------------
# Streamlit dashboard to visualize sentiment vs. returns, mirroring the
# layout in your reference design: overall sentiment gauge, sentiment
# over time, sentiment breakdown, and sentiment-vs-return overlay.

# Run with:
#     streamlit run dashboard.py
# """

# import streamlit as st
# import pandas as pd
# import plotly.graph_objects as go
# from pathlib import Path

# DATA_DIR = Path("data")

# st.set_page_config(page_title="Earnings Call Sentiment Dashboard", layout="wide")
# st.title("📊 Earnings Call Sentiment Dashboard")

# merged_path = DATA_DIR / "merged_event_study.csv"

# if not merged_path.exists():
#     st.warning("No data found yet. Run scraper_financials.py → scraper_transcripts.py → sentiment.py → event_study.py first.")
#     st.stop()

# df = pd.read_csv(merged_path)
# df["call_date"] = pd.to_datetime(df["call_date"])

# tickers = sorted(df["ticker"].unique())
# selected_ticker = st.selectbox("Select ticker", tickers)

# sub = df[df["ticker"] == selected_ticker].sort_values("call_date")

# col1, col2 = st.columns([1, 2])

# with col1:
#     latest_score = sub["overall_sentiment"].iloc[-1] if not sub.empty else 0
#     st.metric("Latest Overall Sentiment", f"{latest_score:.2f}",
#                "Positive" if latest_score > 0 else "Negative")

#     fig_gauge = go.Figure(go.Indicator(
#         mode="gauge+number",
#         value=latest_score,
#         gauge={"axis": {"range": [-1, 1]},
#                "bar": {"color": "green" if latest_score > 0 else "red"}},
#         domain={"x": [0, 1], "y": [0, 1]},
#     ))
#     st.plotly_chart(fig_gauge, use_container_width=True)

# with col2:
#     fig = go.Figure()
#     fig.add_trace(go.Scatter(x=sub["call_date"], y=sub["overall_sentiment"],
#                               name="Sentiment Score", line=dict(color="green")))
#     if "next_day_return_pct" in sub.columns:
#         fig.add_trace(go.Scatter(x=sub["call_date"], y=sub["next_day_return_pct"],
#                                   name="Next-Day Return (%)", yaxis="y2",
#                                   line=dict(color="orange")))
#         fig.update_layout(
#             yaxis=dict(title="Sentiment Score"),
#             yaxis2=dict(title="Return (%)", overlaying="y", side="right"),
#         )
#     fig.update_layout(title="Sentiment vs. Stock Return Over Time")
#     st.plotly_chart(fig, use_container_width=True)

# st.subheader("Raw merged data")
# st.dataframe(sub)
