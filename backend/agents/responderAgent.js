const { callAgent } = require("../config/groq");

const RESPONDER_PROMPT = `You are a Crisis Responder Agent. You receive crisis data and analysis, then generate a response plan.

Create a response plan in JSON format:
{
  "actions": [
    "Specific action step 1",
    "Specific action step 2",
    "..."
  ],
  "resources": [
    {
      "type": "hospital" | "shelter" | "fire_station" | "police" | "military" | "ngo" | "supply_depot",
      "name": "Resource name",
      "priority": "high" | "medium" | "low"
    }
  ],
  "alerts": [
    {
      "target": "Who should receive this alert",
      "message": "The alert message",
      "urgency": "immediate" | "urgent" | "standard"
    }
  ],
  "evacuationNeeded": true/false,
  "estimatedResponseTime": "time estimate",
  "coordinationNotes": "notes on how different response teams should coordinate"
}

Be specific and actionable. Prioritize life safety above all else.`;

async function responderAgent(crisisData, analysisData) {
  const input = JSON.stringify({ crisis: crisisData, analysis: analysisData });
  const result = await callAgent(RESPONDER_PROMPT, input);
  return {
    agent: "Responder Agent",
    ...result,
  };
}

module.exports = { responderAgent };
