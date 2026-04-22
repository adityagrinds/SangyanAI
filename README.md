# SangyanAI

SangyanAI is a multi-agent crisis response platform that monitors live events, analyzes severity, and generates actionable response plans in real time.

## Overview

The system combines:

- Live earthquake data from USGS
- Weather context from Open-Meteo
- A three-stage AI pipeline powered by Groq
- Real-time updates via Socket.IO

It is designed for fast incident intake, transparent reasoning, and coordinated response suggestions.

## Core Features

- Three-agent workflow: Monitor -> Analyzer -> Responder
- Manual crisis report processing
- Automated earthquake monitoring with scheduler support
- Interactive incident map and live activity feed
- Incident history management with MongoDB
- Real-time frontend updates through WebSockets

## Architecture

Frontend:

- React + Vite application
- Incident dashboard, report form, map, and live feeds
- Socket.IO client for real-time events

Backend:

- Node.js + Express API
- Agent orchestration and response generation
- MongoDB persistence for incidents and memory context
- External integrations: USGS, Open-Meteo, Groq

## Tech Stack

- Frontend: React, Vite, Leaflet, Socket.IO Client
- Backend: Node.js, Express, Mongoose, Socket.IO, node-cron
- AI: Groq SDK (LLaMA family models)
- Database: MongoDB Atlas

## Prerequisites

- Node.js 18 or higher
- MongoDB Atlas connection string
- Groq API key

## Quick Start

### 1) Clone

```bash
git clone https://github.com/adityagrinds/SangyanAI.git
cd SangyanAI
```

### 2) Backend Setup

```bash
cd backend
npm install
```

Create backend env file at backend/.env:

```env
GROQ_API_KEY=your_groq_api_key_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crisis-response
PORT=5000
FRONTEND_URL=http://localhost:5173
```

Run backend:

```bash
npm run dev
```

### 3) Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
```

Create frontend env file at frontend/.env:

```env
VITE_API_URL=http://localhost:5000
```

Run frontend:

```bash
npm run dev
```

### 4) Open the App

Visit http://localhost:5173

## Daily Run (After First Setup)

You do not need to run npm install every time.

- Terminal 1:

```bash
cd backend
npm run dev
```

- Terminal 2:

```bash
cd frontend
npm run dev
```

Run npm install again only when dependencies change or node_modules is removed.

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | /api/crisis/process | Process a report through all agents |
| GET | /api/crisis/live-data | Get combined live crisis data |
| GET | /api/crisis/earthquakes | Fetch recent earthquake data |
| POST | /api/crisis/auto-monitor/start | Start autonomous monitor |
| POST | /api/crisis/auto-monitor/stop | Stop autonomous monitor |
| GET | /api/crisis/auto-monitor/status | Get monitor status |
| GET | /api/crisis/incidents | List incidents |
| GET | /api/crisis/incidents/:id | Get incident details |
| DELETE | /api/crisis/incidents/:id | Delete incident |

## Scripts

Backend (backend/package.json):

- npm run dev -> start with nodemon
- npm start -> start with node

Frontend (frontend/package.json):

- npm run dev -> start Vite dev server
- npm run build -> production build
- npm run preview -> preview production build

## Suggested Project Structure

```text
SangyanAI/
    backend/
        agents/
        config/
        models/
        routes/
        services/
        server.js
    frontend/
        src/
            components/
        index.html
```

## Troubleshooting

- Backend fails to start:
    - Check backend/.env values
    - Verify MongoDB URI and Groq key
- Frontend cannot call API:
    - Confirm frontend/.env has VITE_API_URL=http://localhost:5000
    - Ensure backend is running on port 5000
- Port conflicts:
    - Change PORT in backend/.env and update frontend VITE_API_URL accordingly

## License

This project is licensed under the MIT License.
