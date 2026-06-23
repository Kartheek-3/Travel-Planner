# AI-Powered Smart Travel Planner - Main Flask API Controller
# Alignments:
# - SDG 11: Sustainable Cities and Communities (promoting carbon-optimized travel)
# - SDG 12: Responsible Consumption (resource allocation & budgeting)
# - SDG 13: Climate Action (carbon calculations & reporting)

import os
import time
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Load local environment config
load_dotenv()

# Import our custom cloud integration wrappers
from services import (
    fetch_routes_from_maps,
    save_search_to_db,
    get_search_history_from_db,
    delete_search_from_db,
    log_query_to_gcs,
    send_analytics_to_bigquery,
    send_fcm_notification
)

# Import BigQuery SQL analytics adapters
from bigquery_service import insert_travel_record, fetch_analytics_data


# Import the cloud function optimization engine
from cloud_function import handler as run_optimization_logic

from llm_service import analyze_prompt_with_gemini
from weather_service import fetch_weather_for_location
from monitoring_service import log_api_call, log_request_performance, get_aggregated_metrics

app = Flask(__name__)
# Enable Cross-Origin Resource Sharing (CORS) so the React frontend can query the API
CORS(app)

class MockCloudRequest:
    """Helper class to mock a Flask request object to call the Cloud Function locally."""
    def __init__(self, data, method='POST'):
        self.data = data
        self.method = method

    def get_json(self, silent=True):
        return self.data


def execute_optimization(routes, budget, preference):
    """
    Executes optimization logic by sending a POST request to a real Google Cloud Function
    (if CLOUD_FUNCTION_URL is configured in environment) or falling back to the local
    simulation module.
    """
    opt_payload = {
        "routes": routes,
        "budget": budget,
        "preference": preference
    }
    
    cf_url = os.environ.get("CLOUD_FUNCTION_URL")
    if cf_url:
        print(f"[Cloud Function] Invoking remote Cloud Function at: {cf_url}")
        try:
            import requests
            response = requests.post(cf_url, json=opt_payload, timeout=10)
            if response.status_code == 200:
                return response.json(), 200
            else:
                print(f"[Cloud Function] Remote error {response.status_code}: {response.text}")
        except Exception as e:
            print(f"[Cloud Function] Connection failed: {e}. Falling back to local engine.")
            
    # Fallback to local simulation
    print("[Cloud Function] Executing local optimization engine simulation.")
    mock_req = MockCloudRequest(opt_payload)
    opt_res_raw, opt_code, _ = run_optimization_logic(mock_req)
    
    import json
    return json.loads(opt_res_raw), opt_code


# -------------------------------------------------------------------------
# CORE FEATURE: Mood-Based Travel Recommendation System (SDG 11 & SDG 12)
# -------------------------------------------------------------------------
def classify_mood_text(text):
    text_lower = text.lower()
    if any(word in text_lower for word in ["stress", "tired", "burnout", "exhausted", "work", "sad", "angry"]):
        return "Stressed"
    elif any(word in text_lower for word in ["adventure", "trek", "hike", "climb", "explore", "wild", "sport", "fun", "nature"]):
        return "Adventurous"
    elif any(word in text_lower for word in ["relax", "calm", "peace", "chill", "quiet", "beach", "spa", "sleep"]):
        return "Relaxed"
    elif any(word in text_lower for word in ["romance", "romantic", "love", "date", "couple", "honeymoon"]):
        return "Romantic"
    else:
        return "Neutral"


