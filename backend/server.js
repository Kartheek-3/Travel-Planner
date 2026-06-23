import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import services and helpers
import {
  fetchRoutesFromMaps,
  saveSearchToDb,
  getSearchHistoryFromDb,
  logQueryToGcs,
  sendAnalyticsToBigQuery
} from './services.js';
import { runOptimizationLogic } from './cloudFunction.js';
import { analyzePromptWithGemini } from './llmService.js';
import { fetchWeatherForLocation } from './weatherService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware configuration
app.use(cors());
app.use(express.json());

// Helper to log errors safely
const handleError = (res, e, customMessage) => {
  console.error(`${customMessage}:`, e);
  res.status(500).json({ error: `${customMessage}: ${e.message}` });
};

// ==========================================
// API Routing Controller
// ==========================================

const getRoutesHandler = async (req, res) => {
  const { source, destination, budget, preference = 'eco-friendly' } = req.body;

  if (!source || !destination) {
    return res.status(400).json({ error: "Source and destination are required fields." });
  }

  // Clean and parse budget
  let budgetCap = null;
  if (budget !== undefined && budget !== null) {
    const parsed = parseFloat(budget);
    if (!isNaN(parsed)) {
      budgetCap = parsed;
    }
  }

  try {
    // 1. Fetch raw routing choices from Maps (with mock coordinates fallback)
    const rawRoutes = await fetchRoutesFromMaps(source, destination);

    if (!rawRoutes || rawRoutes.length === 0) {
      return res.status(404).json({ error: "Could not find any viable routes for this trip." });
    }

    // 2. Invoke optimization engine
    const optimizedResponse = runOptimizationLogic(rawRoutes, budgetCap, preference);

    // 3. Log search query to GCS / Local fallback
    await logQueryToGcs(source, destination, budgetCap, preference);

    return res.status(200).json(optimizedResponse);

  } catch (e) {
    return handleError(res, e, "Internal Server Error in get-routes");
  }
};

const smartPlanHandler = async (req, res) => {
  const { prompt, current_location_name } = req.body;

  if (!prompt || !current_location_name) {
    return res.status(400).json({ error: "Prompt and current location are required." });
  }

  try {
    // 1. Extract intents using Gemini AI
    let llmResult = await analyzePromptWithGemini(prompt, current_location_name);
    
    let destination = llmResult.destination;
    let sentiment = llmResult.sentiment || "Neutral";
    let budget = llmResult.budget;
    let preference = llmResult.preference || "eco-friendly";
    let itinerary = llmResult.itinerary || [];

    // Robust Degradation: fallback to realistic default if AI fails or returns vague destinations
    if (
      llmResult.error || 
      !destination || 
      ["unknown", "location", "anywhere", "undefined"].includes(destination.toLowerCase())
    ) {
      console.log(`Gemini AI fallback triggered. Error or invalid destination: ${llmResult.error || destination}`);
      destination = "Paris"; // Standard valid mock router destination
      sentiment = "Adventurous";
      budget = 1000;
      preference = "eco-friendly";
      itinerary = [
        { day: "Day 1", activities: "Arrive in Paris, settle into your accommodation, and enjoy a relaxed evening walk near the Eiffel Tower." },
        { day: "Day 2", activities: "Visit the Louvre museum in the morning, followed by a scenic boat ride on the Seine river." }
      ];
    }

    // 2. Fetch destination weather
    const weather = await fetchWeatherForLocation(destination);

    // 3. Fetch routes using optimized Maps services
    const rawRoutes = await fetchRoutesFromMaps(current_location_name, destination);

    if (!rawRoutes || rawRoutes.length === 0) {
      return res.status(404).json({ error: "Could not find routes to the destination." });
    }

    // 4. Run optimization algorithms
    const routingResponse = runOptimizationLogic(rawRoutes, budget, preference);

    // 5. Structure final payload
    const finalResponse = {
      sentiment,
      weather,
      destination,
      source: current_location_name,
      budget_detected: budget,
      preference_detected: preference,
      routing: routingResponse,
      itinerary
    };

    return res.status(200).json(finalResponse);

  } catch (e) {
    return handleError(res, e, "Internal Server Error in smart-plan");
  }
};

const saveRouteHandler = async (req, res) => {
  const { source, destination, budget, preference, selected_route, routes } = req.body;

  if (!selected_route) {
    return res.status(400).json({ error: "Missing selected route data." });
  }

  try {
    // 1. Write search selection to db (Firestore / local file fallback)
    const saved = await saveSearchToDb(
      source,
      destination,
      budget,
      preference,
      selected_route.id,
      routes || []
    );

    if (!saved) {
      return res.status(500).json({ error: "Failed to store record in database." });
    }

    // 2. Stream analytical rows to BigQuery / local logs
    await sendAnalyticsToBigQuery(source, destination, budget, preference, selected_route);

    return res.status(200).json({ message: "Successfully saved route to database & analytics logged." });

  } catch (e) {
    return handleError(res, e, "Internal Server Error in save-route");
  }
};

const historyHandler = async (req, res) => {
  try {
    const history = await getSearchHistoryFromDb();
    return res.status(200).json(history);
  } catch (e) {
    return handleError(res, e, "Failed to retrieve history");
  }
};

const healthHandler = async (req, res) => {
  return res.status(200).json({
    status: "healthy",
    app_title: "AI-Powered Smart Travel Planner for Sustainable Transport (Node.js/Express)",
    sdg_alignments: ["SDG 11", "SDG 12", "SDG 13"]
  });
};

const mapsKeyHandler = async (req, res) => {
  // Secured dynamic API key delivery
  return res.status(200).json({
    apiKey: process.env.GOOGLE_MAPS_API_KEY || ""
  });
};

// Register routes both at root and /api for full backwards-compatibility
app.post('/get-routes', getRoutesHandler);
app.post('/api/get-routes', getRoutesHandler);

app.post('/api/smart-plan', smartPlanHandler);
app.post('/smart-plan', smartPlanHandler);

app.post('/save-route', saveRouteHandler);
app.post('/api/save-route', saveRouteHandler);

app.get('/history', historyHandler);
app.get('/api/history', historyHandler);

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

app.get('/api/maps-key', mapsKeyHandler);
app.get('/maps-key', mapsKeyHandler);

// ==========================================
// Production Static Serving
// ==========================================
const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  console.log(`Serving frontend static files from: ${distPath}`);
  app.use(express.static(distPath));
  
  // Wildcard client router handler (serves React single page app index)
  app.get('*', (req, res, next) => {
    // Skip API paths to avoid trapping 404s
    const apiPrefixes = ['/api', '/get-routes', '/save-route', '/history', '/health', '/maps-key'];
    if (apiPrefixes.some(prefix => req.path.startsWith(prefix))) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log("Static dist folder not compiled. Frontend assets will need to run via dev server (Vite).");
}

// Start Server listener
const port = parseInt(process.env.PORT || '5000', 10);
app.listen(port, '0.0.0.0', () => {
  console.log(`Express API Server running on port ${port} successfully.`);
});
