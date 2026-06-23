import os
import requests
from dotenv import load_dotenv

load_dotenv()

def fetch_weather_for_location(location):
    """
    Fetches the current weather for a destination using OpenWeatherMap API.
    Returns a mock response if the API key is not configured.
    """
    api_key = os.environ.get("OPENWEATHER_API_KEY")
    
    if not api_key:
        print("OpenWeather API key not set, using mock weather data.")
        return {
            "temp": 24,
            "condition": "Clear Sky",
            "icon": "01d",
            "humidity": 45
        }
        
    try:
        # Get coordinates for the location
        geocode_url = f"http://api.openweathermap.org/geo/1.0/direct?q={location}&limit=1&appid={api_key}"
        geo_res = requests.get(geocode_url).json()
        
        if not geo_res:
            return None
            
        lat = geo_res[0]["lat"]
        lon = geo_res[0]["lon"]
        
        # Get weather
        weather_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&appid={api_key}"
        weather_res = requests.get(weather_url).json()
        
        return {
            "temp": round(weather_res["main"]["temp"]),
            "condition": weather_res["weather"][0]["description"].title(),
            "icon": weather_res["weather"][0]["icon"],
            "humidity": weather_res["main"]["humidity"]
        }
    except Exception as e:
        print(f"Weather API error: {e}")
        return {
            "temp": 24,
            "condition": "Clear Sky (Mock)",
            "icon": "01d",
            "humidity": 45
        }
