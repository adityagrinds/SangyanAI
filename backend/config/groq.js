const Groq = require("groq-sdk");
require("dotenv").config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Unable to parse agent response as JSON");
  }
}

function textFromInput(userMessage) {
  if (typeof userMessage === "string") return userMessage;
  return JSON.stringify(userMessage || {});
}

function includesAny(text, terms) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function fallbackMonitor(inputText) {
  const lower = inputText.toLowerCase();
  const isEarthquake = includesAny(lower, ["earthquake", "quake", "seismic", "magnitude", "aftershock"]);
  const isFlood = includesAny(lower, ["flood", "inundat", "overflow", "embankment", "waterlogging", "storm surge"]);
  const isFire = includesAny(lower, ["fire", "wildfire", "blaze", "smoke", "burning"]);
  const isStorm = includesAny(lower, ["cyclone", "hurricane", "tornado", "storm", "typhoon", "hail"]);
  const isEpidemic = includesAny(lower, ["epidemic", "outbreak", "cholera", "flu", "virus", "disease"]);
  const isIndustrial = includesAny(lower, ["explosion", "chemical", "toxic", "factory", "plant", "spill"]);
  const isCrisis = isEarthquake || isFlood || isFire || isStorm || isEpidemic || isIndustrial || /emergency|collapsed|trapped|evacuat|injur|fatal/.test(lower);

  let type = "other";
  if (isEarthquake) type = "earthquake";
  else if (isFlood) type = "flood";
  else if (isFire) type = "fire";
  else if (isStorm) type = "storm";
  else if (isEpidemic) type = "epidemic";
  else if (isIndustrial) type = "industrial";

  let title = "Potential incident detected";
  if (type === "earthquake") title = "Earthquake detected";
  if (type === "flood") title = "Flooding incident detected";
  if (type === "fire") title = "Fire incident detected";
  if (type === "storm") title = "Severe storm detected";
  if (type === "epidemic") title = "Health outbreak detected";
  if (type === "industrial") title = "Industrial emergency detected";

  return {
    isCrisis,
    title,
    type,
    originalReport: inputText,
    location: {
      name: "Unknown location",
      lat: 0,
      lng: 0,
    },
    description: isCrisis
      ? inputText
      : "No clear crisis indicators were detected in the input.",
    confidence: isCrisis ? 0.78 : 0.2,
    fallbackMode: true,
  };
}

function fallbackAnalyzer(crisisData) {
  const text = JSON.stringify(crisisData || {}).toLowerCase();
  const originalReport = `${crisisData?.originalReport || ""} ${crisisData?.description || ""}`.toLowerCase();
  const severityBasis = `${text} ${originalReport}`;
  const severity = includesAny(text, ["critical", "catastrophic", "massive", "collapse", "trapped", "fatal"])
    || includesAny(originalReport, ["critical", "catastrophic", "massive", "collapse", "collapsed", "trapped", "fatal", "multiple buildings", "people trapped"])
    ? "critical"
    : includesAny(severityBasis, ["high", "major", "severe", "multiple", "evacuat", "people trapped", "buildings collapsed"])
      ? "high"
      : includesAny(severityBasis, ["medium", "moderate", "damage", "injur"])
        ? "medium"
        : "low";

  const estimatedAffectedPopulation = severity === "critical" ? 50000 : severity === "high" ? 15000 : severity === "medium" ? 5000 : 1000;

  const riskFactors = [];
  if (severityBasis.includes("collapsed") || severityBasis.includes("collapse")) riskFactors.push("Structural collapse risk");
  if (severityBasis.includes("trapped")) riskFactors.push("Rescue complexity and delayed extraction");
  if (text.includes("earthquake")) riskFactors.push("Structural damage and aftershocks");
  if (text.includes("flood")) riskFactors.push("Floodwater contamination and isolation");
  if (text.includes("fire")) riskFactors.push("Smoke inhalation and fast spread");
  if (text.includes("storm") || text.includes("cyclone") || text.includes("hurricane")) riskFactors.push("Wind damage and infrastructure disruption");
  if (text.includes("chemical") || text.includes("toxic")) riskFactors.push("Hazardous material exposure");
  if (text.includes("epidemic") || text.includes("outbreak")) riskFactors.push("Disease spread and healthcare strain");
  if (!riskFactors.length) riskFactors.push("General infrastructure disruption");

  const immediateThreats = [];
  if (text.includes("earthquake")) immediateThreats.push("Collapsed structures and trapped victims");
  if (text.includes("flood")) immediateThreats.push("Rapid water rise and road cutoffs");
  if (text.includes("fire")) immediateThreats.push("Active flames and smoke spread");
  if (text.includes("storm") || text.includes("cyclone") || text.includes("hurricane")) immediateThreats.push("Winds, debris, and utility outages");
  if (text.includes("chemical") || text.includes("toxic")) immediateThreats.push("Toxic plume exposure");
  if (text.includes("epidemic") || text.includes("outbreak")) immediateThreats.push("Rapid transmission in dense areas");
  if (!immediateThreats.length) immediateThreats.push("Potential escalation and delayed response");

  return {
    severity,
    estimatedAffectedPopulation,
    riskFactors,
    immediateThreats,
    potentialEscalation: "Conditions could worsen without rapid coordination, evacuation, and resource deployment.",
    priorityLevel: severity === "critical" ? 10 : severity === "high" ? 8 : severity === "medium" ? 5 : 3,
    analysisNotes: "Local fallback analysis was used because the Groq API key is missing or invalid.",
    fallbackMode: true,
  };
}