def generate_trip_logic(source, budget, days, mood):
    mood_classified = classify_mood_text(mood) if len(mood) > 15 else mood.capitalize()
    
    # 1. Suggested destination based on mood + budget + days
    destinations_pool = {
        "Stressed": [
            {"name": "Munnar, Kerala", "desc": "Calm hill station with vast tea gardens", "type": "hill"},
            {"name": "Gokarna, Karnataka", "desc": "Serene beach with quiet shores", "type": "beach"}
        ],
        "Adventurous": [
            {"name": "Manali, Himachal", "desc": "Gateway for trekking, skiing, and rafting", "type": "mountain"},
            {"name": "Rishikesh, Uttarakhand", "desc": "White water rafting and mountain treks", "type": "adventure"}
        ],
        "Relaxed": [
            {"name": "Goa (South), India", "desc": "Quiet, luxurious white-sand beaches", "type": "beach"},
            {"name": "Puducherry, India", "desc": "Peaceful French quarters and spiritual centers", "type": "coastal"}
        ],
        "Romantic": [
            {"name": "Udaipur, Rajasthan", "desc": "City of lakes and romantic palaces", "type": "heritage"},
            {"name": "Ooty, Tamil Nadu", "desc": "Cozy hill station with beautiful rose gardens", "type": "hill"}
        ],
        "Neutral": [
            {"name": "Bengaluru, Karnataka", "desc": "Vibrant garden city with parks and microbreweries", "type": "metro"},
            {"name": "Mumbai, Maharashtra", "desc": "Coastal city with high-energy culture", "type": "metro"}
        ]
    }
    
    # Pick list for the detected mood, defaulting to Neutral
    pool = destinations_pool.get(mood_classified, destinations_pool["Neutral"])
    
    # Low budget filter -> pick the first/cheaper destination or nearby
    dest = pool[0] if budget < 30000 else pool[1]
    destination_name = dest["name"]
    
    # 2. Weather integration: mock weather or query weather
    weather_info = fetch_weather_for_location(destination_name)
    # If bad weather, suggest alternate or warn!
    if "rain" in weather_info["condition"].lower() or "storm" in weather_info["condition"].lower():
        destination_name = "Ooty, Tamil Nadu"  # Avoid rainy locations
        weather_info = fetch_weather_for_location(destination_name)
        
    # 3. Generate Day-wise itinerary based on days
    itinerary = []
    for day in range(1, days + 1):
        if day == 1:
            act = f"Arrive at {destination_name}, check-in to eco-friendly stay, and enjoy a quiet evening walk."
        elif day == days:
            act = f"Morning local sightseeing and shopping, followed by return travel to {source}."
        else:
            if mood_classified == "Stressed" or mood_classified == "Relaxed":
                act = "Unwind with yoga, herbal spa therapies, organic dining, and reading by the gardens."
            elif mood_classified == "Adventurous":
                act = "Embark on an early morning wilderness trek, outdoor exploration, and camping."
            elif mood_classified == "Romantic":
                act = "Scenic boat ride at sunset, candlelight dining, and exploring historic gardens."
            else:
                act = "Visit local museums, heritage sites, botanical parks, and experience local street food."
        itinerary.append({"day": f"Day {day}", "activities": act})
        
    # 4. Estimated cost breakdown
    stay_cost = int(2500 * days)
    food_cost = int(1200 * days)
    travel_cost = int(1500 if budget < 30000 else 4500)
    total_cost = stay_cost + food_cost + travel_cost
    
    # 5. Travel mode suggestion
    if budget < 20000:
        mode = "Bus / Train (Eco-Friendly)"
    elif budget < 50000:
        mode = "Train / Private Electric Vehicle"
    else:
        mode = "Flight (Offset CO₂)"
        
    why_this_trip = f"This trip is recommended because you are feeling {mood_classified.lower()} and {destination_name} offers the perfect environment matching your vibe, budget, and weather conditions."
    
    return {
        "destination": destination_name,
        "itinerary": itinerary,
        "cost_breakdown": {
            "stay": stay_cost,
            "food": food_cost,
            "travel": travel_cost,
            "total": total_cost
        },
        "travel_mode": mode,
        "weather_info": weather_info,
        "mood_detected": mood_classified,
        "why_this_trip": why_this_trip
    }


@app.route("/analyze-mood", methods=["POST"])
def analyze_mood():
    """
    POST /analyze-mood
    Expects input JSON: { "message": str }
    """
    data = request.get_json() or {}
    message = data.get("message", "")
    mood = classify_mood_text(message)
    
    # Optional Cloud Integration: Log user query & mood to GCS or save locally
    log_query_to_gcs("mood-analysis", {"message": message, "mood": mood})
    
    return jsonify({"mood": mood}), 200


