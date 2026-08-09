# Sarvam API — verified integration contract (Aug 9, 2026)

All facts below were verified with live calls using our key (probe artifacts in `tmp/`).
Auth for every endpoint: header `api-subscription-key: $SARVAM_API_KEY` (read from `.env.local`).

| Capability | Endpoint | Model |
|---|---|---|
| Story director (chat) | `POST https://api.sarvam.ai/v1/chat/completions` | `sarvam-105b-conversations` |
| Character voices (TTS) | `POST https://api.sarvam.ai/text-to-speech` | `bulbul:v3` |
| Child's answer (STT) | `POST https://api.sarvam.ai/speech-to-text` (multipart) | `saaras:v3` (default) / `saaras:v4` |

## Chat — story director

Winning request (verified: clean minified JSON content, `reasoning_content: null`):

```json
{
  "model": "sarvam-105b-conversations",
  "response_format": { "type": "json_object" },
  "temperature": 0.7,
  "max_tokens": 2000,
  "messages": [
    { "role": "system", "content": "... director rules, reply JSON only ..." },
    { "role": "user", "content": "..." }
  ]
}
```

Gotchas (all verified):
- `sarvam-m` is deprecated. Available: `sarvam-105b`, `sarvam-105b-conversations`.
- `sarvam-105b` is a REASONING model: it fills `message.reasoning_content` and can return
  `message.content: null` when `max_tokens` is small, and wraps JSON in ```json fences even
  when it answers. Do not use it for latency-sensitive JSON generation.
- `sarvam-105b-conversations` does not emit reasoning and honors
  `response_format: {"type":"json_object"}` → exact parseable JSON. Use this.
- `reasoning_effort` accepts only `low | medium | high` (no `none`); unnecessary with the
  conversations model — omit it.
- Streaming (`"stream": true`) works (SSE); not needed for v1.

## TTS — Bulbul v3

Request we use (per line of dialogue):

```json
{
  "model": "bulbul:v3",
  "text": "नमस्ते! जंगल में तुम्हारा स्वागत है।",
  "language_code": "hi-IN",
  "speaker": "varun",
  "pace": 1.0,
  "temperature": 0.8,
  "output_audio_codec": "mp3",
  "speech_sample_rate": 24000
}
```

Response: `{ "request_id": "...", "audios": ["<base64>"] }` — one base64 string per input text.
Default codec is WAV (PCM16 mono 24 kHz, verified with `file`/`afinfo`); we request `mp3`
(~10× smaller, browser-playable) to cut transfer latency.

Rules (verified + doc):
- `pitch` and `loudness` → HTTP 400 on v3 ("currently not supported"). Only `pace` (0.5–2.0)
  and `temperature` (0.01–2.0, default 0.6; higher = more expressive) work.
- Max 2500 chars per request. Case-sensitive lowercase speaker names.
- Languages: `bn-IN, en-IN, gu-IN, hi-IN, kn-IN, ml-IN, mr-IN, od-IN, pa-IN, ta-IN, te-IN`.
- Numbers >4 digits: write with commas ("10,000") for correct pronunciation.

Full bulbul:v3 speaker list (37):
`shubh` (default), `aditya`, `ritu`, `priya`, `neha`, `rahul`, `pooja`, `rohan`, `simran`,
`kavya`, `amit`, `dev`, `ishita`, `shreya`, `ratan`, `varun`, `manan`, `sumit`, `roopa`,
`kabir`, `aayan`, `ashutosh`, `advait`, `anand`, `tanya`, `tarun`, `sunny`, `mani`, `gokul`,
`vijay`, `shruti`, `suhani`, `mohit`, `kavitha`, `rehan`, `soham`, `rupali`.
Verified audible output for: `varun`, `priya`, `ishita`, `shubh`, `mani`.
(v2-only speakers — anushka/abhilash/manisha/vidya/arya/karun/hitesh — must NOT be used with v3.)

Casting shortlist (name-gender inference; confirm by ear during integration):
- Warm narrator (M): `anand` or `varun`
- Villain-ish (M): `kabir` or `ratan`
- Energetic sidekick: `aayan` / `sunny` (M) or `kavya` (F)
- Young female lead: `priya` or `ishita`
- Wise elder (F): `roopa` or `kavitha`

## STT — Saaras

Multipart form fields:
- `file` (required) — the audio. Accepted (verified): WAV, MP3, **WebM** (browser
  MediaRecorder output works as-is — no WAV conversion needed). Docs also list AAC, OGG,
  OPUS, FLAC, M4A, AMR, WMA, PCM. Best at 16 kHz; REST endpoint is for clips < 30 s.
- `model` (optional) — `saaras:v3` (default) or `saaras:v4`. Both verified.
- `mode` (optional, v3 only) — `transcribe` (default) | `translate` | `verbatim` |
  `translit` | `codemix`.
- `language_code` (optional) — BCP-47 or `unknown` for auto-detect (verified:
  returns `language_code` + `language_probability`, e.g. hi-IN @ 0.998).

Response: `{ "request_id", "transcript", "language_code", "language_probability?" }`

Round-trip proof: Bulbul-generated "नमस्ते, जंगल में आपका स्वागत है।" → Saaras transcript
came back verbatim (see `tmp/stt-wav-v4.json`, `tmp/stt-webm-v3.json`).

## App recommendations

- Director: `sarvam-105b-conversations`, JSON mode, temperature 0.7, max_tokens 2000.
- TTS: `bulbul:v3` + `output_audio_codec: "mp3"`, temperature 0.8 for drama, per-character
  `pace`; keep each dialogue line ≤ 240 chars.
- STT: post the raw MediaRecorder WebM blob with `model: saaras:v3`, explicit
  `language_code` from the session (fall back to `unknown`).
- Other endpoints (not used in v1): `/translate`, `/transliterate`, `/text-lid`;
  TTS also has REST-stream and WebSocket variants if we later want token-level streaming.
