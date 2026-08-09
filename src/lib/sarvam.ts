import "server-only";

import type { LanguageCode } from "@/lib/story/types";

/**
 * Thin server-side client for the three Sarvam endpoints we use.
 * Contracts verified live — see docs/sarvam-api.md.
 */

const API_BASE = "https://api.sarvam.ai";

function apiKey(): string {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error("SARVAM_API_KEY is not set");
  return key;
}

async function sarvamFetch(
  path: string,
  init: RequestInit,
  timeoutMs: number,
  retries = 1,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          "api-subscription-key": apiKey(),
          ...(init.headers ?? {}),
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      // Retry once on transient server errors, never on 4xx.
      if (res.status >= 500 && attempt < retries) {
        lastError = new Error(`Sarvam ${path} responded ${res.status}`);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt >= retries) break;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Sarvam ${path} failed`);
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Story director call: sarvam-105b-conversations with JSON mode gives clean,
 * fence-free JSON content and no reasoning_content detour.
 */
export async function directorChat(
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const res = await sarvamFetch(
    "/v1/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sarvam-105b-conversations",
        response_format: { type: "json_object" },
        temperature: opts?.temperature ?? 0.7,
        max_tokens: opts?.maxTokens ?? 2000,
        messages,
      }),
    },
    60_000,
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Sarvam chat failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Sarvam chat returned empty content");
  return content;
}

/**
 * Bulbul v3 synthesis. MP3 output for ~10x smaller payloads than WAV.
 * pitch/loudness are NOT sent (HTTP 400 on v3); pace must stay in [0.5, 2.0].
 */
export async function synthesize(params: {
  text: string;
  speaker: string;
  language: LanguageCode;
  pace?: number;
}): Promise<{ audioBase64: string; mime: string }> {
  const pace = Math.min(2, Math.max(0.5, params.pace ?? 1));
  const res = await sarvamFetch(
    "/text-to-speech",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "bulbul:v3",
        text: params.text.slice(0, 2400),
        language_code: params.language,
        speaker: params.speaker,
        pace,
        temperature: 0.8,
        output_audio_codec: "mp3",
        speech_sample_rate: 24000,
      }),
    },
    30_000,
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Sarvam TTS failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { audios?: string[] };
  const audio = data.audios?.[0];
  if (!audio) throw new Error("Sarvam TTS returned no audio");
  return { audioBase64: audio, mime: "audio/mpeg" };
}

/**
 * Saaras STT. Browser MediaRecorder WebM blobs are accepted as-is (verified).
 */
export async function transcribe(params: {
  audio: Blob;
  language?: LanguageCode | "unknown";
  filename?: string;
}): Promise<{ transcript: string; languageCode?: string }> {
  const form = new FormData();
  form.append("file", params.audio, params.filename ?? "answer.webm");
  form.append("model", "saaras:v3");
  form.append("mode", "transcribe");
  form.append("language_code", params.language ?? "unknown");

  const res = await sarvamFetch(
    "/speech-to-text",
    { method: "POST", body: form },
    30_000,
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Sarvam STT failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    transcript?: string;
    language_code?: string | null;
  };
  return {
    transcript: data.transcript ?? "",
    languageCode: data.language_code ?? undefined,
  };
}
