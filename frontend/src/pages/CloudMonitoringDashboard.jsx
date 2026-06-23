import React, { useState, useEffect } from "react";
import { 
  Cloud, 
  Activity, 
  Cpu, 
  AlertOctagon, 
  RotateCw, 
  Clock, 
  CheckCircle, 
  Info,
  Server,
  Zap
} from "lucide-react";

export default function CloudMonitoringDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [simulatedErrorMsg, setSimulatedErrorMsg] = useState("");

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    let interval = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchMetrics(false);
      }, 4000); // refresh metrics every 4 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchMetrics = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch("/api/monitoring-metrics");
      if (!response.ok) {
        throw new Error("Failed to capture system telemetry logs.");
      }
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching system health metrics:", err);
      setError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const triggerSimulatedError = async () => {
    setSimulatedErrorMsg("Simulating database exception...");
    try {
      // Trigger a simulated error call to logging
      await fetch("/book-option", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "Current Location",
          // missing 'destination' and 'type' to force a 400 error log
        })
      });
      setTimeout(() => {
        fetchMetrics(false);
        setSimulatedErrorMsg("Simulated 400 Bad Request successfully logged!");
        setTimeout(() => setSimulatedErrorMsg(""), 3000);
      }, 500);
    } catch (err) {
      console.error(err);
      setSimulatedErrorMsg("Simulation failed.");
    }
  };

  if (loading && !metrics) {
    return (
      <div className="text-center py-28 glass-card rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mb-4" />
        <span className="font-bold text-slate-200">Connecting Real-time Telemetry Dashboard...</span>
        <p className="text-xs text-slate-500 mt-1">Acquiring execution trace and micro-service logs.</p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="text-center py-20 px-6 glass-card rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl flex flex-col items-center justify-center text-rose-400">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
          <AlertOctagon className="w-8 h-8 text-rose-400 animate-pulse" />
        </div>
        <h3 className="font-extrabold text-xl">Telemetry Connection Error</h3>
        <p className="text-sm text-slate-400 max-w-md mt-2">
          Unable to establish communication with local system log socket: {error}
        </p>
        <button
          onClick={() => fetchMetrics(true)}
          className="mt-6 px-5 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
        >
          Re-establish Connection
        </button>
      </div>
    );
  }

  const {
    total_requests = 0,
    average_latency_ms = 0.0,
    total_errors = 0,
    error_rate_pct = 0.0,
    api_usage = { gemini: 0, google_maps: 0, openweather: 0, bigquery: 0 },
    graph_points = [],
    recent_errors = []
  } = metrics || {};

  // Formulate data points for SVG line chart
  const hasGraphPoints = graph_points && graph_points.length > 0;
  
  // Calculate SVG line path
  let pathD = "";
  let areaD = "";
  if (hasGraphPoints) {
    const pointsCount = graph_points.length;
    const maxVal = Math.max(...graph_points.map(p => p.latency)) || 100;
    const heightScale = 45 / maxVal;
    
    const svgCoords = graph_points.map((p, idx) => {
      const x = 30 + (idx * (240 / (pointsCount - 1 || 1)));
      const y = 50 - (p.latency * heightScale);
      return { x, y };
    });
    
    pathD = `M ${svgCoords[0].x} ${svgCoords[0].y} ` + svgCoords.slice(1).map(c => `L ${c.x} ${c.y}`).join(" ");
    areaD = `${pathD} L ${svgCoords[svgCoords.length - 1].x} 50 L ${svgCoords[0].x} 50 Z`;
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header and Telemetry controllers */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-900 gap-4">
        <div>
          <h2 className="text-2xl font-black flex items-center space-x-2">
            <Cloud className="w-6 h-6 text-rose-500 animate-pulse" />
            <span>Cloud Operations Monitoring Hub</span>
          </h2>
          <span className="text-[11px] text-slate-500 block mt-1 font-semibold uppercase tracking-wider">
            Real-time App Latency, API Usage Shares, and Error Registry (SDG 11 & SDG 12)
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={triggerSimulatedError}
            className="px-3.5 py-2 bg-slate-950/60 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>{simulatedErrorMsg || "Simulate API Error"}</span>
          </button>
          
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
              autoRefresh 
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30" 
                : "bg-slate-950 text-slate-500 border-slate-850"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-rose-500 animate-ping' : 'bg-slate-700'}`} />
            <span>{autoRefresh ? "Auto Streaming" : "Paused"}</span>
          </button>

          <button
            onClick={() => fetchMetrics(false)}
            className="p-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
            title="Force refresh logs"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Total requests */}
        <div className="p-5 glass-card rounded-2xl bg-slate-900/40 border border-slate-800 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="absolute top-[-20%] right-[-10%] w-[100px] h-[100px] bg-indigo-500/5 rounded-full blur-[30px] group-hover:bg-indigo-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Operational Traffic</span>
            <Server className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-3xl font-black text-slate-100">{total_requests}</span>
          <h4 className="font-extrabold text-[11px] text-slate-400 mt-2">HTTP Request Count</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">Total queries handled since instance launch.</p>
        </div>

        {/* Response Latency */}
        <div className="p-5 glass-card rounded-2xl bg-slate-900/40 border border-slate-800 relative overflow-hidden group hover:border-violet-500/30 transition-all">
          <div className="absolute top-[-20%] right-[-10%] w-[100px] h-[100px] bg-violet-500/5 rounded-full blur-[30px] group-hover:bg-violet-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] text-violet-400 font-bold uppercase tracking-wider">App Performance</span>
            <Zap className="w-4 h-4 text-violet-400 animate-pulse" />
          </div>
          <span className="text-3xl font-black text-slate-100">{average_latency_ms} ms</span>
          <h4 className="font-extrabold text-[11px] text-slate-400 mt-2">Avg Request Latency</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">Server compute and database response speed.</p>
        </div>

        {/* Total Errors */}
        <div className="p-5 glass-card rounded-2xl bg-slate-900/40 border border-slate-800 relative overflow-hidden group hover:border-rose-500/30 transition-all">
          <div className="absolute top-[-20%] right-[-10%] w-[100px] h-[100px] bg-rose-500/5 rounded-full blur-[30px] group-hover:bg-rose-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] text-rose-400 font-bold uppercase tracking-wider">System Exceptions</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-3xl font-black text-slate-100">{total_errors}</span>
          <h4 className="font-extrabold text-[11px] text-slate-400 mt-2">Recorded Errors</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">Caught API and runtime fallback entries.</p>
        </div>

        {/* Error rate percentage */}
        <div className="p-5 glass-card rounded-2xl bg-slate-900/40 border border-slate-800 relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="absolute top-[-20%] right-[-10%] w-[100px] h-[100px] bg-amber-500/5 rounded-full blur-[30px] group-hover:bg-amber-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Operational Health</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <span className={`text-3xl font-black ${error_rate_pct > 15 ? 'text-rose-400' : error_rate_pct > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {error_rate_pct}%
          </span>
          <h4 className="font-extrabold text-[11px] text-slate-400 mt-2">Global Error Share</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">Ratio of failed processes compared to success.</p>
        </div>
      </div>

      {/* SVG Visualization Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Real-time Latency spikes line graph */}
        <div className="glass-card p-6 rounded-3xl bg-slate-900/40 border border-slate-800">
          <div className="flex items-center space-x-2 mb-6">
            <Clock className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-extrabold text-base">Request Latency Spikes</h3>
              <span className="text-[10px] text-slate-500 block mt-0.5">Performance analytics for last 10 server actions</span>
            </div>
          </div>

          {!hasGraphPoints ? (
            <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 flex flex-col items-center justify-center">
              <Cpu className="w-6 h-6 text-slate-700 animate-pulse mb-1" />
              <p className="text-xs text-slate-500">Awaiting incoming network traffic to stream metrics...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-44 relative w-full">
                <svg viewBox="0 0 300 60" className="w-full h-full">
                  {/* Grid lines */}
                  <line x1="30" y1="10" x2="270" y2="10" stroke="#1e293b" strokeDasharray="3,3" strokeWidth="0.5" />
                  <line x1="30" y1="25" x2="270" y2="25" stroke="#1e293b" strokeDasharray="3,3" strokeWidth="0.5" />
                  <line x1="30" y1="40" x2="270" y2="40" stroke="#1e293b" strokeDasharray="3,3" strokeWidth="0.5" />
                  <line x1="30" y1="50" x2="270" y2="50" stroke="#334155" strokeWidth="0.8" />
                  
                  {/* Area fill under graph */}
                  <path d={areaD} fill="url(#latencyGrad)" opacity="0.15" className="transition-all duration-500" />
                  
                  {/* Line path */}
                  <path d={pathD} fill="none" stroke="#818cf8" strokeWidth="1.5" className="transition-all duration-500" />
                  
                  {/* Dots */}
                  {graph_points.map((p, idx) => {
                    const pointsCount = graph_points.length;
                    const maxVal = Math.max(...graph_points.map(p => p.latency)) || 100;
                    const heightScale = 45 / maxVal;
                    const x = 30 + (idx * (240 / (pointsCount - 1 || 1)));
                    const y = 50 - (p.latency * heightScale);
                    
                    return (
                      <g key={idx} className="group cursor-pointer">
                        <circle 
                          cx={x} 
                          cy={y} 
                          r="2.5" 
                          fill={p.status >= 400 ? "#f87171" : "#818cf8"} 
                          stroke="#020617" 
                          strokeWidth="0.8" 
                          className="hover:r-4 transition-all"
                        />
                        {/* Hover Tooltip inside SVG */}
                        <title>{`${p.label}\n${p.latency.toFixed(1)} ms\nStatus: ${p.status}`}</title>
                      </g>
                    );
                  })}

                  {/* Gradient Definitions */}
                  <defs>
                    <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* X-axis legends */}
              <div className="flex justify-between text-[8px] font-bold text-slate-500 px-7 uppercase">
                <span>Earliest</span>
                <span>Timeline of Activity</span>
                <span>Latest</span>
              </div>
            </div>
          )}
        </div>

        {/* CHART 2: Outgoing API usage shares bar chart */}
        <div className="glass-card p-6 rounded-3xl bg-slate-900/40 border border-slate-800">
          <div className="flex items-center space-x-2 mb-6">
            <Cpu className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="font-extrabold text-base">Active Outgoing API Calls</h3>
              <span className="text-[10px] text-slate-500 block mt-0.5">Dynamic query transactions registered per service</span>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            {[
              { key: "gemini", name: "Google Gemini AI", icon: "🧠", color: "from-purple-650 to-indigo-500" },
              { key: "google_maps", name: "Google Maps Directions", icon: "🗺️", color: "from-blue-650 to-cyan-500" },
              { key: "openweather", name: "OpenWeatherMap Climate", icon: "🌤️", color: "from-amber-650 to-yellow-500" },
              { key: "bigquery", name: "Google BigQuery Storage", icon: "📦", color: "from-emerald-650 to-teal-500" }
            ].map((api) => {
              const count = api_usage[api.key] || 0;
              const maxCount = Math.max(...Object.values(api_usage)) || 1;
              const percentage = (count / maxCount) * 100;

              return (
                <div key={api.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <span>{api.icon}</span>
                      <span>{api.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-extrabold bg-slate-950 border border-slate-850 px-2.5 py-0.5 rounded-lg">
                      {count} Calls
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full h-2.5 bg-slate-950 border border-slate-900 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r ${api.color} transition-all duration-1000`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Diagnostics Logs and Exception Registry */}
      <div className="grid grid-cols-1 gap-6">
        <div className="glass-card p-6 rounded-3xl bg-slate-900/40 border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-850 mb-4">
            <div className="flex items-center space-x-2">
              <AlertOctagon className="w-5 h-5 text-rose-500" />
              <div>
                <h3 className="font-extrabold text-base">Exceptions and Error Registry</h3>
                <span className="text-[10px] text-slate-500 block mt-0.5">Detailed error logs from server execution</span>
              </div>
            </div>
            <span className="text-[10px] text-rose-400 font-extrabold bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
              Active Alerts: {recent_errors.length}
            </span>
          </div>

          {recent_errors.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-550">
              <CheckCircle className="w-6 h-6 text-emerald-500/40 mb-1" />
              <span className="text-xs font-bold text-slate-450">All Systems Functional</span>
              <p className="text-[10px] text-slate-500 mt-0.5">No exceptions or runtime fallbacks detected in active logs.</p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
              {recent_errors.map((err, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/10 flex items-start space-x-3 animate-fadeIn">
                  <div className="w-7 h-7 rounded bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0 text-xs font-bold">
                    ERR
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="block text-xs font-black text-slate-200 truncate">{err.endpoint}</span>
                      <span className="text-[8px] text-slate-500 font-bold uppercase">{new Date(err.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[10px] text-rose-400 font-semibold leading-relaxed mt-1 whitespace-pre-wrap select-all">
                      {err.error}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
