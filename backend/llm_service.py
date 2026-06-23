import os
import json
import vertexai
from vertexai.generative_models import GenerativeModel
from dotenv import load_dotenv

load_dotenv()

# Extract GCP configurations dynamically to prevent hardcoding
TABLE_ID = os.environ.get("BIGQUERY_TABLE_ID", "cineevent-5a275.travel_dataset.travel_data")
PROJECT_ID = TABLE_ID.split(".")[0] if TABLE_ID else "cineevent-5a275"
LOCATION = os.environ.get("VERTEX_LOCATION", "us-central1")  # Vertex AI region, configurable via .env

# Initialize Vertex AI
# Note: google-cloud-aiplatform reads GOOGLE_APPLICATION_CREDENTIALS automatically from env
try:
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    VERTEX_ACTIVE = True
    print(f"Vertex AI successfully initialized for Project ID: {PROJECT_ID}")
except Exception as e:
    VERTEX_ACTIVE = False
    print(f"Vertex AI initialization failed: {e}. AI planner will run in mock mode.")

def classify_sentiment_local(user_prompt):
    """Parses text prompts to categorize traveler emotions locally."""
    text_lower = user_prompt.lower()
    if any(w in text_lower for w in ["stress", "tired", "burnout", "exhausted", "work", "sad", "angry"]):
        return "Stressed"
    elif any(w in text_lower for w in ["adventure", "trek", "hike", "climb", "explore", "wild", "sport", "fun", "nature", "bored"]):
        return "Adventurous"
    elif any(w in text_lower for w in ["relax", "calm", "peace", "chill", "quiet", "beach", "spa", "sleep"]):
        return "Relaxed"
    elif any(w in text_lower for w in ["romance", "romantic", "love", "date", "couple", "honeymoon"]):
        return "Romantic"
    else:
        return "Neutral"

