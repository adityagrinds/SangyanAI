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

function normalizeCoordinates(location) {
  if (!location) return null;

  const lat = Number(location.lat);
  const lng = Number(location.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;

  return { lat, lng, name: location.name || "Unknown location" };
}

function hasValidCoordinates(location) {
  return !!normalizeCoordinates(location);
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

function createIcon(severity, isSelected = false) {
  const color = severityColors[severity] || "#6b7280";
  const size = isSelected ? 28 : 24;
  const border = isSelected ? 4 : 3;

  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: ${border}px solid white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.35);
      transform: scale(${isSelected ? 1.2 : 1});
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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
    ? normalizeCoordinates(currentLocation)
    : currentLocation?.name
      ? currentLocation
      : null;

  const validIncidents = incidents.filter((incident) => {
    if (!hasValidCoordinates(incident?.location)) return false;
    if (!currentIncident) return true;
    return incident?._id !== currentIncident?._id;
  });

  return (
    <div className="card map-container">
      <div className="card-header">
        <h2>🗺️ Crisis Map</h2>
        <span className="update-count">{validIncidents.length} incidents</span>
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

        {currentIncident && hasValidCoordinates(currentIncident.location) && (
          <Marker
            key={currentIncident._id || "current-selected"}
            position={[Number(currentIncident.location.lat), Number(currentIncident.location.lng)]}
            icon={createIcon(currentIncident.severity, true)}
          >
            <Popup>
              <strong>{currentIncident.title}</strong>
              <br />
              Severity: {currentIncident.severity}
              <br />
              Type: {currentIncident.type}
            </Popup>
          </Marker>
        )}

        {validIncidents.map(
          (incident, i) => (
            <Marker
              key={incident._id || i}
              position={[Number(incident.location.lat), Number(incident.location.lng)]}
              icon={createIcon(incident.severity, currentIncident?._id === incident._id)}
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
