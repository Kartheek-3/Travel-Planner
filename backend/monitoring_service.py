# AI-Powered Smart Travel Planner - Performance Monitoring Service
# Alignments:
# - App performance analytics, API audit logging, and runtime exception tracking.

import os
import json
import time
from datetime import datetime

METRICS_FILE = os.path.join(os.path.dirname(__file__), "local_monitoring.json")

def init_metrics_file():
    """Initializes the metrics JSON structure if not existing."""
    if not os.path.exists(METRICS_FILE):
        default_structure = {
            "api_usage": {
                "gemini": 0,
                "google_maps": 0,
                "openweather": 0,
                "bigquery": 0
            },
            "request_logs": [],
            "error_logs": []
        }
        try:
            with open(METRICS_FILE, "w") as f:
                json.dump(default_structure, f, indent=2)
        except Exception as e:
            print(f"Error creating metrics file: {e}")

def load_metrics():
    """Loads metrics safely, recreating on errors."""
    init_metrics_file()
    try:
        with open(METRICS_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading metrics, recreating structure: {e}")
        return {
            "api_usage": {
                "gemini": 0,
                "google_maps": 0,
                "openweather": 0,
                "bigquery": 0
            },
            "request_logs": [],
            "error_logs": []
        }

def save_metrics(data):
    """Saves metrics back to disk safely."""
    try:
        with open(METRICS_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving metrics: {e}")

def log_api_call(service):
    """
    Increments a specific API counter (gemini, google_maps, openweather, bigquery).
    """
    data = load_metrics()
    service_key = service.lower().strip()
    if service_key in data["api_usage"]:
        data["api_usage"][service_key] += 1
    else:
        data["api_usage"][service_key] = 1
    save_metrics(data)

def log_request_performance(endpoint, latency_ms, status_code=200, error_message=None):
    """
    Logs an endpoint request performance event.
    """
    data = load_metrics()
    
    log_entry = {
        "endpoint": endpoint,
        "latency_ms": round(latency_ms, 2),
        "status_code": status_code,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    # Cap request logs to the last 100 entries to avoid bloating the JSON database
    data["request_logs"].append(log_entry)
    if len(data["request_logs"]) > 100:
        data["request_logs"].pop(0)
        
    if error_message:
        err_entry = {
            "endpoint": endpoint,
            "error": str(error_message),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        data["error_logs"].append(err_entry)
        if len(data["error_logs"]) > 50:
            data["error_logs"].pop(0)
            
    save_metrics(data)

def get_aggregated_metrics():
    """
    Computes summary telemetry data for frontend visualization.
    """
    data = load_metrics()
    
    req_logs = data.get("request_logs", [])
    err_logs = data.get("error_logs", [])
    api_usage = data.get("api_usage", {
        "gemini": 0,
        "google_maps": 0,
        "openweather": 0,
        "bigquery": 0
    })
    
    total_reqs = len(req_logs)
    avg_latency = 0.0
    if total_reqs > 0:
        avg_latency = sum(r["latency_ms"] for r in req_logs) / total_reqs
        
    # Get last 10 points for graphical timeseries
    graph_points = []
    last_10 = req_logs[-10:] if len(req_logs) >= 10 else req_logs
    for idx, r in enumerate(last_10):
        graph_points.append({
            "id": idx + 1,
            "label": r["endpoint"].replace("/api/", "/").replace("/get-", "/"),
            "latency": r["latency_ms"],
            "status": r["status_code"]
        })
        
    # Compute error rates
    total_errors = len(err_logs)
    error_rate = 0.0
    if total_reqs > 0:
        error_rate = round((total_errors / (total_reqs + total_errors)) * 100, 1)
        
    return {
        "total_requests": total_reqs,
        "average_latency_ms": round(avg_latency, 1),
        "total_errors": total_errors,
        "error_rate_pct": error_rate,
        "api_usage": api_usage,
        "graph_points": graph_points,
        "recent_errors": err_logs[-5:] # last 5 errors
    }