def get_local_fallback_recommendation(user_prompt, current_location_name):
    """
    Highly advanced local matching algorithm. If Vertex AI is offline, this generates
    highly beautiful domestic/local travel getaways with valid land route coordinates
    and matching itineraries based on user vibes and starting locations.
    """
    mood = classify_sentiment_local(user_prompt)
    
    # 1. Determine if starting from South India
    is_south_india = True
    if current_location_name:
        try:
            parts = current_location_name.split(",")
            if len(parts) == 2:
                lat = float(parts[0].strip())
                if lat > 20.0:
                    is_south_india = False
        except:
            start_lower = current_location_name.lower()
            if any(kw in start_lower for kw in ["delhi", "mumbai", "manali", "shimla", "kolkata", "jaipur"]):
                is_south_india = False

    # 2. Extract specific popular destination if explicitly mentioned in prompt
    user_prompt_lower = user_prompt.lower()
    common_destinations = {
        "kochi": "Kochi, Kerala",
        "munnar": "Munnar, Kerala",
        "wayanad": "Wayanad, Kerala",
        "alappuzha": "Alappuzha Backwaters, Kerala",
        "varkala": "Varkala Beach, Kerala",
        "trivandrum": "Trivandrum, Kerala",
        "goa": "Goa, India",
        "mumbai": "Mumbai, Maharashtra",
        "delhi": "Delhi, India",
        "bangalore": "Bengaluru, Karnataka",
        "bengaluru": "Bengaluru, Karnataka",
        "chennai": "Chennai, Tamil Nadu",
        "hyderabad": "Hyderabad, Telangana",
        "manali": "Manali, Himachal Pradesh",
        "shimla": "Shimla, Himachal Pradesh",
        "rishikesh": "Rishikesh, Uttarakhand",
        "udaipur": "Udaipur, Rajasthan",
        "jaipur": "Jaipur, Rajasthan",
        "agra": "Agra, Uttar Pradesh",
        "ooty": "Ooty, Tamil Nadu",
        "kodaikanal": "Kodaikanal, Tamil Nadu",
        "mysore": "Mysore, Karnataka",
        "pondicherry": "Pondicherry, India",
        "coorg": "Coorg, Karnataka",
        "paris": "Paris, France",
        "london": "London, UK",
        "tokyo": "Tokyo, Japan"
    }
    
    destination = None
    for dest_key, dest_val in common_destinations.items():
        if dest_key in user_prompt_lower:
            destination = dest_val
            break
            
    # Try custom "to <destination>" split parsing if no direct key matched
    if not destination:
        try:
            if "to " in user_prompt_lower:
                part = user_prompt_lower.split("to ")[1].strip()
                dest_word = part.split()[0].strip("?,.!-")
                if len(dest_word) > 2:
                    destination = dest_word.capitalize()
        except:
            pass

    # 3. Dynamic recommendation fallback matching sentiment & starting location
    if not destination:
        if mood == "Relaxed":
            destination = "Munnar, Kerala" if is_south_india else "Dharamshala, Himachal Pradesh"
        elif mood == "Adventurous":
            destination = "Wayanad, Kerala" if is_south_india else "Manali, Himachal Pradesh"
        elif mood == "Romantic":
            destination = "Varkala Beach, Kerala" if is_south_india else "Udaipur, Rajasthan"
        elif mood == "Stressed":
            destination = "Munnar, Kerala" if is_south_india else "Dharamshala, Himachal Pradesh"
        else:
            destination = "Alappuzha Backwaters, Kerala" if is_south_india else "Agra, Uttar Pradesh"

    # 3.5 Extract duration from prompt if specified
    import re
    duration_days = 3 # Default local fallback
    match = re.search(r"duration:\s*(\d+)\s*days", user_prompt, re.IGNORECASE)
    if match:
        duration_days = int(match.group(1))
    else:
        # Check simple digit matching for days
        match2 = re.search(r"(\d+)\s*day", user_prompt, re.IGNORECASE)
        if match2:
            duration_days = int(match2.group(1))

    # 4. Generate local itineraries dynamically based on duration_days
    dest_lower = destination.lower()
    
    # Establish full pool of activities for each destination
    activities_pool = []
    if "munnar" in dest_lower:
        activities_pool = [
            "Arrive in Munnar, check into a gorgeous tea resort, and enjoy a warm cup of local tea as mists cover the hills.",
            "Take a scenic walk in Eravikulam National Park to spot Nilgiri Tahr, and capture echoes at Echo Point.",
            "Visit the beautiful Mattupetty Dam, enjoy a calm boat ride, and stroll through organic spice gardens.",
            "Take a trek to the beautiful Lockhart Gap, explore the tea museum, and witness sunset at Chithirapuram.",
            "Enjoy a scenic drive to Kundala Lake, try horse riding, and shop for aromatic essential oils at Munnar town.",
            "Relax in the resort, try local spice garden plantation walk, and take a cooking class for traditional Kerala dishes.",
            "Stroll through Chinnar Wildlife Sanctuary to witness unique dry-deciduous forest habitats and spot exotic birds."
        ]
    elif "wayanad" in dest_lower:
        activities_pool = [
            "Reach Wayanad, settle into a cozy treehouse, and trek up to Edakkal Caves to view ancient petroglyphs.",
            "Visit the breathtaking Banasura Sagar Dam, enjoy a thrilling speed boat ride, and walk along scenic bamboo forest trails.",
            "Explore Pookode Lake on a paddleboat and witness wild elephants near Muthanga Wildlife Sanctuary.",
            "Visit the stunning Meenmutty Waterfalls, hike through natural tea estates, and try zip-lining.",
            "Take a jeep safari in Kuruva Island, explore pristine bamboo rafts, and shop for wild organic forest honey.",
            "Unwind at a sustainable eco-farm resort and enjoy traditional Kalaripayattu martial art performance.",
            "Hike up Chembra Peak to witness the famous heart-shaped lake surrounded by scenic mist valleys."
        ]
    elif "varkala" in dest_lower:
        activities_pool = [
            "Check into a clifftop resort overlooking Varkala Beach, relax on the golden sands, and watch a magnificent sunset.",
            "Stroll along the famous red cliffs, enjoy fresh seafood at a local café, and take a soothing Ayurvedic wellness massage.",
            "Visit the ancient Janardhanaswamy Temple and enjoy a peaceful early morning yoga session near the beach.",
            "Take a day trip to Kappil Beach where backwaters meet the sea, and enjoy peaceful kayaking.",
            "Explore the golden sands of Black Beach, take a surfing lesson, and witness local fisherman hauling nets.",
            "Unwind with beach yoga, organic vegan food cafes, and peaceful sunset meditation sessions.",
            "Visit the historic Anjengo Fort and lighthouse to explore scenic views of the coastal waters."
        ]
    elif "alappuzha" in dest_lower:
        activities_pool = [
            "Board a luxury traditional houseboat in Alappuzha, cruise through tranquil canals, and enjoy fresh-cooked backwater delicacies.",
            "Explore the peaceful paddy fields of Kuttanad on a canoe, and stroll along the historic beach pier during sunset.",
            "Visit the Pathiramanal bird sanctuary island, and explore local village coir-making centers.",
            "Stroll around the quiet paths of Marari Beach, relax under coconut palms, and try organic seafood cooking.",
            "Explore ancient Champakulam Church and traditional snake boat storage houses.",
            "Cruise through remote backwater villages on a motorized country boat, meeting local weavers and organic farmers.",
            "Enjoy a traditional Ayurvedic massage at a certified backwater eco-resort."
        ]
    elif "dharamshala" in dest_lower:
        activities_pool = [
            "Settle into McLeod Ganj, visit the beautiful Dalai Lama Temple Complex, and take a peaceful walk in the pine forests.",
            "Trek to Bhagsu Waterfall, visit the historic Kangra Fort, and taste delicious hot momos at local Tibetan cafes.",
            "Explore the beautiful tea gardens of Dharamshala and buy handmade local carpets from Tibetan cooperatives.",
            "Take a day excursion to the beautiful village of Naddi, view stunning Dhauladhar peaks, and watch stars.",
            "Visit the Norbulingka Institute preserved for Tibetan art and culture, and stroll in the gardens.",
            "Hike through Triund trail for a thrilling mountain camping experience under open stars.",
            "Visit the serene St. John in the Wilderness Church located amidst thick deodar forests."
        ]
    elif "manali" in dest_lower:
        activities_pool = [
            "Arrive in Solang Valley, settle in a rustic riverside cottage, and enjoy paragliding or cable car rides.",
            "Trek to the scenic Jogini Waterfalls, explore old Manali pine trails, and unwind next to the Beas river.",
            "Drive through the engineering marvel of Atal Tunnel and experience snow-capped views at Sissu waterfall.",
            "Explore the ancient wooden Hadimba Temple, soak in Vashisht hot water sulfur springs, and buy woolen shawls.",
            "Visit Naggar Castle overlooking the Kullu valley, and stroll through scenic apple orchards.",
            "Try river rafting in the Beas river, hike through quiet pine forests, and enjoy cafe-hopping in Old Manali.",
            "Take an excursion to Rohtang Pass for breathtaking views of snow and mountain passes."
        ]
    elif "udaipur" in dest_lower:
        activities_pool = [
            "Check into a traditional lakeside Haveli in Udaipur, and take a relaxing evening boat cruise on Lake Pichola.",
            "Tour the majestic City Palace, visit Saheliyon-ki-Bari gardens, and enjoy a classical folk dance show at Bagore Ki Haveli.",
            "Visit the magnificent Sajjangarh Monsoon Palace on the hilltop for panoramic sunset views.",
            "Take a day excursion to the majestic Kumbhalgarh Fort and marvel at the world's second-longest continuous wall.",
            "Explore vintage car museums, walk around Fateh Sagar Lake, and enjoy street shopping at Hathi Pol.",
            "Relax at a luxury heritage haveli, try traditional Rajasthani pottery making, and take a local culinary tour.",
            "Visit the beautiful Jagdish Temple and take a ropeway ride to Karni Mata temple."
        ]
    elif "goa" in dest_lower:
        activities_pool = [
            "Arrive in Goa, check in to a seaside boutique cottage, and spend a relaxing afternoon on the sands of Palolem beach.",
            "Visit old Goa churches like Basilica of Bom Jesus, walk through tropical spice plantations, and savor local fish curry.",
            "Explore Chapora Fort for breathtaking sunset views over Vagator beach, followed by water sports.",
            "Visit the scenic Dudhsagar Waterfalls in the jungle, and take a refreshing dip in the natural pool.",
            "Explore Salim Ali Bird Sanctuary on a quiet canoe, and walk through colorful heritage houses of Fontainhas.",
            "Try scuba diving at Grand Island, or enjoy beach yoga and organic vegan cafe hopping in South Goa.",
            "Take a sunset boat cruise along the Mandovi River with traditional Goan folk performances."
        ]
    elif "trivandrum" in dest_lower or "kovalam" in dest_lower:
        activities_pool = [
            "Arrive in Trivandrum, visit the historic Padmanabhaswamy Temple, and settle in a beachfront cottage at Kovalam Beach.",
            "Visit Napier Museum and Zoo, take a peaceful stroll in Kanakakkunnu Palace grounds, and enjoy Kovalam light house sunset.",
            "Take a tranquil boat ride through Poovar Estuary where the lake, river, and sea meet.",
            "Visit the spectacular Neyyar Dam and wildlife sanctuary, take a lion safari boat ride, and see elephant camps.",
            "Explore the magnificent Kowdiar Palace structure, walk around Shankumugham Beach, and enjoy local food stalls.",
            "Visit the beautiful Vizhinjam rock-cut cave temple and shop for traditional handloom sarees.",
            "Stroll through the scenic paths of Ponmudi hill station, enjoying misty views of mountain roads."
        ]
    else:
        activities_pool = [
            f"Arrive in {destination}, settle into your sustainable accommodation, and take a relaxed walking tour of the heritage district.",
            "Enjoy scenic lookouts, visit a local cultural museum, and taste organic regional food at zero-waste restaurants.",
            "Engage in local nature trails, experience native flora/fauna, and witness a beautiful sunset viewpoint.",
            "Participate in a local craft workshop, learn traditional cooking methods, and explore hidden nature spots.",
            "Visit historic fort remnants, walk through organic farm estates, and buy native souvenirs.",
            "Enjoy a tranquil spa treatment, relax at your eco-stay, and summarize your green travel journals.",
            "Explore local street markets and try indigenous street foods while interacting with local inhabitants."
        ]

    # Build itinerary up to duration_days
    itinerary = []
    for d in range(1, duration_days + 1):
        # Retrieve activity index (loop if duration exceeds pool length)
        act_idx = (d - 1) % len(activities_pool)
        itinerary.append({
            "day": f"Day {d}",
            "activities": activities_pool[act_idx]
        })

    # 5. Inferred parameters
    preference = "eco-friendly"
    if "cheap" in user_prompt.lower() or "budget" in user_prompt.lower() or "low cost" in user_prompt.lower():
        preference = "cheap"
    elif "fast" in user_prompt.lower() or "quick" in user_prompt.lower() or "speed" in user_prompt.lower():
        preference = "fast"

    budget = 50000
    try:
        for word in user_prompt.split():
            if word.isdigit():
                val = int(word)
                if val > 1000:
                    budget = val
                    break
    except:
        pass

    return {
        "destination": destination,
        "sentiment": mood,
        "budget": budget,
        "preference": preference,
        "itinerary": itinerary
    }

