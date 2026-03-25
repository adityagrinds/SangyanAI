const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: {
    type: String,
    enum: ["earthquake", "flood", "fire", "storm", "epidemic", "industrial", "other"],
    default: "other",
  },
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
