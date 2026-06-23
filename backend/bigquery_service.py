# AI-Powered Smart Travel Planner - BigQuery & SQLite Database Adapter
# Alignments:
# - SDG 11: Sustainable Cities (analytics tracks clean transit selections)
# - SDG 12: Responsible Consumption (cost benchmarking analytics)
# - SDG 13: Climate Action (carbon analytics tracking and optimization metrics)

import os
import sqlite3
import datetime
import uuid

# Define local database path
LOCAL_DB_PATH = os.path.join(os.path.dirname(__file__), "local_travel_planner.db")

# Global configurations
TABLE_ID = os.environ.get("BIGQUERY_TABLE_ID") # e.g. "my-project.my_dataset.travel_data"
USE_BIGQUERY = False

# Attempt to initialize BigQuery Client
bq_client = None
if TABLE_ID:
    try:
        from google.cloud import bigquery
        # If credentials environment variable is set or default exists
        bq_client = bigquery.Client()
        USE_BIGQUERY = True
        print(f"BigQuery Service Initialized successfully for table: {TABLE_ID}")
    except Exception as e:
        print(f"BigQuery initialization failed: {e}. Falling back to Local SQLite database.")

def init_db():
    """Initializes the database. For SQLite, creates the table if it does not exist."""
    if not USE_BIGQUERY:
        try:
            conn = sqlite3.connect(LOCAL_DB_PATH)
            cursor = conn.cursor()
            # Create travel_data table matching user specifications
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS travel_data (
                    id TEXT PRIMARY KEY,
                    source TEXT NOT NULL,
                    destination TEXT NOT NULL,
                    distance REAL,
                    duration REAL,
                    cost REAL,
                    carbon_emission REAL,
                    preference TEXT,
                    timestamp TEXT
                )
            """)
            conn.commit()
            conn.close()
            print(f"Local SQLite database initialized at: {LOCAL_DB_PATH}")
        except Exception as e:
            print(f"Failed to initialize local SQLite database: {e}")

# Run initialization immediately on import
init_db()

def insert_travel_record(source, destination, distance_km, duration_hours, cost_usd, carbon_kg, preference):
    """
    Inserts a processed route result into Google BigQuery or local SQLite database fallback.
    """
    record_id = str(uuid.uuid4())
    timestamp_iso = datetime.datetime.utcnow().isoformat()

    record = {
        "id": record_id,
        "source": source,
        "destination": destination,
        "distance": float(distance_km),
        "duration": float(duration_hours),
        "cost": float(cost_usd),
        "carbon_emission": float(carbon_kg),
        "preference": preference,
        "timestamp": timestamp_iso
    }

    if USE_BIGQUERY and bq_client:
        try:
            # Stream record into BigQuery
            errors = bq_client.insert_rows_json(TABLE_ID, [record])
            if not errors:
                print(f"Analytics row successfully streamed into BigQuery table: {TABLE_ID}")
                return record_id
            else:
                print(f"BigQuery row streaming errors: {errors}")
        except Exception as e:
            print(f"BigQuery insertion failed: {e}. Writing to SQLite local fallback instead.")

    # Local SQLite Fallback
    try:
        conn = sqlite3.connect(LOCAL_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO travel_data (id, source, destination, distance, duration, cost, carbon_emission, preference, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            record["id"],
            record["source"],
            record["destination"],
            record["distance"],
            record["duration"],
            record["cost"],
            record["carbon_emission"],
            record["preference"],
            record["timestamp"]
        ))
        conn.commit()
        conn.close()
        print(f"Saved travel analytics row to local SQLite database with ID: {record_id}")
        return record_id
    except Exception as ex:
        print(f"Failed to write travel record to SQLite database: {ex}")
        return None

def fetch_analytics_data():
    """
    Fetches aggregates from Google BigQuery or SQLite for visual rendering.
    Returns:
        dict: containing:
            - most_searched: top 5 routes by search frequency
            - average_cost: float
            - average_carbon: float
            - by_preference: list of stats grouped by preference
            - recent_records: last 10 routes for trends
    """
    init_db() # Ensure table exists
    
    analytics = {
        "most_searched": [],
        "average_cost": 0.0,
        "average_carbon": 0.0,
        "by_preference": [],
        "recent_records": []
    }

    if USE_BIGQUERY and bq_client:
        try:
            # 1. Fetch overall averages
            avg_query = f"SELECT AVG(cost) as avg_cost, AVG(carbon_emission) as avg_carbon FROM `{TABLE_ID}`"
            avg_result = list(bq_client.query(avg_query).result())
            if avg_result and avg_result[0].avg_cost is not None:
                analytics["average_cost"] = round(avg_result[0].avg_cost, 2)
                analytics["average_carbon"] = round(avg_result[0].avg_carbon, 2)

            # 2. Most searched routes
            routes_query = f"""
                SELECT source, destination, COUNT(*) as count 
                FROM `{TABLE_ID}` 
                GROUP BY source, destination 
                ORDER BY count DESC 
                LIMIT 5
            """
            routes_result = bq_client.query(routes_query).result()
            analytics["most_searched"] = [
                {"source": row.source, "destination": row.destination, "count": row.count}
                for row in routes_result
            ]

            # 3. Stats by preference
            pref_query = f"""
                SELECT preference, COUNT(*) as count, AVG(cost) as avg_cost, AVG(carbon_emission) as avg_carbon
                FROM `{TABLE_ID}`
                GROUP BY preference
            """
            pref_result = bq_client.query(pref_query).result()
            analytics["by_preference"] = [
                {
                    "preference": row.preference, 
                    "count": row.count, 
                    "avg_cost": round(row.avg_cost or 0, 2), 
                    "avg_carbon": round(row.avg_carbon or 0, 2)
                }
                for row in pref_result
            ]

            # 4. Recent records
            recent_query = f"""
                SELECT source, destination, distance, duration, cost, carbon_emission, preference, timestamp 
                FROM `{TABLE_ID}` 
                ORDER BY timestamp DESC 
                LIMIT 10
            """
            recent_result = bq_client.query(recent_query).result()
            analytics["recent_records"] = [
                {
                    "source": row.source,
                    "destination": row.destination,
                    "distance": row.distance,
                    "duration": row.duration,
                    "cost": row.cost,
                    "carbon_emission": row.carbon_emission,
                    "preference": row.preference,
                    "timestamp": row.timestamp.isoformat() if hasattr(row.timestamp, "isoformat") else str(row.timestamp)
                }
                for row in recent_result
            ]

            return analytics
        except Exception as e:
            print(f"BigQuery analytics fetch failed: {e}. Fetching from local SQLite adapter.")

    # Local SQLite fallback
    try:
        conn = sqlite3.connect(LOCAL_DB_PATH)
        # Configure row factory to return dicts
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # 1. Fetch overall averages
        cursor.execute("SELECT AVG(cost) as avg_cost, AVG(carbon_emission) as avg_carbon FROM travel_data")
        avg_row = cursor.fetchone()
        if avg_row and avg_row["avg_cost"] is not None:
            analytics["average_cost"] = round(avg_row["avg_cost"], 2)
            analytics["average_carbon"] = round(avg_row["avg_carbon"], 2)

        # 2. Most searched routes
        cursor.execute("""
            SELECT source, destination, COUNT(*) as count 
            FROM travel_data 
            GROUP BY source, destination 
            ORDER BY count DESC 
            LIMIT 5
        """)
        analytics["most_searched"] = [dict(row) for row in cursor.fetchall()]

        # 3. Stats by preference
        cursor.execute("""
            SELECT preference, COUNT(*) as count, AVG(cost) as avg_cost, AVG(carbon_emission) as avg_carbon
            FROM travel_data
            GROUP BY preference
        """)
        analytics["by_preference"] = [
            {
                "preference": row["preference"],
                "count": row["count"],
                "avg_cost": round(row["avg_cost"] or 0, 2),
                "avg_carbon": round(row["avg_carbon"] or 0, 2)
            }
            for row in cursor.fetchall()
        ]

        # 4. Recent records
        cursor.execute("""
            SELECT source, destination, distance, duration, cost, carbon_emission, preference, timestamp 
            FROM travel_data 
            ORDER BY timestamp DESC 
            LIMIT 10
        """)
        analytics["recent_records"] = [dict(row) for row in cursor.fetchall()]

        conn.close()
        return analytics
    except Exception as ex:
        print(f"SQLite analytics fetch failed: {ex}")
        return analytics