@app.route("/generate-trip", methods=["POST"])
def generate_trip():
    """
    POST /generate-trip
    Expects input JSON:
    {
        "source": str,
        "budget": int,
        "days": int,
        "mood": str
    }
    """
    data = request.get_json() or {}
    source = data.get("source", "Bengaluru")
    budget = int(data.get("budget", 50000))
    days = int(data.get("days", 3))
    mood = data.get("mood", "Neutral")
    
    plan = generate_trip_logic(source, budget, days, mood)
    
    # Optional Cloud Integration: Stream travel query & mood to BigQuery Analytics
    try:
        send_analytics_to_bigquery({
            "source": source,
            "destination": plan["destination"],
            "budget": budget,
            "days": days,
            "mood": plan["mood_detected"],
            "total_cost": plan["cost_breakdown"]["total"]
        })
    except Exception as e:
        print(f"Failed to stream to BigQuery: {e}")
        
    # Optional Cloud Integration: FCM Alert Trigger
    try:
        send_fcm_notification(
            title=f"Mood Route Generated! ✈️",
            body=f"Recommended {plan['destination']} based on your feeling: {plan['mood_detected']}!"
        )
    except Exception as e:
        print(f"Failed to dispatch FCM: {e}")
        
    return jsonify(plan), 200


@app.route("/weather", methods=["GET"])
def get_weather_query():
    """
    GET /weather?location=Paris
    """
    start_time = time.time()
    log_api_call("openweather")
    location = request.args.get("location", "Paris")
    try:
        w_info = fetch_weather_for_location(location)
        log_request_performance("/weather", (time.time() - start_time) * 1000, 200)
        return jsonify(w_info), 200
    except Exception as e:
        log_request_performance("/weather", (time.time() - start_time) * 1000, 500, str(e))
        return jsonify({"error": str(e)}), 500


@app.route("/get-routes", methods=["POST"])
def get_routes():
    """
    POST /get-routes
    Expects input JSON:
    {
        "source": str,
        "destination": str,
        "budget": float (optional)
    }
    Outputs raw routes with distance and time.
    """
    start_time = time.time()
    log_api_call("google_maps")
    data = request.get_json()
    if not data or not data.get("source") or not data.get("destination"):
        log_request_performance("/get-routes", (time.time() - start_time) * 1000, 400, "Missing source or destination")
        return jsonify({"error": "Source and destination are required fields."}), 400

    source = data.get("source")
    destination = data.get("destination")
    stops = data.get("stops", [])

    try:
        # 1. Fetch raw routing choices from Google Maps API (with high-fidelity mock fallbacks)
        raw_routes = fetch_routes_from_maps(source, destination, stops)
        
        if not raw_routes:
            log_request_performance("/get-routes", (time.time() - start_time) * 1000, 404, "Routes not found")
            return jsonify({"error": "Could not find any viable routes for this trip."}), 404

        # Return raw routes containing distance and duration
        log_request_performance("/get-routes", (time.time() - start_time) * 1000, 200)
        return jsonify({"routes": raw_routes}), 200

    except Exception as e:
        print(f"Exception encountered in /get-routes: {e}")
        log_request_performance("/get-routes", (time.time() - start_time) * 1000, 500, str(e))
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500


