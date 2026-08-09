import type { LanguageCode, SttResponse } from "@/lib/story/types";

const TARGET_SAMPLE_RATE = 16000;

let activeStop: (() => void) | null = null;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * Records mic audio (webm/opus where available), then resamples to 16 kHz
 * mono and returns a proper 16-bit PCM WAV Blob. Resolves on manual
 * `stopRecording()` or automatically after `maxMs`.
 */
export async function recordAnswer(maxMs = 6000): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: { ideal: TARGET_SAMPLE_RATE },
      echoCancellation: true,
      noiseSuppression: true,
    },
  });

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];

  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () =>
      resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
    recorder.onerror = () => reject(new Error("recording failed"));
  });

  let timer: number | null = null;
  const finish = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
    if (activeStop === finish) activeStop = null;
    if (recorder.state !== "inactive") recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
  };

  activeStop = finish;
  timer = window.setTimeout(finish, maxMs);
  recorder.start();

  try {
    const raw = await recorded;
    return await toWav16kMono(raw);
  } finally {
    finish();
  }
}

/** Stops the in-flight `recordAnswer` early (tap-to-stop). */
export function stopRecording(): void {
  activeStop?.();
}

async function toWav16kMono(blob: Blob): Promise<Blob> {
  const encoded = await blob.arrayBuffer();
  const decodeCtx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(encoded);
  } finally {
    decodeCtx.close().catch(() => undefined);
  }

  const frames = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return wavEncode(rendered.getChannelData(0), TARGET_SAMPLE_RATE);
}

/** Encodes float samples as a mono 16-bit PCM WAV file (RIFF header included). */
export function wavEncode(samples: Float32Array, sampleRate: number): Blob {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate = rate * blockAlign
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(36, "data");
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Uploads a WAV answer to /api/stt and returns the (trimmed) transcript. */
export async function sttUpload(blob: Blob, language: LanguageCode): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "answer.wav");
  form.append("language", language);
  const res = await fetch("/api/stt", { method: "POST", body: form });
  if (!res.ok) throw new Error(`/api/stt failed with HTTP ${res.status}`);
  const data = (await res.json()) as SttResponse;
  return (data.transcript ?? "").trim();
}
