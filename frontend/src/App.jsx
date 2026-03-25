import { useState, useEffect } from "react";
import io from "socket.io-client";
import Dashboard from "./components/Dashboard";
import ReportForm from "./components/ReportForm";
import AgentActivity from "./components/AgentActivity";
import CrisisMap from "./components/CrisisMap";
import IncidentList from "./components/IncidentList";
import LiveDataFeed from "./components/LiveDataFeed";
import AutoMonitor from "./components/AutoMonitor";
import ReasoningChain from "./components/ReasoningChain";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

function App() {
  const [agentUpdates, setAgentUpdates] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [currentIncident, setCurrentIncident] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [reasoningChain, setReasoningChain] = useState([]);
  const [activeTab, setActiveTab] = useState("report");

  useEffect(() => {
    socket.on("agentUpdate", (data) => {
      setAgentUpdates((prev) => [...prev, { ...data, timestamp: new Date() }]);
    });

    socket.on("newIncident", (incident) => {
      setIncidents((prev) => [incident, ...prev]);
      setCurrentIncident(incident);
    });

    socket.on("reasoningUpdate", (data) => {
      setReasoningChain(data.chain);
    });

    fetch(`${API_URL}/api/crisis/incidents`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setIncidents(data);
      })
      .catch(() => {});

    return () => {
      socket.off("agentUpdate");
      socket.off("newIncident");
      socket.off("reasoningUpdate");
    };
  }, []);

  const handleSubmitReport = async (report) => {
    setProcessing(true);
    setAgentUpdates([]);
    setCurrentIncident(null);
    setReasoningChain([]);

    try {
      const res = await fetch(`${API_URL}/api/crisis/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      });
      const data = await res.json();
      if (data.incident) {
        setCurrentIncident(data.incident);
      }
      if (data.details?.reasoningChain) {
        setReasoningChain(data.details.reasoningChain);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">🛡️</span>
            <h1>CrisisAI</h1>
          </div>
          <span className="tagline">Multi-Agent Autonomous Crisis Response System</span>
        </div>
        <div className="header-right">
          <div className={`status-badge ${processing ? "active" : "idle"}`}>
            <span className="status-dot"></span>
            {processing ? "Agents Working" : "System Ready"}
          </div>
        </div>
      </header>

      <div className="tab-bar">
        <button className={`tab ${activeTab === "report" ? "active" : ""}`} onClick={() => setActiveTab("report")}>
          📡 Manual Report
        </button>
        <button className={`tab ${activeTab === "live" ? "active" : ""}`} onClick={() => setActiveTab("live")}>
          🌍 Live Data
        </button>
        <button className={`tab ${activeTab === "auto" ? "active" : ""}`} onClick={() => setActiveTab("auto")}>
          🛰️ Auto Monitor
        </button>
      </div>

      <main className="app-main">
        <div className="left-panel">
          {activeTab === "report" && <ReportForm onSubmit={handleSubmitReport} processing={processing} />}
          {activeTab === "live" && <LiveDataFeed />}
          {activeTab === "auto" && <AutoMonitor socket={socket} />}
          <AgentActivity updates={agentUpdates} />
        </div>

        <div className="right-panel">
          <CrisisMap incidents={incidents} currentIncident={currentIncident} />
          <ReasoningChain chain={reasoningChain} />
          <Dashboard currentIncident={currentIncident} />
        </div>
      </main>

      <IncidentList incidents={incidents} onSelect={setCurrentIncident} />
    </div>
  );
}

export default App;
