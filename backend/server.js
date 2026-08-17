const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const crisisRoutes = require("./routes/crisis");
const { setSocketIO } = require("./services/autoMonitor");

const app = express();
const server = http.createServer(app);

// CORS origins - add your Vercel URL after deployment
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.FRONTEND_URL,  // Add your Vercel URL in env
].filter(Boolean);

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
});

// Middleware
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Make io accessible in routes and auto-monitor
app.set("io", io);
setSocketIO(io);

// Routes
app.use("/api/crisis", crisisRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Crisis Response API is running" });
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Connect to MongoDB (optional) and start server
const PORT = process.env.PORT || 5000;

function startServer(dbStatus) {
  server.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT} ${dbStatus}`);
    console.log(`   API: http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/\n`);
  });
}

if (process.env.MONGODB_URI && process.env.MONGODB_URI !== "mongodb+srv://username:password@cluster.mongodb.net/crisis-response") {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("[MongoDB] ✅ Connected successfully");
      startServer("(with database)");
    })
    .catch((err) => {
      console.warn(`[MongoDB] ⚠ Connection failed: ${err.message}`);
      console.log("[MongoDB] Running without database — incidents won't be saved");
      startServer("(no database)");
    });
} else {
  console.log("[MongoDB] No MONGODB_URI configured — running without database");
  startServer("(no database)");
}
