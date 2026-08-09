# कहानी खुद की — Kahani Khud Ki

**The story whose hero is YOU.** An interactive, multi-voice AI audio drama for children in
Indian languages — powered end-to-end by [Sarvam AI](https://www.sarvam.ai).

A child gives their name, picks a world, and the show begins: an AI director writes the story
beat-by-beat, every character speaks with a *distinct* Bulbul voice, **every chapter paints
itself** — a live storybook illustration generated per beat — and at the end of each beat a
character turns to the child and asks them — **by name** — what to do next. The child answers
out loud. The story adapts. Say something wild ("मैं ड्रैगन को पिज़्ज़ा दूँगा!") and the
director doesn't refuse — it makes your idea the smartest thing that could have happened.

Radio drama × Bandersnatch × a picture book that draws itself. Not a voice assistant — a new medium.

## Why this wins the whitespace

Pocket FM / Kuku FM proved 200M+ Indians pay for audio drama — but everything they ship is
**linear and pre-recorded**. Nobody has shipped a live, voice-interactive drama where the
listener is *inside* the story, in their mother tongue. That's this.

## How it works

```
child speaks ──▶ Saaras v3 (STT, accepts raw browser WebM)
                     │ transcript
                     ▼
        Sarvam-105B-conversations (JSON mode)      ← "the director"
        writes the next SceneBeat as strict JSON
        (incl. an English "scene" description per beat)
              │ lines per character      │ every line + scene context
              ▼                          ▼
        Bulbul v3 (TTS)          Nano Banana 2 Lite
        one distinct voice       (gemini-3.1-flash-lite-image)
        per character, MP3,      paints ONE illustration PER NARRATION
        line N+1 prefetched      LINE (staggered lookahead) — the book
        while N plays            literally draws itself as it speaks
                     │
                     ▼
        theatrical stage: full-bleed illustration backdrop,
        glowing cast rail, caption panel, WebAudio ambience
```

**Zero-wait forks:** while a beat's audio is still playing, BOTH possible next
beats (one per option) are speculatively generated in the background — tapping
a chip or saying an option starts the next chapter in under ~2s. Off-script
creative answers (the magic moments) generate fresh.

**Languages:** the story, voices and questions follow the selected language for
all 11 options (the director enforces script — verified for Gujarati and Hindi).
UI chrome (labels, buttons, cast names, theme cards) is fully localized for
Hindi, Gujarati and English; other languages get English chrome with a fully
localized story.

**Planned stories, not drift:** beat 1 also produces a secret outline (rising
stakes, the planned twist, the payoff). Later beats follow the plan while
bending to the child's answers — promises planted in beat 1 pay off in the
finale.

## Teacher mode 🧑‍🏫

- **Thought → world**: a teacher writes an idea ("पानी बचाओ") and gets a full
  custom story world — cast, voices, art bible — that runs the normal
  interactive loop (`/api/craft-theme`).
- **Upload a story**: paste or upload a .txt of the teacher's own story and the
  app performs it — multi-voice, illustrated, with optional comprehension
  questions per chapter (`/api/adapt-story`, scripted playback).
- **Student report card**: after any story, one tap generates a localized,
  evidence-based report from the child's actual answers — five skill scores
  (creativity, courage, kindness, decisiveness, expression), strengths, growth
  areas framed positively, per-answer notes, and a suggested next activity
  (`/api/report`).

- **Director**: `src/lib/story/director.ts` — system prompt with the "magic rule"
  (embrace off-script answers), strict JSON schema, robust parse-and-repair.
- **Themes & cast**: `src/lib/story/themes.ts` — 3 worlds (जंगल का ख़ज़ाना, चाँद का रहस्य,
  जादुई मेला), narrator + 3 characters each, cast onto verified Bulbul v3 speakers.
- **Demo insurance**: `src/lib/story/fallback.ts` — a complete hand-written 5-beat story
  is served automatically if the LLM ever fails. The show cannot die on stage.
- **API contract**: `docs/sarvam-api.md` — every endpoint/param verified with live calls.

## Run it

```bash
npm install
cat > .env.local <<EOF
SARVAM_API_KEY=<your sarvam key>
GEMINI_API_KEY=<your gemini key>
EOF
npm run dev
# open http://localhost:3000
```

Requires a [Sarvam API key](https://dashboard.sarvam.ai) (₹100 free credits on signup)
and a [Gemini API key](https://aistudio.google.com) for illustrations (the show runs
without it — beats just keep the mood-gradient backdrop).

## Demo script (2 minutes)

1. Ask a judge their name (or a kid's name). Type it. Pick 🌴 जंगल का ख़ज़ाना.
2. Let beat 1 play — point out each character speaking with its own voice, the glowing
   cast rail, the child's name inside the story.
3. At the choice, hand the judge the mic: tell them to say something that is NOT one of
   the two options. The wilder the better.
4. Beat 2 opens with the cast celebrating *their* idea by name. That's the wow.
5. Mention: 11 languages in the selector, same engine.

**Stage tips**
- Noisy venue / flaky mic? Flip on **टैप मोड** on the setup screen — answers become tap
  chips, the drama is unchanged.
- Wi-Fi dies mid-demo? The fallback story takes over silently on the next beat.
- Use a wired speaker; the character voices are the show.

## Stack

Next.js (App Router, TypeScript, Tailwind v4, framer-motion) · Sarvam
`sarvam-105b-conversations` (chat, JSON mode) · `bulbul:v3` (TTS, 37 voices) ·
`saaras:v3` (STT) · Nano Banana 2 Lite `gemini-3.1-flash-lite-image`
(per-beat illustrations) · WebAudio ambience synth (no audio assets anywhere).

## Roadmap

- Streaming beats: token-stream the director + Bulbul WebSocket for near-zero gaps
- Pronunciation dictionaries for character catchphrases
- "Story so far" recap audio to resume yesterday's adventure
- Parent dashboard: per-child story archive as an illustrated storybook PDF
