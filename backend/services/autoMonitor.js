const cron = require("node-cron");
const mongoose = require("mongoose");
const { getRecentEarthquakes } = require("./liveData");
const { monitorAgent } = require("../agents/monitorAgent");
const { analyzerAgent } = require("../agents/analyzerAgent");
const { responderAgent } = require("../agents/responderAgent");
const { getRelevantMemory, buildMemoryContext } = require("./memory");
const { enrichCrisisContext } = require("./factEnrichment");
const Incident = require("../models/Incident");

let isAutoMonitoring = false;
let cronJob = null;
let io = null;

function setSocketIO(socketIO) {
  io = socketIO;
}

async function processEarthquakeAutonomously(earthquake) {
  if (!io) return;

  // Check if we already processed this earthquake (only if DB connected)
  if (mongoose.connection.readyState === 1) {
    const existing = await Incident.findOne({ title: earthquake.title });
    if (existing) return null;
  }

  const report = `LIVE EARTHQUAKE DETECTED: ${earthquake.title}. Magnitude: ${earthquake.magnitude}. Location: ${earthquake.place}. Depth: ${earthquake.depth}km. Tsunami warning: ${earthquake.tsunami ? "YES" : "No"}. Time: ${earthquake.time}. Coordinates: ${earthquake.lat}, ${earthquake.lng}.`;

  io.emit("autoMonitor", { type: "detection", message: `🔴 Live earthquake detected: ${earthquake.title}`, data: earthquake });

  // Run through agent pipeline
  io.emit("agentUpdate", { agent: "Monitor Agent", status: "working", message: `[AUTO] Analyzing live earthquake: ${earthquake.title}` });
  const monitorResult = await monitorAgent(report);
  io.emit("agentUpdate", { agent: "Monitor Agent", status: "done", message: `[AUTO] ${monitorResult.title}`, data: monitorResult });

  // Get memory for better context
  const memory = await getRelevantMemory("earthquake");
  const memoryContext = buildMemoryContext(memory);

  // Fact Enrichment — fetch REAL population & facilities for this earthquake location
  io.emit("agentUpdate", { agent: "Fact Enrichment", status: "working", message: `[AUTO] Fetching real data for ${earthquake.place}...` });
  let enrichedFacts = null;
  try {
    enrichedFacts = await enrichCrisisContext(
      { name: earthquake.place, lat: earthquake.lat, lng: earthquake.lng },
      "earthquake",
      "earthquake"
    );
    const pop = enrichedFacts?.populationInfo?.population;
    const facCount = enrichedFacts?.nearbyFacilities?.length || 0;
    io.emit("agentUpdate", { agent: "Fact Enrichment", status: "done", message: `[AUTO] ✅ Population: ${pop ? pop.toLocaleString() : "N/A"} | Facilities: ${facCount}`, data: enrichedFacts });
  } catch (enrichErr) {
    io.emit("agentUpdate", { agent: "Fact Enrichment", status: "done", message: "[AUTO] ⚠️ Real data unavailable — hallucination prevention active" });
  }

  io.emit("agentUpdate", { agent: "Analyzer Agent", status: "working", message: `[AUTO] Analyzing severity with real data...${memory ? ` (referencing ${memory.count} past incidents)` : ""}` });
  const analyzerResult = await analyzerAgent({ ...monitorResult, memoryContext }, enrichedFacts);
  io.emit("agentUpdate", { agent: "Analyzer Agent", status: "done", message: `[AUTO] Severity: ${analyzerResult.severity}, Priority: ${analyzerResult.priorityLevel}/10, Affected: ${analyzerResult.estimatedAffectedPopulation?.toLocaleString() || "N/A"}`, data: analyzerResult });

  io.emit("agentUpdate", { agent: "Responder Agent", status: "working", message: `[AUTO] Generating response plan using ${enrichedFacts?.nearbyFacilities?.length || 0} real facilities...` });
  const responderResult = await responderAgent(monitorResult, { ...analyzerResult, memoryContext }, enrichedFacts);
  io.emit("agentUpdate", { agent: "Responder Agent", status: "done", message: `[AUTO] Response plan ready: ${responderResult.actions?.length || 0} actions, ${responderResult.resources?.length || 0} verified facilities`, data: responderResult });

  // Save incident (only if DB connected)
  let incident = null;
  try {
    incident = new Incident({
      title: monitorResult.title || earthquake.title,
      description: monitorResult.description,
      type: monitorResult.type || "earthquake",
      severity: analyzerResult.severity,
      location: monitorResult.location || { name: earthquake.place, lat: earthquake.lat, lng: earthquake.lng },
      status: "responding",
      affectedPopulation: {
        value: analyzerResult.estimatedAffectedPopulation,
        status: analyzerResult.populationStatus,
        source: analyzerResult.populationDataSource,
      },
      agentLogs: [
        { agent: "Monitor Agent", message: JSON.stringify(monitorResult) },
        { agent: "Analyzer Agent", message: JSON.stringify(analyzerResult) },
        { agent: "Responder Agent", message: JSON.stringify(responderResult) },
        ...(memory ? [{ agent: "Memory System", message: JSON.stringify(memory) }] : []),
      ],
      response: {
        actions: responderResult.actions || [],
        resources: (responderResult.resources || []).map((r) => r.name || r),
        alerts: (responderResult.alerts || []).map((a) => a.message || a),
      },
    });

    if (mongoose.connection.readyState === 1) {
      await incident.save();
      io.emit("newIncident", incident);
    }
  } catch (dbErr) {
    console.warn("[DB] Could not save auto-monitored incident:", dbErr.message);
  }

  return incident;
}

function startAutoMonitor() {
  if (isAutoMonitoring) return { status: "already running" };

  isAutoMonitoring = true;

  // Check every 2 minutes for new earthquakes
  cronJob = cron.schedule("*/2 * * * *", async () => {
    if (!io) return;
    io.emit("autoMonitor", { type: "scan", message: "🔍 Scanning for new crisis events..." });

    try {
      const earthquakes = await getRecentEarthquakes(5);
      io.emit("autoMonitor", { type: "scan", message: `📡 Found ${earthquakes.length} recent significant earthquakes. Checking for new ones...` });

      for (const eq of earthquakes.slice(0, 3)) {
        await processEarthquakeAutonomously(eq);
      }
    } catch (err) {
      io.emit("autoMonitor", { type: "error", message: `Scan error: ${err.message}` });
    }
  });

  return { status: "started", interval: "every 2 minutes" };
}

function stopAutoMonitor() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }
  isAutoMonitoring = false;
  return { status: "stopped" };
}

function getAutoMonitorStatus() {
  return { isRunning: isAutoMonitoring };
}

module.exports = { startAutoMonitor, stopAutoMonitor, getAutoMonitorStatus, setSocketIO };
