const severityConfig = {
  low: { color: "#10b981", bg: "#ecfdf5", label: "LOW" },
  medium: { color: "#f59e0b", bg: "#fffbeb", label: "MEDIUM" },
  high: { color: "#f97316", bg: "#fff7ed", label: "HIGH" },
  critical: { color: "#ef4444", bg: "#fef2f2", label: "CRITICAL" },
};

function Dashboard({ currentIncident }) {
  if (!currentIncident) {
    return (
      <div className="card dashboard">
        <div className="card-header">
          <h2>📋 Response Dashboard</h2>
        </div>
        <div className="empty-state">
          <p>No active incident. Submit a crisis report to see the response plan.</p>
        </div>
      </div>
    );
  }

  const severity = severityConfig[currentIncident.severity] || severityConfig.medium;

  return (
    <div className="card dashboard">
      <div className="card-header">
        <h2>📋 Response Dashboard</h2>
        <span className="severity-badge" style={{ backgroundColor: severity.bg, color: severity.color, border: `1px solid ${severity.color}` }}>
          {severity.label}
        </span>
      </div>

      <div className="dashboard-content">
        <div className="incident-title">
          <h3>{currentIncident.title}</h3>
          <p>{currentIncident.description}</p>
          {currentIncident.type === "earthquake" && currentIncident.magnitude != null && (
            <p>
              <strong>Earthquake magnitude:</strong> {Number(currentIncident.magnitude).toFixed(1)}
              {currentIncident.depth != null ? ` • Depth: ${Number(currentIncident.depth).toFixed(1)} km` : ""}
            </p>
          )}
        </div>

        <div className="dash-section">
          <h4>👥 Affected Population</h4>
          <p>
            {currentIncident.affectedPopulation?.value != null
              ? currentIncident.affectedPopulation.value.toLocaleString()
              : "Not available"}
          </p>
          <small>
            Status: {currentIncident.affectedPopulation?.status === "confirmed"
              ? "Confirmed"
              : currentIncident.affectedPopulation?.status === "estimated"
                ? "Estimated"
                : "Not available"}
            {" | "}Source: {currentIncident.affectedPopulation?.source || "No event-specific official figure found"}
          </small>
        </div>

        <div className="dashboard-grid">
          <div className="dash-section">
            <h4>🎯 Response Actions</h4>
            <ul>
              {currentIncident.response?.actions?.map((action, i) => (
                <li key={i}>{action}</li>
              )) || <li>No actions defined</li>}
            </ul>
          </div>

          <div className="dash-section">
            <h4>🏥 Resources Needed</h4>
            <ul>
              {currentIncident.response?.resources?.map((resource, i) => (
                <li key={i}>{resource}</li>
              )) || <li>No resources identified</li>}
            </ul>
          </div>

          <div className="dash-section alerts-section">
            <h4>📢 Alerts</h4>
            {currentIncident.response?.alerts?.map((alert, i) => (
              <div key={i} className="alert-item">{alert}</div>
            )) || <p>No alerts</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
