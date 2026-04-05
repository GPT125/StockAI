from fastapi import APIRouter
from backend.services import stock_data, cache, market_summary
from backend import config
from backend.data.sp500_tickers import SECTOR_ETFS
from concurrent.futures import ThreadPoolExecutor, as_completed

router = APIRouter(prefix="/api/market", tags=["market"])

INDEX_TICKERS = {
    "S&P 500": "^GSPC",
    "NASDAQ": "^IXIC",
    "Dow Jones": "^DJI",
    "Russell 2000": "^RUT",
}


@router.get("/overview")
def market_overview():
    cached = cache.get("market:overview", config.CACHE_TTL_MARKET)
    if cached:
        return cached

    def _fetch_index(name, ticker):
        try:
            info = stock_data.get_stock_info(ticker)
            if info:
                return {
                    "name": name,
                    "ticker": ticker,
                    "price": info.get("regularMarketPrice") or info.get("previousClose"),
                    "change": info.get("regularMarketChange", 0),
                    "changePercent": info.get("regularMarketChangePercent", 0),
                }
        except Exception:
            pass
        return None

    indices = []
    # Fetch all 4 indices in parallel (was sequential → ~4× faster cold)
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(_fetch_index, n, t) for n, t in INDEX_TICKERS.items()]
        for f in as_completed(futures, timeout=15):
            result = f.result()
            if result:
                indices.append(result)
    # Preserve original ordering (S&P, NASDAQ, Dow, Russell)
    order = list(INDEX_TICKERS.keys())
    indices.sort(key=lambda x: order.index(x["name"]) if x["name"] in order else 99)

    cache.set("market:overview", indices)
    return indices


@router.get("/sectors")
def sector_performance():
    cached = cache.get("market:sectors", config.CACHE_TTL_MARKET)
    if cached and len(cached) >= 5:  # only use cache if we have meaningful data
        return cached

    def _fetch_sector(sector_name, etf):
        try:
            info = stock_data.get_stock_info(etf)
            if info:
                return {
                    "sector": sector_name,
                    "etf": etf,
                    "price": info.get("regularMarketPrice") or info.get("previousClose"),
                    "change": info.get("regularMarketChange", 0),
                    "changePercent": info.get("regularMarketChangePercent", 0),
                }
        except Exception:
            pass
        return None

    sectors = []
    # Fetch all sector ETFs in parallel for speed and reliability
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(_fetch_sector, name, etf): name for name, etf in SECTOR_ETFS.items()}
        for future in as_completed(futures, timeout=20):
            result = future.result()
            if result:
                sectors.append(result)

    # Sort by sector name for consistent ordering
    sectors.sort(key=lambda x: x["sector"])

    if sectors:
        cache.set("market:sectors", sectors)
    return sectors


@router.get("/summary")
def get_market_summary(force: bool = False):
    return market_summary.get_market_summary(force=force)


# In-memory storage for market summary settings (per-session)
_summary_settings = {
    "frequency": "daily",
    "includeGovernment": True,
    "includeRecommendations": True,
}


@router.get("/summary/settings")
def get_summary_settings():
    return _summary_settings


@router.post("/summary/settings")
def update_summary_settings(settings: dict):
    global _summary_settings
    if "frequency" in settings:
        valid = ["realtime", "hourly", "daily", "weekly", "monthly"]
        if settings["frequency"] in valid:
            _summary_settings["frequency"] = settings["frequency"]
    if "includeGovernment" in settings:
        _summary_settings["includeGovernment"] = bool(settings["includeGovernment"])
    if "includeRecommendations" in settings:
        _summary_settings["includeRecommendations"] = bool(settings["includeRecommendations"])
    return _summary_settings
