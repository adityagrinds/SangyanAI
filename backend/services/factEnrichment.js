/**
 * factEnrichment.js
 * Fetches REAL, VERIFIED data from open APIs:
 * 1. Open-Meteo Geocoding API  → real city census population
 * 2. OpenStreetMap Overpass API → real nearby hospitals, shelters, fire stations, police
 * 3. UNOCHA ReliefWeb API       → official verified disaster reports / figures
 *
 * NO fake numbers, NO hallucinated names. If data is unavailable, returns null.
 */

const https = require("https");
const http = require("http");

// ─── Utility: fetch JSON from a URL ───────────────────────────────────────────
function fetchJSON(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { headers: { "User-Agent": "SangyanAI/1.0 (crisis-response-platform)" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Invalid JSON from ${url}`));
        }
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
    req.on("error", reject);
  });
}

// ─── 1. REAL POPULATION via Open-Meteo Geocoding API ─────────────────────────
// Open-Meteo geocoding returns official city population from multiple databases.
async function getAreaPopulationInfo(lat, lng, locationName) {
  try {
    // Use Open-Meteo geocoding search by name to get official census population
    const query = encodeURIComponent(locationName || "");
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1&language=en&format=json`;
    const data = await fetchJSON(url);

    if (data && data.results && data.results.length > 0) {
      const place = data.results[0];
      return {
        source: "Open-Meteo Geocoding API (official census data)",
        cityName: place.name,
        country: place.country,
        admin1: place.admin1, // state/province
        admin2: place.admin2, // district
        population: place.population || null, // official census population, null if unavailable
        lat: place.latitude,
        lng: place.longitude,
        timezone: place.timezone,
      };
    }
    return null;
  } catch (err) {
    console.warn("[FactEnrichment] Population fetch failed:", err.message);
    return null;
  }
}

// ─── Affected population model (spatial impact based on crisis type) ──────────
function calculateAffectedPopulation(totalPopulation, crisisType, radiusKm = 50) {
  if (!totalPopulation) return null;

  // Impact fractions are conservative estimates per crisis type
  const impactFractions = {
    earthquake: 0.15,  // ~15% within radius directly impacted
    flood: 0.20,       // floods affect broader flat terrain
    fire: 0.05,        // wildfires, limited radius
    cyclone: 0.25,     // wide-area wind/rain damage
    tsunami: 0.10,
    landslide: 0.08,
    drought: 0.30,     // affects agriculture and wide population
    default: 0.10,
  };

  const fraction = impactFractions[crisisType?.toLowerCase()] || impactFractions.default;
  const estimated = Math.round(totalPopulation * fraction);

  return {
    totalCensusPopulation: totalPopulation,
    estimatedAffectedPopulation: estimated,
    impactFraction: fraction,
    crisisType,
    note: `Estimated using ${(fraction * 100).toFixed(0)}% spatial impact model for ${crisisType || "general"} crisis type`,
  };
}

// ─── 2. REAL FACILITIES via OpenStreetMap Overpass API ───────────────────────
async function getNearbyFacilities(lat, lng, radiusKm = 30) {
  try {
    const radiusM = radiusKm * 1000;
    // Query for hospitals, clinics, shelters, fire stations, police, military
    const overpassQuery = `
[out:json][timeout:15];
(
  node["amenity"="hospital"](around:${radiusM},${lat},${lng});
  node["amenity"="clinic"](around:${radiusM},${lat},${lng});
  node["amenity"="shelter"](around:${radiusM},${lat},${lng});
  node["amenity"="fire_station"](around:${radiusM},${lat},${lng});
  node["amenity"="police"](around:${radiusM},${lat},${lng});
  way["amenity"="hospital"](around:${radiusM},${lat},${lng});
  way["amenity"="clinic"](around:${radiusM},${lat},${lng});
);
out center tags 20;
    `.trim();

    const encodedQuery = encodeURIComponent(overpassQuery);
    const url = `https://overpass-api.de/api/interpreter?data=${encodedQuery}`;
    const data = await fetchJSON(url, 18000);

    if (!data || !data.elements) return [];

    const facilities = data.elements
      .filter((el) => el.tags && (el.tags.name || el.tags["name:en"]))
      .map((el) => {
        const tags = el.tags;
        const facilityLat = el.lat || el.center?.lat;
        const facilityLng = el.lon || el.center?.lon;

        // Calculate distance in km from the incident
        let distanceKm = null;
        if (facilityLat && facilityLng) {
          const R = 6371;
          const dLat = ((facilityLat - lat) * Math.PI) / 180;
          const dLon = ((facilityLng - lng) * Math.PI) / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat * Math.PI) / 180) * Math.cos((facilityLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
          distanceKm = parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
        }

        return {
          type: tags.amenity,
          name: tags.name || tags["name:en"],
          phone: tags.phone || tags["contact:phone"] || null,
          beds: tags.beds || null,
          address: [tags["addr:street"], tags["addr:city"]].filter(Boolean).join(", ") || null,
          lat: facilityLat,
          lng: facilityLng,
          distanceKm,
          osmId: el.id,
          source: "OpenStreetMap Overpass API (real infrastructure data)",
        };
      })
      .sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999))
      .slice(0, 15); // top 15 nearest

    return facilities;
  } catch (err) {
    console.warn("[FactEnrichment] OSM Overpass fetch failed:", err.message);
    return [];
  }
}

