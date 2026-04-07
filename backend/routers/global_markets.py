"""Global markets router — international indices, currencies, commodities, crypto, bonds, and world events."""
import time
from fastapi import APIRouter
from concurrent.futures import ThreadPoolExecutor, as_completed
from backend.services import stock_data, cache, news_service
from backend import config

router = APIRouter(prefix="/api/global", tags=["global"])

# ── World Indices by region ──
REGIONS = {
    "Americas": [
        {"ticker": "^GSPC",   "name": "S&P 500",           "flag": "🇺🇸", "currency": "USD", "country": "United States", "exchange": "NYSE"},
        {"ticker": "^DJI",    "name": "Dow Jones",          "flag": "🇺🇸", "currency": "USD", "country": "United States", "exchange": "NYSE"},
        {"ticker": "^IXIC",   "name": "NASDAQ",             "flag": "🇺🇸", "currency": "USD", "country": "United States", "exchange": "NASDAQ"},
        {"ticker": "^GSPTSE", "name": "S&P/TSX",            "flag": "🇨🇦", "currency": "CAD", "country": "Canada",        "exchange": "TSX"},
        {"ticker": "^BVSP",   "name": "Bovespa",            "flag": "🇧🇷", "currency": "BRL", "country": "Brazil",        "exchange": "B3"},
        {"ticker": "^MXX",    "name": "IPC Mexico",          "flag": "🇲🇽", "currency": "MXN", "country": "Mexico",        "exchange": "BMV"},
        {"ticker": "^MERV",   "name": "MERVAL",             "flag": "🇦🇷", "currency": "ARS", "country": "Argentina",     "exchange": "BCBA"},
    ],
    "Europe": [
        {"ticker": "^FTSE",      "name": "FTSE 100",       "flag": "🇬🇧", "currency": "GBP", "country": "United Kingdom", "exchange": "LSE"},
        {"ticker": "^GDAXI",     "name": "DAX",            "flag": "🇩🇪", "currency": "EUR", "country": "Germany",        "exchange": "XETRA"},
        {"ticker": "^FCHI",      "name": "CAC 40",         "flag": "🇫🇷", "currency": "EUR", "country": "France",         "exchange": "Euronext"},
        {"ticker": "^SSMI",      "name": "SMI",            "flag": "🇨🇭", "currency": "CHF", "country": "Switzerland",    "exchange": "SIX"},
        {"ticker": "^AEX",       "name": "AEX",            "flag": "🇳🇱", "currency": "EUR", "country": "Netherlands",    "exchange": "Euronext"},
        {"ticker": "^IBEX",      "name": "IBEX 35",        "flag": "🇪🇸", "currency": "EUR", "country": "Spain",          "exchange": "BME"},
        {"ticker": "FTSEMIB.MI", "name": "FTSE MIB",       "flag": "🇮🇹", "currency": "EUR", "country": "Italy",          "exchange": "Borsa Italiana"},
        {"ticker": "^STOXX50E",  "name": "Euro Stoxx 50",  "flag": "🇪🇺", "currency": "EUR", "country": "Eurozone",       "exchange": "Eurex"},
        {"ticker": "IMOEX.ME",   "name": "MOEX",           "flag": "🇷🇺", "currency": "RUB", "country": "Russia",         "exchange": "MOEX"},
    ],
    "Asia-Pacific": [
        {"ticker": "^N225",    "name": "Nikkei 225",         "flag": "🇯🇵", "currency": "JPY", "country": "Japan",         "exchange": "TSE"},
        {"ticker": "^HSI",     "name": "Hang Seng",          "flag": "🇭🇰", "currency": "HKD", "country": "Hong Kong",     "exchange": "HKEX"},
        {"ticker": "000001.SS","name": "Shanghai Composite",  "flag": "🇨🇳", "currency": "CNY", "country": "China",         "exchange": "SSE"},
        {"ticker": "^KS11",   "name": "KOSPI",               "flag": "🇰🇷", "currency": "KRW", "country": "South Korea",   "exchange": "KRX"},
        {"ticker": "^BSESN",  "name": "BSE Sensex",          "flag": "🇮🇳", "currency": "INR", "country": "India",         "exchange": "BSE"},
        {"ticker": "^AXJO",   "name": "ASX 200",             "flag": "🇦🇺", "currency": "AUD", "country": "Australia",     "exchange": "ASX"},
        {"ticker": "^TWII",   "name": "TAIEX",               "flag": "🇹🇼", "currency": "TWD", "country": "Taiwan",        "exchange": "TWSE"},
        {"ticker": "^STI",    "name": "Straits Times",       "flag": "🇸🇬", "currency": "SGD", "country": "Singapore",     "exchange": "SGX"},
        {"ticker": "^JKSE",   "name": "Jakarta Composite",   "flag": "🇮🇩", "currency": "IDR", "country": "Indonesia",     "exchange": "IDX"},
        {"ticker": "^NZ50",   "name": "NZX 50",              "flag": "🇳🇿", "currency": "NZD", "country": "New Zealand",   "exchange": "NZX"},
    ],
    "Middle East & Africa": [
        {"ticker": "^TA125.TA", "name": "TA-125",           "flag": "🇮🇱", "currency": "ILS", "country": "Israel",        "exchange": "TASE"},
        {"ticker": "^TASI",     "name": "Tadawul",          "flag": "🇸🇦", "currency": "SAR", "country": "Saudi Arabia",  "exchange": "Tadawul"},
        {"ticker": "^J203.JO",  "name": "JSE All Share",    "flag": "🇿🇦", "currency": "ZAR", "country": "South Africa",  "exchange": "JSE"},
    ],
}

