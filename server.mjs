import express from "express";
import cors from "cors";
import multer from "multer";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import dns from "node:dns/promises";
import net from "node:net";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "*").split(",").map(s => s.trim()).filter(Boolean);
const ALLOWED_MEDIA_HOSTS = (process.env.ALLOWED_MEDIA_HOSTS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const CACHE_DIR = path.resolve(".caption-cache");

await fs.mkdir(CACHE_DIR, { recursive: true });

app.use(cors({
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error("Origin not allowed"));
  }
}));
app.use(express.json({ limit: "4mb" }));
app.use(express.static("public"));

const upload = multer({
  dest: path.join(os.tmpdir(), "xitution-uploads"),
  limits: { fileSize: 800 * 1024 * 1024 }
});

function requireApiKey() {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured on the server.");
}

function sha(text) {
  return createHash("sha256").update(text).digest("hex");
}

function isPrivateIPv4(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some(Number.isNaN)) return false;
  return p[0] === 10 ||
    p[0] === 127 ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) ||
    p[0] === 0;
}
function isPrivateIPv6(ip) {
  const x = ip.toLowerCase();
  return x === "::1" || x.startsWith("fe80:") || x.startsWith("fc") || x.startsWith("fd");
}
async function assertSafeRemoteUrl(raw) {
  const u = new URL(raw);
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only http/https media URLs are allowed.");
  if (["localhost", "localhost.localdomain"].includes(u.hostname.toLowerCase())) throw new Error("Local addresses are not allowed.");
  if (ALLOWED_MEDIA_HOSTS.length && !ALLOWED_MEDIA_HOSTS.some(h => u.hostname.toLowerCase() === h || u.hostname.toLowerCase().endsWith("." + h))) {
    throw new Error(`Media host not allowed: ${u.hostname}`);
  }
  if (net.isIP(u.hostname)) {
    if ((net.isIPv4(u.hostname) && isPrivateIPv4(u.hostname)) || (net.isIPv6(u.hostname) && isPrivateIPv6(u.hostname))) {
      throw new Error("Private network addresses are not allowed.");
    }
  } else {
    const addrs = await dns.lookup(u.hostname, { all: true });
    for (const a of addrs) {
      if ((a.family === 4 && isPrivateIPv4(a.address)) || (a.family === 6 && isPrivateIPv6(a.address))) {
        throw new Error("Resolved media host points to a private network.");
      }
    }
  }
  return u;
}

async function runFfmpeg(args) {
  return await new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", d => err += d.toString());
    p.on("error", reject);
    p.on("close", code => code === 0 ? resolve() : reject(new Error(`ffmpeg failed (${code}): ${err.slice(-3000)}`)));
  });
}

