import os
import json
from typing import Dict, List, Optional

DATA_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'watchlists.json')


def _load() -> dict:
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, 'r') as f:
            return json.load(f)
    return {"default": []}


def _save(data: dict):
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, 'w') as f:
        json.dump(data, f, indent=2)


def get_watchlist(list_name: str = "default") -> List[dict]:
    data = _load()
    return data.get(list_name, [])


def add_to_watchlist(ticker: str, list_name: str = "default", alert_type: str = None, alert_value: float = None, notes: str = "") -> dict:
    data = _load()
    if list_name not in data:
        data[list_name] = []

    # Check if already exists
    for item in data[list_name]:
        if item["ticker"] == ticker.upper():
            # Update alert settings
            if alert_type:
                item["alertType"] = alert_type
            if alert_value is not None:
                item["alertValue"] = alert_value
            if notes:
                item["notes"] = notes
            _save(data)
            return {"success": True, "updated": True}

    entry = {
        "ticker": ticker.upper(),
        "alertType": alert_type,  # "price_below", "price_above", "percent_drop", "percent_rise"
        "alertValue": alert_value,
        "notes": notes,
    }
    data[list_name].append(entry)
    _save(data)
    return {"success": True, "added": True}


def remove_from_watchlist(ticker: str, list_name: str = "default") -> dict:
    data = _load()
    if list_name in data:
        data[list_name] = [item for item in data[list_name] if item["ticker"] != ticker.upper()]
        _save(data)
    return {"success": True}


def get_all_watchlists() -> dict:
    return _load()
