
const https = require("https");
const http = require("http");

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

async function getAreaPopulationInfo(lat, lng, locationName) {
  try {
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

function extractAffectedPopulation(text) {
  if (!text) return null;

  const normalized = text.replace(/,/g, "");
  const patterns = [
    /(?:affected|impacted|displaced|evacuated)[^0-9]{0,80}(\d{2,})/i,
    /(\d{2,})[^.]{0,80}(?:people\s+(?:were\s+)?(?:affected|impacted|displaced|evacuated))/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const value = Number(match[1]);
      if (Number.isSafeInteger(value) && value > 0) return value;
    }
  }

  return null;
}

function calculateAffectedPopulationEstimate(totalPopulation, crisisType, eventData = {}) {
  if (!totalPopulation) return null;

  if (crisisType === "earthquake" && Number.isFinite(Number(eventData.magnitude))) {
    const magnitude = Number(eventData.magnitude);
    const depthKm = Math.max(0, Number(eventData.depthKm) || 0);
    const magnitudeFactor = Math.min(0.7, Math.max(0.01, 0.01 * 2 ** (magnitude - 4)));
    const depthFactor = depthKm <= 15 ? 1 : depthKm <= 35 ? 0.75 : depthKm <= 70 ? 0.45 : 0.25;
    const tsunamiFactor = eventData.tsunami ? 1.35 : 1;
    const impactFraction = Math.min(0.7, magnitudeFactor * depthFactor * tsunamiFactor);

    return {
      value: Math.max(1, Math.round(totalPopulation * impactFraction)),
      status: "estimated",
      source: "Calculated estimate using local population and earthquake severity factors",
      factors: { magnitude, depthKm, tsunami: Boolean(eventData.tsunami), impactFraction },
    };
  }

  return null;
}

async function getNearbyFacilities(lat, lng, radiusKm = 30) {
  try {
    const radiusM = radiusKm * 1000;
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
      excerpt: item.fields?.["body-html"]
        ? item.fields["body-html"].replace(/<[^>]*>/g, "").substring(0, 2000).trim()
        : null,
    }));

    const affectedReport = reports.find((report) => {
      report.affectedPopulation = extractAffectedPopulation(`${report.title || ""} ${report.excerpt || ""}`);
      return report.affectedPopulation != null;
    });

    return {
      source: "UNOCHA ReliefWeb (official humanitarian reports)",
      reports,
      count: reports.length,
      affectedPopulation: affectedReport?.affectedPopulation || null,
      affectedPopulationSource: affectedReport
        ? `${affectedReport.source || "ReliefWeb"} — ${affectedReport.title}`
        : null,
    };
  } catch (err) {
    console.warn("[FactEnrichment] ReliefWeb fetch failed:", err.message);
    return null;
  }
}

async function enrichCrisisContext(location, query, crisisType, eventData = {}) {
  const { name, lat, lng } = location || {};

  console.log(`[FactEnrichment] Fetching real data for: ${name} (${lat}, ${lng}), type: ${crisisType}`);

  const [populationInfo, facilities, reliefWebData] = await Promise.allSettled([
    lat && lng ? getAreaPopulationInfo(lat, lng, name) : Promise.resolve(null),
    lat && lng ? getNearbyFacilities(lat, lng, 40) : Promise.resolve([]),
    getReliefWebData(query, name),
  ]);

  const popData = populationInfo.status === "fulfilled" ? populationInfo.value : null;
  const facilityList = facilities.status === "fulfilled" ? facilities.value : [];
  const reliefData = reliefWebData.status === "fulfilled" ? reliefWebData.value : null;

  const reportedAffectedPopulation = reliefData?.affectedPopulation
    ? {
        value: reliefData.affectedPopulation,
        status: "confirmed",
        source: "Official disaster report",
      }
    : null;
  const estimatedAffectedPopulation = reportedAffectedPopulation
    || calculateAffectedPopulationEstimate(popData?.population, crisisType, eventData);

  return {
    populationInfo: popData,
    affectedPopulation: estimatedAffectedPopulation,
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
  extractAffectedPopulation,
  calculateAffectedPopulationEstimate,
};