@app.route("/process-routes", methods=["POST"])
def process_routes():
    """
    POST /process-routes
    Calculates cost + carbon and stores the chosen route in BigQuery (or local SQLite fallback).
    Expects input JSON:
    {
        "source": str,
        "destination": str,
        "budget": float (optional),
        "preference": "cheap" | "fast" | "eco-friendly",
        "routes": list
    }
    """
    data = request.get_json()
    if not data or not data.get("source") or not data.get("destination") or not data.get("routes"):
        return jsonify({"error": "Source, destination, and routes are required fields."}), 400

    source = data.get("source")
    destination = data.get("destination")
    budget = data.get("budget")
    preference = data.get("preference", "eco-friendly")
    routes = data.get("routes")

    # Clean / convert budget
    if budget is not None:
        try:
            budget = float(budget)
        except ValueError:
            budget = None

    try:
        # 1. Invoke Optimization Engine
        opt_res, opt_code = execute_optimization(routes, budget, preference)
        
        if opt_code != 200:
            return jsonify({"error": f"Optimization engine failed: {opt_res.get('error')}"}), opt_code

        # 2. Store the optimized recommended route in BigQuery / Local SQLite
        processed_routes = opt_res.get("routes", [])
        recommendation_id = opt_res.get("recommendation")
        
        recommended_route = None
        if processed_routes:
            if recommendation_id:
                for r in processed_routes:
                    if r.get("id") == recommendation_id:
                        recommended_route = r
                        break
            if not recommended_route:
                recommended_route = processed_routes[0]

        if recommended_route:
            distance_meters = recommended_route.get("distance_val", 0)
            distance_km = distance_meters / 1000.0
            
            duration_seconds = recommended_route.get("time_val", 0)
            duration_hours = duration_seconds / 3600.0
            
            cost = recommended_route.get("cost", 0.0)
            carbon = recommended_route.get("carbon", 0.0)
            
            # Write to BigQuery or local SQLite
            insert_travel_record(
                source=source,
                destination=destination,
                distance_km=distance_km,
                duration_hours=duration_hours,
                cost_usd=cost,
                carbon_kg=carbon,
                preference=preference
            )
            
            # Dispatch FCM notification about the best route
            mode_display = recommended_route.get("mode_display", "Recommended Mode")
            send_fcm_notification(
                title="Best Route Found! 📍",
                body=f"Recommended: {mode_display} (${cost:.2f}) with {carbon:.2f} kg CO₂ emissions."
            )
            
        # 3. Log search query metrics to Google Cloud Storage (GCS)
        log_query_to_gcs(source, destination, budget, preference)

        # Dispatch FCM warning if any of the eligible routes have high carbon emissions (> 15 kg)
        high_carbon_routes = [r for r in processed_routes if r.get("carbon", 0) > 15.0]
        if high_carbon_routes:
            max_carbon_route = max(high_carbon_routes, key=lambda x: x.get("carbon", 0))
            send_fcm_notification(
                title="High Carbon Footprint Warning! 🚨",
                body=f"The {max_carbon_route.get('mode_display')} route emits {max_carbon_route.get('carbon')} kg CO₂! Consider choosing a greener alternative."
            )

        # Return full optimized response
        return jsonify(opt_res), 200

    except Exception as e:
        print(f"Exception encountered in /process-routes: {e}")
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500


@app.route("/analytics", methods=["GET"])
def get_analytics():
    """
    GET /analytics
    Fetches aggregate travel data and stats from BigQuery or local SQLite fallback.
    """
    try:
        stats = fetch_analytics_data()
        return jsonify(stats), 200
    except Exception as e:
        print(f"Exception encountered in /analytics: {e}")
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500


