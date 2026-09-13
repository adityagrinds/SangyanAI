import { useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const LANGUAGES = [
  ["hi-IN", "Hindi"],
  ["en-IN", "English / Hinglish"],
  ["bn-IN", "Bengali"],
  ["gu-IN", "Gujarati"],
  ["kn-IN", "Kannada"],
  ["ml-IN", "Malayalam"],
  ["mr-IN", "Marathi"],
  ["pa-IN", "Punjabi"],
  ["ta-IN", "Tamil"],
  ["te-IN", "Telugu"],
];

const SAMPLE_REPORTS = [
  "M7.2 earthquake near Gaziantep, Turkey. Multiple mid-rise buildings pancaked, people trapped, power and telecom down across central districts.",
  "Monsoon flooding in Sylhet, Bangladesh. Brahmaputra has overtopped embankments; remote villages unreachable, thousands displaced, urgent need for boats and dry food.",
  "Wildfire in Redding, California growing towards residential edge. 7,000 acres burned, red-flag winds forecast this evening, spot fires jumping Highway 44, evacuations in progress.",
  "Chemical plant explosion in Navi Mumbai industrial zone. Toxic plume moving south with wind, reports of respiratory distress, local EMS overwhelmed, shelter-in-place advised.",
  "Category 4 cyclone making landfall near Beira, Mozambique. Storm surge expected, low-lying neighborhoods already flooding, hospital generators at risk.",
  "Flash floods in Dubai after record cloudburst. Major arteries submerged, cars stranded, airport diversions ongoing, metro partially suspended.",
  "Tornado outbreak near Tulsa, Oklahoma. Multiple touchdowns, debris on highways, power lines down, injuries reported, sirens active.",
  "Epidemic cluster in Lagos informal settlements. Rapid spike in cholera-like symptoms, local clinics short on IV fluids and ORS.",
  "Dam breach risk on the Paraná River near Corrientes, Argentina. Upstream levels rising fast, downstream towns alerted, livestock evacuation underway.",
  "Landslide in Shimla, India after heavy rain. Hill road cut off, tourist buses stranded, risk of secondary slides, search teams requested.",
  "Heatwave in Seville, Spain. Grid stress warnings issued, elderly care homes reporting heat illnesses, cooling centers requested.",
];

function ReportForm({ onSubmit, processing, voiceSummary, onSpeak }) {
  const [report, setReport] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [language, setLanguage] = useState("hi-IN");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (report.trim() && !processing) {
      onSubmit(report.trim());
    }
  };

  const loadSample = () => {
    const random = SAMPLE_REPORTS[Math.floor(Math.random() * SAMPLE_REPORTS.length)];
    setReport(random);
  };

  const encodeWav = async (blob) => {
    const audioContext = new AudioContext();
    try {
      const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer());
      const channelCount = Math.min(decoded.numberOfChannels, 2);
      const frameCount = decoded.length;
      const bytesPerSample = 2;
      const wav = new ArrayBuffer(44 + frameCount * channelCount * bytesPerSample);
      const view = new DataView(wav);
      const writeString = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
      const write16 = (offset, value) => view.setUint16(offset, value, true);
      const write32 = (offset, value) => view.setUint32(offset, value, true);
      writeString(0, "RIFF");
      write32(4, 36 + frameCount * channelCount * bytesPerSample);
      writeString(8, "WAVE");
      writeString(12, "fmt ");
      write32(16, 16);
      write16(20, 1);
      write16(22, channelCount);
      write32(24, decoded.sampleRate);
      write32(28, decoded.sampleRate * channelCount * bytesPerSample);
      write16(32, channelCount * bytesPerSample);
      write16(34, 16);
      writeString(36, "data");
      write32(40, frameCount * channelCount * bytesPerSample);
      const channels = Array.from({ length: channelCount }, (_, index) => decoded.getChannelData(index));
      let offset = 44;
      for (let frame = 0; frame < frameCount; frame += 1) {
        for (let channel = 0; channel < channelCount; channel += 1) {
          const sample = Math.max(-1, Math.min(1, channels[channel][frame]));
          view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
          offset += 2;
        }
      }
      return new Blob([wav], { type: "audio/wav" });
    } finally {
      await audioContext.close();
    }
  };

  const toggleRecording = async () => {
    setVoiceError("");
    if (recording) {
      recorderRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError("Microphone recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setTranscribing(true);
        try {
          const recordedAudio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const audio = await encodeWav(recordedAudio);
          const formData = new FormData();
          formData.append("audio", audio, "sangyan-report.wav");
          formData.append("language", language);
          const response = await fetch(`${API_URL}/api/voice/transcribe`, { method: "POST", body: formData });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Transcription failed");
          setReport((current) => `${current} ${data.text}`.trim());
        } catch (error) {
          setVoiceError(error.message);
        } finally {
          setTranscribing(false);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (error) {
      setVoiceError(error.name === "NotAllowedError" ? "Microphone permission is required." : error.message);
    }
  };

  return (
    <div className="card report-form">
      <div className="card-header">
        <h2>Crisis Report Input</h2>
        <button className="btn-secondary" onClick={loadSample} disabled={processing}>
          Load Sample
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={report}
          onChange={(e) => setReport(e.target.value)}
          placeholder="Enter a crisis report, news article, or emergency description..."
          rows={5}
          disabled={processing}
        />
        <div className="voice-actions">
          <select value={language} onChange={(event) => setLanguage(event.target.value)} disabled={recording || transcribing || processing}>
            {LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
          <button className="btn-secondary" type="button" onClick={toggleRecording} disabled={processing || transcribing}>
            {recording ? "⏹ Stop & Transcribe" : transcribing ? "⌛ Transcribing..." : "🎙 Speak Report"}
          </button>
          {voiceSummary && (
            <button className="btn-secondary" type="button" onClick={onSpeak} disabled={processing}>
              🔊 Read Response
            </button>
          )}
        </div>
        {voiceError && <p className="voice-error">{voiceError}</p>}
        <button className="btn-primary" type="submit" disabled={processing || !report.trim()}>
          {processing ? (
            <>
              <span className="spinner"></span> Agents Processing...
            </>
          ) : (
            "🚀 Deploy Agents"
          )}
        </button>
      </form>
    </div>
  );
}

export default ReportForm;
