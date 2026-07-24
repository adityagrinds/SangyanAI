import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
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

const geocodeCache = new Map();

function hasValidCoordinates(location) {
  return Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lng)) && !(Number(location?.lat) === 0 && Number(location?.lng) === 0);
}

async function geocodeLocation(name) {
  const trimmedName = name?.trim();
  if (!trimmedName) return null;

  if (geocodeCache.has(trimmedName)) {
    return geocodeCache.get(trimmedName);
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(trimmedName)}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      geocodeCache.set(trimmedName, null);
      return null;
    }

    const resolved = {
      name: trimmedName,
      lat: Number(results[0].lat),
      lng: Number(results[0].lon),
    };

    geocodeCache.set(trimmedName, resolved);
    return resolved;
  } catch {
    return null;
  }
}

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
    if (hasValidCoordinates(location)) {
      map.flyTo([location.lat, location.lng], 8, { duration: 1.5 });
    }
  }, [location, map]);
  return null;
}

function CurrentLocationFollower({ location }) {
  const map = useMap();
  const [resolvedLocation, setResolvedLocation] = useState(location);

  useEffect(() => {
    let isMounted = true;

    async function resolveLocation() {
      if (hasValidCoordinates(location)) {
        setResolvedLocation(location);
        return;
      }

      const geocoded = await geocodeLocation(location?.name);
      if (isMounted && geocoded) {
        setResolvedLocation(geocoded);
      }
    }

    resolveLocation();

    return () => {
      isMounted = false;
    };
  }, [location]);

  useEffect(() => {
    if (hasValidCoordinates(resolvedLocation)) {
      map.flyTo([resolvedLocation.lat, resolvedLocation.lng], 8, { duration: 1.5 });
    }
  }, [resolvedLocation, map]);

  return null;
}

function CrisisMap({ incidents, currentIncident }) {
  const currentLocation = currentIncident?.location;
  const currentMarkerLocation = hasValidCoordinates(currentLocation)
    ? currentLocation
    : currentLocation?.name
      ? currentLocation
      : null;

  return (
    <div className="card map-container">
      <div className="card-header">
        <h2>🗺️ Crisis Map</h2>
        <span className="update-count">{incidents.length} incidents</span>
      </div>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        attributionControl={false}
        style={{ height: "400px", width: "100%", borderRadius: "0 0 12px 12px" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {currentMarkerLocation && <CurrentLocationFollower location={currentMarkerLocation} />}
        {incidents.map(
          (incident, i) =>
            hasValidCoordinates(incident.location) && (
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
