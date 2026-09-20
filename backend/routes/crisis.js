const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Incident = require("../models/Incident");
const { monitorAgent } = require("../agents/monitorAgent");
const { analyzerAgent } = require("../agents/analyzerAgent");
const { responderAgent } = require("../agents/responderAgent");
const { getRelevantMemory, buildMemoryContext } = require("../services/memory");
const { getGlobalCrisisData, getRecentEarthquakes } = require("../services/liveData");
const { startAutoMonitor, stopAutoMonitor, getAutoMonitorStatus } = require("../services/autoMonitor");
const { resolveIncidentLocation } = require("../services/locationResolver");
const { enrichCrisisContext } = require("../services/factEnrichment");

router.post("/process", async (req, res) => {
  const { report } = req.body;
  const io = req.app.get("io");

  if (!report) {
    return res.status(400).json({ error: "Report text is required" });
  }

  const reasoningChain = [];

  try {
    io.emit("agentUpdate", { agent: "Monitor Agent", status: "working", message: "Scanning report for crisis indicators..." });
    reasoningChain.push({ agent: "Monitor Agent", action: "Received raw report input", timestamp: new Date() });

    const monitorResult = await monitorAgent(report);

    const resolvedLocation = await resolveIncidentLocation({
      report,
      title: monitorResult.title,
      description: monitorResult.description,
      location: monitorResult.location,
    });

    if (resolvedLocation && (resolvedLocation.lat !== monitorResult.location?.lat || resolvedLocation.lng !== monitorResult.location?.lng || resolvedLocation.name !== monitorResult.location?.name)) {
      monitorResult.location = resolvedLocation;
      reasoningChain.push({
        agent: "Location Resolver",
        action: `Resolved map location to ${resolvedLocation.name} (${resolvedLocation.lat}, ${resolvedLocation.lng})`,
        timestamp: new Date(),
      });
      io.emit("reasoningUpdate", { chain: reasoningChain });
    }

    reasoningChain.push({ agent: "Monitor Agent", action: `Detected: ${monitorResult.title || "No crisis"}. Type: ${monitorResult.type}. Confidence: ${monitorResult.confidence}`, timestamp: new Date() });
    io.emit("agentUpdate", { agent: "Monitor Agent", status: "done", message: `Detection complete: ${monitorResult.title || "No crisis detected"}`, data: monitorResult });
    io.emit("reasoningUpdate", { chain: reasoningChain });

    if (!monitorResult.isCrisis) {
      return res.json({ message: "No crisis detected in the report.", monitorResult, reasoningChain });
    }

    const memory = await getRelevantMemory(monitorResult.type, monitorResult.location?.name);
    const memoryContext = buildMemoryContext(memory);

    if (memory && memory.count > 0) {
      reasoningChain.push({ agent: "Memory System", action: `Retrieved ${memory.count} similar past incidents for context`, timestamp: new Date() });
      io.emit("reasoningUpdate", { chain: reasoningChain });
    }

    io.emit("agentUpdate", { agent: "Fact Enrichment", status: "working", message: `Fetching real census data & nearby facilities for ${monitorResult.location?.name || "location"}...` });
    reasoningChain.push({ agent: "Fact Enrichment", action: `Collecting population, facility and official disaster data for: ${monitorResult.location?.name || "unknown location"}`, timestamp: new Date() });

    let enrichedFacts = null;
    try {
      enrichedFacts = await enrichCrisisContext(
        monitorResult.location || { name: monitorResult.location?.name },
        monitorResult.type || "crisis",
        monitorResult.type,
        {
          magnitude: monitorResult.magnitude,
          depthKm: monitorResult.depth,
          tsunami: monitorResult.tsunami,
        }
      );
      const factsLog = [
        enrichedFacts.populationInfo?.population ? `Population: ${enrichedFacts.populationInfo.population.toLocaleString()} (census)` : "Population: N/A",
        `Facilities found: ${enrichedFacts.nearbyFacilities?.length || 0}`,
        enrichedFacts.reliefWebReports ? `Official reports found: ${enrichedFacts.reliefWebReports.count}` : "Official reports: N/A",
      ].join(" | ");
      reasoningChain.push({ agent: "Fact Enrichment", action: `Real data fetched — ${factsLog}`, timestamp: new Date() });
      io.emit("agentUpdate", { agent: "Fact Enrichment", status: "done", message: `✅ ${factsLog}`, data: enrichedFacts });
      io.emit("reasoningUpdate", { chain: reasoningChain });
    } catch (enrichErr) {
      console.warn("[FactEnrichment] Non-fatal error:", enrichErr.message);
      io.emit("agentUpdate", { agent: "Fact Enrichment", status: "done", message: "⚠️ Real data fetch failed — agents will avoid hallucinating" });
    }

    reasoningChain.push({ agent: "Monitor Agent → Analyzer Agent", action: `Passing crisis data + verified facts: type=${monitorResult.type}, location=${monitorResult.location?.name}`, timestamp: new Date() });
    io.emit("agentUpdate", { agent: "Analyzer Agent", status: "working", message: `Analyzing severity with real data...${memory ? ` (referencing ${memory.count} past incidents)` : ""}` });

    const analyzerInput = { ...monitorResult, memoryContext };
    const analyzerResult = await analyzerAgent(analyzerInput, enrichedFacts);

    reasoningChain.push({ agent: "Analyzer Agent", action: `Assessed severity: ${analyzerResult.severity}. Priority: ${analyzerResult.priorityLevel}/10. Est. affected: ${analyzerResult.estimatedAffectedPopulation?.toLocaleString() || "N/A"} (${analyzerResult.populationDataSource || ""})`, timestamp: new Date() });
    io.emit("agentUpdate", { agent: "Analyzer Agent", status: "done", message: `Analysis complete: Severity ${analyzerResult.severity}, Priority ${analyzerResult.priorityLevel}/10`, data: analyzerResult });
    io.emit("reasoningUpdate", { chain: reasoningChain });

    reasoningChain.push({ agent: "Analyzer Agent → Responder Agent", action: `Passing analysis + ${enrichedFacts?.nearbyFacilities?.length || 0} real OSM facilities: severity=${analyzerResult.severity}`, timestamp: new Date() });
    io.emit("agentUpdate", { agent: "Responder Agent", status: "working", message: `Generating response plan using ${enrichedFacts?.nearbyFacilities?.length || 0} real nearby facilities...` });

    const responderResult = await responderAgent(monitorResult, { ...analyzerResult, memoryContext }, enrichedFacts);

    reasoningChain.push({ agent: "Responder Agent", action: `Plan created: ${responderResult.actions?.length || 0} actions, ${responderResult.resources?.length || 0} real facilities, ${responderResult.alerts?.length || 0} alerts. Evacuation: ${responderResult.evacuationNeeded ? "YES" : "No"}`, timestamp: new Date() });
    io.emit("agentUpdate", { agent: "Responder Agent", status: "done", message: `Response plan ready: ${responderResult.actions?.length || 0} actions, ${responderResult.resources?.length || 0} verified facilities`, data: responderResult });
    io.emit("reasoningUpdate", { chain: reasoningChain });

    let incident = null;
    try {
      incident = new Incident({
        title: monitorResult.title,
        description: monitorResult.description,
        type: monitorResult.type,
        magnitude: monitorResult.magnitude,
        depth: monitorResult.depth,
        severity: analyzerResult.severity,
        location: monitorResult.location,
        status: "responding",
        affectedPopulation: {
          value: analyzerResult.estimatedAffectedPopulation,
          status: analyzerResult.populationStatus,
          source: analyzerResult.populationDataSource,
        },
        reportFacts: {
          areaPopulation: enrichedFacts?.populationInfo?.population || null,
          areaName: enrichedFacts?.populationInfo?.cityName || monitorResult.location?.name || null,
          nearbyFacilities: (enrichedFacts?.nearbyFacilities || []).slice(0, 8).map((facility) => ({
            name: facility.name,
            type: facility.type,
            distanceKm: facility.distanceKm,
            address: facility.address,
          })),
          officialReports: (enrichedFacts?.reliefWebReports?.reports || []).map((report) => ({
            title: report.title,
            date: report.date,
            source: report.source,
          })),
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
      console.warn("[DB] Could not save incident:", dbErr.message);
    }

    res.json({
      incident: incident || { title: monitorResult.title, type: monitorResult.type, severity: analyzerResult.severity },
      details: {
        monitor: monitorResult,
        analysis: analyzerResult,
        response: responderResult,
        facts: {
          areaPopulation: enrichedFacts?.populationInfo?.population || null,
          areaName: enrichedFacts?.populationInfo?.cityName || monitorResult.location?.name || null,
          nearbyFacilities: (enrichedFacts?.nearbyFacilities || []).slice(0, 8).map((facility) => ({
            name: facility.name,
            type: facility.type,
            distanceKm: facility.distanceKm,
            address: facility.address,
          })),
          officialReports: (enrichedFacts?.reliefWebReports?.reports || []).map((report) => ({
            title: report.title,
            date: report.date,
            source: report.source,
          })),
        },
        memory,
        reasoningChain,
      },
      voiceSummary: [
        `Crisis detected: ${monitorResult.title || "Unknown event"}.`,
        `Severity is ${analyzerResult.severity}.`,
        `Priority is ${analyzerResult.priorityLevel} out of 10.`,
        responderResult.alerts?.[0]?.message || "",
      ].filter(Boolean).join(" "),
    });
  } catch (error) {
    console.error("Processing error:", error);
    res.status(500).json({ error: "Failed to process report", details: error.message });
  }
});

router.get("/live-data", async (req, res) => {
  try {
    const data = await getGlobalCrisisData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch live data", details: error.message });
  }
});

router.get("/earthquakes", async (req, res) => {
  try {
    const quakes = await getRecentEarthquakes(parseFloat(req.query.min_mag) || 4);
    res.json(quakes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch earthquakes" });
  }
});

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

router.get("/incidents", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const incidents = await Incident.find().sort({ createdAt: -1 });
    res.json(incidents);
  } catch (error) {
    res.json([]);
  }
});

router.get("/incidents/:id", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: "Incident not found" });
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch incident" });
  }
});

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
