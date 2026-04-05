"""
Chat history stored in SQLite (users.db) so it persists across server restarts.
Tables: conversations, chat_messages
"""
import os
import sqlite3
import time
import uuid
from typing import List, Dict

# Use same DB as auth
_DEFAULT_DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
_DATA_DIR = os.getenv('DATA_DIR', _DEFAULT_DATA_DIR)
DB_PATH = os.path.join(_DATA_DIR, 'users.db')


def _get_db():
    os.makedirs(_DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            title TEXT DEFAULT 'New Chat',
            created_at REAL DEFAULT (strftime('%s','now')),
            updated_at REAL DEFAULT (strftime('%s','now')),
            message_count INTEGER DEFAULT 0
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp REAL DEFAULT (strftime('%s','now'))
        )
    """)
    conn.commit()
    return conn


def _row_to_convo(row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "messageCount": row["message_count"],
    }


def _row_to_message(row) -> dict:
    return {
        "role": row["role"],
        "content": row["content"],
        "timestamp": row["timestamp"],
    }


def get_conversations(user_id: int) -> List[dict]:
    """Return all conversations for a user, newest first."""
    conn = _get_db()
    rows = conn.execute(
        "SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC",
        (user_id,)
    ).fetchall()
    conn.close()
    return [_row_to_convo(r) for r in rows]


def create_conversation(user_id: int, title: str = "New Chat") -> dict:
    convo_id = str(uuid.uuid4())[:8]
    now = time.time()
    conn = _get_db()
    conn.execute(
        "INSERT INTO conversations (id, user_id, title, created_at, updated_at, message_count) VALUES (?, ?, ?, ?, ?, 0)",
        (convo_id, user_id, title, now, now),
    )
    conn.commit()
    conn.close()
    return {"id": convo_id, "title": title, "createdAt": now, "updatedAt": now, "messageCount": 0}


def get_messages(user_id: int, convo_id: str) -> List[dict]:
    conn = _get_db()
    # Verify ownership
    convo = conn.execute(
        "SELECT id FROM conversations WHERE id = ? AND user_id = ?", (convo_id, user_id)
    ).fetchone()
    if not convo:
        conn.close()
        return []
    rows = conn.execute(
        "SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY timestamp ASC",
        (convo_id,)
    ).fetchall()
    conn.close()
    return [_row_to_message(r) for r in rows]


def add_message(user_id: int, convo_id: str, role: str, content: str) -> dict:
    now = time.time()
    conn = _get_db()
    conn.execute(
        "INSERT INTO chat_messages (conversation_id, user_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)",
        (convo_id, user_id, role, content, now),
    )
    # Update conversation metadata
    conn.execute(
        "UPDATE conversations SET updated_at = ?, message_count = message_count + 1 WHERE id = ? AND user_id = ?",
        (now, convo_id, user_id),
    )
    conn.commit()
    conn.close()
    return {"role": role, "content": content, "timestamp": now}


def rename_conversation(user_id: int, convo_id: str, title: str) -> dict:
    conn = _get_db()
    conn.execute(
        "UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?",
        (title, convo_id, user_id),
    )
    conn.commit()
    row = conn.execute(
        "SELECT * FROM conversations WHERE id = ? AND user_id = ?", (convo_id, user_id)
    ).fetchone()
    conn.close()
    if row:
        return _row_to_convo(row)
    return {"error": "Not found"}


def delete_conversation(user_id: int, convo_id: str) -> dict:
    conn = _get_db()
    # Only delete if owner
    conn.execute(
        "DELETE FROM chat_messages WHERE conversation_id = ? AND user_id = ?", (convo_id, user_id)
    )
    conn.execute(
        "DELETE FROM conversations WHERE id = ? AND user_id = ?", (convo_id, user_id)
    )
    conn.commit()
    conn.close()
    return {"success": True}
