import sqlite3
import os
import json
from datetime import datetime

DB_FILE = "models.db"


def get_db():
    """Get a database connection."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the database schema."""
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS models (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('base', 'custom')),
            file_path TEXT NOT NULL,
            words TEXT NOT NULL DEFAULT '[]',
            description TEXT NOT NULL DEFAULT '',
            downloaded INTEGER NOT NULL DEFAULT 1,
            published INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 0
        )
    """)

    # Add columns if upgrading from older schema
    for col, default in [
        ("downloaded", "1"),
        ("description", "''"),
        ("published", "0"),
    ]:
        try:
            conn.execute(
                f"ALTER TABLE models ADD COLUMN {col} INTEGER NOT NULL DEFAULT {default}"
                if col in ("downloaded", "published")
                else f"ALTER TABLE models ADD COLUMN {col} TEXT NOT NULL DEFAULT {default}"
            )
        except sqlite3.OperationalError:
            pass

    conn.commit()
    conn.close()


def add_model(name, model_type, file_path, words, description=""):
    """Add a new model record to the database (downloaded by default, not published)."""
    conn = get_db()
    now = datetime.now().isoformat()
    cursor = conn.execute(
        """INSERT INTO models (name, type, file_path, words, description, downloaded, published, created_at, updated_at, is_active)
           VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, 0)""",
        (name, model_type, file_path, json.dumps(words), description, now, now),
    )
    model_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return model_id


def set_active_model(model_id):
    """Set a model as the active one (deactivate all others first)."""
    conn = get_db()
    conn.execute("UPDATE models SET is_active = 0")
    conn.execute("UPDATE models SET is_active = 1 WHERE id = ?", (model_id,))
    conn.commit()
    conn.close()


def get_active_model():
    """Get the currently active model."""
    conn = get_db()
    row = conn.execute("SELECT * FROM models WHERE is_active = 1").fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def get_downloaded_models():
    """Get all downloaded (local) models."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM models WHERE downloaded = 1 ORDER BY updated_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_marketplace_models():
    """Get models published to the marketplace."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM models WHERE published = 1 ORDER BY name ASC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_models():
    """Get all models."""
    conn = get_db()
    rows = conn.execute("SELECT * FROM models ORDER BY updated_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_model_by_id(model_id):
    """Get a single model by ID."""
    conn = get_db()
    row = conn.execute("SELECT * FROM models WHERE id = ?", (model_id,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def mark_downloaded(model_id):
    """Mark a marketplace model as downloaded."""
    conn = get_db()
    now = datetime.now().isoformat()
    conn.execute(
        "UPDATE models SET downloaded = 1, updated_at = ? WHERE id = ?",
        (now, model_id),
    )
    conn.commit()
    conn.close()


def publish_model(model_id):
    """Publish a model to the marketplace."""
    conn = get_db()
    now = datetime.now().isoformat()
    conn.execute(
        "UPDATE models SET published = 1, updated_at = ? WHERE id = ?",
        (now, model_id),
    )
    conn.commit()
    conn.close()


def unpublish_model(model_id):
    """Remove a model from the marketplace."""
    conn = get_db()
    now = datetime.now().isoformat()
    conn.execute(
        "UPDATE models SET published = 0, updated_at = ? WHERE id = ?",
        (now, model_id),
    )
    conn.commit()
    conn.close()


def update_model_words(model_id, words):
    """Update the words list for a model."""
    conn = get_db()
    now = datetime.now().isoformat()
    conn.execute(
        "UPDATE models SET words = ?, updated_at = ? WHERE id = ?",
        (json.dumps(words), now, model_id),
    )
    conn.commit()
    conn.close()


def delete_model(model_id):
    """Delete a model record and its file from disk."""
    conn = get_db()
    row = conn.execute(
        "SELECT file_path, downloaded FROM models WHERE id = ?", (model_id,)
    ).fetchone()
    conn.execute("DELETE FROM models WHERE id = ?", (model_id,))
    conn.commit()
    conn.close()
    if row and row["downloaded"]:
        path = row["file_path"]
        if os.path.exists(path):
            os.remove(path)
    return row is not None


# Initialize on import
init_db()
