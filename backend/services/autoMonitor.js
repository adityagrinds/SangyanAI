const cron = require("node-cron");
const { getRecentEarthquakes } = require("./liveData");
const { monitorAgent } = require("../agents/monitorAgent");
const { analyzerAgent } = require("../agents/analyzerAgent");
const { responderAgent } = require("../agents/responderAgent");
const { getRelevantMemory, buildMemoryContext } = require("./memory");
const Incident = require("../models/Incident");

let isAutoMonitoring = false;
let cronJob = null;
let io = null;

function setSocketIO(socketIO) {
  io = socketIO;
}

async function processEarthquakeAutonomously(earthquake) {
  if (!io) return;

  // Check if we already processed this earthquake
  const existing = await Incident.findOne({ title: earthquake.title });
  if (existing) return null;

  const report = `LIVE EARTHQUAKE DETECTED: ${earthquake.title}. Magnitude: ${earthquake.magnitude}. Location: ${earthquake.place}. Depth: ${earthquake.depth}km. Tsunami warning: ${earthquake.tsunami ? "YES" : "No"}. Time: ${earthquake.time}. Coordinates: ${earthquake.lat}, ${earthquake.lng}.`;

  io.emit("autoMonitor", { type: "detection", message: `🔴 Live earthquake detected: ${earthquake.title}`, data: earthquake });

  // Run through agent pipeline
  io.emit("agentUpdate", { agent: "Monitor Agent", status: "working", message: `[AUTO] Analyzing live earthquake: ${earthquake.title}` });
  const monitorResult = await monitorAgent(report);
  io.emit("agentUpdate", { agent: "Monitor Agent", status: "done", message: `[AUTO] ${monitorResult.title}`, data: monitorResult });

  // Get memory for better context
  const memory = await getRelevantMemory("earthquake");
  const memoryContext = buildMemoryContext(memory);

  io.emit("agentUpdate", { agent: "Analyzer Agent", status: "working", message: `[AUTO] Analyzing severity...${memory ? ` (referencing ${memory.count} past incidents)` : ""}` });
  const analyzerResult = await analyzerAgent({ ...monitorResult, memoryContext });
  io.emit("agentUpdate", { agent: "Analyzer Agent", status: "done", message: `[AUTO] Severity: ${analyzerResult.severity}, Priority: ${analyzerResult.priorityLevel}/10`, data: analyzerResult });

  io.emit("agentUpdate", { agent: "Responder Agent", status: "working", message: "[AUTO] Generating response plan..." });
  const responderResult = await responderAgent(monitorResult, { ...analyzerResult, memoryContext });
  io.emit("agentUpdate", { agent: "Responder Agent", status: "done", message: `[AUTO] Response plan ready: ${responderResult.actions?.length || 0} actions`, data: responderResult });

  // Save incident
  const incident = new Incident({
    title: monitorResult.title || earthquake.title,
    description: monitorResult.description,
    type: monitorResult.type || "earthquake",
    severity: analyzerResult.severity,
    location: monitorResult.location || { name: earthquake.place, lat: earthquake.lat, lng: earthquake.lng },
    status: "responding",
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

  await incident.save();
  io.emit("newIncident", incident);

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
