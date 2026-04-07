"""Academy progress tracking — per-user lesson completion saved in SQLite."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import sqlite3
import os
import time

from backend.services import auth_service

router = APIRouter(prefix="/api/academy", tags=["academy"])

_DEFAULT_DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
_DATA_DIR = os.getenv('DATA_DIR', _DEFAULT_DATA_DIR)
DB_PATH = os.path.join(_DATA_DIR, 'users.db')


def _get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS academy_progress (
            user_id INTEGER NOT NULL,
            lesson_id TEXT NOT NULL,
            completed_at REAL NOT NULL,
            PRIMARY KEY (user_id, lesson_id)
        )
    """)
    conn.commit()
    return conn


def _auth_user(request: Request):
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""
    if not token:
        return None
    return auth_service.get_user(token)


@router.get("/progress")
def get_progress(request: Request):
    """Return the list of completed lesson IDs for the current user."""
    user = _auth_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    try:
        conn = _get_db()
        rows = conn.execute(
            "SELECT lesson_id, completed_at FROM academy_progress WHERE user_id = ?",
            (user["id"],),
        ).fetchall()
        conn.close()
        return {
            "completed": [r["lesson_id"] for r in rows],
            "timestamps": {r["lesson_id"]: r["completed_at"] for r in rows},
        }
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/progress")
def toggle_progress(data: dict, request: Request):
    """Toggle a lesson's completed status. Body: {lesson_id, done}."""
    user = _auth_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    lesson_id = data.get("lesson_id", "").strip()
    done = bool(data.get("done", True))
    if not lesson_id:
        return JSONResponse({"error": "lesson_id required"}, status_code=400)
    try:
        conn = _get_db()
        if done:
            conn.execute(
                "INSERT OR REPLACE INTO academy_progress (user_id, lesson_id, completed_at) VALUES (?, ?, ?)",
                (user["id"], lesson_id, time.time()),
            )
        else:
            conn.execute(
                "DELETE FROM academy_progress WHERE user_id = ? AND lesson_id = ?",
                (user["id"], lesson_id),
            )
        conn.commit()
        rows = conn.execute(
            "SELECT lesson_id FROM academy_progress WHERE user_id = ?",
            (user["id"],),
        ).fetchall()
        conn.close()
        return {"success": True, "completed": [r["lesson_id"] for r in rows]}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/progress/bulk")
def bulk_progress(data: dict, request: Request):
    """Merge a list of lesson IDs into the user's completed set (used to sync
    a guest's localStorage progress after login)."""
    user = _auth_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    ids = data.get("lesson_ids") or []
    if not isinstance(ids, list):
        return JSONResponse({"error": "lesson_ids must be a list"}, status_code=400)
    try:
        conn = _get_db()
        now = time.time()
        for lid in ids:
            if isinstance(lid, str) and lid:
                conn.execute(
                    "INSERT OR IGNORE INTO academy_progress (user_id, lesson_id, completed_at) VALUES (?, ?, ?)",
                    (user["id"], lid, now),
                )
        conn.commit()
        rows = conn.execute(
            "SELECT lesson_id FROM academy_progress WHERE user_id = ?",
            (user["id"],),
        ).fetchall()
        conn.close()
        return {"success": True, "completed": [r["lesson_id"] for r in rows]}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/progress/reset")
def reset_progress(request: Request):
    """Clear all completed lessons for the current user."""
    user = _auth_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    try:
        conn = _get_db()
        conn.execute("DELETE FROM academy_progress WHERE user_id = ?", (user["id"],))
        conn.commit()
        conn.close()
        return {"success": True, "completed": []}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
