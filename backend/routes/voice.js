const express = require("express");
const multer = require("multer");
const { transcribeAudio, synthesizeSpeech } = require("../services/voice");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = ["audio/webm", "audio/wav", "audio/mpeg", "audio/ogg", "audio/mp4", "audio/x-m4a"];
    callback(null, allowed.includes(file.mimetype));
  },
});

router.post("/transcribe", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Audio file is required" });
  }

  try {
    const result = await transcribeAudio({
      buffer: req.file.buffer,
      originalname: req.file.originalname || "recording.webm",
      mimetype: req.file.mimetype,
      language: req.body.language,
    });
    res.json({ text: result.transcript, language: req.body.language || "hi-IN", requestId: result.request_id });
  } catch (error) {
    const providerMessage = error.response?.data?.message || error.response?.data?.error;
    console.error("[Voice] STT failed:", providerMessage || error.message);
    res.status(error.message === "GNANI_API_KEY is not configured" ? 503 : 502).json({
      error: providerMessage || "Speech transcription failed",
    });
  }
});

router.post("/synthesize", async (req, res) => {
  const { text, language, voice } = req.body;
  if (!text || typeof text !== "string" || text.length > 5000) {
    return res.status(400).json({ error: "Text is required and must be under 5000 characters" });
  }

  try {
    const audio = await synthesizeSpeech({ text: text.trim(), language, voice });
    res.set("Content-Type", audio.headers["content-type"] || "audio/wav");
    res.send(Buffer.from(audio.data));
  } catch (error) {
    const providerMessage = Buffer.isBuffer(error.response?.data)
      ? error.response.data.toString("utf8")
      : error.response?.data?.message || error.response?.data?.error;
    console.error("[Voice] TTS failed:", providerMessage || error.message);
    res.status(error.message === "GNANI_API_KEY is not configured" ? 503 : 502).json({
      error: providerMessage || "Speech synthesis failed",
    });
  }
});

module.exports = router;
