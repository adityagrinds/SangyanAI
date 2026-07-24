const geocodeCache = new Map();

function hasValidCoordinates(location) {
  return Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lng)) && !(Number(location?.lat) === 0 && Number(location?.lng) === 0);
}

function extractLocationQuery(text) {
  if (!text || typeof text !== "string") return null;

  const normalizedText = text.replace(/\s+/g, " ").trim();
  const patterns = [
    /(?:near|in|at|around|from|outside|inside|close to|by)\s+([A-Za-z0-9.,'"()\-\s]+?)(?:[.;!?]|$)/i,
    /([A-Za-z0-9.-]+(?:,\s*[A-Za-z0-9.-]+){0,3})/,
  ];

  const tailStrippers = [
    /\b(after|with|while|because|causing|leading to|due to|as|and|plus)\b.*$/i,
    /\b(record|heavy|major|multiple|severe|strong|intense)\b.*$/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    if (match?.[1]) {
      let candidate = match[1].replace(/\s+/g, " ").trim();
      for (const stripPattern of tailStrippers) {
        candidate = candidate.replace(stripPattern, "").trim();
      }
      candidate = candidate.replace(/[.,;!?]+$/g, "").trim();
      if (candidate.length >= 3 && !/^unknown location$/i.test(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

async function geocodeLocation(query) {
  const trimmedQuery = query?.trim();
  if (!trimmedQuery) return null;

  if (geocodeCache.has(trimmedQuery)) {
    return geocodeCache.get(trimmedQuery);
  }

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmedQuery)}&count=1&language=en&format=json`
    );

    if (!response.ok) {
      geocodeCache.set(trimmedQuery, null);
      return null;
    }

    const payload = await response.json();
    const location = payload?.results?.[0];
    if (!location) {
      geocodeCache.set(trimmedQuery, null);
      return null;
    }

    const resolved = {
      name: [location.name, location.admin1, location.country].filter(Boolean).join(", "),
      lat: Number(location.latitude),
      lng: Number(location.longitude),
    };

    if (!hasValidCoordinates(resolved)) {
      geocodeCache.set(trimmedQuery, null);
      return null;
    }

    geocodeCache.set(trimmedQuery, resolved);
    return resolved;
  } catch {
    geocodeCache.set(trimmedQuery, null);
    return null;
  }
}

async function resolveIncidentLocation({ report, title, description, location }) {
  if (hasValidCoordinates(location)) {
    return location;
  }

  const candidateQueries = [
    location?.name,
    extractLocationQuery(report),
    extractLocationQuery(description),
    extractLocationQuery(title),
  ].filter(Boolean);

  for (const query of candidateQueries) {
    const resolved = await geocodeLocation(query);
    if (resolved) {
      return resolved;
    }
  }

  return location || null;
}

module.exports = { resolveIncidentLocation, extractLocationQuery, geocodeLocation, hasValidCoordinates };