async function downloadToFile(url, outPath) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Could not download video: ${res.status} ${res.statusText}`);
  const len = Number(res.headers.get("content-length") || 0);
  if (len && len > 800 * 1024 * 1024) throw new Error("Video is larger than 800 MB.");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 800 * 1024 * 1024) throw new Error("Video is larger than 800 MB.");
  await fs.writeFile(outPath, buf);
}

async function extractAudioChunks(inputPath, dir) {
  // 10-minute mono MP3 chunks: small enough for reliable upload and good speech recognition.
  const pattern = path.join(dir, "chunk-%03d.mp3");
  await runFfmpeg([
    "-y", "-i", inputPath,
    "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k",
    "-f", "segment", "-segment_time", "600", "-reset_timestamps", "1",
    pattern
  ]);
  const files = (await fs.readdir(dir))
    .filter(x => /^chunk-\d+\.mp3$/.test(x))
    .sort()
    .map(x => path.join(dir, x));
  if (!files.length) throw new Error("No audio track could be extracted.");
  return files;
}

async function openAITranscribe(filePath) {
  requireApiKey();
  const bytes = await fs.readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "audio/mpeg" }), path.basename(filePath));
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.append("temperature", "0");

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form
  });
  if (!r.ok) throw new Error(`Transcription failed: ${r.status} ${await r.text()}`);
  return await r.json();
}

async function transcribeMediaFile(mediaPath) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "xitution-cap-"));
  try {
    const chunks = await extractAudioChunks(mediaPath, dir);
    const segments = [];
    let language = null;
    for (let i = 0; i < chunks.length; i++) {
      const tr = await openAITranscribe(chunks[i]);
      language ||= tr.language || null;
      const offset = i * 600;
      for (const s of (tr.segments || [])) {
        const text = String(s.text || "").trim();
        if (!text) continue;
        segments.push({
          start: Number(s.start || 0) + offset,
          end: Number(s.end || 0) + offset,
          text
        });
      }
    }
    return { language, segments };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function extractResponseText(obj) {
  let out = "";
  for (const item of (obj.output || [])) {
    for (const c of (item.content || [])) {
      if (c.type === "output_text" && typeof c.text === "string") out += c.text;
    }
  }
  return out.trim();
}

const LANGUAGE_NAMES = {
  original: "Original",
  de: "Deutsch",
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  it: "Italiano",
  zh: "中文",
  ar: "العربية",
  tr: "Türkçe",
  pl: "Polski",
  ru: "Русский",
  ja: "日本語",
  ko: "한국어",
  nl: "Nederlands",
  cs: "Čeština",
  ro: "Română"
};

async function translateBatch(texts, target) {
  requireApiKey();
  const targetName = LANGUAGE_NAMES[target] || target;
  const input = [
    `Translate each subtitle item into ${targetName}.`,
    `Return ONLY a valid JSON array of strings.`,
    `Keep exactly ${texts.length} items in exactly the same order.`,
    `Do not add commentary. Preserve names and medical/technical terminology accurately.`,
    `Items:`,
    JSON.stringify(texts)
  ].join("\n");

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      input
    })
  });
  if (!r.ok) throw new Error(`Translation failed: ${r.status} ${await r.text()}`);
  const data = await r.json();
  let text = extractResponseText(data).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const arr = JSON.parse(text);
  if (!Array.isArray(arr) || arr.length !== texts.length) throw new Error("Translation returned an unexpected format.");
  return arr.map(String);
}

async function translateSegments(segments, target) {
  if (!target || target === "original") return segments;
  const out = [];
  const batchSize = 40;
  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize);
    const translated = await translateBatch(batch.map(s => s.text), target);
    batch.forEach((s, idx) => out.push({ ...s, text: translated[idx] }));
  }
  return out;
}

async function cacheRead(key) {
  try { return JSON.parse(await fs.readFile(path.join(CACHE_DIR, key + ".json"), "utf8")); }
  catch { return null; }
}
async function cacheWrite(key, data) {
  await fs.writeFile(path.join(CACHE_DIR, key + ".json"), JSON.stringify(data), "utf8");
}

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "Xitution Universal Subtitles",
    version: "1.0.0",
    api_key_configured: Boolean(OPENAI_API_KEY),
    ffmpeg: Boolean(ffmpegPath)
  });
});

app.post("/api/captions/url", async (req, res) => {
  let tempDir;
  try {
    const { videoUrl } = req.body || {};
    if (!videoUrl) return res.status(400).json({ error: "videoUrl is required" });

    const safe = await assertSafeRemoteUrl(videoUrl);
    const key = sha("source:" + safe.href);
    const cached = await cacheRead(key);
    if (cached) return res.json({ ...cached, cached: true });

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "xitution-url-"));
    const media = path.join(tempDir, "video.bin");
    await downloadToFile(safe.href, media);
    const result = await transcribeMediaFile(media);
    await cacheWrite(key, result);
    res.json({ ...result, cached: false });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  } finally {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

app.post("/api/captions/upload", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "video file is required" });
    const fingerprint = sha(`${req.file.originalname}:${req.file.size}:${req.file.mimetype}`);
    const key = "upload-" + fingerprint;
    const cached = await cacheRead(key);
    if (cached) return res.json({ ...cached, cached: true });
    const result = await transcribeMediaFile(req.file.path);
    await cacheWrite(key, result);
    res.json({ ...result, cached: false });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  } finally {
    if (req.file?.path) await fs.rm(req.file.path, { force: true }).catch(() => {});
  }
});

app.post("/api/captions/translate", async (req, res) => {
  try {
    const { sourceId, segments, target } = req.body || {};
    if (!Array.isArray(segments)) return res.status(400).json({ error: "segments must be an array" });
    if (!target) return res.status(400).json({ error: "target is required" });

    const key = sha(`translate:${sourceId || sha(JSON.stringify(segments))}:${target}`);
    const cached = await cacheRead(key);
    if (cached) return res.json({ segments: cached.segments, cached: true });

    const translated = await translateSegments(segments, target);
    const data = { segments: translated };
    await cacheWrite(key, data);
    res.json({ ...data, cached: false });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`Xitution Universal Subtitles listening on :${PORT}`);
});
