const axios = require("axios");
const FormData = require("form-data");

const GNANI_API_KEY = process.env.GNANI_API_KEY;
const GNANI_STT_URL = "https://api.vachana.ai/stt/v3";
const GNANI_TTS_URL = "https://api.vachana.ai/api/v1/tts/inference";

function requireApiKey() {
  if (!GNANI_API_KEY) {
    throw new Error("GNANI_API_KEY is not configured");
  }
}

async function transcribeAudio({ buffer, originalname, mimetype, language }) {
  requireApiKey();

  const form = new FormData();
  form.append("audio_file", buffer, { filename: originalname, contentType: mimetype });
  form.append("language_code", language || "hi-IN");
  form.append("format", "transcribe");

  const response = await axios.post(GNANI_STT_URL, form, {
    headers: {
      ...form.getHeaders(),
      "X-API-Key-ID": GNANI_API_KEY,
    },
    maxContentLength: 15 * 1024 * 1024,
    maxBodyLength: 15 * 1024 * 1024,
    timeout: 45000,
  });

  if (!response.data?.transcript) {
    throw new Error("Gnani STT returned no transcript");
  }

  return response.data;
}

async function synthesizeSpeech({ text, language, voice }) {
  requireApiKey();

  const response = await axios.post(
    GNANI_TTS_URL,
    {
      text,
      voice: voice || "Nalini",
      model: "timbre-v2.5",
      language: language || "hi-IN",
      speed: 1,
      audio_config: {
        encoding: "linear_pcm",
        container: "wav",
        num_channels: 1,
        sample_rate: 48000,
        sample_width: 2,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key-ID": GNANI_API_KEY,
      },
      responseType: "arraybuffer",
      timeout: 45000,
    }
  );

  return response;
}

module.exports = { transcribeAudio, synthesizeSpeech };
