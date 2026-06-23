import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE = path.join(__dirname, 'gemini_debug.log');

const apiKey = process.env.GEMINI_API_KEY;

let genAI = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * Uses Google Gemini to extract intent, destination, sentiment, budget, and preference from free-form text.
 */
export async function analyzePromptWithGemini(userPrompt, currentLocName = null) {
  if (!apiKey || !genAI) {
    console.log("Gemini API key not configured or initialization failed.");
    return {
      error: "Gemini API key not configured.",
      sentiment: "Neutral",
      destination: "Unknown",
      budget: null,
      preference: "eco-friendly",
      itinerary: []
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const locationContext = currentLocName ? ` The user is currently in ${currentLocName}.` : "";

    const systemInstruction = `
    You are an AI travel planner assistant.${locationContext} Analyze the user's prompt and extract the following information in JSON format:
    {
      "destination": "MUST be a specific City name or real geographic location (e.g., 'Paris', 'Tokyo'). If the user does not specify a destination, or if they just say 'location', 'anywhere', or ask for a trip in general, YOU MUST INVENT AND SUGGEST a popular real-world destination. DO NOT return 'location', 'unknown', or empty.",
      "sentiment": "A 1-2 word description of the user's mood/intent (e.g., Adventurous, Relaxed, Stressed, Excited)",
      "budget": 500 (Extract a number if provided in USD, otherwise null),
      "preference": "cheap", "fast", or "eco-friendly" (Infer based on the prompt. Default to eco-friendly if unsure),
      "itinerary": [
        {
          "day": "Day 1",
          "activities": "Short 1-2 sentence description of morning/afternoon/evening plans."
        },
        {
          "day": "Day 2",
          "activities": "Another short daily plan."
        }
      ] (Generate a 2-3 day itinerary based on the destination and sentiment. Make it engaging!)
    }
    Return ONLY valid JSON. Do not include markdown formatting or extra text.
    `;

    const response = await model.generateContent(`${systemInstruction}\n\nUser Prompt: ${userPrompt}`);
    const rawText = response.response.text();
    
    // Strip potential markdown formatting from the response
    const resultText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    // Log to debug file
    try {
      fs.appendFileSync(
        LOG_FILE,
        `PROMPT: ${userPrompt}\nRAW RESPONSE:\n${rawText}\nCLEANED:\n${resultText}\n\n`,
        'utf8'
      );
    } catch (logErr) {
      console.error("Failed to write to gemini_debug.log:", logErr);
    }

    const parsedData = JSON.parse(resultText);
    return parsedData;

  } catch (e) {
    console.error("Error parsing Gemini response:", e);
    
    try {
      fs.appendFileSync(
        LOG_FILE,
        `PROMPT: ${userPrompt}\nEXCEPTION: ${e.message}\n\n`,
        'utf8'
      );
    } catch (logErr) {
      // Ignore logging failures
    }

    return {
      error: e.message,
      sentiment: "Unknown",
      destination: "Unknown",
      budget: null,
      preference: "eco-friendly",
      itinerary: []
    };
  }
}
