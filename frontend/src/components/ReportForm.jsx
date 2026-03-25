import { useState } from "react";

const SAMPLE_REPORTS = [
  "A 7.2 magnitude earthquake has struck central Turkey near the city of Gaziantep. Multiple buildings have collapsed and there are reports of people trapped under rubble. Power outages reported across the region.",
  "Massive flooding in Bangladesh after monsoon rains. The Brahmaputra river has breached its banks, displacing thousands. Roads are submerged and rescue teams cannot reach remote villages.",
  "A large wildfire is spreading rapidly through northern California forests near residential areas. Over 5,000 acres burned so far. Winds are expected to intensify. Evacuations underway.",
  "A chemical plant explosion in industrial district of Mumbai, India. Toxic fumes spreading across nearby neighborhoods. Multiple casualties reported. Emergency services are overwhelmed.",
];

function ReportForm({ onSubmit, processing }) {
  const [report, setReport] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (report.trim() && !processing) {
      onSubmit(report.trim());
    }
  };

  const loadSample = () => {
    const random = SAMPLE_REPORTS[Math.floor(Math.random() * SAMPLE_REPORTS.length)];
    setReport(random);
  };

  return (
    <div className="card report-form">
      <div className="card-header">
        <h2>📡 Crisis Report Input</h2>
        <button className="btn-secondary" onClick={loadSample} disabled={processing}>
          Load Sample
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={report}
          onChange={(e) => setReport(e.target.value)}
          placeholder="Enter a crisis report, news article, or emergency description..."
          rows={5}
          disabled={processing}
        />
        <button className="btn-primary" type="submit" disabled={processing || !report.trim()}>
          {processing ? (
            <>
              <span className="spinner"></span> Agents Processing...
            </>
          ) : (
            "🚀 Deploy Agents"
          )}
        </button>
      </form>
    </div>
  );
}

export default ReportForm;
