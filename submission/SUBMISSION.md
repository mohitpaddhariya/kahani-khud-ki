# Hackathon Submission — Kahani Khud Ki

## Project Title

**कहानी खुद की (Kahani Khud Ki) — The story whose hero is YOU**

## Brief Description

Kahani Khud Ki is a live, interactive, self-illustrating AI audio drama for
children (ages 5-10) in 11 Indian languages — radio drama × Bandersnatch × a
picture book that draws itself.

A child types their name, touches a world, and steps *inside* the story. An AI
director (Sarvam-105B) writes the tale beat by beat around them; every
character speaks with its own distinct voice (Bulbul v3); every narration line
paints its own storybook illustration (Nano Banana 2 Lite); and at each turn a
character looks at the child, asks them — by name — what to do next, and
listens to their spoken answer (Saaras v3). There are no wrong answers: say
something wild ("मैं ड्रैगन को पिज़्ज़ा दूँगा!") and the director makes it the
smartest thing that could have happened.

## Key Features

- **The child is IN the story** — named, spoken to, and listened to; the plot
  visibly bends to their answers, with cliffhangers before every question and
  callbacks to their earlier ideas.
- **A cast, not a voice** — each character is cast onto a distinct Bulbul v3
  speaker with its own pace; the narrator opens every scene.
- **A picture book that draws itself** — one illustration per narration line,
  generated live with a per-world art bible for consistent characters.
- **Plan-driven storytelling** — the director writes a secret story outline in
  beat 1 (twist, payoff) and follows it while adapting, so promises planted
  early actually pay off.
- **Zero-wait forks** — while a chapter plays, BOTH possible next chapters are
  speculatively generated; answering starts the next beat in ~2 seconds.
- **11 Indian languages** — story, voices, and questions in all 11; full UI
  chrome in Hindi, Gujarati, and English.
- **Teacher mode** — type a thought ("पानी बचाओ") and get a full custom story
  world in seconds, or upload any .txt story (Aladdin, Panchatantra, your own)
  and hear it performed multi-voice with comprehension questions.
- **Student report card** — after any story, an evidence-based report scores 5
  skills (creativity, courage, kindness, decisiveness, expression) from the
  child's actual answers, with growth areas framed kindly and a suggested next
  activity.
- **Engineered for a live stage** — a hand-written fallback story means the
  show cannot die; tap-chips back up the mic; name-scrubbing defeats image
  content filters for famous tales; production build is clean.

## Tech Stack

Sarvam-105B (chat, JSON mode) · Saaras v3 (STT) · Bulbul v3 (TTS, 37 voices) ·
Nano Banana 2 Lite / gemini-3.1-flash-lite-image (illustrations) · Next.js,
TypeScript, Tailwind v4, framer-motion.

## Links

- **GitHub Repository**: https://github.com/mohitpaddhariya/kahani-khud-ki
- **Project Deployment**: —
- **Demo Video**: —
- **Presentation**: `submission/Kahani-Khud-Ki.pptx` (also PDF) in the repository
