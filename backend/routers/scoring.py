from fastapi import APIRouter, HTTPException
from concurrent.futures import ThreadPoolExecutor, as_completed
from backend.services import stock_data, cache
from backend.services.scoring_engine import compute_score
from backend.data.sp500_tickers import ALL_TICKERS, SP500_TICKERS
from backend import config

router = APIRouter(prefix="/api/scoring", tags=["scoring"])


@router.get("/{ticker}")
def get_score(ticker: str):
    ticker = ticker.upper()
    key = f"score:{ticker}"
    cached = cache.get(key, config.CACHE_TTL_SCORING)
    if cached:
        return cached

    info = stock_data.get_stock_info(ticker)
    if not info:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")

    history = stock_data.get_price_history(ticker, "1y")
    score = compute_score(info, history)
    score["ticker"] = ticker
    cache.set(key, score)
    return score


def _score_one_ticker(ticker: str, sector_filter: str = None):
    """Score a single ticker — returns dict or None. Used for parallel execution."""
    try:
        info = stock_data.get_stock_info(ticker)
        if not info:
            return None
        if sector_filter and info.get("sector", "").lower() != sector_filter.lower():
            return None
        history = stock_data.get_price_history(ticker, "1y")
        score = compute_score(info, history)
        return {
            "ticker": ticker,
            "name": info.get("shortName", info.get("longName", ticker)),
            "price": info.get("regularMarketPrice") or info.get("currentPrice"),
            "change": info.get("regularMarketChange", 0),
            "changePercent": info.get("regularMarketChangePercent", 0),
            "sector": info.get("sector", "N/A"),
            "marketCap": info.get("marketCap", 0),
            **score,
        }
    except Exception:
        return None


@router.get("/top/ranked")
def top_stocks(limit: int = 20, sector: str = None):
    key = f"top:{limit}:{sector or 'all'}"
    cached = cache.get(key, config.CACHE_TTL_SCORING)
    if cached:
        return cached

    # Smaller pool + parallel fetch = dramatically faster cold start.
    # 50 popular tickers × 16 workers ≈ 3-4s instead of 30-60s.
    popular = SP500_TICKERS[:50]
    results = []

    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = {executor.submit(_score_one_ticker, t, sector): t for t in popular}
        for f in as_completed(futures, timeout=45):
            try:
                r = f.result()
                if r:
                    results.append(r)
            except Exception:
                continue

    results.sort(key=lambda x: x.get("composite", 0), reverse=True)
    results = results[:limit]
    cache.set(key, results)
    return results
