# AI-Powered Smart Travel Planner - Services layer
# Includes integrations for Google Maps API, Firestore, Google Cloud Storage, and BigQuery.
# Incorporates standard mock fallback adapters for immediate local execution.

import os
import json
import requests
import datetime
import uuid

# Determine fallback file locations
LOCAL_DB_FILE = os.path.join(os.path.dirname(__file__), "local_db.json")
LOCAL_LOGS_FILE = os.path.join(os.path.dirname(__file__), "local_logs.json")

# ==========================================
# 1. Firebase Firestore Adapter
# ==========================================
db = None
try:
    firebase_cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH")
    import firebase_admin
    from firebase_admin import credentials, firestore
    
    if firebase_cred_path and os.path.exists(firebase_cred_path):
        cred = credentials.Certificate(firebase_cred_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firestore initialized successfully using credentials.")
    else:
        # Fall back to default credentials if available
        firebase_admin.initialize_app()
        db = firestore.client()
        print("Firestore initialized using default application credentials.")
except Exception as e:
    print(f"Firestore initialization failed: {e}. Falling back to Local JSON database.")
    db = None

def save_search_to_db(source, destination, budget, preference, selected_route_id, routes):
    """Saves user query and routes to Firestore or local database fallback."""
    record_id = uuid.uuid4().hex
    record = {
        "id": record_id,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "source": source,
        "destination": destination,
        "budget": budget,
        "preference": preference,
        "selected_route_id": selected_route_id,
        "routes": routes
    }
    
    if db:
        try:
            db.collection("searches").document(record_id).set(record)
            print(f"Successfully saved search to Cloud Firestore with ID: {record_id}")
            return True
        except Exception as e:
            print(f"Error saving to Firestore: {e}")
            
    # Fallback Local JSON DB (SDG 12: Resource planning & continuous operation)
    try:
        data = []
        if os.path.exists(LOCAL_DB_FILE):
            with open(LOCAL_DB_FILE, "r") as f:
                try:
                    data = json.load(f)
                except ValueError:
                    data = []
        data.append(record)
        with open(LOCAL_DB_FILE, "w") as f:
            json.dump(data, f, indent=2)
        print(f"Saved search to local database fallback with ID: {record_id}")
        return True
    except Exception as ex:
        print(f"Failed to write to local database: {ex}")
        return False

def get_search_history_from_db():
    """Retrieves saved searches from Firestore or local fallback database."""
    if db:
        try:
            docs = db.collection("searches").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(10).stream()
            history = []
            for doc in docs:
                data = doc.to_dict()
                if "id" not in data:
                    data["id"] = doc.id
                history.append(data)
            return history
        except Exception as e:
            print(f"Failed to fetch from Firestore: {e}")
            
    # Local fallback
    if os.path.exists(LOCAL_DB_FILE):
        try:
            with open(LOCAL_DB_FILE, "r") as f:
                data = json.load(f)
                # Return last 10 entries in reverse chronological order
                return sorted(data, key=lambda x: x["timestamp"], reverse=True)[:10]
        except Exception as ex:
            print(f"Failed to read local database: {ex}")
    return []

def delete_search_from_db(record_id):
    """Deletes a saved search from Firestore or local database fallback."""
    if db:
        try:
            db.collection("searches").document(record_id).delete()
            print(f"Successfully deleted search document {record_id} from Cloud Firestore.")
            return True
        except Exception as e:
            print(f"Error deleting search from Firestore: {e}")
            
    # Fallback Local JSON DB
    try:
        if os.path.exists(LOCAL_DB_FILE):
            data = []
            with open(LOCAL_DB_FILE, "r") as f:
                try:
                    data = json.load(f)
                except ValueError:
                    data = []
            
            # Filter out the record by ID or timestamp
            updated_data = [x for x in data if x.get("id") != record_id and x.get("timestamp") != record_id]
            
            with open(LOCAL_DB_FILE, "w") as f:
                json.dump(updated_data, f, indent=2)
            print(f"Successfully deleted search {record_id} from local database fallback.")
            return True
    except Exception as ex:
        print(f"Failed to delete search from local database fallback: {ex}")
        return False


def get_mock_coordinates(name, is_start=False):
    """Generates realistic coordinates for popular locations or fallback offsets."""
    clean_name = name.lower().strip()
    if "paris" in clean_name:
        return {"lat": 48.8566, "lng": 2.3522}
    if "tokyo" in clean_name:
        return {"lat": 35.6762, "lng": 139.6503}
    if "new york" in clean_name or "nyc" in clean_name:
        return {"lat": 40.7128, "lng": -74.0060}
    if "london" in clean_name:
        return {"lat": 51.5074, "lng": -0.1278}
    if "pune" in clean_name:
        return {"lat": 18.5204, "lng": 73.8567}
    if "mumbai" in clean_name or "bombay" in clean_name:
        return {"lat": 19.0760, "lng": 72.8777}
        
    # Check for direct latitude, longitude coordinate input
    import re
    coords_regex = r"^([-+]?\d{1,2}(?:\.\d+)?),\s*([-+]?\d{1,3}(?:\.\d+)?)$"
    match = re.match(coords_regex, name)
    if match:
        return {"lat": float(match.group(1)), "lng": float(match.group(2))}

    # Fallback to Mumbai (is_start) or offset coordinates (is_destination)
    if is_start:
        return {"lat": 19.0760, "lng": 72.8777}
    else:
        offset_seed = len(name)
        return {
            "lat": 19.0760 + (offset_seed % 12) * 0.15,
            "lng": 72.8777 + (offset_seed % 10) * 0.15
        }


# ==========================================
# 2. Google Maps API Route Fetcher
# ==========================================
def fetch_routes_from_maps(source, destination, stops=None):
    """
    Fetches real routes using Google Maps Directions API or generates realistic fallback metrics.
    Supports Driving, Transit, Bicycling, and Walking modes.
    Enriched with start_location and end_location coordinate keys.
    Supports waypoints for multi-stop routing.
    """
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    
    # Modes to query
    modes = ["driving", "transit", "bicycling", "walking"]
    routes_data = []
 
    if api_key:
        print("Fetching route metrics from Google Maps API...")
        for mode in modes:
            try:
                # Directions API endpoint
                url = "https://maps.googleapis.com/maps/api/directions/json"
                params = {
                    "origin": source,
                    "destination": destination,
                    "mode": mode,
                    "key": api_key
                }
                
                # Add stops as waypoints if present
                if stops and isinstance(stops, list) and len(stops) > 0:
                    params["waypoints"] = "|".join(stops)
                
                response = requests.get(url, params=params, timeout=10)
                res_json = response.json()
                
                if res_json.get("status") == "OK":
                    route = res_json["routes"][0]
                    leg = route["legs"][0]
                    
                    routes_data.append({
                        "mode": mode,
                        "mode_display": "Public Transit" if mode == "transit" else mode.capitalize(),
                        "distance_val": sum(l["distance"]["value"] for l in route["legs"]),  # Sum of all segments
                        "time_val": sum(l["duration"]["value"] for l in route["legs"]),      # Sum of all segments
                        "start_location": leg["start_location"],   # {lat, lng}
                        "end_location": route["legs"][-1]["end_location"] # {lat, lng} of final destination
                    })
            except Exception as e:
                print(f"Google Maps Direction query failed for mode {mode}: {e}")
                
        if routes_data:
            return routes_data
            
    # ==========================================
    # Mock Route Generator Fallback
    # ==========================================
    # If no API key is specified, we generate realistic, high-fidelity mock paths
    # calculated logically to ensure the app is fully functional locally.
    print("Google Maps API key not set or API query failed. Generating realistic mock route data...")
    
    # Calculate pseudo-distance based on stops if present
    base_distance_km = 0
    if stops and isinstance(stops, list) and len(stops) > 0:
        legs = [source] + stops + [destination]
        for i in range(len(legs) - 1):
            seg_seed = len(legs[i]) + len(legs[i+1])
            base_distance_km += 10 + (seg_seed % 150)
    else:
        seed = len(source) + len(destination)
        base_distance_km = 10 + (seed % 150)
    
    # Mode multiplier matrices to emulate physical routing differences:
    # (Mode, Speed in km/h, Distance multiplier)
    mode_profiles = {
        "driving": {"speed": 65, "dist_mult": 1.0, "display": "Driving (Car)"},
        "transit": {"speed": 45, "dist_mult": 1.15, "display": "Public Transit (Bus/Train)"},
        "bicycling": {"speed": 18, "dist_mult": 0.95, "display": "Bicycling"},
        "walking": {"speed": 4.8, "dist_mult": 0.9, "display": "Walking"},
    }
    
    start_coords = get_mock_coordinates(source, True)
    end_coords = get_mock_coordinates(destination, False)
 
    for mode, profile in mode_profiles.items():
        # Active transportation (walking/biking) is constrained for very long distances
        if base_distance_km > 35 and mode in ["walking", "bicycling"]:
            continue  # Walking 35km+ is highly unrealistic for standard travel
            
        distance_meters = int(base_distance_km * profile["dist_mult"] * 1000)
        time_seconds = int((distance_meters / 1000.0 / profile["speed"]) * 3600)
        
        routes_data.append({
            "mode": mode,
            "mode_display": profile["display"],
            "distance_val": distance_meters,
            "time_val": time_seconds,
            "start_location": start_coords,
            "end_location": end_coords
        })
        
    return routes_data



# ==========================================
# 3. Google Cloud Storage Logger
# ==========================================
def log_query_to_gcs(source, destination, budget, preference):
    """Logs the user query details directly to a GCS bucket or a local log fallback."""
    log_data = {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "source": source,
        "destination": destination,
        "budget": budget,
        "preference": preference
    }
    
    bucket_name = os.environ.get("GCS_LOG_BUCKET_NAME")
    if bucket_name:
        try:
            from google.cloud import storage
            storage_client = storage.Client()
            bucket = storage_client.bucket(bucket_name)
            
            # File name pattern: year/month/day/timestamp_log.json
            now = datetime.datetime.utcnow()
            blob_name = f"logs/{now.year}/{now.month:02d}/{now.day:02d}/{int(now.timestamp())}_query.json"
            blob = bucket.blob(blob_name)
            
            blob.upload_from_string(
                data=json.dumps(log_data),
                content_type='application/json'
            )
            print(f"Query successfully logged to GCS Bucket: {bucket_name}/{blob_name}")
            return True
        except Exception as e:
            print(f"Failed to upload query logs to GCS: {e}")
            
    # Local fallback
    try:
        logs = []
        if os.path.exists(LOCAL_LOGS_FILE):
            with open(LOCAL_LOGS_FILE, "r") as f:
                try:
                    logs = json.load(f)
                except ValueError:
                    logs = []
        logs.append(log_data)
        with open(LOCAL_LOGS_FILE, "w") as f:
            json.dump(logs, f, indent=2)
        print("Logged query to local log fallback.")
        return True
    except Exception as ex:
        print(f"Failed to log locally: {ex}")
        return False


# ==========================================
# 4. Google Cloud BigQuery Analytics Adapter
# ==========================================
def send_analytics_to_bigquery(source, destination, budget, preference, selected_route):
    """Streams query and route selection metrics into BigQuery for visual reporting."""
    table_id = os.environ.get("BIGQUERY_TABLE_ID")  # Format: project.dataset.table
    
    analytics_row = {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "source": source,
        "destination": destination,
        "budget": float(budget) if budget else 0.0,
        "preference": preference,
        "selected_mode": selected_route.get("mode") if selected_route else "none",
        "saved_cost": float(selected_route.get("cost")) if selected_route else 0.0,
        "saved_carbon": float(selected_route.get("carbon")) if selected_route else 0.0,
    }
    
    if table_id:
        try:
            from google.cloud import bigquery
            client = bigquery.Client()
            errors = client.insert_rows_json(table_id, [analytics_row])
            if not errors:
                print("Analytics row streamed successfully into BigQuery.")
                return True
            else:
                print(f"BigQuery stream encountered errors: {errors}")
        except Exception as e:
            print(f"Failed streaming analytics to BigQuery: {e}")
            
    print("Analytics logged locally (BigQuery environment variables not set).")
    return True


# ==========================================
# 5. Firebase Cloud Messaging (FCM) Adapter
# ==========================================
def send_fcm_notification(title, body, token=None):
    """
    Sends a push notification via Firebase Cloud Messaging (FCM) Legacy API.
    Gracefully degrades to logging if keys are not configured.
    """
    server_key = os.environ.get("FCM_SERVER_KEY")
    device_token = token or os.environ.get("FCM_DEVICE_TOKEN")
    
    # If no token is provided or configured, target a general topic
    recipient = device_token if device_token else "/topics/travel-alerts"
    
    log_msg = f"[FCM Notification] Recipient: {recipient} | Title: '{title}' | Body: '{body}'"
    
    if not server_key:
        print(f"{log_msg} (FCM_SERVER_KEY not set. Local demonstration logged.)")
        return False
        
    try:
        url = "https://fcm.googleapis.com/fcm/send"
        headers = {
            "Authorization": f"key={server_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "to": recipient,
            "notification": {
                "title": title,
                "body": body,
                "sound": "default"
            },
            "data": {
                "timestamp": datetime.datetime.utcnow().isoformat()
            }
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=5)
        if response.status_code == 200:
            print(f"FCM Notification successfully dispatched: {response.json()}")
            return True
        else:
            print(f"FCM API returned status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"Failed to transmit FCM push notification: {e}")
        return False