@app.route("/api/smart-plan", methods=["POST"])
def smart_plan():
    """
    POST /api/smart-plan
    Expects input JSON:
    {
        "prompt": "Natural language prompt from user",
        "current_lat": float,
        "current_lng": float,
        "current_location_name": str
    }
    """
    start_time = time.time()
    data = request.get_json()
    prompt = data.get("prompt")
    current_loc_name = data.get("current_location_name")
    
    if not prompt or not current_loc_name:
        log_request_performance("/api/smart-plan", (time.time() - start_time) * 1000, 400, "Missing prompt or location")
        return jsonify({"error": "Prompt and current location are required."}), 400
        
    try:
        # 1. Analyze prompt with Gemini
        log_api_call("gemini")
        llm_result = analyze_prompt_with_gemini(prompt, current_loc_name)
        
        destination = llm_result.get("destination")
        
        # Robust Fallback: If the API fails or returns unhelpful destinations, do not crash.
        # Gracefully degrade to a realistic default so the user can experience the routing logic.
        if "error" in llm_result or not destination or destination.lower() in ["unknown", "location", "anywhere"]:
            print(f"Gemini AI fallback triggered. Error or invalid destination: {llm_result.get('error', destination)}")
            destination = "Paris" # Guaranteed valid destination for mock router
            sentiment = "Adventurous"
            budget = 1000
            preference = "eco-friendly"
            itinerary = [
                {"day": "Day 1", "activities": "Arrive in Paris, settle into your accommodation, and enjoy a relaxed evening walk near the Eiffel Tower."},
                {"day": "Day 2", "activities": "Visit the Louvre museum in the morning, followed by a scenic boat ride on the Seine river."}
            ]
        else:
            sentiment = llm_result.get("sentiment", "Neutral")
            budget = llm_result.get("budget")
            preference = llm_result.get("preference", "eco-friendly")
            itinerary = llm_result.get("itinerary", [])
        
        # 2. Fetch Weather
        log_api_call("openweather")
        weather = fetch_weather_for_location(destination)
        
        # 3. Get Routes using existing logic
        log_api_call("google_maps")
        raw_routes = fetch_routes_from_maps(current_loc_name, destination)
        if not raw_routes:
            log_request_performance("/api/smart-plan", (time.time() - start_time) * 1000, 404, "Routes to destination not found")
            return jsonify({"error": "Could not find routes to the destination."}), 404
            
        opt_res, opt_code = execute_optimization(raw_routes, budget, preference)
        
        if opt_code != 200:
            log_request_performance("/api/smart-plan", (time.time() - start_time) * 1000, opt_code, "Optimization engine failed")
            return jsonify({"error": f"Optimization engine failed: {opt_res.get('error')}"}), opt_code
            
        # Log recommended route from AI search to BigQuery/SQLite for unified analytics dashboard
        processed_routes = opt_res.get("routes", [])
        recommendation_id = opt_res.get("recommendation")
        
        recommended_route = None
        if processed_routes:
            if recommendation_id:
                for r in processed_routes:
                    if r.get("id") == recommendation_id:
                        recommended_route = r
                        break
            if not recommended_route:
                recommended_route = processed_routes[0]
 
        if recommended_route:
            distance_meters = recommended_route.get("distance_val", 0)
            distance_km = distance_meters / 1000.0
            
            duration_seconds = recommended_route.get("time_val", 0)
            duration_hours = duration_seconds / 3600.0
            
            cost = recommended_route.get("cost", 0.0)
            carbon = recommended_route.get("carbon", 0.0)
            
            # Write to BigQuery or local SQLite
            log_api_call("bigquery")
            insert_travel_record(
                source=current_loc_name,
                destination=destination,
                distance_km=distance_km,
                duration_hours=duration_hours,
                cost_usd=cost,
                carbon_kg=carbon,
                preference=preference
            )
            
            # Dispatch FCM notification about the AI-suggested route
            mode_display = recommended_route.get("mode_display", "Recommended Mode")
            send_fcm_notification(
                title="AI Travel Agent Suggestion! 🌟",
                body=f"Smart plan created for {destination} via {mode_display} (${cost:.2f})."
            )
 
        # Combine everything
        final_response = {
            "sentiment": sentiment,
            "weather": weather,
            "destination": destination,
            "source": current_loc_name,
            "budget_detected": budget,
            "preference_detected": preference,
            "routing": opt_res,
            "itinerary": itinerary
        }
        
        log_request_performance("/api/smart-plan", (time.time() - start_time) * 1000, 200)
        return jsonify(final_response), 200
        
    except Exception as e:
        print(f"Exception encountered in /api/smart-plan: {e}")
        log_request_performance("/api/smart-plan", (time.time() - start_time) * 1000, 500, str(e))
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500



@app.route("/save-route", methods=["POST"])
def save_route():
    """
    POST /save-route
    Saves a preferred route selection into Cloud Firestore and logs metrics to BigQuery.
    Expects input JSON:
    {
        "source": str,
        "destination": str,
        "budget": float,
        "preference": str,
        "selected_route": dict,
        "routes": list
    }
    """
    data = request.get_json()
    if not data or not data.get("selected_route"):
        return jsonify({"error": "Missing selected route data."}), 400

    source = data.get("source")
    destination = data.get("destination")
    budget = data.get("budget")
    preference = data.get("preference")
    selected_route = data.get("selected_route")
    routes = data.get("routes", [])

    try:
        # 1. Write the permanent record to Cloud Firestore (or local JSON fallback)
        saved = save_search_to_db(
            source=source,
            destination=destination,
            budget=budget,
            preference=preference,
            selected_route_id=selected_route.get("id"),
            routes=routes
        )

        if not saved:
            return jsonify({"error": "Failed to store record in database."}), 500

        # 2. Log analytical event to BigQuery (for sustainable policy visual reporting)
        send_analytics_to_bigquery(
            source=source,
            destination=destination,
            budget=budget,
            preference=preference,
            selected_route=selected_route
        )

        # Dispatch FCM confirmation notification about the saved choice
        selected_route_mode = selected_route.get("mode_display", "Route Choice")
        send_fcm_notification(
            title="Trip Saved! 💾",
            body=f"Your {selected_route_mode} selection from {source.split(',')[0]} to {destination.split(',')[0]} is successfully stored."
        )

        return jsonify({"message": "Successfully saved route to database & analytics logged."}), 200

    except Exception as e:
        print(f"Exception encountered in /save-route: {e}")
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500