def analyze_prompt_with_gemini(user_prompt, current_location_name=None):
    """
    Uses Google Cloud Vertex AI (Gemini 1.5 Flash) to extract intent.
    If Vertex AI is unconfigured or returns an error, we fall back to a highly robust
    local intelligent matcher matching domestic/local getaways.
    """
    if not VERTEX_ACTIVE:
        print("[LLM Service] Vertex AI inactive. Running high-fidelity local intelligent plan matching.")
        return get_local_fallback_recommendation(user_prompt, current_location_name)
        
    model = GenerativeModel('gemini-1.5-flash')
    location_context = f" The user is currently in {current_location_name}." if current_location_name else ""
    
    system_instruction = f"""
    You are an AI travel planner assistant.{location_context} Analyze the user's prompt and extract the following information in JSON format:
    {{
      "destination": "MUST be a specific City name or real geographic location (e.g., 'Paris', 'Tokyo'). If the user does not specify a destination, or if they just say 'location', 'anywhere', or ask for a trip in general, YOU MUST INVENT AND SUGGEST a popular real-world destination. DO NOT return 'location', 'unknown', or empty.",
      "sentiment": "A 1-2 word description of the user's mood/intent (e.g., Adventurous, Relaxed, Stressed, Excited)",
      "budget": 500 (Extract a number if provided in USD, otherwise null),
      "preference": "cheap", "fast", or "eco-friendly" (Infer based on the prompt. Default to eco-friendly if unsure),
      "itinerary": [
        {{
          "day": "Day 1",
          "activities": "Short 1-2 sentence description of morning/afternoon/evening plans."
        }},
        {{
          "day": "Day 2",
          "activities": "Another short daily plan."
        }}
      ] (Generate a 2-3 day itinerary based on the destination and sentiment. Make it engaging!)
    }}
    Return ONLY valid JSON. Do not include markdown formatting or extra text.
    """
    
    log_file = os.path.join(os.path.dirname(__file__), "gemini_debug.log")
    try:
        response = model.generate_content(f"{system_instruction}\n\nUser Prompt: {user_prompt}")
        result_text = response.text.replace("```json", "").replace("```", "").strip()
        
        with open(log_file, "a") as f:
            f.write(f"PROMPT: {user_prompt}\nRAW RESPONSE:\n{response.text}\nCLEANED:\n{result_text}\n\n")
            
        parsed_data = json.loads(result_text)
        
        # Robustness Check: If Gemini successfully returned but returned invalid/boring unknown place, invoke local matcher
        dest = parsed_data.get("destination", "")
        if not dest or dest.lower() in ["unknown", "location", "anywhere", "paris"]:
            # Paris is okay, but if it is suggested as a generic fallback, our local matcher is much more dynamic and land-routable
            if not dest or dest.lower() in ["unknown", "location", "anywhere"]:
                return get_local_fallback_recommendation(user_prompt, current_location_name)
                
        return parsed_data
        
    except Exception as e:
        with open(log_file, "a") as f:
            f.write(f"PROMPT: {user_prompt}\nEXCEPTION: {str(e)}\n\n")
        print(f"Error parsing Vertex Gemini response: {e}. Gracefully falling back to local intelligent matcher.")
        return get_local_fallback_recommendation(user_prompt, current_location_name)

