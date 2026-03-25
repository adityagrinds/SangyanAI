const { callAgent } = require("../config/groq");

const ANALYZER_PROMPT = `You are a Crisis Analyzer Agent. You receive detected crisis data and perform a deep analysis.

Analyze the crisis and respond in JSON format:
{
  "severity": "low" | "medium" | "high" | "critical",
  "estimatedAffectedPopulation": number,
  "riskFactors": ["list of risk factors"],
  "immediateThreats": ["list of immediate threats"],
  "potentialEscalation": "description of how this could get worse",
  "priorityLevel": 1-10,
  "analysisNotes": "detailed analysis of the situation"
}

Be realistic and thorough in your analysis. Consider secondary effects like infrastructure damage, supply chain disruption, displacement, etc.`;

async function analyzerAgent(crisisData) {
  const input = typeof crisisData === "string" ? crisisData : JSON.stringify(crisisData);
  const result = await callAgent(ANALYZER_PROMPT, input);
  return {
    agent: "Analyzer Agent",
    ...result,
  };
}

module.exports = { analyzerAgent };