@app.route("/history", methods=["GET"])
def get_history():
    """
    GET /history
    Pulls past routing calculations.
    """
    try:
        history = get_search_history_from_db()
        return jsonify(history), 200
    except Exception as e:
        print(f"Exception encountered in /history: {e}")
        return jsonify({"error": f"Failed to retrieve history: {str(e)}"}), 500


@app.route("/api/delete-route/<record_id>", methods=["DELETE"])
def delete_route(record_id):
    """
    DELETE /api/delete-route/<record_id>
    Deletes a saved route from database/local storage.
    """
    try:
        success = delete_search_from_db(record_id)
        if success:
            return jsonify({"message": "Successfully deleted saved route."}), 200
        else:
            return jsonify({"error": "Failed to delete saved route from database."}), 500
    except Exception as e:
        print(f"Exception encountered in /api/delete-route: {e}")
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500


@app.route("/api/maps-key", methods=["GET"])
@app.route("/maps-key", methods=["GET"])
def get_maps_key():
    """GET /api/maps-key secure dynamic API key proxy endpoint."""
    key = os.environ.get("GOOGLE_MAPS_API_KEY", "")
    return jsonify({"apiKey": key}), 200


@app.route("/geo-guide", methods=["POST"])
def geo_guide():
    """
    POST /geo-guide
    Queries nearby lodging, dining, fuel, and sights around coordinate markers.
    """
    data = request.get_json() or {}
    lat = data.get("lat")
    lng = data.get("lng")
    if not lat or not lng:
        return jsonify({"error": "Latitude and longitude are required."}), 400

    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    results = {
        "hotels": [],
        "restaurants": [],
        "fuel": [],
        "attractions": []
    }

    if api_key:
        types_map = {
            "hotels": "lodging",
            "restaurants": "restaurant",
            "fuel": "gas_station",
            "attractions": "tourist_attraction"
        }
        for category, ptype in types_map.items():
            try:
                url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                params = {
                    "location": f"{lat},{lng}",
                    "radius": 3000,
                    "type": ptype,
                    "key": api_key
                }
                res = requests.get(url, params=params, timeout=5).json()
                if res.get("status") == "OK":
                    for item in res.get("results", [])[:5]:
                        results[category].append({
                            "name": item.get("name"),
                            "vicinity": item.get("vicinity", "Nearby area"),
                            "rating": item.get("rating", 4.2),
                            "lat": item["geometry"]["location"]["lat"],
                            "lng": item["geometry"]["location"]["lng"]
                        })
            except Exception as e:
                print(f"Error querying Places API for {ptype}: {e}")

    # High-fidelity mock fallback listings
    for category in ["hotels", "restaurants", "fuel", "attractions"]:
        if not results[category]:
            if category == "hotels":
                places = [
                    {"name": "Green Tree Eco Resort", "rating": 4.8, "vicinity": "Green Valley"},
                    {"name": "The Grand Horizon Hotel", "rating": 4.5, "vicinity": "City Center"},
                    {"name": "Urban Wellness Lodging", "rating": 4.6, "vicinity": "Nature Reserve"}
                ]
            elif category == "restaurants":
                places = [
                    {"name": "Organic Garden Cafe", "rating": 4.7, "vicinity": "Local Farms"},
                    {"name": "The Green Gourmet", "rating": 4.9, "vicinity": "Eco Street"},
                    {"name": "Spices & Herbs Bistro", "rating": 4.4, "vicinity": "Riverside walk"}
                ]
            elif category == "fuel":
                places = [
                    {"name": "EcoCharge Power Station", "rating": 4.9, "vicinity": "Main Highway (EV Charge)"},
                    {"name": "Universal Solar Charging Hub", "rating": 4.8, "vicinity": "North Boulevard"},
                    {"name": "CleanFuel Gas Station", "rating": 4.1, "vicinity": "South Expressway"}
                ]
            else:
                places = [
                    {"name": "Botanical Butterfly Gardens", "rating": 4.9, "vicinity": "Nature Path"},
                    {"name": "Historical City Clock Tower", "rating": 4.3, "vicinity": "Heritage Square"},
                    {"name": "Eco River Rafting & Trails", "rating": 4.8, "vicinity": "Forest Edge"}
                ]
            
            for idx, p in enumerate(places):
                offset_lat = float(lat) + (idx + 1) * 0.003 * (1 if idx % 2 == 0 else -1)
                offset_lng = float(lng) + (idx + 1) * 0.003 * (-1 if idx % 2 == 0 else 1)
                results[category].append({
                    "name": p["name"],
                    "vicinity": p["vicinity"],
                    "rating": p["rating"],
                    "lat": offset_lat,
                    "lng": offset_lng
                })
                
    return jsonify(results), 200


