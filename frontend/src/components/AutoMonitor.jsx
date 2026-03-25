import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function AutoMonitor({ socket }) {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Check current status
    fetch(`${API_URL}/api/crisis/auto-monitor/status`)
      .then((res) => res.json())
      .then((data) => setIsRunning(data.isRunning))
      .catch(() => {});

    // Listen for auto-monitor events
    socket.on("autoMonitor", (data) => {
      setLogs((prev) => [...prev.slice(-20), { ...data, timestamp: new Date() }]);
    });

    return () => socket.off("autoMonitor");
  }, [socket]);

  const toggleMonitor = async () => {
    const endpoint = isRunning ? "stop" : "start";
    try {
      const res = await fetch(`${API_URL}/api/crisis/auto-monitor/${endpoint}`, { method: "POST" });
      const data = await res.json();
      setIsRunning(data.status === "started" || data.status === "already running");
    } catch (err) {
      console.error("Failed to toggle auto-monitor:", err);
    }
  };

  return (
    <div className="card auto-monitor">
      <div className="card-header">
        <h2>🛰️ Auto Monitor</h2>
        <button className={`btn-monitor ${isRunning ? "running" : ""}`} onClick={toggleMonitor}>
          <span className={`monitor-dot ${isRunning ? "active" : ""}`}></span>
          {isRunning ? "ACTIVE" : "START"}
        </button>
      </div>
      <div className="monitor-content">
        {!isRunning && logs.length === 0 ? (
          <div className="empty-state">
            <p>Enable auto-monitoring to let agents autonomously scan for real-time crisis events worldwide.</p>
          </div>
        ) : (
          <div className="monitor-logs">
            {logs.map((log, i) => (
              <div key={i} className={`monitor-log ${log.type}`}>
                <span className="log-message">{log.message}</span>
                <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AutoMonitor;
