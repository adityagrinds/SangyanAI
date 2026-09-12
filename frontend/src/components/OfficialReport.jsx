import { useRef } from "react";

function formatDate(value) {
  if (!value) return "Date not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function OfficialReport({ incident, onClose }) {
  const reportRef = useRef(null);
  if (!incident) return null;

  const details = incident.reportDetails || {};
  const monitor = details.monitor || {};
  const analysis = details.analysis || {};
  const response = details.response || incident.response || {};
  const facts = details.facts || incident.reportFacts || {};
  const population = incident.affectedPopulation;
  const facilities = facts.nearbyFacilities || [];
  const reports = facts.officialReports || [];

  const downloadJpeg = () => {
    const element = reportRef.current;
    if (!element) return;
    const canvas = document.createElement("canvas");
    const scale = 2;
    const rect = element.getBoundingClientRect();
    canvas.width = rect.width * scale;
    canvas.height = element.scrollHeight * scale;
    const context = canvas.getContext("2d");
    context.scale(scale, scale);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, element.scrollHeight);
    const data = new XMLSerializer().serializeToString(element);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${element.scrollHeight}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${data}</div></foreignObject></svg>`;
    const image = new Image();
    image.onload = () => {
      context.drawImage(image, 0, 0, rect.width, element.scrollHeight);
      const link = document.createElement("a");
      link.download = `${(incident.title || "crisis-report").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  return (
    <div className="official-report-modal" onClick={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className="official-report-section">
      <div className="report-actions">
        <h2>Official Situation Report</h2>
        <div>
          <button className="report-close-button" onClick={onClose}>Close</button>
          <button className="btn-secondary" onClick={() => window.print()}>Save as PDF</button>
          <button className="btn-secondary" onClick={downloadJpeg}>Save as JPEG</button>
        </div>
      </div>
      <article className="official-report" ref={reportRef}>
        <header className="official-report-header">
          <div>
            <p className="report-kicker">CRISIS RESPONSE BRIEF</p>
            <h3>{incident.title || "Crisis incident report"}</h3>
            <p>{formatDate(incident.createdAt || new Date())} | {incident.location?.name || "Location not available"}</p>
          </div>
          <strong className={`report-severity ${incident.severity}`}>{incident.severity?.toUpperCase()}</strong>
        </header>

        <div className="report-facts-grid">
          <div><span>Incident type</span><strong>{incident.type || "Not available"}</strong></div>
          <div><span>Detection confidence</span><strong>{monitor.confidence != null ? `${Math.round(monitor.confidence * 100)}%` : "Not available"}</strong></div>
          <div><span>Affected population</span><strong>{population?.value != null ? population.value.toLocaleString() : "Not available"}</strong><small>{population?.status || "Not available"}</small></div>
          {incident.type === "earthquake" && <div><span>Magnitude / depth</span><strong>{incident.magnitude != null ? Number(incident.magnitude).toFixed(1) : "N/A"} / {incident.depth != null ? `${Number(incident.depth).toFixed(1)} km` : "N/A"}</strong></div>}
        </div>

        <div className="report-block"><h4>Situation summary</h4><p>{incident.description || monitor.description || "No summary available."}</p></div>
        <div className="report-block"><h4>Assessment</h4><p>{analysis.analysisNotes || "Assessment details are not available."}</p><p><strong>Priority:</strong> {analysis.priorityLevel || "N/A"}/10</p></div>

        <div className="report-columns">
          <div className="report-block"><h4>Immediate actions</h4><ul>{(response.actions || []).map((item, index) => <li key={index}>{item}</li>)}</ul></div>
          <div className="report-block"><h4>Resources and alerts</h4><ul>{(response.resources || []).map((item, index) => <li key={index}>{typeof item === "string" ? item : item.name}</li>)}{(response.alerts || []).map((item, index) => <li key={`alert-${index}`}>{typeof item === "string" ? item : item.message}</li>)}</ul></div>
        </div>

        {facilities.length > 0 && <div className="report-block"><h4>Nearby response facilities</h4><ul>{facilities.map((facility, index) => <li key={index}>{facility.name}{facility.distanceKm != null ? ` — ${facility.distanceKm} km` : ""}{facility.address ? `, ${facility.address}` : ""}</li>)}</ul></div>}
        {reports.length > 0 && <div className="report-block"><h4>Official information used</h4><ul>{reports.map((report, index) => <li key={index}>{report.title} ({formatDate(report.date)})</li>)}</ul></div>}
        <footer>Prepared by Sangyan AI | Verify critical decisions with field authorities before deployment.</footer>
      </article>
      </section>
    </div>
  );
}

export default OfficialReport;
