# AI-Powered Smart Travel Planner - Optimization Engine (Cloud Function)
# Alignments:
# - SDG 11: Sustainable Cities and Communities (promoting eco-friendly public transit & micro-mobility)
# - SDG 12: Responsible Consumption (optimizing cost limits)
# - SDG 13: Climate Action (minimizing carbon footprint)

import json

# Emission factors: kg CO2 emitted per kilometer (based on standard transport metrics)
EMISSION_FACTORS = {
    "driving": 0.12,      # Private vehicles generate significant emissions
    "transit": 0.04,      # Public transit (buses/trains) has a lower impact per passenger
    "walking": 0.0,      # Active mobility produces zero emissions (SDG 11 & 13)
    "bicycling": 0.0,    # Active mobility produces zero emissions
}

# Cost factors: USD (or equivalent currency unit) per kilometer
COST_FACTORS = {
    "driving": 0.25,      # Includes fuel, maintenance, and vehicle wear-and-tear
    "transit": 0.08,      # Standard commercial ticket rates per km
    "walking": 0.0,
    "bicycling": 0.0,
}


def get_travel_options(distance):
    """
    Computes available travel options based on distance (km) and estimates INR costs.
    Highlight cheapest option among the options.
    """
    options = []
    
    # Calculate costs (represented directly in INR currency)
    bus_cost = round(distance * 1.5, 2)
    train_cost = round(distance * 1.0, 2)
    flight_cost = round(distance * 5.0, 2)
    
    if distance < 300:
        options = [
            {"type": "Bus", "link": "https://www.redbus.in", "cost": bus_cost, "icon": "🚌"},
            {"type": "Train", "link": "https://www.irctc.co.in", "cost": train_cost, "icon": "🚆"}
        ]
    elif distance < 800:
        options = [
            {"type": "Train", "link": "https://www.irctc.co.in", "cost": train_cost, "icon": "🚆"},
            {"type": "Flight", "link": "https://www.makemytrip.com/flights", "cost": flight_cost, "icon": "✈️"}
        ]
    else:
        options = [
            {"type": "Flight", "link": "https://www.makemytrip.com/flights", "cost": flight_cost, "icon": "✈️"}
        ]
        
    # Highlight cheapest option
    if options:
        cheapest_opt = min(options, key=lambda x: x["cost"])
        for opt in options:
            opt["cheapest"] = (opt["type"] == cheapest_opt["type"])
            
    return options


def handler(request):
    """
    HTTP Cloud Function.
    Args:
        request (flask.Request): The request object containing JSON data.
        Expected schema:
        {
            "routes": [
                {
                    "mode": "driving" | "transit" | "walking" | "bicycling",
                    "distance_val": int,  # in meters
                    "time_val": int,      # in seconds
                    "mode_display": str
                }
            ],
            "budget": float,
            "preference": "cheap" | "fast" | "eco-friendly"
        }
    Returns:
        JSON response with optimized routes, carbon footprint calculations, and tags.
    """
    # Enable CORS
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    headers = {'Access-Control-Allow-Origin': '*'}
    
    try:
        request_json = request.get_json(silent=True)
        if not request_json or 'routes' not in request_json:
            return (json.dumps({"error": "Missing 'routes' in request data"}), 400, headers)

        routes = request_json['routes']
        budget = request_json.get('budget')
        preference = request_json.get('preference', 'eco-friendly').lower()

        if not routes:
            return (json.dumps({"routes": [], "recommendation": None}), 200, headers)

        # 1. Enrich routes with Cost and Carbon calculations (SDG 13 & SDG 12)
        processed_routes = []
        for index, r in enumerate(routes):
            mode = r.get("mode", "driving").lower()
            distance_meters = r.get("distance_val", 0)
            time_seconds = r.get("time_val", 0)
            
            distance_km = distance_meters / 1000.0

            # Calculate Carbon Footprint (SDG 13 - Climate Action)
            emission_factor = EMISSION_FACTORS.get(mode, 0.12)
            carbon_emissions = round(distance_km * emission_factor, 2)

            # Calculate Estimated Travel Cost (SDG 12 - Responsible Consumption)
            cost_factor = COST_FACTORS.get(mode, 0.25)
            estimated_cost = round(distance_km * cost_factor, 2)

            # Calculate Eco Score (1-100) based on carbon emissions
            eco_score = max(1, min(100, int(100 - (carbon_emissions * 2.0))))
            if eco_score >= 80:
                eco_color = "green"
            elif eco_score >= 40:
                eco_color = "yellow"
            else:
                eco_color = "red"

            processed_routes.append({
                "id": f"route_{index + 1}",
                "mode": mode,
                "mode_display": r.get("mode_display", mode.capitalize()),
                "distance": f"{round(distance_km, 2)} km",
                "distance_val": distance_meters,
                "time": format_time(time_seconds),
                "time_val": time_seconds,
                "cost": estimated_cost,
                "carbon": carbon_emissions,
                "eco_score": eco_score,
                "eco_color": eco_color,
                "tags": [],
                "options": get_travel_options(distance_km)
            })

        # 2. Determine Cheapest, Fastest, and Eco-Friendly routes
        min_cost = min(r["cost"] for r in processed_routes)
        min_time = min(r["time_val"] for r in processed_routes)
        min_carbon = min(r["carbon"] for r in processed_routes)

        for r in processed_routes:
            if r["cost"] == min_cost:
                r["tags"].append("Cheapest")
            if r["time_val"] == min_time:
                r["tags"].append("Fastest")
            if r["carbon"] == min_carbon:
                r["tags"].append("Eco-Friendly")

        # 3. Recommendation selection logic based on preference and optional budget
        eligible_routes = processed_routes
        budget_exceeded = False

        if budget is not None and budget > 0:
            # Filter routes within budget
            within_budget = [r for r in processed_routes if r["cost"] <= budget]
            if within_budget:
                eligible_routes = within_budget
            else:
                budget_exceeded = True  # Flag if all routes exceed budget

        # Select best route based on user preference from eligible routes
        recommendation = None
        if eligible_routes:
            if preference == "cheap":
                recommendation = min(eligible_routes, key=lambda x: x["cost"])
            elif preference == "fast":
                recommendation = min(eligible_routes, key=lambda x: x["time_val"])
            else:  # eco-friendly (default)
                recommendation = min(eligible_routes, key=lambda x: x["carbon"])

        response_data = {
            "routes": processed_routes,
            "recommendation": recommendation["id"] if recommendation else None,
            "budget_exceeded": budget_exceeded,
            "sdg_alignments": {
                "sdg_11_message": "SDG 11: Active and public transit routes support sustainable cities by reducing urban congestion.",
                "sdg_12_message": "SDG 12: Cost optimization promotes sustainable travel budgeting and resource distribution.",
                "sdg_13_message": "SDG 13: Low-carbon transit selections directly mitigate atmospheric CO2 impacts."
            }
        }

        return (json.dumps(response_data), 200, headers)

    except Exception as e:
        return (json.dumps({"error": str(e)}), 500, headers)

def format_time(seconds):
    """Formats travel time from seconds into readable string."""
    if seconds == 0:
        return "0 mins"
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes} mins"
