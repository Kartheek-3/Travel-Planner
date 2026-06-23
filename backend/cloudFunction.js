// AI-Powered Smart Travel Planner - Optimization Engine (Cloud Function port)
// Alignments:
// - SDG 11: Sustainable Cities and Communities (promoting eco-friendly public transit & micro-mobility)
// - SDG 12: Responsible Consumption (optimizing cost limits)
// - SDG 13: Climate Action (minimizing carbon footprint)

// Emission factors: kg CO2 emitted per kilometer (based on standard transport metrics)
const EMISSION_FACTORS = {
  driving: 0.12,      // Private vehicles generate significant emissions
  transit: 0.04,      // Public transit (buses/trains) has a lower impact per passenger
  walking: 0.0,       // Active mobility produces zero emissions (SDG 11 & 13)
  bicycling: 0.0,     // Active mobility produces zero emissions
};

// Cost factors: USD (or equivalent currency unit) per kilometer
const COST_FACTORS = {
  driving: 0.25,      // Includes fuel, maintenance, and vehicle wear-and-tear
  transit: 0.08,      // Standard commercial ticket rates per km
  walking: 0.0,
  bicycling: 0.0,
};

/**
 * Formats travel time from seconds into readable string.
 */
export function formatTime(seconds) {
  if (seconds === 0) return "0 mins";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} mins`;
}


export function getTravelOptions(distance) {
  const options = [];
  const busCost = Math.round(distance * 1.5 * 100) / 100;
  const trainCost = Math.round(distance * 1.0 * 100) / 100;
  const flightCost = Math.round(distance * 5.0 * 100) / 100;

  if (distance < 300) {
    options.push(
      { type: "Bus", link: "https://www.redbus.in", cost: busCost, icon: "🚌" },
      { type: "Train", link: "https://www.irctc.co.in", cost: trainCost, icon: "🚆" }
    );
  } else if (distance < 800) {
    options.push(
      { type: "Train", link: "https://www.irctc.co.in", cost: trainCost, icon: "🚆" },
      { type: "Flight", link: "https://www.makemytrip.com/flights", cost: flightCost, icon: "✈️" }
    );
  } else {
    options.push(
      { type: "Flight", link: "https://www.makemytrip.com/flights", cost: flightCost, icon: "✈️" }
    );
  }

  if (options.length > 0) {
    const minCost = Math.min(...options.map(o => o.cost));
    options.forEach(o => {
      o.cheapest = (o.cost === minCost);
    });
  }

  return options;
}

/**
 * Optimization and SDG Enrichment Engine logic.
 */
export function runOptimizationLogic(routes, budget, preference = 'eco-friendly') {
  if (!routes || routes.length === 0) {
    return { routes: [], recommendation: null, budget_exceeded: false };
  }

  const pref = preference.toLowerCase();

  // 1. Enrich routes with Cost and Carbon calculations (SDG 13 & SDG 12)
  const processedRoutes = routes.map((r, index) => {
    const mode = (r.mode || "driving").toLowerCase();
    const distanceMeters = r.distance_val || 0;
    const timeSeconds = r.time_val || 0;
    const distanceKm = distanceMeters / 1000.0;

    // Calculate Carbon Footprint (SDG 13 - Climate Action)
    const emissionFactor = EMISSION_FACTORS[mode] !== undefined ? EMISSION_FACTORS[mode] : 0.12;
    const carbonEmissions = Math.round(distanceKm * emissionFactor * 100) / 100;

    // Calculate Estimated Travel Cost (SDG 12 - Responsible Consumption)
    const costFactor = COST_FACTORS[mode] !== undefined ? COST_FACTORS[mode] : 0.25;
    const estimatedCost = Math.round(distanceKm * costFactor * 100) / 100;

    return {
      id: `route_${index + 1}`,
      mode,
      mode_display: r.mode_display || (mode.charAt(0).toUpperCase() + mode.slice(1)),
      distance: `${Math.round(distanceKm * 100) / 100} km`,
      distance_val: distanceMeters,
      time: formatTime(timeSeconds),
      time_val: timeSeconds,
      cost: estimatedCost,
      carbon: carbonEmissions,
      tags: [],
      options: getTravelOptions(distanceKm)
    };
  });

  // 2. Determine Cheapest, Fastest, and Eco-Friendly routes
  const minCost = Math.min(...processedRoutes.map(r => r.cost));
  const minTime = Math.min(...processedRoutes.map(r => r.time_val));
  const minCarbon = Math.min(...processedRoutes.map(r => r.carbon));

  processedRoutes.forEach(r => {
    if (r.cost === minCost) r.tags.push("Cheapest");
    if (r.time_val === minTime) r.tags.push("Fastest");
    if (r.carbon === minCarbon) r.tags.push("Eco-Friendly");
  });

  // 3. Recommendation selection logic based on preference and optional budget
  let eligibleRoutes = processedRoutes;
  let budgetExceeded = false;

  if (budget !== null && budget !== undefined && budget > 0) {
    // Filter routes within budget
    const withinBudget = processedRoutes.filter(r => r.cost <= budget);
    if (withinBudget.length > 0) {
      eligibleRoutes = withinBudget;
    } else {
      budgetExceeded = true;  // Flag if all routes exceed budget
    }
  }

  // Select best route based on user preference from eligible routes
  let recommendation = null;
  if (eligibleRoutes.length > 0) {
    if (pref === "cheap") {
      recommendation = eligibleRoutes.reduce((prev, curr) => prev.cost < curr.cost ? prev : curr);
    } else if (pref === "fast") {
      recommendation = eligibleRoutes.reduce((prev, curr) => prev.time_val < curr.time_val ? prev : curr);
    } else {  // eco-friendly (default)
      recommendation = eligibleRoutes.reduce((prev, curr) => prev.carbon < curr.carbon ? prev : curr);
    }
  }

  return {
    routes: processedRoutes,
    recommendation: recommendation ? recommendation.id : null,
    budget_exceeded: budgetExceeded,
    sdg_alignments: {
      sdg_11_message: "SDG 11: Active and public transit routes support sustainable cities by reducing urban congestion.",
      sdg_12_message: "SDG 12: Cost optimization promotes sustainable travel budgeting and resource distribution.",
      sdg_13_message: "SDG 13: Low-carbon transit selections directly mitigate atmospheric CO2 impacts."
    }
  };
}
