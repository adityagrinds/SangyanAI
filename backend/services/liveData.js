const axios = require("axios");

// USGS Earthquake API - completely free, no key needed
async function getRecentEarthquakes(minMagnitude = 4) {
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=${minMagnitude}&limit=10&orderby=time`;
  const { data } = await axios.get(url);

  return data.features.map((eq) => ({
    id: eq.id,
    title: eq.properties.title,
    magnitude: eq.properties.mag,
    place: eq.properties.place,
    time: new Date(eq.properties.time),
    tsunami: eq.properties.tsunami === 1,
    lat: eq.geometry.coordinates[1],
    lng: eq.geometry.coordinates[0],
    depth: eq.geometry.coordinates[2],
    url: eq.properties.url,
  }));
}

// Open-Meteo Weather API - completely free, no key needed
async function getWeatherAlerts(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=3`;
  const { data } = await axios.get(url);

  const severeWeatherCodes = [65, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];
  const currentCode = data.current?.weather_code;

  return {
    current: {
      temperature: data.current?.temperature_2m,
      windSpeed: data.current?.wind_speed_10m,
      weatherCode: currentCode,
      isSevere: severeWeatherCodes.includes(currentCode),
      description: getWeatherDescription(currentCode),
    },
    forecast: data.daily,
    location: { lat, lng },
  };
}

function getWeatherDescription(code) {
  const descriptions = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Depositing rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    67: "Freezing rain", 71: "Slight snowfall", 73: "Moderate snowfall",
    75: "Heavy snowfall", 77: "Snow grains",
    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    85: "Slight snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
  };
  return descriptions[code] || "Unknown";
}

// Fetch global disaster data combining earthquake + weather for major cities
async function getGlobalCrisisData() {
  const earthquakes = await getRecentEarthquakes(4);

  // Get weather for affected earthquake areas
  const enrichedQuakes = [];
  for (const eq of earthquakes.slice(0, 5)) {
    try {
      const weather = await getWeatherAlerts(eq.lat, eq.lng);
      enrichedQuakes.push({ ...eq, weather: weather.current });
    } catch {
      enrichedQuakes.push(eq);
    }
  }

  return {
    earthquakes: enrichedQuakes,
    timestamp: new Date(),
    source: "USGS + Open-Meteo",
  };
}

module.exports = { getRecentEarthquakes, getWeatherAlerts, getGlobalCrisisData };
