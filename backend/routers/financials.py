from fastapi import APIRouter, HTTPException
from backend.services import multi_source, stock_data

router = APIRouter(prefix="/api/financials", tags=["financials"])


@router.get("/{ticker}/income-statement")
def get_income_statement(ticker: str, period: str = "quarter"):
    data = multi_source.get_fmp_financials(ticker.upper(), "income-statement", period)
    if not data:
        # Fallback to yfinance
        yd = stock_data.get_earnings_data(ticker.upper())
        if yd:
            return yd
        raise HTTPException(status_code=404, detail=f"No income statement data for {ticker}")
    return data


@router.get("/{ticker}/balance-sheet")
def get_balance_sheet(ticker: str, period: str = "quarter"):
    data = multi_source.get_fmp_financials(ticker.upper(), "balance-sheet-statement", period)
    if not data:
        raise HTTPException(status_code=404, detail=f"No balance sheet data for {ticker}")
    return data


@router.get("/{ticker}/cash-flow")
def get_cash_flow(ticker: str, period: str = "quarter"):
    data = multi_source.get_fmp_financials(ticker.upper(), "cash-flow-statement", period)
    if not data:
        raise HTTPException(status_code=404, detail=f"No cash flow data for {ticker}")
    return data


@router.get("/{ticker}/earnings")
def get_earnings(ticker: str):
    # Try FMP first
    data = multi_source.get_fmp_earnings(ticker.upper())
    if data:
        return {"source": "fmp", "data": data}
    # Fallback to yfinance
    yd = stock_data.get_earnings_data(ticker.upper())
    if yd:
        return {"source": "yfinance", "data": yd}
    raise HTTPException(status_code=404, detail=f"No earnings data for {ticker}")


@router.get("/{ticker}/key-metrics")
def get_key_metrics(ticker: str):
    data = multi_source.get_fmp_key_metrics(ticker.upper())
    if not data:
        raise HTTPException(status_code=404, detail=f"No key metrics for {ticker}")
    return data


@router.get("/{ticker}/ratios")
def get_ratios(ticker: str):
    data = multi_source.get_fmp_ratios(ticker.upper())
    if not data:
        raise HTTPException(status_code=404, detail=f"No ratios for {ticker}")
    return data


@router.get("/{ticker}/technical/{indicator}")
def get_technical_indicator(ticker: str, indicator: str = "SMA", time_period: int = 50):
    valid = ["SMA", "EMA", "RSI", "MACD", "BBANDS", "STOCH", "ADX", "CCI", "AROON", "OBV"]
    if indicator.upper() not in valid:
        indicator = "SMA"
    data = multi_source.get_alpha_vantage_indicators(ticker.upper(), indicator.upper(), time_period)
    if not data:
        raise HTTPException(status_code=404, detail=f"No {indicator} data for {ticker}")
    return data


@router.get("/{ticker}/sentiment")
def get_sentiment(ticker: str):
    """Get sentiment from Finnhub + HuggingFace FinBERT analysis of recent news."""
    from backend.services import ai_service, news_service
    finnhub_data = multi_source.get_finnhub_sentiment(ticker.upper())

    # Also get HuggingFace FinBERT sentiment from recent news headlines
    hf_sentiment = None
    try:
        news = news_service.get_stock_news(ticker.upper())
        if news:
            headlines = " | ".join([a.get("title", "") for a in news[:5] if a.get("title")])
            if headlines:
                hf_sentiment = ai_service.get_hf_sentiment(headlines)
    except Exception:
        pass

    return {
        "finnhub": finnhub_data or {},
        "huggingface_finbert": hf_sentiment,
        "source": "Finnhub + HuggingFace FinBERT",
    }


@router.get("/{ticker}/peers")
def get_peers(ticker: str):
    data = multi_source.get_finnhub_peers(ticker.upper())
    if not data:
        return {"peers": []}
    return {"peers": data}


@router.get("/{ticker}/comprehensive")
def get_comprehensive(ticker: str):
    """Get comprehensive data from all sources."""
    return multi_source.get_comprehensive_stock_data(ticker.upper())


@router.get("/macro/dashboard")
def get_macro_data():
    """Get macro economic indicators from FRED."""
    return multi_source.get_macro_dashboard()
