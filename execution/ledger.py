import sqlite3
import json
import uuid
import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "config" / "ledger.db"

def _get_connection():
    # Ensure config dir exists
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = _get_connection()
    c = conn.cursor()
    
    # Track every single action the system takes
    c.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            niche_id TEXT,
            event_type TEXT,
            package_type TEXT,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def log_generation(niche_id: str, package_type: str, metadata: dict = None):
    """Log a successful package generation to the Attention Ledger."""
    conn = _get_connection()
    c = conn.cursor()
    
    event_id = str(uuid.uuid4())
    c.execute(
        "INSERT INTO events (id, niche_id, event_type, package_type, metadata) VALUES (?, ?, ?, ?, ?)",
        (event_id, niche_id, "package_generated", package_type, json.dumps(metadata or {}))
    )
    
    conn.commit()
    conn.close()
    print(f"📓 [LEDGER] Logged '{package_type}' generation for niche: {niche_id}")

def can_generate(niche_id: str, package_type: str, max_per_week: int = 3) -> bool:
    """
    Pacing Policy: Check if we are allowed to generate based on recent history.
    """
    conn = _get_connection()
    c = conn.cursor()
    
    # Check how many were generated in the last 7 days
    seven_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    
    c.execute(
        """
        SELECT COUNT(*) as count 
        FROM events 
        WHERE niche_id = ? AND package_type = ? AND event_type = 'package_generated' 
        AND created_at > ?
        """,
        (niche_id, package_type, seven_days_ago.isoformat())
    )
    
    row = c.fetchone()
    count = row['count'] if row else 0
    conn.close()
    
    if count >= max_per_week:
        print(f"🛑 [LEDGER POLICY] Generation blocked. {niche_id} has reached its limit of {max_per_week} '{package_type}' packages this week.")
        return False
        
    return True

def get_niche_stats(niche_id: str):
    """Retrieve dynamic stats for a niche to display on the React UI."""
    conn = _get_connection()
    c = conn.cursor()
    
    c.execute(
        "SELECT COUNT(*) as total_generated, MAX(created_at) as last_run FROM events WHERE niche_id = ? AND event_type = 'package_generated'",
        (niche_id,)
    )
    row = c.fetchone()
    conn.close()
    
    return {
        "total_generated": row['total_generated'] if row else 0,
        "last_run": row['last_run'] if row and row['last_run'] else "Never"
    }

if __name__ == "__main__":
    init_db()
    print("📓 Attention Ledger DB Initialized.")
