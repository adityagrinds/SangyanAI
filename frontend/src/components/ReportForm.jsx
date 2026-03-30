import { useState } from "react";

const SAMPLE_REPORTS = [
  "M7.2 earthquake near Gaziantep, Turkey. Multiple mid-rise buildings pancaked, people trapped, power and telecom down across central districts.",
  "Monsoon flooding in Sylhet, Bangladesh. Brahmaputra has overtopped embankments; remote villages unreachable, thousands displaced, urgent need for boats and dry food.",
  "Wildfire in Redding, California growing towards residential edge. 7,000 acres burned, red-flag winds forecast this evening, spot fires jumping Highway 44, evacuations in progress.",
  "Chemical plant explosion in Navi Mumbai industrial zone. Toxic plume moving south with wind, reports of respiratory distress, local EMS overwhelmed, shelter-in-place advised.",
  "Category 4 cyclone making landfall near Beira, Mozambique. Storm surge expected, low-lying neighborhoods already flooding, hospital generators at risk.",
  "Flash floods in Dubai after record cloudburst. Major arteries submerged, cars stranded, airport diversions ongoing, metro partially suspended.",
  "Tornado outbreak near Tulsa, Oklahoma. Multiple touchdowns, debris on highways, power lines down, injuries reported, sirens active.",
  "Epidemic cluster in Lagos informal settlements. Rapid spike in cholera-like symptoms, local clinics short on IV fluids and ORS.",
  "Dam breach risk on the Paraná River near Corrientes, Argentina. Upstream levels rising fast, downstream towns alerted, livestock evacuation underway.",
  "Landslide in Shimla, India after heavy rain. Hill road cut off, tourist buses stranded, risk of secondary slides, search teams requested.",
  "Heatwave in Seville, Spain. Grid stress warnings issued, elderly care homes reporting heat illnesses, cooling centers requested.",
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
