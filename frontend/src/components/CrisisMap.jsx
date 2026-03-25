import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const severityColors = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

function createIcon(severity) {
  const color = severityColors[severity] || "#6b7280";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function FlyToLocation({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location?.lat && location?.lng) {
      map.flyTo([location.lat, location.lng], 8, { duration: 1.5 });
    }
  }, [location, map]);
  return null;
}

function CrisisMap({ incidents, currentIncident }) {
  const currentLocation = currentIncident?.location;

  return (
    <div className="card map-container">
      <div className="card-header">
        <h2>🗺️ Crisis Map</h2>
        <span className="update-count">{incidents.length} incidents</span>
      </div>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: "400px", width: "100%", borderRadius: "0 0 12px 12px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {currentLocation && <FlyToLocation location={currentLocation} />}
        {incidents.map(
          (incident, i) =>
            incident.location?.lat && (
              <Marker
                key={incident._id || i}
                position={[incident.location.lat, incident.location.lng]}
                icon={createIcon(incident.severity)}
              >
                <Popup>
                  <strong>{incident.title}</strong>
                  <br />
                  Severity: {incident.severity}
                  <br />
                  Type: {incident.type}
                </Popup>
              </Marker>
            )
        )}
      </MapContainer>
    </div>
  );
}

export default CrisisMap;