CURRENCY_PAIRS = {
    "EUR/USD": "EURUSD=X",
    "GBP/USD": "GBPUSD=X",
    "USD/JPY": "JPY=X",
    "USD/CNY": "CNY=X",
    "USD/CAD": "CAD=X",
    "AUD/USD": "AUDUSD=X",
    "USD/CHF": "CHF=X",
    "USD/INR": "INR=X",
    "NZD/USD": "NZDUSD=X",
    "USD/SGD": "SGD=X",
    "USD/KRW": "KRW=X",
    "USD/BRL": "BRL=X",
}

COMMODITIES = {
    "Energy": [
        {"name": "Crude Oil (WTI)", "ticker": "CL=F"},
        {"name": "Brent Oil",       "ticker": "BZ=F"},
        {"name": "Natural Gas",     "ticker": "NG=F"},
        {"name": "Heating Oil",     "ticker": "HO=F"},
    ],
    "Metals": [
        {"name": "Gold",     "ticker": "GC=F"},
        {"name": "Silver",   "ticker": "SI=F"},
        {"name": "Copper",   "ticker": "HG=F"},
        {"name": "Platinum", "ticker": "PL=F"},
    ],
    "Agriculture": [
        {"name": "Corn",     "ticker": "ZC=F"},
        {"name": "Wheat",    "ticker": "ZW=F"},
        {"name": "Soybeans", "ticker": "ZS=F"},
        {"name": "Coffee",   "ticker": "KC=F"},
    ],
}

CRYPTO = {
    "Bitcoin":  "BTC-USD",
    "Ethereum": "ETH-USD",
    "Solana":   "SOL-USD",
    "XRP":      "XRP-USD",
    "Cardano":  "ADA-USD",
    "Dogecoin": "DOGE-USD",
}

BONDS = {
    "US 2-Year":      "^IRX",
    "US 10-Year":     "^TNX",
    "US 30-Year":     "^TYX",
}

FUTURES = {
    "S&P 500 Futures":  "ES=F",
    "NASDAQ Futures":   "NQ=F",
    "Dow Futures":      "YM=F",
    "Russell Futures":  "RTY=F",
}

# Market hours (UTC) — used for open/closed status
MARKET_HOURS = {
    "NYSE":             {"open": 13.5, "close": 20,    "tz": "ET"},
    "NASDAQ":           {"open": 13.5, "close": 20,    "tz": "ET"},
    "LSE":              {"open": 8,    "close": 16.5,  "tz": "GMT"},
    "XETRA":            {"open": 8,    "close": 16.5,  "tz": "CET"},
    "Euronext":         {"open": 8,    "close": 16.5,  "tz": "CET"},
    "TSE":              {"open": 0,    "close": 6,     "tz": "JST"},
    "HKEX":             {"open": 1.5,  "close": 8,     "tz": "HKT"},
    "SSE":              {"open": 1.5,  "close": 7,     "tz": "CST"},
    "KRX":              {"open": 0,    "close": 6.5,   "tz": "KST"},
    "BSE":              {"open": 3.75, "close": 10,    "tz": "IST"},
    "ASX":              {"open": 0,    "close": 6,     "tz": "AEST"},
    "TSX":              {"open": 13.5, "close": 20,    "tz": "ET"},
    "B3":               {"open": 13,   "close": 20,    "tz": "BRT"},
    "BMV":              {"open": 14.5, "close": 21,    "tz": "CT"},
}


