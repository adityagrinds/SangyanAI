const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: {
    type: String,
    enum: ["earthquake", "flood", "fire", "storm", "epidemic", "industrial", "other"],
    default: "other",
  },
  magnitude: { type: Number, default: null },
  depth: { type: Number, default: null },
  severity: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "medium",
  },
  location: {
    name: String,
    lat: Number,
    lng: Number,
  },
  status: {
    type: String,
    enum: ["detected", "analyzing", "responding", "resolved"],
    default: "detected",
  },
  affectedPopulation: {
    value: { type: Number, min: 0, default: null },
    status: { type: String, enum: ["confirmed", "estimated", "not_available"], default: "not_available" },
    source: { type: String, default: "Not available" },
  },
  reportFacts: {
    areaPopulation: { type: Number, default: null },
    areaName: { type: String, default: null },
    nearbyFacilities: [{
      name: String,
      type: String,
      distanceKm: Number,
      address: String,
    }],
    officialReports: [{
      title: String,
      date: String,
      source: String,
    }],
  },
  agentLogs: [
    {
      agent: String,
      message: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
  response: {
    actions: [String],
    resources: [String],
    alerts: [String],
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Incident", incidentSchema);
