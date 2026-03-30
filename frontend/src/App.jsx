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
  const [showLanding, setShowLanding] = useState(true);
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

    socket.on("incidentDeleted", ({ id }) => {
      setIncidents((prev) => prev.filter((inc) => inc._id !== id));
      setCurrentIncident((prev) => (prev?._id === id ? null : prev));
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
      socket.off("incidentDeleted");
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

  const handleDeleteIncident = async (id) => {
    try {
      await fetch(`${API_URL}/api/crisis/incidents/${id}`, { method: "DELETE" });
      setIncidents((prev) => prev.filter((inc) => inc._id !== id));
      setCurrentIncident((prev) => (prev?._id === id ? null : prev));
    } catch (err) {
      console.error("Failed to delete incident", err);
    }
  };

  const handleHeroCta = () => {
    setShowLanding(false);
    setActiveTab("report");
    requestAnimationFrame(() => {
      const el = document.getElementById("main-content");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const handleBackToLanding = () => {
    setShowLanding(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (showLanding) {
    return (
      <div className="landing">
        <div className="landing-bg"></div>
        <div className="landing-ink"></div>
        <div className="landing-particles"></div>
        <header className="landing-header">
          <div className="logo">
            <span className="logo-icon">🛡️</span>
            <h1>SANGYAN AI</h1>
          </div>
        </header>
        <main className="landing-content">
          <p className="eyebrow">Welcome to our</p>
          <h1 className="landing-title">
            <span>SANGYAN</span>
            <span>AI</span>
            <span>Response</span>
            <span>Studio</span>
          </h1>
          <p className="landing-sub">
            Live, factual, multi-agent disaster intelligence with breathtaking clarity. Monitor, analyze, and respond before the world even blinks.
          </p>
          <div className="landing-actions">
            <button className="btn-primary hero-btn" onClick={handleHeroCta}>
              Let&apos;s revolutionize
            </button>
            <button className="ghost-btn" onClick={handleHeroCta}>Take a tour</button>
          </div>
        </main>
        <div className="landing-social">
          <span>⬤</span>
          <span>◎</span>
          <span>◉</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">🛡️</span>
            <h1>SANGYAN AI</h1>
          </div>
          <span className="tagline">Multi-Agent Autonomous Crisis Response System</span>
        </div>
        <div className="header-right">
          <button className="ghost-btn small" onClick={handleBackToLanding}>◀ Back</button>
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

      <main className="app-main" id="main-content">
        <div className="left-panel">
          {activeTab === "report" && (
            <>
              <ReportForm onSubmit={handleSubmitReport} processing={processing} />
              <AgentActivity updates={agentUpdates} />
            </>
          )}
          {activeTab === "live" && <LiveDataFeed />}
          {activeTab === "auto" && <AutoMonitor socket={socket} />}
        </div>

        <div className="right-panel">
          <CrisisMap incidents={incidents} currentIncident={currentIncident} />
          {activeTab === "report" && <ReasoningChain chain={reasoningChain} />}
          {activeTab === "report" && <Dashboard currentIncident={currentIncident} />}
        </div>
      </main>

      <IncidentList incidents={incidents} onSelect={setCurrentIncident} onDelete={handleDeleteIncident} />
    </div>
  );
}

export default App;