def _fetch_quote(label, ticker, extra=None):
    try:
        info = stock_data.get_stock_info(ticker)
        if not info:
            return None
        result = {
            "label": label,
            "ticker": ticker,
            "price": info.get("regularMarketPrice") or info.get("previousClose"),
            "change": info.get("regularMarketChange", 0),
            "changePercent": info.get("regularMarketChangePercent", 0),
            "previousClose": info.get("previousClose"),
            "dayHigh": info.get("dayHigh"),
            "dayLow": info.get("dayLow"),
            "volume": info.get("volume") or info.get("regularMarketVolume"),
            "fiftyTwoWeekHigh": info.get("fiftyTwoWeekHigh"),
            "fiftyTwoWeekLow": info.get("fiftyTwoWeekLow"),
            "marketCap": info.get("marketCap"),
        }
        if extra:
            result.update(extra)
        return result
    except Exception:
        return None


def _get_market_status(exchange):
    """Determine if a market is currently open based on UTC time."""
    import datetime
    now = datetime.datetime.utcnow()
    weekday = now.weekday()
    if weekday >= 5:  # Weekend
        return "closed"
    hours = MARKET_HOURS.get(exchange)
    if not hours:
        return "unknown"
    utc_hour = now.hour + now.minute / 60
    if hours["open"] <= utc_hour < hours["close"]:
        return "open"
    return "closed"


@router.get("/indices")
def world_indices():
    cached = cache.get("global:indices:v2", 300)
    if cached:
        return cached

    results = {}
    all_items = []
    for region, items in REGIONS.items():
        for item in items:
            all_items.append((region, item))

    with ThreadPoolExecutor(max_workers=12) as ex:
        futures = {}
        for region, item in all_items:
            f = ex.submit(_fetch_quote, item["country"], item["ticker"], {
                "name": item["name"], "flag": item["flag"],
                "currency": item["currency"], "country": item["country"],
                "exchange": item["exchange"],
                "status": _get_market_status(item["exchange"]),
                "region": region,
            })
            futures[f] = region

        for f in as_completed(futures, timeout=30):
            r = f.result()
            if r:
                region = r["region"]
                if region not in results:
                    results[region] = []
                results[region].append(r)

    cache.set("global:indices:v2", results)
    return results


@router.get("/currencies")
def currencies():
    cached = cache.get("global:currencies:v2", 300)
    if cached:
        return cached

    results = []
    with ThreadPoolExecutor(max_workers=12) as ex:
        futures = [ex.submit(_fetch_quote, pair, ticker) for pair, ticker in CURRENCY_PAIRS.items()]
        for f in as_completed(futures, timeout=20):
            r = f.result()
            if r:
                results.append(r)
    cache.set("global:currencies:v2", results)
    return results


@router.get("/commodities")
def commodities_endpoint():
    cached = cache.get("global:commodities:v2", 300)
    if cached:
        return cached

    results = {}
    all_items = []
    for category, items in COMMODITIES.items():
        for item in items:
            all_items.append((category, item))

    with ThreadPoolExecutor(max_workers=12) as ex:
        futures = {}
        for category, item in all_items:
            f = ex.submit(_fetch_quote, item["name"], item["ticker"], {"category": category})
            futures[f] = category

        for f in as_completed(futures, timeout=20):
            r = f.result()
            if r:
                cat = r.get("category", "Other")
                if cat not in results:
                    results[cat] = []
                results[cat].append(r)

    cache.set("global:commodities:v2", results)
    return results


@router.get("/crypto")
def crypto():
    cached = cache.get("global:crypto", 120)
    if cached:
        return cached

    results = []
    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = [ex.submit(_fetch_quote, name, ticker) for name, ticker in CRYPTO.items()]
        for f in as_completed(futures, timeout=20):
            r = f.result()
            if r:
                results.append(r)
    cache.set("global:crypto", results)
    return results


@router.get("/bonds")
def bonds():
    cached = cache.get("global:bonds", 300)
    if cached:
        return cached

    results = []
    with ThreadPoolExecutor(max_workers=4) as ex:
        futures = [ex.submit(_fetch_quote, name, ticker) for name, ticker in BONDS.items()]
        for f in as_completed(futures, timeout=15):
            r = f.result()
            if r:
                results.append(r)
    cache.set("global:bonds", results)
    return results


