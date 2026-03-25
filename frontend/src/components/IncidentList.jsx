function IncidentList({ incidents, onSelect }) {
  if (incidents.length === 0) return null;

  return (
    <div className="card incident-list">
      <div className="card-header">
        <h2>📜 Incident History</h2>
        <span className="update-count">{incidents.length} total</span>
      </div>
      <div className="incidents-scroll">
        {incidents.map((incident, i) => (
          <div
            key={incident._id || i}
            className="incident-item"
            onClick={() => onSelect(incident)}
          >
            <div className="incident-type-icon">
              {getTypeIcon(incident.type)}
            </div>
            <div className="incident-info">
              <strong>{incident.title}</strong>
              <span className="incident-meta">
                {incident.location?.name} • {incident.type} • {incident.severity}
              </span>
            </div>
            <div className={`severity-dot ${incident.severity}`}></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getTypeIcon(type) {
  const icons = {
    earthquake: "🌍",
    flood: "🌊",
    fire: "🔥",
    storm: "⛈️",
    epidemic: "🦠",
    industrial: "🏭",
    other: "⚠️",
  };
  return icons[type] || "⚠️";
}

export default IncidentList;
