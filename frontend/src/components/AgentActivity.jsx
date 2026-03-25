import { useEffect, useRef } from "react";

const agentIcons = {
  "Monitor Agent": "🔍",
  "Analyzer Agent": "📊",
  "Responder Agent": "🚨",
};

const statusColors = {
  working: "#f59e0b",
  done: "#10b981",
  error: "#ef4444",
};

function AgentActivity({ updates }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [updates]);

  return (
    <div className="card agent-activity">
      <div className="card-header">
        <h2>🤖 Agent Activity</h2>
        <span className="update-count">{updates.length} events</span>
      </div>
      <div className="activity-log" ref={scrollRef}>
        {updates.length === 0 ? (
          <div className="empty-state">
            <p>No agent activity yet. Submit a report to start.</p>
          </div>
        ) : (
          updates.map((update, i) => (
            <div key={i} className={`activity-item ${update.status}`}>
              <div className="activity-icon">
                {agentIcons[update.agent] || "🤖"}
              </div>
              <div className="activity-content">
                <div className="activity-header">
                  <strong>{update.agent}</strong>
                  <span
                    className="status-pill"
                    style={{ backgroundColor: statusColors[update.status] }}
                  >
                    {update.status}
                  </span>
                </div>
                <p>{update.message}</p>
                <span className="activity-time">
                  {new Date(update.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AgentActivity;