@router.get("/futures")
def futures():
    cached = cache.get("global:futures", 120)
    if cached:
        return cached

    results = []
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = [ex.submit(_fetch_quote, name, ticker) for name, ticker in FUTURES.items()]
        for f in as_completed(futs, timeout=15):
            r = f.result()
            if r:
                results.append(r)
    cache.set("global:futures", results)
    return results


@router.get("/fear-greed")
def fear_greed():
    """VIX-based fear & greed approximation."""
    cached = cache.get("global:fear-greed", 300)
    if cached:
        return cached

    try:
        vix_info = stock_data.get_stock_info("^VIX")
        vix = vix_info.get("regularMarketPrice", 20) if vix_info else 20
        vix_change = vix_info.get("regularMarketChangePercent", 0) if vix_info else 0

        # Map VIX to 0-100 score (inverted: low VIX = high greed)
        if vix <= 12:
            score, label = 90, "Extreme Greed"
        elif vix <= 17:
            score, label = 72, "Greed"
        elif vix <= 22:
            score, label = 50, "Neutral"
        elif vix <= 30:
            score, label = 30, "Fear"
        else:
            score, label = 10, "Extreme Fear"

        result = {
            "score": score,
            "label": label,
            "vix": round(vix, 2),
            "vixChange": round(vix_change, 2),
        }
        cache.set("global:fear-greed", result)
        return result
    except Exception:
        return {"score": 50, "label": "Neutral", "vix": 20, "vixChange": 0}


@router.get("/dxy")
def dollar_index():
    """US Dollar Index (DXY)."""
    cached = cache.get("global:dxy", 300)
    if cached:
        return cached

    try:
        result = _fetch_quote("US Dollar Index", "DX-Y.NYB")
        if result:
            cache.set("global:dxy", result)
            return result
        return {"label": "US Dollar Index", "price": None, "change": 0, "changePercent": 0}
    except Exception:
        return {"label": "US Dollar Index", "price": None, "change": 0, "changePercent": 0}


@router.get("/events")
def international_events():
    """Return recent international news that may impact markets."""
    cached = cache.get("global:events:v2", 600)
    if cached:
        return cached

    # Aggregate news from multiple international/macro tickers
    tickers = ["EFA", "EEM", "FXI", "EWJ", "EWG", "EWU", "INDA", "EWZ", "SPY", "GLD", "USO"]
    all_news = []
    seen_titles = set()
    try:
        with ThreadPoolExecutor(max_workers=6) as ex:
            def fetch_news(t):
                try:
                    return news_service.get_stock_news(t, limit=5) or []
                except Exception:
                    return []
            futures = [ex.submit(fetch_news, t) for t in tickers]
            for f in as_completed(futures, timeout=25):
                for n in f.result():
                    title = (n.get("title") or "").strip()
                    if title and title not in seen_titles:
                        seen_titles.add(title)
                        all_news.append(n)
    except Exception:
        pass

    # Sort by date descending
    def _ts(n):
        return n.get("providerPublishTime") or n.get("pubDate") or 0
    all_news.sort(key=_ts, reverse=True)
    result = all_news[:30]
    cache.set("global:events:v2", result)
    return result


@router.get("/overview")
def global_overview():
    """Single endpoint that returns all global data for faster page load."""
    cached = cache.get("global:overview", 120)
    if cached:
        return cached

    with ThreadPoolExecutor(max_workers=4) as ex:
        f_indices = ex.submit(world_indices)
        f_currencies = ex.submit(currencies)
        f_commodities = ex.submit(commodities_endpoint)
        f_crypto = ex.submit(crypto)
        f_bonds = ex.submit(bonds)
        f_futures = ex.submit(futures)
        f_fear = ex.submit(fear_greed)
        f_dxy = ex.submit(dollar_index)
        f_events = ex.submit(international_events)

        result = {
            "indices": f_indices.result(),
            "currencies": f_currencies.result(),
            "commodities": f_commodities.result(),
            "crypto": f_crypto.result(),
            "bonds": f_bonds.result(),
            "futures": f_futures.result(),
            "fearGreed": f_fear.result(),
            "dxy": f_dxy.result(),
            "events": f_events.result(),
            "timestamp": time.time(),
        }

    cache.set("global:overview", result)
    return result
