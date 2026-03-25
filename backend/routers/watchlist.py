from fastapi import APIRouter
from backend.services import watchlist_service
from backend.services.stock_data import get_quick_quote

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


@router.get("/")
def get_watchlist(list_name: str = "default"):
    items = watchlist_service.get_watchlist(list_name)
    # Enrich with live price data
    enriched = []
    for item in items:
        quote = get_quick_quote(item["ticker"])
        enriched.append({
            **item,
            "name": quote.get("name", "") if quote else "",
            "price": quote.get("price") if quote else None,
            "change": quote.get("change") if quote else None,
            "changePercent": quote.get("changePercent") if quote else None,
            "marketCap": quote.get("marketCap") if quote else None,
            "sector": quote.get("sector", "") if quote else "",
            "quoteType": quote.get("quoteType", "") if quote else "",
        })
    return enriched


@router.post("/")
def add_to_watchlist(data: dict):
    return watchlist_service.add_to_watchlist(
        ticker=data.get("ticker", ""),
        list_name=data.get("listName", "default"),
        alert_type=data.get("alertType"),
        alert_value=data.get("alertValue"),
        notes=data.get("notes", ""),
    )


@router.delete("/{ticker}")
def remove_from_watchlist(ticker: str, list_name: str = "default"):
    return watchlist_service.remove_from_watchlist(ticker, list_name)
