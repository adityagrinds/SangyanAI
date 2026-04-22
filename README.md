<![CDATA[<div align="center">

# 🛡️ SANGYAN AI

### Multi-Agent Autonomous Crisis Response System

_Live, factual, multi-agent disaster intelligence with breathtaking clarity._
_Monitor, analyze, and respond — before the world even blinks._

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-F55036?style=for-the-badge)](https://groq.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## 📖 About

**SANGYAN AI** is an autonomous, multi-agent crisis response dashboard that detects, analyzes, and generates response plans for real-world disasters in real time. It combines live seismic data from **USGS**, weather intelligence from **Open-Meteo**, and the reasoning power of **LLaMA 3.3 70B via Groq** to deliver actionable intelligence through a pipeline of three specialized AI agents.

> **Built for hackathons. Designed for real impact.**

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🤖 **3-Agent AI Pipeline** | Monitor → Analyzer → Responder chain processes crises end-to-end |
| 🌍 **Live Earthquake Feed** | Real-time data from USGS Earthquake API (no API key needed) |
| 🌦️ **Weather Intelligence** | Open-Meteo integration enriches crisis data with local weather conditions |
| 🗺️ **Interactive Crisis Map** | Leaflet-powered map with real-time incident markers and geo-location |
| 🧠 **Agent Memory System** | Historical incident retrieval gives agents context from past crises |
| 🔗 **Transparent Reasoning Chain** | Full visibility into how each agent thinks and passes data |
| 🛰️ **Autonomous Auto-Monitor** | Cron-based scanner automatically detects and processes new earthquakes |
| ⚡ **Real-time Updates** | Socket.IO pushes agent activity, incidents, and alerts live to the UI |
| 📡 **Manual Report Submission** | Submit free-text crisis reports for instant AI-powered analysis |
| 🗑️ **Incident Management** | View, select, and delete incidents with real-time sync across clients |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │  Report   │ │  Live    │ │  Auto    │ │  Crisis Map   │  │
│  │  Form     │ │  Data    │ │  Monitor │ │  (Leaflet)    │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────────────┘  │
│       │             │            │                           │
│  ┌────┴─────────────┴────────────┴──────────────────────┐   │
│  │              Socket.IO Client + REST API             │   │
│  └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js + Express)               │
│                                                             │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │  Monitor    │──▶│  Analyzer    │──▶│  Responder      │  │
│  │  Agent      │   │  Agent       │   │  Agent          │  │
│  │ (Detect)    │   │ (Assess)     │   │ (Plan)          │  │
│  └──────┬──────┘   └──────┬───────┘   └────────┬────────┘  │
│         │                 │                     │           │
│         ▼                 ▼                     ▼           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Groq API  (LLaMA 3.3 70B Versatile)        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Memory      │  │  Auto        │  │  Live Data       │  │
│  │  System      │  │  Monitor     │  │  Service         │  │
│  │ (Past Ctx)   │  │ (Cron Jobs)  │  │ (USGS+Weather)   │  │
│  └──────┬───────┘  └──────────────┘  └──────────────────┘  │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              MongoDB Atlas (Incidents)                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🤖 The Agent Pipeline

### 1. 🔍 Monitor Agent
> _"Is this a crisis?"_

Scans incoming reports (manual or automated) and determines if a crisis exists. Extracts structured data including crisis type, location with coordinates, and confidence score.

### 2. 📊 Analyzer Agent
> _"How bad is it?"_

Performs deep severity analysis — estimates affected population, identifies risk factors, immediate threats, potential escalation scenarios, and assigns a priority level (1–10). Leverages historical memory for better assessments.

### 3. 🚨 Responder Agent
> _"What do we do?"_

Generates a concrete response plan with specific action steps, required resources (hospitals, shelters, fire stations, NGOs), targeted alerts with urgency levels, evacuation recommendations, and coordination notes.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB** Atlas cluster (free tier works)
- **Groq API Key** — [Get one free at groq.com](https://console.groq.com)

### 1. Clone the Repository

```bash
git clone https://github.com/adityagrinds/CrisisAI.git
cd CrisisAI
```

### 2. Set Up the Backend

```bash
cd backend
npm install
```

Create a `.env` file:

```env
GROQ_API_KEY=your_groq_api_key_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crisis-response
PORT=5000
FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
npm run dev
```

### 3. Set Up the Frontend

```bash
cd frontend
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

### 4. Open the App

Navigate to **[http://localhost:5173](http://localhost:5173)** and you're live. 🎉

---

## 📁 Project Structure

```
CrisisAI/
├── backend/
│   ├── agents/
│   │   ├── monitorAgent.js      # Crisis detection agent
│   │   ├── analyzerAgent.js     # Severity analysis agent
│   │   └── responderAgent.js    # Response planning agent
│   ├── config/
│   │   └── groq.js              # Groq SDK + LLaMA 3.3 config
│   ├── models/
│   │   └── Incident.js          # Mongoose incident schema
│   ├── routes/
│   │   └── crisis.js            # All API endpoints
│   ├── services/
│   │   ├── autoMonitor.js       # Cron-based autonomous scanner
│   │   ├── liveData.js          # USGS + Open-Meteo integrations
│   │   └── memory.js            # Historical incident memory
│   ├── server.js                # Express + Socket.IO entry point
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AgentActivity.jsx    # Live agent status feed
│   │   │   ├── AutoMonitor.jsx      # Auto-scan control panel
│   │   │   ├── CrisisMap.jsx        # Leaflet interactive map
│   │   │   ├── Dashboard.jsx        # Incident detail dashboard
│   │   │   ├── IncidentList.jsx     # Historical incident list
│   │   │   ├── LiveDataFeed.jsx     # Real-time earthquake feed
│   │   │   ├── ReasoningChain.jsx   # Agent reasoning visualizer
│   │   │   └── ReportForm.jsx       # Manual report submission
│   │   ├── App.jsx                  # Main app with routing
│   │   ├── App.css                  # Full design system
│   │   └── main.jsx                 # React entry point
│   └── .env.example
├── .gitignore
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/crisis/process` | Process a crisis report through all 3 agents |
| `GET` | `/api/crisis/live-data` | Fetch live global crisis data (earthquakes + weather) |
| `GET` | `/api/crisis/earthquakes` | Get recent earthquakes from USGS |
| `POST` | `/api/crisis/auto-monitor/start` | Start autonomous earthquake monitoring |
| `POST` | `/api/crisis/auto-monitor/stop` | Stop autonomous monitoring |
| `GET` | `/api/crisis/auto-monitor/status` | Check auto-monitor status |
| `GET` | `/api/crisis/incidents` | List all saved incidents |
| `GET` | `/api/crisis/incidents/:id` | Get a single incident by ID |
| `DELETE` | `/api/crisis/incidents/:id` | Delete an incident |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 8, TypeScript, Leaflet, Socket.IO Client |
| **Backend** | Node.js, Express 4, Socket.IO, Mongoose, node-cron |
| **AI / LLM** | Groq SDK → LLaMA 3.3 70B Versatile |
| **Database** | MongoDB Atlas |
| **Live Data** | USGS Earthquake API, Open-Meteo Weather API |
| **Real-time** | WebSockets via Socket.IO |

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for crisis response**

_SANGYAN AI — Because every second counts._

</div>
]]>
