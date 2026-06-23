import dotenv from 'dotenv';

dotenv.config();

/**
 * Fetches the current weather for a destination using OpenWeatherMap API.
 * Returns a mock response if the API key is not configured.
 */
export async function fetchWeatherForLocation(location) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    console.log("OpenWeather API key not set, using mock weather data.");
    return {
      temp: 24,
      condition: "Clear Sky",
      icon: "01d",
      humidity: 45
    };
  }

  try {
    // 1. Get coordinates for the location (Geocoding API)
    const geocodeUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`;
    const geoRes = await fetch(geocodeUrl);
    const geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) {
      console.log(`Could not geocode location: ${location}. Using mock weather.`);
      return {
        temp: 22,
        condition: "Partly Cloudy",
        icon: "03d",
        humidity: 50
      };
    }

    const { lat, lon } = geoData[0];

    // 2. Get current weather metrics
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();

    return {
      temp: Math.round(weatherData.main.temp),
      condition: weatherData.weather[0].description
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      icon: weatherData.weather[0].icon,
      humidity: weatherData.main.humidity
    };

  } catch (e) {
    console.error(`Weather API error for location "${location}":`, e);
    return {
      temp: 24,
      condition: "Clear Sky (Mock)",
      icon: "01d",
      humidity: 45
    };
  }
}
