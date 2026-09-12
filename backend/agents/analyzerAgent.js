const { callAgent } = require("../config/groq");

/**
 * analyzerAgent — receives crisis data + REAL enriched facts.
 * The LLM is instructed via strict prompt to use only the verified figures provided.
 * A programmatic guardrail then enforces the correct population number even if the LLM deviates.
 */

function buildAnalyzerPrompt(enrichedFacts) {
  const affectedPopulation = enrichedFacts?.affectedPopulation;

  let populationSection = "";
  if (affectedPopulation?.value) {
    populationSection = `
VERIFIED EVENT-SPECIFIC AFFECTED POPULATION (DO NOT CHANGE THIS NUMBER):
- Affected Population: ${affectedPopulation.value.toLocaleString()}
- Status: ${affectedPopulation.status}
- Data Source: ${affectedPopulation.source}
⚠ You MUST use exactly ${affectedPopulation.value} as estimatedAffectedPopulation.
`;
  } else {
    populationSection = `
EVENT-SPECIFIC AFFECTED POPULATION: Not available from a free official source.
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
  "estimatedAffectedPopulation": <exact verified event number above, or null>,
  "populationStatus": "confirmed" | "not_available",
  "populationDataSource": "<official report source or 'Not available'>",
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
  const verifiedPop = enrichedFacts?.affectedPopulation;
  if (verifiedPop != null) {
    result.estimatedAffectedPopulation = verifiedPop.value;
    result.populationStatus = verifiedPop.status;
    result.populationDataSource = verifiedPop.source;
  } else {
    // No event-specific official data available — never fall back to a guess.
    result.estimatedAffectedPopulation = null;
    result.populationStatus = "not_available";
    result.populationDataSource = "Not available — no event-specific official figure found";
  }

  return {
    agent: "Analyzer Agent",
    ...result,
  };
}

module.exports = { analyzerAgent };
