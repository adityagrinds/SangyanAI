const express = require("express");
const router = express.Router();
const Incident = require("../models/Incident");
const { monitorAgent } = require("../agents/monitorAgent");
const { analyzerAgent } = require("../agents/analyzerAgent");
const { responderAgent } = require("../agents/responderAgent");
const { getRelevantMemory, buildMemoryContext } = require("../services/memory");
const { getGlobalCrisisData, getRecentEarthquakes } = require("../services/liveData");
const { startAutoMonitor, stopAutoMonitor, getAutoMonitorStatus } = require("../services/autoMonitor");

// Process a new crisis report through all 3 agents with memory + reasoning chain
router.post("/process", async (req, res) => {
  const { report } = req.body;
  const io = req.app.get("io");

  if (!report) {
    return res.status(400).json({ error: "Report text is required" });
  }

  const reasoningChain = [];

  try {
    // Step 1: Monitor Agent detects the crisis
    io.emit("agentUpdate", { agent: "Monitor Agent", status: "working", message: "Scanning report for crisis indicators..." });
    reasoningChain.push({ agent: "Monitor Agent", action: "Received raw report input", timestamp: new Date() });

    const monitorResult = await monitorAgent(report);

    reasoningChain.push({ agent: "Monitor Agent", action: `Detected: ${monitorResult.title || "No crisis"}. Type: ${monitorResult.type}. Confidence: ${monitorResult.confidence}`, timestamp: new Date() });
    io.emit("agentUpdate", { agent: "Monitor Agent", status: "done", message: `Detection complete: ${monitorResult.title || "No crisis detected"}`, data: monitorResult });
    io.emit("reasoningUpdate", { chain: reasoningChain });

    if (!monitorResult.isCrisis) {
      return res.json({ message: "No crisis detected in the report.", monitorResult, reasoningChain });
    }

    // Fetch agent memory for context
    const memory = await getRelevantMemory(monitorResult.type, monitorResult.location?.name);
    const memoryContext = buildMemoryContext(memory);

    if (memory && memory.count > 0) {
      reasoningChain.push({ agent: "Memory System", action: `Retrieved ${memory.count} similar past incidents for context`, timestamp: new Date() });
      io.emit("reasoningUpdate", { chain: reasoningChain });
    }

    // Step 2: Analyzer Agent assesses severity (with memory)
    reasoningChain.push({ agent: "Monitor Agent → Analyzer Agent", action: `Passing crisis data: type=${monitorResult.type}, location=${monitorResult.location?.name}`, timestamp: new Date() });
    io.emit("agentUpdate", { agent: "Analyzer Agent", status: "working", message: `Analyzing severity...${memory ? ` (referencing ${memory.count} past incidents)` : ""}` });

    const analyzerInput = { ...monitorResult, memoryContext };
    const analyzerResult = await analyzerAgent(analyzerInput);

    reasoningChain.push({ agent: "Analyzer Agent", action: `Assessed severity: ${analyzerResult.severity}. Priority: ${analyzerResult.priorityLevel}/10. Est. affected: ${analyzerResult.estimatedAffectedPopulation}`, timestamp: new Date() });
    io.emit("agentUpdate", { agent: "Analyzer Agent", status: "done", message: `Analysis complete: Severity ${analyzerResult.severity}, Priority ${analyzerResult.priorityLevel}/10`, data: analyzerResult });
    io.emit("reasoningUpdate", { chain: reasoningChain });

    // Step 3: Responder Agent creates response plan (with memory)
    reasoningChain.push({ agent: "Analyzer Agent → Responder Agent", action: `Passing analysis: severity=${analyzerResult.severity}, risks=${analyzerResult.riskFactors?.length || 0} identified`, timestamp: new Date() });
    io.emit("agentUpdate", { agent: "Responder Agent", status: "working", message: "Generating response plan..." });

    const responderResult = await responderAgent(monitorResult, { ...analyzerResult, memoryContext });

    reasoningChain.push({ agent: "Responder Agent", action: `Plan created: ${responderResult.actions?.length || 0} actions, ${responderResult.resources?.length || 0} resources, ${responderResult.alerts?.length || 0} alerts. Evacuation: ${responderResult.evacuationNeeded ? "YES" : "No"}`, timestamp: new Date() });
    io.emit("agentUpdate", { agent: "Responder Agent", status: "done", message: `Response plan ready: ${responderResult.actions?.length || 0} actions identified`, data: responderResult });
    io.emit("reasoningUpdate", { chain: reasoningChain });

    // Save to database
    const incident = new Incident({
      title: monitorResult.title,
      description: monitorResult.description,
      type: monitorResult.type,
      severity: analyzerResult.severity,
      location: monitorResult.location,
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

    res.json({
      incident,
      details: {
        monitor: monitorResult,
        analysis: analyzerResult,
        response: responderResult,
        memory,
        reasoningChain,
      },
    });
  } catch (error) {
    console.error("Processing error:", error);
    res.status(500).json({ error: "Failed to process report", details: error.message });
  }
});

// Get live crisis data from real APIs
router.get("/live-data", async (req, res) => {
  try {
    const data = await getGlobalCrisisData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch live data", details: error.message });
  }
});

// Get recent earthquakes
router.get("/earthquakes", async (req, res) => {
  try {
    const quakes = await getRecentEarthquakes(parseFloat(req.query.min_mag) || 4);
    res.json(quakes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch earthquakes" });
  }
});

// Auto-monitor controls
router.post("/auto-monitor/start", (req, res) => {
  const result = startAutoMonitor();
  res.json(result);
});

router.post("/auto-monitor/stop", (req, res) => {
  const result = stopAutoMonitor();
  res.json(result);
});

router.get("/auto-monitor/status", (req, res) => {
  res.json(getAutoMonitorStatus());
});

// Get all incidents
router.get("/incidents", async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ createdAt: -1 });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
});

// Get single incident
router.get("/incidents/:id", async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: "Incident not found" });
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch incident" });
  }
});

// Delete incident
router.delete("/incidents/:id", async (req, res) => {
  try {
    const incident = await Incident.findByIdAndDelete(req.params.id);
    if (!incident) return res.status(404).json({ error: "Incident not found" });

    const io = req.app.get("io");
    if (io) io.emit("incidentDeleted", { id: req.params.id });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete incident" });
  }
});

module.exports = router;
