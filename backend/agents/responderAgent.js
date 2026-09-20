const { callAgent } = require("../config/groq");


function buildResponderPrompt(enrichedFacts) {
  const facilities = enrichedFacts?.nearbyFacilities || [];

  let facilitiesSection = "";
  if (facilities.length > 0) {
    facilitiesSection = `
REAL NEARBY FACILITIES (OpenStreetMap - verified infrastructure):
${facilities.map((f, i) =>
  `${i + 1}. [${f.type?.toUpperCase()}] ${f.name}${f.distanceKm ? ` — ${f.distanceKm}km away` : ""}${f.phone ? ` | Phone: ${f.phone}` : ""}${f.address ? ` | ${f.address}` : ""}`
).join("\n")}

⚠ CRITICAL: You MUST use ONLY the facility names listed above in the "resources" array.
Do NOT invent, guess, or create any hospital/shelter/police station names that are not in the list above.
If a facility type is not in the list, omit it or say "Contact local authorities".
`;
  } else {
    facilitiesSection = `
REAL NEARBY FACILITIES: None found in OpenStreetMap for this location.
⚠ CRITICAL: Do NOT invent facility names. For resources, use generic types like "Nearest available hospital" or "Local emergency services" only.
`;
  }

  return `You are a Crisis Responder Agent. You receive crisis data, analysis, and verified real-world infrastructure data.

${facilitiesSection}

STRICT RULES:
1. NEVER invent hospital names, shelter names, or facility names not listed above.
2. Use the exact facility names from the list above for the "resources" array.
3. Actions should be specific and reference real locations/agencies where available.
4. All alert targets should be realistic (e.g. "Kathmandu Metropolitan Police", not made-up names).

Create a response plan in valid JSON format ONLY (no markdown, no text outside JSON):
{
  "actions": [
    "Specific actionable step 1",
    "Specific actionable step 2"
  ],
  "resources": [
    {
      "type": "hospital" | "shelter" | "fire_station" | "police" | "ngo" | "supply_depot",
      "name": "<EXACT name from the real facility list above, or 'Local emergency services'>",
      "priority": "high" | "medium" | "low",
      "distanceKm": <number or null>
    }
  ],
  "alerts": [
    {
      "target": "Who should receive this alert",
      "message": "The alert message",
      "urgency": "immediate" | "urgent" | "standard"
    }
  ],
  "evacuationNeeded": true | false,
  "estimatedResponseTime": "time estimate",
  "coordinationNotes": "notes on how response teams should coordinate"
}`;
}

async function responderAgent(crisisData, analysisData, enrichedFacts) {
  const prompt = buildResponderPrompt(enrichedFacts);
  const input = JSON.stringify({ crisis: crisisData, analysis: analysisData });
  const result = await callAgent(prompt, input);

  const knownNames = new Set((enrichedFacts?.nearbyFacilities || []).map((f) => f.name?.toLowerCase()));

  if (enrichedFacts?.nearbyFacilities?.length > 0 && result.resources?.length > 0) {
    result.resources = result.resources.map((r) => {
      const nameLower = r.name?.toLowerCase() || "";
      if (!knownNames.has(nameLower) && r.name && !r.name.toLowerCase().includes("local") && !r.name.toLowerCase().includes("nearest")) {
        const matchingFacility = enrichedFacts.nearbyFacilities.find(
          (f) => f.type === r.type || (r.type === "hospital" && (f.type === "hospital" || f.type === "clinic"))
        );
        if (matchingFacility) {
          return { ...r, name: matchingFacility.name, distanceKm: matchingFacility.distanceKm };
        }
        return { ...r, name: "Local emergency services" };
      }
      return r;
    });
  }

  return {
    agent: "Responder Agent",
    facilitiesSource: enrichedFacts?.nearbyFacilities?.length > 0 ? "OpenStreetMap Overpass API (real data)" : "No real facility data available",
    ...result,
  };
}

module.exports = { responderAgent };