@app.route("/weather", methods=["POST"])
def get_weather_details():
    """
    POST /weather
    Returns live weather for destination and raises safety alerts for fog/rain conditions.
    """
    data = request.get_json() or {}
    location = data.get("location")
    if not location:
        return jsonify({"error": "Location parameter is required."}), 400
        
    weather = fetch_weather_for_location(location)
    if not weather:
        weather = {
            "temp": 24,
            "condition": "Clear Sky",
            "humidity": 45,
            "icon": "01d"
        }
        
    condition_lower = weather.get("condition", "").lower()
    warning_triggered = False
    warning_title = ""
    warning_message = ""
    
    bad_weather_keywords = ["rain", "drizzle", "shower", "storm", "thunderstorm", "fog", "mist", "snow", "haze", "windy"]
    matched_keyword = None
    for kw in bad_weather_keywords:
        if kw in condition_lower:
            matched_keyword = kw
            warning_triggered = True
            break
            
    if warning_triggered:
        warning_title = f"Adverse Weather Warning: {matched_keyword.capitalize()} Detected! ⚠️"
        warning_message = (
            f"Active weather hazards ({weather['condition']}) have been detected near your destination. "
            "Highways may be highly congested or restricted. For safe, comfortable, and zero-risk travel, "
            "we strongly recommend selecting Public Transit (Electric trains/metro) as your primary route."
        )
        
        send_fcm_notification(
            title=warning_title,
            body=f"Rain/Fog conditions detected in {location}. We suggest public transit for safety."
        )
        
    return jsonify({
        "weather": weather,
        "warning_triggered": warning_triggered,
        "warning_title": warning_title,
        "warning_message": warning_message
    }), 200


@app.route("/chatbot", methods=["POST"])
def chatbot_agent():
    """
    POST /chatbot
    Rule-based + LLM intelligent counselor providing dynamic cost, carbon, and travel updates.
    """
    data = request.get_json() or {}
    message = data.get("message", "").lower()
    routes = data.get("routes", [])
    
    reply = ""
    action = None
    
    if "cheap" in message or "lowest cost" in message or "budget" in message:
        if routes:
            cheapest = min(routes, key=lambda x: x.get("cost", 99999.0))
            reply = (
                f"Based on our routing analysis, the cheapest transit mode is **{cheapest.get('mode_display')}** "
                f"which costs **${cheapest.get('cost'):.2f}** and has an Eco Score of **{cheapest.get('eco_score', 80)}/100**. "
                "Would you like me to select this route for you?"
            )
            action = {"type": "select_route", "route_id": cheapest.get("id")}
        else:
            reply = "To suggest the cheapest route, please enter your starting point and destination first in the Route Planner form!"
            
    elif "eco" in message or "green" in message or "carbon" in message or "sustainable" in message:
        if routes:
            greenest = min(routes, key=lambda x: x.get("carbon", 99999.0))
            reply = (
                f"The most sustainable route is **{greenest.get('mode_display')}**! "
                f"It generates only **{greenest.get('carbon'):.2f} kg CO₂** emissions and earns a perfect Eco Score of **{greenest.get('eco_score', 95)}/100**! "
                "Choosing this route directly aligns with UN SDG 13 (Climate Action). Would you like to select it?"
            )
            action = {"type": "select_route", "route_id": greenest.get("id")}
        else:
            reply = "To suggest the most eco-friendly route, please search for a travel segment in the Route Planner form first!"
            
    elif "fast" in message or "quick" in message or "duration" in message or "time" in message:
        if routes:
            fastest = min(routes, key=lambda x: x.get("time_val", 99999))
            reply = (
                f"The fastest route option is **{fastest.get('mode_display')}**, "
                f"getting you there in **{fastest.get('time')}** with a cost of **${fastest.get('cost'):.2f}**. "
                "Would you like me to select this route on the dashboard?"
            )
            action = {"type": "select_route", "route_id": fastest.get("id")}
        else:
            reply = "To suggest the fastest route, please query your starting point and destination in the Route Planner first!"
            
    else:
        gemini_prompt = (
            f"You are EcoRoute AI, an intelligent, extremely polite travel chatbot aligned with UN SDGs 11, 12, 13. "
            f"The user says: '{message}'. Answer briefly (1-2 sentences max), encourage green transport like rail, "
            f"cycling, or transit, and mention you can analyze cost and carbon emissions dynamically."
        )
        try:
            ai_reply = analyze_prompt_with_gemini(gemini_prompt, "Travel Desk")
            reply = ai_reply.get("destination", "")
            if not reply or len(reply) < 5 or "error" in ai_reply:
                reply = (
                    "Hello! I am your EcoRoute AI travel guide. I am here to help you optimize your journeys! "
                    "You can ask me to find the 'cheapest route', 'fastest route', or 'most eco-friendly route' "
                    "once you enter your travel details!"
                )
        except:
            reply = (
                "Hello! I am your EcoRoute AI travel guide. I am here to help you optimize your journeys! "
                "You can ask me to find the 'cheapest route', 'fastest route', or 'most eco-friendly route' "
                "once you enter your travel details!"
            )
            
    return jsonify({
        "reply": reply,
        "action": action
    }), 200


