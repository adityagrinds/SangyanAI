const { callAgent } = require("../config/groq");

const MONITOR_PROMPT = `You are a Crisis Monitor Agent. Your job is to analyze incoming reports, news, or data and detect if there is a crisis or emergency situation.

Analyze the input and respond in JSON format:
{
  "isCrisis": true/false,
  "title": "Short title of the crisis",
  "type": "earthquake" | "flood" | "fire" | "storm" | "epidemic" | "industrial" | "other",
  "location": {
    "name": "Location name",
    "lat": latitude_number,
    "lng": longitude_number
  },
  "description": "Brief description of what is happening",
  "confidence": 0.0 to 1.0
}

If the input does not describe a crisis, set isCrisis to false and provide minimal fields.
Always provide realistic coordinates for the location mentioned.`;

async function monitorAgent(input) {
  const result = await callAgent(MONITOR_PROMPT, input);
  const allowedTypes = ["earthquake", "flood", "fire", "storm", "epidemic", "industrial", "other"];
  const type = allowedTypes.includes(result.type) ? result.type : "other";
  const confidence = Math.max(0, Math.min(1, Number(result.confidence) || 0));
  const isCrisis = Boolean(result.isCrisis);

  const loc = result.location || {};
  const lat = Number(loc.lat);
  const lng = Number(loc.lng);
  const cleanedLocation = loc.name
    ? {
        name: loc.name,
        ...(Number.isFinite(lat) ? { lat } : {}),
        ...(Number.isFinite(lng) ? { lng } : {}),
      }
    : undefined;

  return {
    agent: "Monitor Agent",
    ...result,
    type,
    confidence,
    isCrisis,
    location: cleanedLocation,
  };
}

module.exports = { monitorAgent };
