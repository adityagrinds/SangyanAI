import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function LiveDataFeed() {
  const [earthquakes, setEarthquakes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchLiveData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/crisis/earthquakes?min_mag=4`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setEarthquakes(data);
        setLastFetch(new Date());
      }
    } catch (err) {
      console.error("Failed to fetch live data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
  }, []);

  return (
    <div className="card live-feed">
      <div className="card-header">
        <h2>🌍 Live Earthquake Feed</h2>
        <button className="btn-secondary" onClick={fetchLiveData} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>
      <div className="live-feed-content">
        {lastFetch && (
          <div className="feed-meta">
            Last updated: {lastFetch.toLocaleTimeString()} • Source: USGS
          </div>
        )}
        {earthquakes.length === 0 ? (
          <div className="empty-state"><p>No recent earthquakes found.</p></div>
        ) : (
          <div className="quake-list">
            {earthquakes.map((eq, i) => (
              <div key={eq.id || i} className={`quake-item ${eq.magnitude >= 6 ? "severe" : eq.magnitude >= 5 ? "moderate" : ""}`}>
                <div className="quake-mag">
                  <span className={`mag-badge mag-${Math.floor(eq.magnitude)}`}>
                    {eq.magnitude.toFixed(1)}
                  </span>
                </div>
                <div className="quake-info">
                  <strong>{eq.title}</strong>
                  <span className="quake-meta">
                    {new Date(eq.time).toLocaleString()} • Depth: {eq.depth?.toFixed(1)}km
                    {eq.tsunami && <span className="tsunami-badge">⚠️ TSUNAMI</span>}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveDataFeed;