@app.route("/health", methods=["GET"])
def health():
    """GET /health diagnostic endpoint."""
    return jsonify({
        "status": "healthy",
        "app_title": "AI-Powered Smart Travel Planner for Sustainable Transport",
        "sdg_alignments": ["SDG 11", "SDG 12", "SDG 13"]
    }), 200


@app.route("/book-option", methods=["POST"])
def book_option():
    """
    POST /book-option
    Logs clicked booking choices to BigQuery and dispatches FCM and Cloud Function triggers.
    """
    start_time = time.time()
    log_api_call("bigquery")
    data = request.get_json()
    if not data or not data.get("destination") or not data.get("type"):
        log_request_performance("/book-option", (time.time() - start_time) * 1000, 400, "Missing destination or booking type")
        return jsonify({"error": "Destination and booking type are required."}), 400
        
    dest = data.get("destination")
    source = data.get("source", "Current Location")
    transit_type = data.get("type")
    cost = data.get("cost", 0.0)
    
    try:
        # 1. Log metrics to BigQuery/SQLite database
        insert_travel_record(
            source=source,
            destination=dest,
            distance_km=0.0,  # Click metric
            duration_hours=0.0,
            cost_usd=cost,
            carbon_kg=0.0,
            preference=f"book_{transit_type.lower()}"
        )
        
        # 2. Dispatch FCM push notification
        send_fcm_notification(
            title=f"🎫 {transit_type} Booking Redirect Triggered!",
            body=f"Redirecting you to book your sustainable ticket to {dest}. Safe journeys!"
        )
        
        # 3. Simulate GCP Cloud Function event hook trigger
        cf_url = os.environ.get("CLOUD_FUNCTION_URL")
        if cf_url:
            print(f"[Cloud Function Event Hook] Triggered for sustainable {transit_type} book option.")
            
        log_request_performance("/book-option", (time.time() - start_time) * 1000, 200)
        return jsonify({
            "status": "success",
            "message": "Booking recorded and cloud integrations triggered successfully."
        }), 200
    except Exception as e:
        log_request_performance("/book-option", (time.time() - start_time) * 1000, 500, str(e))
        return jsonify({"error": str(e)}), 500


@app.route("/api/monitoring-metrics", methods=["GET"])
def get_monitoring_metrics():
    """
    GET /api/monitoring-metrics
    Returns system performance and active cloud metrics graphs data.
    """
    start_time = time.time()
    try:
        metrics = get_aggregated_metrics()
        log_request_performance("/api/monitoring-metrics", (time.time() - start_time) * 1000, 200)
        return jsonify(metrics), 200
    except Exception as e:
        log_request_performance("/api/monitoring-metrics", (time.time() - start_time) * 1000, 500, str(e))
        return jsonify({"error": str(e)}), 500
# Production Static Serving
dist_path = os.path.join(os.path.dirname(__file__), '../frontend/dist')
if os.path.exists(dist_path):
    print(f"[Production] Serving frontend static files from: {dist_path}")
    
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path != "" and os.path.exists(os.path.join(dist_path, path)):
            return send_from_directory(dist_path, path)
        else:
            return send_from_directory(dist_path, 'index.html')


if __name__ == "__main__":
    # Local development server runs on Port 5000 (Vite proxy config targets this)
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