// ─── 3. REAL DISASTER REPORTS via UNOCHA ReliefWeb API ───────────────────────
async function getReliefWebData(query, locationName) {
  try {
    const searchTerm = encodeURIComponent(`${query} ${locationName || ""}`);
    const url = `https://api.reliefweb.int/v1/reports?appname=SangyanAI&query[value]=${searchTerm}&limit=3&fields[include][]=title&fields[include][]=date&fields[include][]=body-html&fields[include][]=source&sort[]=date:desc`;
    const data = await fetchJSON(url);

    if (!data || !data.data || data.data.length === 0) return null;

    const reports = data.data.map((item) => ({
      title: item.fields?.title,
      date: item.fields?.date?.created,
      source: item.fields?.source?.[0]?.name,
      url: item.href,
      // Strip HTML tags from body for clean text
      excerpt: item.fields?.["body-html"]
        ? item.fields["body-html"].replace(/<[^>]*>/g, "").substring(0, 300).trim()
        : null,
    }));

    return {
      source: "UNOCHA ReliefWeb (official humanitarian reports)",
      reports,
      count: reports.length,
    };
  } catch (err) {
    console.warn("[FactEnrichment] ReliefWeb fetch failed:", err.message);
    return null;
  }
}

// ─── Master enrichment function ───────────────────────────────────────────────
/**
 * enrichCrisisContext — main function called before analyzerAgent
 * @param {object} location — { name, lat, lng }
 * @param {string} query    — crisis type or keyword (e.g. "earthquake")
 * @param {string} crisisType — "earthquake" | "flood" | "fire" etc.
 * @returns {object} enrichedFacts with real population, facilities, reports
 */
async function enrichCrisisContext(location, query, crisisType) {
  const { name, lat, lng } = location || {};

  console.log(`[FactEnrichment] Fetching real data for: ${name} (${lat}, ${lng}), type: ${crisisType}`);

  // Run all API calls in parallel for speed
  const [populationInfo, facilities, reliefWebData] = await Promise.allSettled([
    lat && lng ? getAreaPopulationInfo(lat, lng, name) : Promise.resolve(null),
    lat && lng ? getNearbyFacilities(lat, lng, 40) : Promise.resolve([]),
    getReliefWebData(query, name),
  ]);

  const popData = populationInfo.status === "fulfilled" ? populationInfo.value : null;
  const facilityList = facilities.status === "fulfilled" ? facilities.value : [];
  const reliefData = reliefWebData.status === "fulfilled" ? reliefWebData.value : null;

  // Calculate affected population based on REAL census data
  const affectedModel = popData?.population
    ? calculateAffectedPopulation(popData.population, crisisType)
    : null;

  return {
    populationInfo: popData,
    affectedPopulationModel: affectedModel,
    nearbyFacilities: facilityList,
    reliefWebReports: reliefData,
    enrichedAt: new Date().toISOString(),
    dataSources: [
      popData ? "Open-Meteo Geocoding API" : null,
      facilityList.length > 0 ? "OpenStreetMap Overpass API" : null,
      reliefData ? "UNOCHA ReliefWeb API" : null,
    ].filter(Boolean),
  };
}

module.exports = {
  enrichCrisisContext,
  getAreaPopulationInfo,
  getNearbyFacilities,
  getReliefWebData,
  calculateAffectedPopulation,
};
