const Incident = require("../models/Incident");

// Get past incidents similar to the current crisis for agent context
async function getRelevantMemory(type, location) {
  const query = {};
  if (type) query.type = type;

  const pastIncidents = await Incident.find(query)
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  if (pastIncidents.length === 0) return null;

  const memory = pastIncidents.map((inc) => ({
    title: inc.title,
    type: inc.type,
    severity: inc.severity,
    location: inc.location?.name,
    actions: inc.response?.actions?.slice(0, 3),
    date: inc.createdAt,
  }));

  return {
    count: pastIncidents.length,
    summary: `Found ${pastIncidents.length} similar past incidents of type "${type}".`,
    incidents: memory,
  };
}

// Build memory context string for agent prompts
function buildMemoryContext(memory) {
  if (!memory || memory.count === 0) return "";

  let context = "\n\nHISTORICAL CONTEXT FROM PAST INCIDENTS:\n";
  memory.incidents.forEach((inc, i) => {
    context += `\n${i + 1}. "${inc.title}" (${inc.severity} severity, ${inc.location})`;
    if (inc.actions?.length) {
      context += `\n   Actions taken: ${inc.actions.join(", ")}`;
    }
  });
  context += "\n\nUse this historical data to provide better, more informed recommendations.";

  return context;
}

module.exports = { getRelevantMemory, buildMemoryContext };
