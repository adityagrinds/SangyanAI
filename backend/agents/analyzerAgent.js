const { callAgent } = require("../config/groq");

/**
 * analyzerAgent — receives crisis data + REAL enriched facts.
 * The LLM is instructed via strict prompt to use only the verified figures provided.
 * A programmatic guardrail then enforces the correct population number even if the LLM deviates.
 */

function buildAnalyzerPrompt(enrichedFacts) {
  const pop = enrichedFacts?.affectedPopulationModel;
  const popInfo = enrichedFacts?.populationInfo;

  let populationSection = "";
  if (pop && pop.estimatedAffectedPopulation) {
    populationSection = `
VERIFIED POPULATION DATA (DO NOT CHANGE THESE NUMBERS):
- City/Area: ${popInfo?.cityName || "N/A"}, ${popInfo?.country || ""}
- Official Census Population: ${pop.totalCensusPopulation.toLocaleString()}
- Estimated Affected Population: ${pop.estimatedAffectedPopulation.toLocaleString()} (${(pop.impactFraction * 100).toFixed(0)}% impact model for ${pop.crisisType})
- Data Source: ${popInfo?.source || "Open-Meteo Geocoding API"}
⚠ You MUST use exactly ${pop.estimatedAffectedPopulation} as the estimatedAffectedPopulation. Do NOT guess or invent a different number.
`;
  } else {
    populationSection = `
POPULATION DATA: Not available for this location.
⚠ You MUST set estimatedAffectedPopulation to null. Do NOT invent or guess any population figure.
`;
  }

  let reliefWebSection = "";
  if (enrichedFacts?.reliefWebReports?.reports?.length > 0) {
    const reports = enrichedFacts.reliefWebReports.reports;
    reliefWebSection = `
OFFICIAL HUMANITARIAN REPORTS (UNOCHA ReliefWeb - verified sources):
${reports.map((r, i) => `${i + 1}. [${r.source || "ReliefWeb"}] ${r.title} (${r.date ? new Date(r.date).toLocaleDateString() : "recent"})\n   ${r.excerpt || ""}`).join("\n")}
Use these verified reports in your analysisNotes. Do NOT contradict figures from these official reports.
`;
  }

  return `You are a Crisis Analyzer Agent. You receive detected crisis data along with verified, real-world factual data from official APIs.

${populationSection}
${reliefWebSection}

STRICT RULES:
1. Never invent numbers. If a figure is not provided in the context above, state it is "Not available" rather than guessing.
2. The estimatedAffectedPopulation field MUST use the exact verified figure provided above (or null if not available).
3. Your analysis should be grounded in the real data provided. Reference the official sources when applicable.
4. Severity, riskFactors, immediateThreats, and priorityLevel are YOUR expert assessment — be realistic.

Analyze the crisis and respond ONLY in valid JSON format (no markdown, no explanation outside JSON):
{
  "severity": "low" | "medium" | "high" | "critical",
  "estimatedAffectedPopulation": <exact number from VERIFIED DATA above, or null>,
  "populationDataSource": "<source name or 'Not available'>",
  "riskFactors": ["list of risk factors"],
  "immediateThreats": ["list of immediate threats"],
  "potentialEscalation": "description of how this could get worse",
  "priorityLevel": 1-10,
  "analysisNotes": "detailed analysis citing real data sources"
}`;
}

async function analyzerAgent(crisisData, enrichedFacts) {
  const prompt = buildAnalyzerPrompt(enrichedFacts);
  const input = typeof crisisData === "string" ? crisisData : JSON.stringify(crisisData);

  const result = await callAgent(prompt, input);

  // ─── Programmatic guardrail: enforce real population number ───────────────
  const verifiedPop = enrichedFacts?.affectedPopulationModel?.estimatedAffectedPopulation;
  if (verifiedPop != null) {
    result.estimatedAffectedPopulation = verifiedPop;
    result.populationDataSource = enrichedFacts?.populationInfo?.source || "Open-Meteo Geocoding API";
  } else if (result.estimatedAffectedPopulation !== null && result.estimatedAffectedPopulation !== undefined) {
    // No real data available — set to null to prevent hallucination
    result.estimatedAffectedPopulation = null;
    result.populationDataSource = "Not available — real census data could not be fetched for this location";
  }

  return {
    agent: "Analyzer Agent",
    ...result,
  };
}

module.exports = { analyzerAgent };