function fallbackResponder(crisisData, analysisData) {
  const crisisText = JSON.stringify(crisisData || {}).toLowerCase();
  const analysisText = JSON.stringify(analysisData || {}).toLowerCase();
  const combinedText = `${crisisText} ${analysisText}`;

  const actions = [
    "Activate local emergency command and verify on-ground conditions.",
    "Dispatch first responders and request live situation updates.",
    "Share immediate public safety guidance through all available channels.",
  ];

  if (combinedText.includes("earthquake")) {
    actions.push("Check for trapped people, stabilize unsafe structures, and prepare rescue equipment.");
  } else if (combinedText.includes("flood")) {
    actions.push("Move people to higher ground and secure boat or water rescue support.");
  } else if (combinedText.includes("fire")) {
    actions.push("Establish a perimeter, prioritize evacuation, and send fire suppression units.");
  } else if (combinedText.includes("chemical") || combinedText.includes("toxic")) {
    actions.push("Initiate hazardous-material isolation and shelter-in-place guidance.");
  } else if (combinedText.includes("epidemic") || combinedText.includes("outbreak")) {
    actions.push("Coordinate health screening, isolation, and medical supply distribution.");
  } else {
    actions.push("Collect more field intelligence and adapt the response plan in real time.");
  }

  const resources = [];
  if (combinedText.includes("earthquake") || combinedText.includes("collapse")) {
    resources.push({ type: "military", name: "Urban search and rescue team", priority: "high" });
    resources.push({ type: "hospital", name: "Nearest trauma hospitals", priority: "high" });
  }
  if (combinedText.includes("flood")) {
    resources.push({ type: "shelter", name: "Temporary flood shelters", priority: "high" });
    resources.push({ type: "ngo", name: "Water and food relief NGO", priority: "medium" });
  }
  if (combinedText.includes("fire")) {
    resources.push({ type: "fire_station", name: "Regional fire brigade", priority: "high" });
  }
  if (combinedText.includes("chemical") || combinedText.includes("toxic")) {
    resources.push({ type: "police", name: "Hazmat isolation support", priority: "high" });
  }
  if (combinedText.includes("epidemic") || combinedText.includes("outbreak")) {
    resources.push({ type: "hospital", name: "District health response unit", priority: "high" });
    resources.push({ type: "ngo", name: "Medical supply distribution partner", priority: "medium" });
  }
  if (!resources.length) {
    resources.push({ type: "ngo", name: "General relief coordination unit", priority: "medium" });
  }

  const alerts = [
    {
      target: "Local authorities",
      message: "A crisis report was detected. Verify ground truth and activate the incident command structure.",
      urgency: "urgent",
    },
    {
      target: "Residents in affected area",
      message: "Follow official safety instructions and stay clear of the incident zone.",
      urgency: "immediate",
    },
  ];

  return {
    actions,
    resources,
    alerts,
    evacuationNeeded: combinedText.includes("earthquake") || combinedText.includes("flood") || combinedText.includes("fire") || combinedText.includes("cyclone") || combinedText.includes("hurricane"),
    estimatedResponseTime: "15-30 minutes for initial coordination",
    coordinationNotes: "Local fallback response plan was generated because the Groq API key is missing or invalid.",
    fallbackMode: true,
  };
}

async function callAgent(systemPrompt, userMessage) {
  const inputText = textFromInput(userMessage);

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: inputText },
      ],
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0].message.content;
    return safeJsonParse(text);
  } catch (error) {
    const prompt = systemPrompt.toLowerCase();
    if (prompt.includes("monitor agent")) {
      return fallbackMonitor(inputText);
    }
    if (prompt.includes("analyzer agent")) {
      const parsed = typeof userMessage === "string" ? safeJsonParse(userMessage) : userMessage;
      return fallbackAnalyzer(parsed);
    }
    if (prompt.includes("responder agent")) {
      let parsedInput = userMessage;
      if (typeof userMessage === "string") {
        try {
          parsedInput = JSON.parse(userMessage);
        } catch {
          parsedInput = { crisis: userMessage, analysis: {} };
        }
      }
      return fallbackResponder(parsedInput?.crisis || parsedInput, parsedInput?.analysis || {});
    }

    throw error;
  }
}

module.exports = { callAgent };
