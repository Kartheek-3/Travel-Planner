import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import {
  Navigation,
  MapPin,
  IndianRupee,
  Leaf,
  Clock,
  ArrowRight,
  History,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Award,
  Sparkles,
  Bookmark,
  LogOut,
  MessageSquare,
  Cloud,
  Map as MapIcon,
  Calendar,
  Mic,
  Download,
  Coffee,
  Send
} from "lucide-react";
import AnalyticsDashboard from "./AnalyticsDashboard";
import CloudMonitoringDashboard from "./CloudMonitoringDashboard";

export default function Home() {
  const navigate = useNavigate();

  const handleBookOptionClick = async (option, route) => {
    try {
      // Log to backend
      await fetch("/book-option", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: activeQuery?.source || "Current Location",
          destination: activeQuery?.destination || "Trip Destination",
          type: option.type,
          cost: option.cost
        })
      });
    } catch (err) {
      console.error("Failed to log booking click to cloud operations:", err);
    }
    // Redirect in a new tab securely
    window.open(option.link, "_blank", "noopener,noreferrer");
  };
  
  // Tab control state
  const [activeTab, setActiveTab] = useState("ai"); // "ai" or "direct"

  // Common Form States
  const [currentLocName, setCurrentLocName] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [budgetInput, setBudgetInput] = useState("50000");
  const [durationInput, setDurationInput] = useState("5");
  const [preferenceInput, setPreferenceInput] = useState("eco-friendly");
  const [stops, setStops] = useState([]);

  // AI Tab specific state
  const [prompt, setPrompt] = useState("");
  const [isListening, setIsListening] = useState(false);

  // Direct Tab specific state
  const [destinationName, setDestinationName] = useState("");

  // Dynamic Google Map States
  const [mapsApiKey, setMapsApiKey] = useState("");
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);

  // Smart Plan & Routing Results
  const [weatherData, setWeatherData] = useState(null);
  const [sentimentData, setSentimentData] = useState("");
  const [itinerary, setItinerary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [recommendationId, setRecommendationId] = useState(null);
  const [budgetExceeded, setBudgetExceeded] = useState(false);
  const [activeQuery, setActiveQuery] = useState(null);

  // Geo Guide Places states (SDG 11: Local sustainable infrastructure discovery)
  const [places, setPlaces] = useState(null);
  const [activePlaceCat, setActivePlaceCat] = useState("hotels");
  const [selectedPlaceCoords, setSelectedPlaceCoords] = useState(null);

  // Chatbot Assistant states (SDG 11, 12, 13)
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hello! I am EcoRoute AI, your sustainable travel assistant. Ask me to find the "cheapest route", "fastest route", or "most eco-friendly route" based on your current plans!' }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Mood Recommender States (SDG 11 & SDG 12)
  const [moodText, setMoodText] = useState("I feel stressed and tired");
  const [moodResult, setMoodResult] = useState(null);
  const [moodDetected, setMoodDetected] = useState("");

  // History states
  const [history, setHistory] = useState([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [viewMode, setViewMode] = useState("planner"); // "planner" or "my-trips"
  const [isDeleting, setIsDeleting] = useState(null); // ID of record being deleted

  // Fetch Maps API key and History on mount
  useEffect(() => {
    fetchMapsKey();
    fetchHistory();
  }, []);

  const fetchMapsKey = async () => {
    try {
      const response = await fetch("/api/maps-key");
      if (response.ok) {
        const data = await response.json();
        if (data.apiKey) {
          setMapsApiKey(data.apiKey);
        }
      }
    } catch (e) {
      console.error("Failed to load secure Maps API key:", e);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch("/history");
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (e) {
      console.error("Failed to load search history:", e);
    }
  };

  const handleDeleteRoute = async (recordId, e) => {
    if (e) e.stopPropagation();
    setIsDeleting(recordId);
    try {
      const response = await fetch(`/api/delete-route/${recordId}`, {
        method: "DELETE"
      });
      if (response.ok) {
        fetchHistory();
      } else {
        const data = await response.json();
        console.error("Failed to delete saved route:", data.error);
      }
    } catch (err) {
      console.error("Error deleting saved route:", err);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleGetLocation = () => {
    setGettingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Store coordinates directly as source location
            setCurrentLocName(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
          } catch (e) {
            console.error(e);
          } finally {
            setGettingLocation(false);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setGettingLocation(false);
        }
      );
    } else {
      setGettingLocation(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please try Google Chrome, MS Edge, or Apple Safari.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = "en-US";
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setPrompt(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setIsListening(false);
    }
  };

  const getCarbonIndicator = (carbon) => {
    if (carbon === 0) {
      return {
        label: "Zero Emissions 🍃",
        class: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
      };
    }
    if (carbon < 5) {
      return {
        label: "Low Emissions 🟢",
        class: "bg-green-500/10 text-green-400 border border-green-500/20"
      };
    }
    if (carbon <= 15) {
      return {
        label: "Moderate Emissions 🟡",
        class: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
      };
    }
    return {
      label: "High Emissions 🚨",
      class: "bg-red-500/10 text-red-400 border border-red-500/20"
    };
  };

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to export the PDF report.");
      return;
    }

    const recommendedRoute = routes.find(r => r.id === recommendationId) || routes[0];

    const itineraryHtml = itinerary.map((day, idx) => `
      <div style="margin-bottom: 20px; padding: 15px; border-radius: 12px; background: #f8fafc; border-left: 4px solid #6366f1;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b; font-weight: 800;">${day.day}</h3>
        <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6;">${day.activities}</p>
      </div>
    `).join("");

    const routesHtml = routes.map(r => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px; font-weight: bold; color: #334155;">${r.mode_display} ${r.id === recommendationId ? '⭐' : ''}</td>
        <td style="padding: 12px; color: #475569;">${r.distance}</td>
        <td style="padding: 12px; color: #475569;">${r.time}</td>
        <td style="padding: 12px; color: #6366f1; font-weight: bold;">₹${r.cost}</td>
        <td style="padding: 12px; color: #10b981; font-weight: bold;">${r.carbon} kg CO₂</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Travel Plan Report - ${activeQuery?.destination}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; padding: 40px; margin: 0; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .title { margin: 0; font-size: 26px; font-weight: 800; color: #0f172a; }
            .meta-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
            .meta-card { background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .meta-label { font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; letter-spacing: 0.5px; }
            .meta-val { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 5px; }
            .section-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 30px 0 15px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; background: #f1f5f9; padding: 12px; color: #475569; font-size: 12px; text-transform: uppercase; }
            .sdg-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 15px; border-radius: 12px; margin-top: 30px; }
            .sdg-title { font-weight: bold; color: #065f46; display: flex; align-items: center; gap: 6px; }
            .sdg-desc { font-size: 13px; color: #047857; margin-top: 5px; line-height: 1.5; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">✈️ AI Travel Agent Report</h1>
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #64748b;">Generated on ${new Date().toLocaleDateString()} | Sustainable Travel Planner</p>
            </div>
            <button onclick="window.print()" style="background: #6366f1; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 8px; cursor: pointer;">Print / Save as PDF</button>
          </div>

          <div class="meta-grid">
            <div class="meta-card">
              <div class="meta-label">Origin</div>
              <div class="meta-val">${activeQuery?.source.split(',')[0]}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Destination</div>
              <div class="meta-val">${activeQuery?.destination.split(',')[0]}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Budget Limit</div>
              <div class="meta-val">${activeQuery?.budget ? `₹${activeQuery.budget}` : 'None'}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Selected Mode</div>
              <div class="meta-val">${recommendedRoute?.mode_display}</div>
            </div>
          </div>

          <div class="section-title">📊 Transport Comparison</div>
          <table>
            <thead>
              <tr>
                <th>Mode</th>
                <th>Distance</th>
                <th>Duration</th>
                <th>Cost</th>
                <th>Carbon Footprint</th>
              </tr>
            </thead>
            <tbody>
              ${routesHtml}
            </tbody>
          </table>

          <div class="section-title">📅 Personalized Daily Itinerary</div>
          <div>
            ${itineraryHtml}
          </div>

          <div class="sdg-box">
            <div class="sdg-title">🌱 United Nations SDG Alignments</div>
            <div class="sdg-desc">
              This travel proposal actively supports <b>SDG 11 (Sustainable Cities)</b> and <b>SDG 13 (Climate Action)</b>. 
              By prioritizing low-carbon transport options, this plan saves up to <b>${(routes.map(r => r.carbon).reduce((a, b) => Math.max(a, b), 0) - recommendedRoute.carbon).toFixed(2)} kg CO₂</b> compared to high-emission transport mode alternatives.
            </div>
          </div>

          <script>
            window.onload = () => {
              setTimeout(() => { window.print(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const fetchGeoGuide = async (lat, lng) => {
    try {
      const response = await fetch("/geo-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng })
      });
      if (response.ok) {
        const data = await response.json();
        setPlaces(data);
      }
    } catch (err) {
      console.error("Failed to fetch geo guide places:", err);
    }
  };

  const handleSendChatMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          routes: routes
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
        if (data.action && data.action.type === "select_route") {
          setRecommendationId(data.action.route_id);
        }
      } else {
        throw new Error("Chatbot failed");
      }
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Central router connection lost. Please verify your connection." }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (e) => {
      console.error("Voice matching error:", e);
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("Captured speech:", transcript);

      const cleanText = transcript.toLowerCase().trim();
      const match = cleanText.match(/plan\s+trip\s+from\s+(.+?)\s+to\s+(.+)/i);
      
      if (match) {
        const sourceVal = match[1].trim();
        const destVal = match[2].trim();
        const capitalize = (str) => str.replace(/\b\w/g, (c) => c.toUpperCase());
        
        setCurrentLocName(capitalize(sourceVal));
        setDestinationName(capitalize(destVal));
        setActiveTab("direct");
      } else {
        setPrompt(transcript);
        setActiveTab("ai");
      }
    };

    recognition.start();
  };

  // Submit AI travel planner request
  const handleSmartPlan = async (e) => {
    e.preventDefault();
    if (!prompt || !currentLocName) return;

    setLoading(true);
    setError(null);
    setSaveSuccess(false);
    setItinerary([]);
    setStartCoords(null);
    setEndCoords(null);
    setPlaces(null);
    setSelectedPlaceCoords(null);
    setMoodResult(null);
    setMoodDetected("");

    const budgetCap = budgetInput ? parseFloat(budgetInput) : 50000;
    const daysCap = durationInput ? parseInt(durationInput) : 3;

    try {
      // Post unified prompt detailing mood, budget limits, and duration to smart-plan endpoint
      const response = await fetch("/api/smart-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${prompt} (Budget: INR ${budgetCap}, Duration: ${daysCap} days)`,
          current_location_name: currentLocName
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to calculate smart routes.");
      }

      setRoutes(data.routing.routes);
      setRecommendationId(data.routing.recommendation);
      setBudgetExceeded(data.routing.budget_exceeded);
      setWeatherData(data.weather);
      setSentimentData(data.sentiment);
      setMoodDetected(data.sentiment);
      
      const parsedItinerary = Array.isArray(data.itinerary) ? data.itinerary : [];
      setItinerary(parsedItinerary);
      
      // Calculate realistic cost breakdown based on budget and duration
      const totalBudget = budgetCap || 50000;
      const calculatedStay = Math.round(daysCap * 120);
      const calculatedFood = Math.round(daysCap * 50);
      const firstRoute = data.routing.routes && data.routing.routes.length > 0 ? data.routing.routes[0] : null;
      const calculatedTravel = firstRoute ? Math.round(firstRoute.cost) : Math.round(daysCap * 30);
      const calculatedTotal = calculatedStay + calculatedFood + calculatedTravel;

      // Construct unified moodResult representing the unified AI Vibe Agent plan!
      const unifiedMoodResult = {
        destination: data.destination,
        why_this_trip: data.why_this_trip || `Your personalized trip to ${data.destination} is recommended because you are feeling a ${data.sentiment.toLowerCase()} vibe, aligned with your specified ${daysCap}-day journey and ₹${budgetCap} INR budget limits.`,
        mood_detected: data.sentiment,
        travel_mode: firstRoute ? firstRoute.mode_display : "Eco-Friendly Public Transit",
        cost_breakdown: {
          stay: calculatedStay,
          food: calculatedFood,
          travel: calculatedTravel,
          total: calculatedTotal
        },
        itinerary: parsedItinerary.map((it, idx) => ({
          day: it.day || `Day ${idx + 1}`,
          activities: it.activities || it
        }))
      };

      setMoodResult(unifiedMoodResult);

      // Extract start and end coordinates for interactive mapping
      if (firstRoute) {
        if (firstRoute.start_location) setStartCoords(firstRoute.start_location);
        if (firstRoute.end_location) {
          setEndCoords(firstRoute.end_location);
          fetchGeoGuide(firstRoute.end_location.lat, firstRoute.end_location.lng);
        }
      }

      setActiveQuery({ 
        source: currentLocName, 
        destination: data.destination, 
        budget: data.budget_detected || budgetCap, 
        preference: data.preference_detected || "eco-friendly"
      });

    } catch (err) {
      setError(err.message);
      setRoutes([]);
      setRecommendationId(null);
      setItinerary([]);
    } finally {
      setLoading(false);
    }
  };

  // Submit Structured Direct Route request
  const handleDirectPlan = async (e) => {
    e.preventDefault();
    if (!currentLocName || !destinationName) return;

    setLoading(true);
    setError(null);
    setSaveSuccess(false);
    setItinerary([]);
    setStartCoords(null);
    setEndCoords(null);
    setPlaces(null);
    setSelectedPlaceCoords(null);
    setMoodResult(null);
    setMoodDetected("");

    const budgetCap = budgetInput ? parseFloat(budgetInput) : null;

    try {
      // 1. Fetch raw routing choices from Google Maps API via /get-routes
      const response = await fetch("/get-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: currentLocName,
          destination: destinationName,
          budget: budgetCap,
          stops: stops
        })
      });

      const rawData = await response.json();
      if (!response.ok) {
        throw new Error(rawData.error || "Failed to fetch routing options.");
      }

      // 2. Perform cost + carbon calculations and store recommended route in database via /process-routes
      const processResponse = await fetch("/process-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: currentLocName,
          destination: destinationName,
          budget: budgetCap,
          preference: preferenceInput,
          routes: rawData.routes
        })
      });

      const data = await processResponse.json();
      if (!processResponse.ok) {
        throw new Error(data.error || "Failed to process routing calculations.");
      }

      setRoutes(data.routes);
      setRecommendationId(data.recommendation);
      setBudgetExceeded(data.budget_exceeded);
      
      // Fetch dynamic weather data with safety alerts from backend
      try {
        const weatherResponse = await fetch("/weather", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location: destinationName })
        });
        const wData = await weatherResponse.json();
        if (weatherResponse.ok) {
          setWeatherData(wData.weather);
          if (wData.warning_triggered) {
            setError(wData.warning_message);
          }
        }
      } catch (weatherErr) {
        console.error("Failed to query weather API:", weatherErr);
        setWeatherData({
          temp: 24,
          condition: "Clear skies (Mock)",
          humidity: 45
        });
      }
      setSentimentData("Direct Optimized Journey");

      // Extract coordinates from routing results
      if (data.routes && data.routes.length > 0) {
        const firstRoute = data.routes[0];
        if (firstRoute.start_location) setStartCoords(firstRoute.start_location);
        if (firstRoute.end_location) {
          setEndCoords(firstRoute.end_location);
          fetchGeoGuide(firstRoute.end_location.lat, firstRoute.end_location.lng);
        }
      }

      setActiveQuery({
        source: currentLocName,
        destination: destinationName,
        budget: budgetCap,
        preference: preferenceInput
      });

    } catch (err) {
      setError(err.message);
      setRoutes([]);
      setRecommendationId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRoute = async (selectedRoute) => {
    if (!activeQuery || !selectedRoute) return;

    try {
      const response = await fetch("/save-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: activeQuery.source,
          destination: activeQuery.destination,
          budget: activeQuery.budget ? parseFloat(activeQuery.budget) : 0,
          preference: activeQuery.preference,
          selected_route: selectedRoute,
          routes: routes
        })
      });

      if (response.ok) {
        setSaveSuccess(true);
        fetchHistory(); // Refresh history panel
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (e) {
      console.error("Failed to save route:", e);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Failed to log out", err);
    }
  };

  const loadPastSearch = (item) => {
    setRoutes(item.routes);
    setRecommendationId(item.selected_route_id);
    setCurrentLocName(item.source);
    setDestinationName(item.destination);
    setPrompt(`Plan a trip to ${item.destination}`);
    setBudgetInput(item.budget || "");
    setPreferenceInput(item.preference || "eco-friendly");
    
    // Set coordinates for visualization
    if (item.routes && item.routes.length > 0) {
      const firstRoute = item.routes[0];
      if (firstRoute.start_location) setStartCoords(firstRoute.start_location);
      if (firstRoute.end_location) setEndCoords(firstRoute.end_location);
    }

    setWeatherData({
      temp: 22,
      condition: "Clear Climate (Saved)",
      humidity: 50
    });
    setSentimentData("Saved Record");

    setActiveQuery({
      source: item.source,
      destination: item.destination,
      budget: item.budget,
      preference: item.preference
    });
  };

  const getTransportIcon = (mode) => {
    switch (mode) {
      case "driving": return "🚗";
      case "transit": return "🚍";
      case "bicycling": return "🚴";
      case "walking": return "🚶";
      default: return "✈️";
    }
  };



  return (
    <div className="min-h-screen pb-16 relative overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-950/40 rounded-full blur-[120px] pointer-events-none pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-950/40 rounded-full blur-[120px] pointer-events-none pulse-glow" />

      {/* Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl gradient-button flex items-center justify-center bg-indigo-600">
              <Navigation className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight gradient-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">EcoRoute AI</span>
              <span className="block text-[10px] text-slate-400 font-medium">Smart Sustainable Travel</span>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-4 text-xs font-semibold text-slate-400">
              <span className="px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">SDG 11</span>
              <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">SDG 12</span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SDG 13</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {/* Banner Hero */}
        <div className="text-center max-w-3xl mx-auto mb-10 relative">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4.5 py-1.5 mb-6 text-xs text-indigo-300 font-bold tracking-wide uppercase shadow-lg shadow-indigo-500/5 float-animation">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>AI-Driven Sustainable Travel Intelligence Engine</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
            Journey Smart. <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">Travel Sustainably.</span>
          </h1>
          <p className="mt-5 text-slate-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto font-medium">
            Optimize your journeys dynamically. Compare route options across distance, travel times, atmospheric carbon emissions, and operational costs. Build green pathways for a healthier planet.
          </p>
        </div>

        {/* Navigation Switcher between Planner, Analytics, and Telemetry Monitoring */}
        <div className="flex items-center justify-center space-x-2 mb-10 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800 max-w-md mx-auto backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setViewMode("planner")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 ${
              viewMode === "planner"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Route Planner</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("analytics")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 ${
              viewMode === "analytics"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Analytics Center</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("monitoring")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 ${
              viewMode === "monitoring"
                ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cloud className="w-3.5 h-3.5 animate-pulse" />
            <span>System Health</span>
          </button>
        </div>

        {viewMode === "planner" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">


            {/* LEFT SIDE: Custom Reactive Forms Panel */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-card p-6 rounded-3xl relative overflow-hidden bg-slate-900/40 border border-slate-800 backdrop-blur-xl">
                
                {/* Panel Header with Voice dictation (SDG 11: Micro-mobility inputs & automation) */}
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-extrabold tracking-widest text-slate-500 uppercase">Input Configuration</span>
                  <button
                    type="button"
                    onClick={startVoiceRecognition}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-all ${
                      isListening
                        ? "bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse"
                        : "bg-indigo-500/5 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10 hover:text-white"
                    }`}
                    title="Dictate travel prompt or say 'Plan trip from Kochi to Bangalore'"
                  >
                    <span>🎙️</span>
                    <span>{isListening ? "Listening..." : "Voice Input"}</span>
                  </button>
                </div>

                {/* Form Navigation Tabs */}
                <div className="flex p-1 bg-slate-950/80 rounded-2xl border border-slate-855 mb-6 space-x-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("ai")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 ${
                      activeTab === "ai"
                        ? "bg-indigo-650/20 text-indigo-400 border border-indigo-500/20 shadow-md shadow-indigo-500/5"
                        : "text-slate-400 hover:text-slate-200 border border-transparent"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Vibe Agent 🎭</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("direct")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 ${
                      activeTab === "direct"
                        ? "bg-emerald-650/20 text-emerald-400 border border-emerald-500/20 shadow-md shadow-emerald-500/5"
                        : "text-slate-400 hover:text-slate-200 border border-transparent"
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>Direct Optimizer 🗺️</span>
                  </button>
                </div>

              {/* Tab 1: AI Prompt Form */}
              {activeTab === "ai" && (
                <form onSubmit={handleSmartPlan} className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-1.5 mb-1.5">
                      <Coffee className="w-4 h-4 text-indigo-400" />
                      <label className="block text-xs font-semibold text-slate-400">Describe Your Mood, Vibe or Travel Goals</label>
                    </div>
                    <div className="relative">
                      <textarea
                        required
                        rows={4}
                        placeholder="I'm feeling burnt out and need a quiet beach with good food... Or say 'Plan a trip to Paris'!"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 transition-all resize-none"
                      />
                      <button
                        type="button"
                        onClick={handleVoiceInput}
                        className={`absolute right-3 bottom-3 p-1.5 rounded-lg border transition-all ${
                          isListening
                            ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                            : "bg-slate-900/50 text-indigo-400 border-slate-800 hover:border-slate-700 hover:text-indigo-300"
                        }`}
                        title="Voice Input (Speech to Text)"
                      >
                        <Mic className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Vibe Presets Quick Tags (SDG 12 & SDG 11) */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        { label: "🧘 Calm & Relaxed", text: "I feel tired and want pure relaxation in nature" },
                        { label: "🌋 Stressed Out", text: "I am feeling extremely stressed and need a quiet beach getaway" },
                        { label: "🧗 Adventurous", text: "I want an exciting wilderness trip with outdoor trekking" },
                        { label: "💖 Romantic Date", text: "I want a romantic palace trip with beautiful lakeside walks" }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPrompt(item.text)}
                          className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:border-indigo-500/50 transition-all font-bold"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 md:gap-4">
                    {/* Budget Field */}
                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <span className="text-xs text-indigo-400 font-bold">₹</span>
                        <label className="block text-[10px] md:text-xs font-semibold text-slate-400">Budget (INR)</label>
                      </div>
                      <input
                        type="number"
                        placeholder="50000"
                        value={budgetInput}
                        onChange={(e) => setBudgetInput(e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 transition-all"
                      />
                    </div>

                    {/* Duration Field */}
                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <label className="block text-[10px] md:text-xs font-semibold text-slate-400">Duration (Days)</label>
                      </div>
                      <input
                        type="number"
                        placeholder="5"
                        value={durationInput}
                        onChange={(e) => setDurationInput(e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 transition-all"
                      />
                    </div>

                    {/* Start Location Field */}
                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                        <label className="block text-[10px] md:text-xs font-semibold text-slate-400">Start Location</label>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="e.g. 9.0993, 76.4903"
                          value={currentLocName}
                          onChange={(e) => setCurrentLocName(e.target.value)}
                          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 pl-3 pr-8 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={handleGetLocation}
                          disabled={gettingLocation}
                          className="absolute right-2 top-3 text-indigo-400 hover:text-indigo-300 transition-all disabled:opacity-50"
                          title="Use Current GPS Coordinates"
                        >
                          <Send className={`w-3.5 h-3.5 transform rotate-[315deg] ${gettingLocation ? 'animate-pulse' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4.5 rounded-2xl font-extrabold text-sm text-black bg-white hover:bg-slate-100 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 shadow-xl"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 transform rotate-[315deg]" />
                        <span>Plan My Escape</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Tab 2: Direct Reactive Form */}
              {activeTab === "direct" && (
                <form onSubmit={handleDirectPlan} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Starting Point</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-emerald-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mumbai, India"
                        value={currentLocName}
                        onChange={(e) => setCurrentLocName(e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={gettingLocation}
                        className="absolute right-3 top-2.5 text-emerald-400 hover:text-emerald-300 transition-all disabled:opacity-50"
                        title="Use Current GPS Coordinates"
                      >
                        <Send className={`w-4 h-4 transform rotate-[315deg] ${gettingLocation ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Multi-Stop Waypoints (SDG 11: Sustainable Infrastructure Support) */}
                  {stops.map((stop, idx) => (
                    <div key={idx} className="space-y-1 animate-fadeIn">
                      <div className="flex justify-between items-center">
                        <label className="block text-[11px] font-bold text-indigo-400">Intermediate Stop {idx + 1}</label>
                        <button
                          type="button"
                          onClick={() => {
                            const newStops = [...stops];
                            newStops.splice(idx, 1);
                            setStops(newStops);
                          }}
                          className="text-[10px] font-extrabold text-rose-500 hover:text-rose-400 hover:underline"
                        >
                          Remove Stop
                        </button>
                      </div>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-indigo-400" />
                        <input
                          type="text"
                          required
                          placeholder={`e.g. Stop address or landmark`}
                          value={stop}
                          onChange={(e) => {
                            const newStops = [...stops];
                            newStops[idx] = e.target.value;
                            setStops(newStops);
                          }}
                          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 transition-all"
                        />
                      </div>
                    </div>
                  ))}

                  {stops.length < 3 && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setStops([...stops, ""])}
                        className="text-xs font-extrabold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl transition-all"
                      >
                        <span>+ Add Stop Waypoint</span>
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Destination Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-emerald-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Pune, MH"
                        value={destinationName}
                        onChange={(e) => setDestinationName(e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Coupled Slider + Numeric Budget Settings (SDG 12) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-400">Budget Limit (₹ INR)</label>
                      <span className="text-xs font-bold text-emerald-400">{budgetInput ? `₹${budgetInput}` : "No Limit"}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-3 w-4 h-4 text-emerald-400" />
                        <input
                          type="number"
                          placeholder="Enter budget limit"
                          value={budgetInput}
                          onChange={(e) => setBudgetInput(e.target.value)}
                          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-500 transition-all"
                        />
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="2000"
                        step="10"
                        value={budgetInput || 10}
                        onChange={(e) => setBudgetInput(e.target.value)}
                        className="w-full accent-emerald-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Travel Priority</label>
                    <select
                      value={preferenceInput}
                      onChange={(e) => setPreferenceInput(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500 text-slate-100 transition-all"
                    >
                      <option value="eco-friendly">♻️ Eco-Friendly Preferred</option>
                      <option value="cheap">💵 Cheapest Price</option>
                      <option value="fast">⚡ Fastest Duration</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 py-4.5 rounded-2xl font-extrabold text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 shadow-xl shadow-emerald-500/10"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    ) : (
                      <>
                        <Navigation className="w-4 h-4" />
                        <span>Get Optimized Routes</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Past searches container */}
            <div className="glass-card p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl">
              <div className="flex items-center space-x-2 mb-4">
                <History className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Search History</h3>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-900/10">
                  <p className="text-xs text-slate-500">No previous routes saved yet.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {history.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadPastSearch(item)}
                      className="w-full text-left p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-all flex justify-between items-center group"
                    >
                      <div className="truncate pr-2">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-200">
                          <span className="truncate">{item.source.split(',')[0]}</span>
                          <ArrowRight className="w-3 h-3 flex-shrink-0 text-slate-500" />
                          <span className="truncate">{item.destination.split(',')[0]}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Preference: {item.preference}
                        </span>
                      </div>
                      <Award className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Dynamic Dashboards */}
          <div className="lg:col-span-8 space-y-6">

            {/* Error notifications */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start space-x-3 text-red-400">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sm">Failed to fetch routes</span>
                  <p className="text-xs mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Budget alarm notifier */}
            {budgetExceeded && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-start space-x-3 text-orange-400">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sm">Budget Cap Warning</span>
                  <p className="text-xs mt-0.5">All calculated travel routes exceed your specified budget of ₹${activeQuery?.budget} INR. Try increasing the budget limit or planning with micro-mobility options.</p>
                </div>
              </div>
            )}

            {/* Save success toast banner */}
            {saveSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center space-x-3 text-emerald-400 animate-bounce">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-bold text-sm">Route selection successfully synchronized with Cloud Firestore!</span>
              </div>
            )}

            {/* Welcome skeleton if no routes fetched yet */}
            {routes.length === 0 && !loading && !error && (
              <div className="text-center py-20 px-6 glass-card rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
                  <Navigation className="w-8 h-8 text-indigo-400 animate-pulse" />
                </div>
                <h3 className="font-extrabold text-xl">Ready for Routing Optimization</h3>
                <p className="text-sm text-slate-400 max-w-md mt-2">
                  Configure your starting point, destination, preference and budget cap limits in the left panel, and click submit to analyze green travel routes!
                </p>
              </div>
            )}

            {/* Loading state spinner */}
            {loading && (
              <div className="text-center py-28 glass-card rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin mb-4" />
                <span className="font-bold text-slate-200">Executing optimization calculations...</span>
                <p className="text-xs text-slate-500 mt-1">Comparing distances, travel times, and greenhouse gas metrics.</p>
              </div>
            )}

            {/* AI Insights & Weather Banner */}
            {activeQuery && weatherData && !loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 glass-card rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI Sentiment Profile</span>
                    <h4 className="font-bold text-slate-200 capitalize">{sentimentData || "Standard Trip"}</h4>
                    <p className="text-xs text-slate-400 mt-1">Detected goal: {activeQuery.preference}. Optimizing routes accordingly.</p>
                  </div>
                </div>
                
                <div className="p-5 glass-card rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                    <Cloud className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Destination Weather</span>
                    <h4 className="font-bold text-slate-200 capitalize">{weatherData.temp}°C, {weatherData.condition}</h4>
                    <p className="text-xs text-slate-400 mt-1">Humidity: {weatherData.humidity}% in {activeQuery.destination}.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Mood Travel Recommendation Insights Card (SDG 11, 12, 13) */}
            {moodResult && !loading && (
              <div className="glass-card p-6 rounded-3xl bg-slate-900/40 border border-purple-500/30 backdrop-blur-xl relative overflow-hidden space-y-6">
                
                {/* Purple decorative ambient background glow */}
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-xl animate-pulse">
                      🎭
                    </div>
                    <div>
                      <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block">Core Mood Recommender Vibe</span>
                      <h3 className="font-black text-xl text-slate-100">Personalized NLP Travel Plan</h3>
                    </div>
                  </div>
                  <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm">
                    Mood Detected: {moodDetected}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                  {/* Left block: recommendation metrics */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-all">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Recommended Destination</span>
                      <span className="text-lg font-extrabold text-slate-200">{moodResult.destination}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-all">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Why this Trip?</span>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">"{moodResult.why_this_trip}"</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850">
                        <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Suggested Mode</span>
                        <span className="text-xs font-extrabold text-purple-400">{moodResult.travel_mode}</span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850">
                        <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Optimal Weather</span>
                        <span className="text-xs font-extrabold text-sky-400 capitalize">{weatherData?.condition || "Mild & Sunny"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right block: estimated cost breakdown */}
                  <div className="md:col-span-5 p-5 rounded-2xl bg-purple-950/10 border border-purple-500/15 flex flex-col justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-3 text-center">Cost Estimate Breakdown</span>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">Eco Lodging stay</span>
                          <span className="text-slate-200 font-bold">₹{moodResult.cost_breakdown?.stay} INR</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">Organic local food</span>
                          <span className="text-slate-200 font-bold">₹{moodResult.cost_breakdown?.food} INR</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">Low-Carbon transit</span>
                          <span className="text-slate-200 font-bold">₹{moodResult.cost_breakdown?.travel} INR</span>
                        </div>
                        <div className="border-t border-purple-500/20 my-2 pt-2 flex justify-between items-center text-sm">
                          <span className="text-slate-200 font-extrabold">Estimated Total</span>
                          <span className="text-purple-400 font-black text-base">₹{moodResult.cost_breakdown?.total} INR</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 text-center leading-relaxed mt-4 pt-3 border-t border-purple-500/10 font-bold">
                      CO₂ Emission offset fully covered under SDG 13 initiatives.
                    </div>
                  </div>
                </div>

                {/* Eco-Friendly Booking & Transport Links */}
                <div className="space-y-3 pt-4 border-t border-slate-800/60 mt-4 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <span className="block text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                      🍃 Verified Eco-Friendly Booking & Transport Links
                    </span>
                    <span className="text-[9px] text-slate-500 font-extrabold uppercase">
                      Estimated Local Fares
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        name: "IRCTC Indian Railways",
                        mode: "Sustainable Train",
                        cost: "₹350 - ₹1,200",
                        link: `https://www.irctc.co.in/nget/train-search`,
                        icon: "🚆",
                        badge: "Low CO₂ Emission"
                      },
                      {
                        name: "redBus / KSRTC",
                        mode: "Eco-Friendly Bus Route",
                        cost: "₹450 - ₹950",
                        link: `https://www.redbus.in/bus-tickets`,
                        icon: "🚌",
                        badge: "Shared Energy Saving"
                      },
                      {
                        name: "Zoomcar / EV Cab",
                        mode: "Electric Vehicle Rental",
                        cost: "₹1,800 - ₹3,500",
                        link: "https://www.zoomcar.com/",
                        icon: "🚗",
                        badge: "Zero Tailpipe Gases"
                      },
                      {
                        name: "Google Flights",
                        mode: "Offset Air Travel",
                        cost: "₹4,500 - ₹8,000",
                        link: `https://www.google.com/travel/flights?q=Flights+to+${encodeURIComponent(moodResult.destination || "Kerala")}`,
                        icon: "✈️",
                        badge: "CO₂ Offset Matcher"
                      }
                    ].map((opt, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-2xl">{opt.icon}</span>
                            <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {opt.badge}
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-slate-200 mt-3">{opt.name}</h4>
                          <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{opt.mode}</span>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-slate-900/60 flex items-center justify-between">
                          <div>
                            <span className="block text-[8px] text-slate-500 font-extrabold uppercase tracking-wide">Est. Fare</span>
                            <span className="text-xs font-extrabold text-slate-200">{opt.cost}</span>
                          </div>
                          
                          <a
                            href={opt.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-extrabold hover:bg-slate-850 transition-all flex items-center space-x-1 hover:text-white"
                          >
                            <span>Book Route</span>
                            <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day-wise itinerary list */}
                {moodResult.itinerary && moodResult.itinerary.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mood-Based Day-wise Itinerary</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {moodResult.itinerary.map((dayPlan, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-900 flex flex-col justify-between hover:border-purple-500/20 transition-all animate-fadeIn">
                          <div>
                            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-widest">
                              {dayPlan.day}
                            </span>
                            <p className="text-[11px] text-slate-400 leading-relaxed mt-2.5 font-medium">
                              {dayPlan.activities}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Map Visualization (Secure, Client-side React Google Maps) */}
            {routes.length > 0 && !loading && (
              mapsApiKey ? (
                <div className="glass-card p-6 rounded-3xl relative overflow-hidden bg-slate-900/40 border border-slate-800 backdrop-blur-xl">
                  <div className="flex items-center space-x-2 mb-4">
                    <MapIcon className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="font-bold text-base">Interactive Journey Map</h3>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Visualizing active routes from {activeQuery?.source.split(',')[0]} to {activeQuery?.destination.split(',')[0]}.
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-full h-[320px] overflow-hidden rounded-2xl border border-slate-850 bg-slate-950">
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={
                        selectedPlaceCoords 
                          ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${selectedPlaceCoords.lat},${selectedPlaceCoords.lng}`
                          : `https://www.google.com/maps/embed/v1/directions?key=${mapsApiKey}&origin=${encodeURIComponent(activeQuery?.source || '')}&destination=${encodeURIComponent(activeQuery?.destination || '')}${stops && stops.filter(s => s.trim() !== "").length > 0 ? `&waypoints=${encodeURIComponent(stops.filter(s => s.trim() !== "").join("|"))}` : ""}`
                      }
                    ></iframe>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center py-10 bg-slate-900/40 border border-slate-800 text-center">
                  <MapIcon className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
                  <span className="text-xs text-slate-400 font-semibold">Google Maps is running in Local Emulation Mode</span>
                  <p className="text-[10px] text-slate-550 max-w-xs mt-1 leading-relaxed">
                    Set a GOOGLE_MAPS_API_KEY in the backend `.env` file to fully unlock beautiful dynamic visual maps here.
                  </p>
                </div>
              )
            )}

            {/* ROUTE CARDS GRID */}
            {routes.length > 0 && !loading && (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-extrabold text-xl">Available Transport Options</h3>
                    <span className="text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                      Recommendation based on: {activeQuery?.preference}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {routes.map((route) => {
                      const isRecommended = route.id === recommendationId;
                      return (
                        <div
                          key={route.id}
                          className={`glass-card p-5 rounded-2xl relative flex flex-col justify-between bg-slate-900/40 border backdrop-blur-xl ${
                            isRecommended
                              ? "border-emerald-500/50 shadow-emerald-500/5 ring-1 ring-emerald-500/20"
                              : "border-slate-800"
                          }`}
                        >
                          {/* Recommended Indicator badge */}
                          {isRecommended && (
                            <div className="absolute top-3 right-3 flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold tracking-wider uppercase">
                              <CheckCircle className="w-3 h-3" />
                              <span>AI Recommended</span>
                            </div>
                          )}

                          {/* Mode Header */}
                          <div>
                            <div className="flex items-center space-x-3 mb-4">
                              <span className="text-2xl">{getTransportIcon(route.mode)}</span>
                              <div>
                                <h4 className="font-bold text-sm text-slate-200">{route.mode_display}</h4>
                                <span className="text-[10px] text-slate-500 font-medium">Distance: {route.distance}</span>
                              </div>
                            </div>

                            {/* Key metrics grid */}
                            <div className="grid grid-cols-3 gap-3 border-t border-b border-slate-800/80 py-3 mb-4 text-center">
                              {/* Time */}
                              <div>
                                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Duration</span>
                                <span className="text-sm font-bold text-slate-300">{route.time}</span>
                              </div>

                              {/* Cost */}
                              <div>
                                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Est. Cost</span>
                                <span className="text-sm font-bold text-indigo-400">₹{route.cost}</span>
                              </div>

                              {/* Carbon */}
                              <div>
                                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">CO₂ Emission</span>
                                <span className={`text-sm font-bold ${route.carbon === 0 ? "text-emerald-400" : "text-emerald-300"}`}>
                                  {route.carbon} kg
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Available Booking Options Grid (SDG 11 & SDG 12) */}
                          {route.options && route.options.length > 0 && (
                            <div className="mt-4 mb-5 pt-4 border-t border-slate-800/80">
                              <span className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-3 text-left">
                                Available Booking Options
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {route.options.map((opt, oIdx) => (
                                  <div
                                    key={oIdx}
                                    className={`p-3.5 rounded-2xl border flex flex-col justify-between transition-all hover:bg-slate-900/40 group text-left ${
                                      opt.cheapest 
                                        ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50 shadow-md shadow-emerald-950/50" 
                                        : "bg-slate-900/20 border-slate-800 hover:border-slate-700 shadow-md shadow-slate-950/50"
                                    }`}
                                  >
                                    <div>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-xl">{opt.icon}</span>
                                          <span className="block text-xs font-black text-slate-100">{opt.type}</span>
                                        </div>
                                        {opt.cheapest && (
                                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0 scale-95">
                                            Cheapest
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-2.5 flex justify-between items-baseline">
                                        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Est. Cost</span>
                                        <span className="text-sm font-black text-indigo-400">₹{opt.cost}</span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleBookOptionClick(opt, route)}
                                      title="Click to book tickets"
                                      className="w-full mt-3.5 py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 group-hover:bg-slate-800/80 group-hover:border-slate-700 transition-all text-xs font-black text-slate-300 hover:text-white flex items-center justify-center space-x-1.5 active:scale-95"
                                    >
                                      <span>Book Tickets</span>
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions / Tag list */}
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {/* Carbon Level Badge */}
                              {(() => {
                                const indicator = getCarbonIndicator(route.carbon);
                                return (
                                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg ${indicator.class}`}>
                                    {indicator.label}
                                  </span>
                                );
                              })()}

                              {/* Eco Score Badge (1-100 score with Green/Yellow/Red conditioning) */}
                              {route.eco_score !== undefined && (
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${
                                  route.eco_color === "green"
                                    ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                                    : route.eco_color === "yellow"
                                      ? "bg-amber-950/40 text-amber-400 border-amber-500/30"
                                      : "bg-rose-950/40 text-rose-400 border-rose-500/30"
                                }`}>
                                  🌱 Score: {route.eco_score}/100
                                </span>
                              )}

                              {route.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg ${
                                    tag === "Eco-Friendly"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : tag === "Cheapest"
                                        ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  }`}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>

                            <button
                              onClick={() => handleSaveRoute(route)}
                              title="Save this trip choice directly into Cloud BigQuery"
                              className="text-xs font-black uppercase tracking-wider bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/30 hover:border-emerald-400 px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/20 active:scale-95 transition-all flex items-center space-x-1.5"
                            >
                              <Bookmark className="w-3.5 h-3.5 fill-current" />
                              <span>Save to My Trips</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* GEO GUIDE AGENT: NEARBY PLACES DISCOVERY (SDG 11: Sustainable Communities) */}
                {places && (
                  <div className="glass-card p-6 rounded-3xl mt-6 bg-slate-900/40 border border-slate-800 backdrop-blur-xl animate-fadeIn">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-5 h-5 text-indigo-400 animate-pulse" />
                        <div>
                          <h3 className="font-extrabold text-base">Geo Guide: Local Destinations</h3>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Explore curated, nearby establishments at your destination (SDG 11)</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                        Places Discovery
                      </span>
                    </div>

                    {/* Places Category Pill Switchers */}
                    <div className="flex space-x-2 mb-4 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
                      {["hotels", "restaurants", "fuel", "attractions"].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setActivePlaceCat(cat)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap capitalize ${
                            activePlaceCat === cat
                              ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20"
                              : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white"
                          }`}
                        >
                          {cat === "fuel" ? "⛽ Fuel & EV Stations" : cat === "hotels" ? "🏨 Eco Lodging" : cat === "restaurants" ? "🍽️ Organic Dining" : "🎯 Tourist Sights"}
                        </button>
                      ))}
                    </div>

                    {/* Places List Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(places[activePlaceCat] || []).map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedPlaceCoords({ lat: item.lat, lng: item.lng })}
                          className={`p-3.5 rounded-2xl cursor-pointer border transition-all flex flex-col justify-between bg-slate-950/40 hover:bg-slate-900/40 hover:border-slate-700 ${
                            selectedPlaceCoords?.lat === item.lat && selectedPlaceCoords?.lng === item.lng
                              ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/30"
                              : "border-slate-850"
                          }`}
                        >
                          <div>
                            <h4 className="font-extrabold text-xs text-slate-200 line-clamp-1">{item.name}</h4>
                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{item.vicinity}</p>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-900/50">
                            <span className="text-[10px] font-bold text-slate-400 flex items-center space-x-0.5">
                              <span>⭐</span>
                              <span>{item.rating}</span>
                            </span>
                            <span className="text-[9px] font-extrabold text-indigo-400 hover:underline">
                              Locate on Map
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI GENERATED ITINERARY */}
                {itinerary && itinerary.length > 0 && (
                  <div className="glass-card p-6 rounded-3xl mt-6 bg-slate-900/40 border border-slate-800 backdrop-blur-xl">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-800/80 pb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                        <div>
                          <h3 className="font-extrabold text-base">AI Generated Itinerary</h3>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Personalized travel plan for {activeQuery?.destination}</span>
                        </div>
                      </div>
                      <button
                        onClick={handleExportPDF}
                        className="text-xs font-bold text-indigo-400 hover:text-white bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl hover:bg-indigo-500/20 hover:border-indigo-500/40 flex items-center space-x-1.5 transition-all"
                        title="Download PDF Travel Report"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export PDF</span>
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {itinerary.map((dayPlan, idx) => (
                        <div key={idx} className="flex space-x-4">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 z-10">
                              <span className="text-xs font-bold text-indigo-400">{idx + 1}</span>
                            </div>
                            {idx !== itinerary.length - 1 && (
                              <div className="w-0.5 h-full bg-slate-800 my-1"></div>
                            )}
                          </div>
                          <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-4 flex-1 mb-2">
                            <h4 className="font-bold text-sm text-slate-200 mb-2">{dayPlan.day}</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">{dayPlan.activities}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SVG COMPARISON CHART */}
                <div className="glass-card p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl">
                  <div className="flex items-center space-x-2 mb-6">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="font-extrabold text-base">Cost ($) vs. Carbon Footprint (kg CO₂)</h3>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Visual route index comparison (lower is better)</span>
                    </div>
                  </div>

                  {/* Render Custom React SVG Bar Chart */}
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[400px]">
                      <svg viewBox="0 0 500 160" className="w-full h-auto">
                        {/* Grid lines */}
                        <line x1="80" y1="10" x2="480" y2="10" stroke="#334155" strokeWidth="0.5" strokeDasharray="3" />
                        <line x1="80" y1="50" x2="480" y2="50" stroke="#334155" strokeWidth="0.5" strokeDasharray="3" />
                        <line x1="80" y1="90" x2="480" y2="90" stroke="#334155" strokeWidth="0.5" strokeDasharray="3" />
                        <line x1="80" y1="130" x2="480" y2="130" stroke="#334155" strokeWidth="0.5" strokeDasharray="3" />

                        {routes.map((route, idx) => {
                          const yOffset = 15 + idx * 35;

                          // Normalize bar widths (max value constraint)
                          const maxCost = Math.max(...routes.map(r => r.cost)) || 1;
                          const maxCarbon = Math.max(...routes.map(r => r.carbon)) || 1;

                          const costWidth = Math.max(5, (route.cost / maxCost) * 160);
                          const carbonWidth = Math.max(5, (route.carbon / maxCarbon) * 160);

                          return (
                            <g key={route.id}>
                              {/* Y Axis Label */}
                              <text x="10" y={yOffset + 14} fill="#94a3b8" fontSize="9" fontWeight="bold">
                                {route.mode_display.split(' ')[0]}
                              </text>

                              {/* Cost Bar (Blue/Indigo Gradient representation) */}
                              <rect x="80" y={yOffset} width={costWidth} height="8" rx="2" fill="url(#blueGrad)" />
                              <text x={85 + costWidth} y={yOffset + 7} fill="#818cf8" fontSize="8" fontWeight="bold">
                                ₹{route.cost}
                              </text>

                              {/* Carbon Bar (Emerald representation) */}
                              <rect x="80" y={yOffset + 11} width={carbonWidth} height="8" rx="2" fill="url(#greenGrad)" />
                              <text x={85 + carbonWidth} y={yOffset + 18} fill="#34d399" fontSize="8" fontWeight="bold">
                                {route.carbon} kg
                              </text>
                            </g>
                          );
                        })}

                        {/* Defs for gradients */}
                        <defs>
                          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                          <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#059669" />
                            <stop offset="100%" stopColor="#10b981" />
                          </linearGradient>
                        </defs>
                      </svg>

                      {/* Legend */}
                      <div className="flex items-center justify-center space-x-6 mt-4 text-[10px] font-bold text-slate-400">
                        <div className="flex items-center space-x-2">
                          <span className="w-3 h-1.5 rounded-sm bg-indigo-500 inline-block" />
                          <span>Estimated Cost (₹ INR)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-3 h-1.5 rounded-sm bg-emerald-500 inline-block" />
                          <span>Carbon Emission (kg CO₂)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : viewMode === "analytics" ? (
        <AnalyticsDashboard />
      ) : (
        <CloudMonitoringDashboard />
      )}


      </main>

      {/* Footer copyright */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-900 mt-16 pt-6 text-center text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
        © {new Date().getFullYear()} EcoRoute AI. Built in support of Sustainable & Cost-Optimized Transportation.
      </footer>

      {/* FLOATING CHATBOT ASSISTANT (SDG 11, 12, 13) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Chat window drawer */}
        {chatOpen && (
          <div className="w-80 h-96 glass-card rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur-2xl shadow-2xl flex flex-col justify-between mb-4 overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-extrabold text-xs text-slate-100">EcoRoute AI Assistant</span>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Message History list thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-indigo-500 text-white rounded-tr-none'
                        : 'bg-slate-900 border border-slate-850 text-slate-300 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-850 text-slate-500 rounded-2xl rounded-tl-none px-3 py-2 text-xs flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Quick replies */}
            <div className="px-3 py-1.5 bg-slate-900/20 border-t border-slate-900 flex space-x-1 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setChatInput("Suggest cheapest route");
                  // Immediate send mock submit trigger
                  setTimeout(() => {
                    const btn = document.getElementById("chatSubmitBtn");
                    if (btn) btn.click();
                  }, 100);
                }}
                className="text-[9px] font-bold bg-slate-950 border border-slate-800 text-slate-400 hover:text-white px-2 py-0.5 rounded-lg whitespace-nowrap transition-all"
              >
                💵 Cheapest
              </button>
              <button
                type="button"
                onClick={() => {
                  setChatInput("Suggest eco-friendly route");
                  setTimeout(() => {
                    const btn = document.getElementById("chatSubmitBtn");
                    if (btn) btn.click();
                  }, 100);
                }}
                className="text-[9px] font-bold bg-slate-950 border border-slate-800 text-slate-400 hover:text-white px-2 py-0.5 rounded-lg whitespace-nowrap transition-all"
              >
                ♻️ Eco-Friendly
              </button>
              <button
                type="button"
                onClick={() => {
                  setChatInput("Suggest fastest route");
                  setTimeout(() => {
                    const btn = document.getElementById("chatSubmitBtn");
                    if (btn) btn.click();
                  }, 100);
                }}
                className="text-[9px] font-bold bg-slate-950 border border-slate-800 text-slate-400 hover:text-white px-2 py-0.5 rounded-lg whitespace-nowrap transition-all"
              >
                ⚡ Fastest
              </button>
            </div>

            {/* Chat Input form */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-900 bg-slate-950 flex items-center space-x-2">
              <input
                type="text"
                placeholder="Ask about cheapest or eco route..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                className="flex-1 bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500"
              />
              <button
                type="submit"
                id="chatSubmitBtn"
                disabled={chatLoading || !chatInput.trim()}
                className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white rounded-xl p-2 transition-all flex items-center justify-center flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Floating Bubble Button */}
        <button
          type="button"
          onClick={() => setChatOpen(!chatOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white shadow-xl shadow-indigo-500/20 flex items-center justify-center transition-all transform hover:scale-105 active:scale-95"
          title="Open AI Travel Desk Chatbot"
        >
          {chatOpen ? (
            <span className="text-xl font-bold">✕</span>
          ) : (
            <MessageSquare className="w-6 h-6 animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
}
