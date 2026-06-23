import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Leaf, 
  IndianRupee, 
  Search, 
  ArrowRight, 
  Activity, 
  Info,
  Sparkles,
  Award
} from "lucide-react";

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch("/analytics");
      if (!response.ok) {
        throw new Error("Failed to load analytics statistics.");
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-28 glass-card rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mb-4" />
        <span className="font-bold text-slate-200">Retrieving BigQuery Data Warehouse...</span>
        <p className="text-xs text-slate-500 mt-1">Executing aggregate SQL metrics in real-time.</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 px-6 glass-card rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl flex flex-col items-center justify-center text-red-400">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
          <Info className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="font-extrabold text-xl">Analytics Connection Issue</h3>
        <p className="text-sm text-slate-400 max-w-md mt-2">
          Could not establish connection with Google BigQuery database adapter: {error}
        </p>
        <button
          onClick={fetchAnalytics}
          className="mt-6 px-5 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Fallbacks for empty data sets
  const mostSearched = data.most_searched || [];
  const averageCost = data.average_cost || 0.0;
  const averageCarbon = data.average_carbon || 0.0;
  const byPreference = data.by_preference || [];
  const recentRecords = data.recent_records || [];

  const totalSearches = recentRecords.length > 0 ? mostSearched.reduce((sum, item) => sum + item.count, 0) : 0;

  // SDG Message details
  const sdgGoals = [
    {
      id: "SDG 11",
      title: "Sustainable Commutes",
      val: "Bicycle / Transit Mode Shares",
      desc: "Promoting green transport integration helps develop breathable cities, lowers urban heat islands, and optimizes metropolitan layout space.",
      color: "from-orange-500 to-amber-500",
      bg: "bg-orange-500/10 border-orange-500/20"
    },
    {
      id: "SDG 12",
      title: "Cost Rationalization",
      val: `₹${averageCost} avg expense`,
      desc: "Analyzing transit fare metrics and resource distribution fosters responsible individual energy consumption and optimizes cost ratios.",
      color: "from-yellow-500 to-amber-400",
      bg: "bg-yellow-500/10 border-yellow-500/20"
    },
    {
      id: "SDG 13",
      title: "Greenhouse Gas Cut",
      val: `${averageCarbon} kg avg CO₂`,
      desc: "Tracking carbon footprints empowers travelers to make deliberate eco-friendly routes, mitigating atmospheric climate impacts.",
      color: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-500/10 border-emerald-500/20"
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Global KPI Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cost Card */}
        <div className="p-6 glass-card rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="absolute top-[-20%] right-[-10%] w-[120px] h-[120px] bg-indigo-500/10 rounded-full blur-[40px] group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">SDG 12: Cost Budgeting</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <IndianRupee className="w-4.5 h-4.5 animate-pulse" />
            </div>
          </div>
          <span className="text-3xl font-black text-slate-100">₹{averageCost.toFixed(2)}</span>
          <h4 className="font-extrabold text-sm text-slate-400 mt-2">Average Route Cost</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Overall travel fare optimized through standard cost routing coefficients.
          </p>
        </div>

        {/* Carbon Card */}
        <div className="p-6 glass-card rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="absolute top-[-20%] right-[-10%] w-[120px] h-[120px] bg-emerald-500/10 rounded-full blur-[40px] group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">SDG 13: Climate Action</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Leaf className="w-4.5 h-4.5" />
            </div>
          </div>
          <span className="text-3xl font-black text-slate-100">{averageCarbon.toFixed(2)} kg</span>
          <h4 className="font-extrabold text-sm text-slate-400 mt-2">Average CO₂ Footprint</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Atmospheric emissions index tracked across private and mass transit routes.
          </p>
        </div>

        {/* Searches Card */}
        <div className="p-6 glass-card rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl relative overflow-hidden group hover:border-purple-500/30 transition-all">
          <div className="absolute top-[-20%] right-[-10%] w-[120px] h-[120px] bg-purple-500/10 rounded-full blur-[40px] group-hover:bg-purple-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">BigQuery Warehouse</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Search className="w-4.5 h-4.5" />
            </div>
          </div>
          <span className="text-3xl font-black text-slate-100">{recentRecords.length}</span>
          <h4 className="font-extrabold text-sm text-slate-400 mt-2">Total Queries Persisted</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Active query instances logged in Primary Google BigQuery storage tables.
          </p>
        </div>
      </div>

      {/* 2. Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* CHART 1: Most Searched Routes */}
        <div className="glass-card p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-extrabold text-base">Most Frequently Searched Routes</h3>
              <span className="text-[10px] text-slate-500 block mt-0.5">Top-searched origin-destination segments</span>
            </div>
          </div>

          {mostSearched.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
              <p className="text-xs text-slate-500">Insufficient query history to generate routing analysis.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {mostSearched.map((route, idx) => {
                const maxCount = Math.max(...mostSearched.map(r => r.count)) || 1;
                const percentage = (route.count / maxCount) * 100;
                
                // Formulate a label
                const sourceShort = route.source.split(',')[0].trim();
                const destShort = route.destination.split(',')[0].trim();

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <div className="flex items-center space-x-1.5 truncate pr-2">
                        <span className="truncate">{sourceShort}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{destShort}</span>
                      </div>
                      <span className="text-[10px] text-indigo-400 font-extrabold flex-shrink-0 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                        {route.count} {route.count === 1 ? 'Search' : 'Searches'}
                      </span>
                    </div>

                    {/* Animated Horizontal Bar */}
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900 relative">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-400 transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CHART 2: Preference Breakdown */}
        <div className="glass-card p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center space-x-2 mb-6">
            <Activity className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-extrabold text-base">Carbon vs. Cost by Preference</h3>
              <span className="text-[10px] text-slate-500 block mt-0.5">Performance indices grouped by travel priority</span>
            </div>
          </div>

          {byPreference.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
              <p className="text-xs text-slate-500">No priority metrics saved yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-850 text-center">
                <span className="text-left">Priority</span>
                <span>Volume</span>
                <span>Avg Cost</span>
                <span>Avg CO₂</span>
              </div>
              
              {byPreference.map((pref, idx) => {
                // Color codes
                let tagColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
                let icon = "♻️";
                if (pref.preference === "cheap") {
                  tagColor = "text-violet-400 bg-violet-500/10 border-violet-500/25";
                  icon = "💵";
                } else if (pref.preference === "fast") {
                  tagColor = "text-amber-400 bg-amber-500/10 border-amber-500/25";
                  icon = "⚡";
                }

                return (
                  <div 
                    key={idx} 
                    className="grid grid-cols-4 items-center text-center text-xs font-semibold py-2.5 border-b border-slate-900/50 hover:bg-slate-900/20 transition-all rounded-lg"
                  >
                    <div className="text-left font-bold text-slate-200 capitalize flex items-center space-x-1">
                      <span>{icon}</span>
                      <span>{pref.preference === "eco-friendly" ? "Eco" : pref.preference}</span>
                    </div>
                    <span className="font-extrabold text-slate-400">{pref.count}</span>
                    <span className="font-extrabold text-indigo-400">₹{pref.avg_cost.toFixed(1)}</span>
                    <span className="font-extrabold text-emerald-400">{pref.avg_carbon.toFixed(1)} kg</span>
                  </div>
                );
              })}

              {/* Responsive SVG Preference Comparison */}
              <div className="h-28 mt-4 relative">
                <svg viewBox="0 0 300 80" className="w-full h-full">
                  {byPreference.map((pref, idx) => {
                    const x = 50 + idx * 100;
                    const maxCost = Math.max(...byPreference.map(p => p.avg_cost)) || 1;
                    const maxCarbon = Math.max(...byPreference.map(p => p.avg_carbon)) || 1;
                    
                    const costHeight = (pref.avg_cost / maxCost) * 45;
                    const carbonHeight = (pref.avg_carbon / maxCarbon) * 45;
                    
                    return (
                      <g key={idx}>
                        {/* Cost Bar */}
                        <rect x={x - 12} y={55 - costHeight} width="8" height={costHeight} rx="2" fill="#6366f1" />
                        {/* Carbon Bar */}
                        <rect x={x + 2} y={55 - carbonHeight} width="8" height={carbonHeight} rx="2" fill="#10b981" />
                        
                        {/* Label */}
                        <text x={x} y="72" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">
                          {pref.preference === "eco-friendly" ? "Eco" : pref.preference.toUpperCase()}
                        </text>
                      </g>
                    );
                  })}
                  <line x1="20" y1="55" x2="280" y2="55" stroke="#334155" strokeWidth="1" />
                </svg>
                
                {/* Micro Legend */}
                <div className="flex items-center justify-center space-x-4 text-[9px] font-bold text-slate-500 mt-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-1.5 rounded-sm bg-indigo-500 inline-block" />
                    <span>Cost Ratio</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-1.5 rounded-sm bg-emerald-500 inline-block" />
                    <span>CO₂ Emissions</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>



      {/* 4. SDG Direct Contribution breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sdgGoals.map((sdg, index) => (
          <div key={index} className={`p-5 rounded-2xl glass-card border border-slate-800 bg-slate-900/40 backdrop-blur-xl ${sdg.bg}`}>
            <span className="text-[9px] font-bold tracking-widest uppercase text-slate-500 block mb-1">Impact Analysis</span>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-extrabold text-sm text-slate-200">{sdg.id}: {sdg.title}</h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${sdg.color} text-white`}>
                {sdg.val}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{sdg.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
