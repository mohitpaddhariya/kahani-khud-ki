/**
 * Kahani Khud Ki — shared contracts.
 * This file is the single source of truth for types shared between
 * the story director (LLM), the API routes, and the frontend.
 */

export type ThemeId = "jungle" | "space" | "mela";

/** Built-in theme id, or "custom" when the session carries its own ThemeDef. */
export type ThemeRef = ThemeId | "custom";

export type Mood =
  | "calm"
  | "mystery"
  | "tension"
  | "adventure"
  | "triumph"
  | "sad";

/** BCP-47 style codes used by Sarvam APIs. Hindi is the demo default. */
export type LanguageCode =
  | "hi-IN"
  | "en-IN"
  | "bn-IN"
  | "ta-IN"
  | "te-IN"
  | "mr-IN"
  | "gu-IN"
  | "kn-IN"
  | "ml-IN"
  | "pa-IN"
  | "od-IN";

export interface CharacterDef {
  /** Stable id referenced by DialogueLine.characterId, e.g. "narrator", "villain". */
  id: string;
  /** Display name shown in captions, in the story language, e.g. "सूत्रधार". */
  name: string;
  /** One-line description of personality/voice used in the director prompt. */
  role: string;
  /** Bulbul TTS speaker id, e.g. "abhilash". */
  speaker: string;
  /** Optional TTS pace multiplier (1.0 = normal). */
  pace?: number;
  /** Hex color for UI glow when this character speaks. */
  color: string;
  /** Emoji avatar. */
  emoji: string;
}

export interface ThemeDef {
  id: ThemeId;
  /** Display title in Hindi, e.g. "जंगल का ख़ज़ाना". */
  title: string;
  tagline: string;
  emoji: string;
  /** Full cast including the narrator (id "narrator" required). */
  cast: CharacterDef[];
  /** Story premise for the director prompt. */
  premise: string;
  /**
   * English art bible for the illustrator model: the world's look plus each
   * character's visual appearance, so images stay consistent across beats.
   */
  artDirection: string;
}

export interface DialogueLine {
  characterId: string;
  /** Spoken text in the story language. Keep under ~220 chars for TTS quality. */
  text: string;
}

export interface StoryChoice {
  /** Character who turns to the child and asks. */
  askedById: string;
  /** Question addressed directly to the child, by name. */
  question: string;
  /** Two suggested answers, shown as tap chips and used as STT hints. */
  options: [string, string];
}

export interface SceneBeat {
  mood: Mood;
  lines: DialogueLine[];
  /** null when isEnding is true. */
  choice: StoryChoice | null;
  isEnding: boolean;
  /**
   * 1-2 sentence ENGLISH visual description of this beat's OPENING moment for
   * the illustrator (characters described by appearance, never by name).
   * Optional: purely decorative, the show works without it.
   */
  scene?: string;
  /**
   * Second illustration: the beat's turning point / second half, shown when
   * the narration crosses the midpoint. Optional.
   */
  scene2?: string;
  /**
   * Only on the FIRST beat of a live session: the director's plan for the
   * remaining beats. The client stores it on the session.
   */
  outline?: string[];
}

export interface StoryTurn {
  beat: SceneBeat;
  /** What the child answered (STT transcript or tapped chip). */
  userReply?: string;
}

export interface StorySession {
  childName: string;
  language: LanguageCode;
  themeId: ThemeRef;
  /** Present when themeId === "custom" (teacher-crafted worlds). */
  customTheme?: ThemeDef;
  /**
   * The director's secret story plan, produced with beat 1 (one line per
   * remaining beat). Later beats follow it while adapting to answers.
   */
  outline?: string[];
  turns: StoryTurn[];
}

/* ------------------------- API route contracts ------------------------- */

/** POST /api/scene */
export interface SceneRequest {
  session: StorySession;
  /** Child's answer to the previous beat's choice (omit for the first beat). */
  userReply?: string;
}
export interface SceneResponse {
  beat: SceneBeat;
}

/** POST /api/tts */
export interface TtsRequest {
  text: string;
  speaker: string;
  language: LanguageCode;
  pace?: number;
}
export interface TtsResponse {
  /** Base64-encoded audio. */
  audioBase64: string;
  /** e.g. "audio/wav". */
  mime: string;
}

/**
 * POST /api/stt — multipart/form-data with fields:
 *   audio: Blob (16kHz mono WAV preferred)
 *   language: LanguageCode
 */
export interface SttResponse {
  transcript: string;
  languageCode?: string;
}

/**
 * POST /api/illustrate — provide either a `scene` description (beat-level
 * establishing shot) or a `line` (per-narration-line moment, any language)
 * with optional English `context` for visual continuity.
 */
export interface IllustrateRequest {
  scene?: string;
  line?: {
    /** The spoken story line, in the story language. */
    text: string;
    /** Display name of the speaking character. */
    speaker: string;
  };
  /** English continuity anchor, usually the beat's scene/scene2. */
  context?: string;
  themeId: ThemeRef;
  /** Required when themeId === "custom": the custom theme's art bible. */
  artDirection?: string;
  /**
   * Character/display names to neutralize before prompting the image model —
   * famous names (e.g. अलादीन) trip its content filter even in kids' stories.
   */
  scrub?: string[];
}
export interface IllustrateResponse {
  /** Base64-encoded image. */
  imageBase64: string;
  /** e.g. "image/jpeg". */
  mime: string;
}

/* ----------------------- report card & teacher mode ---------------------- */

export type SkillId =
  | "creativity"
  | "courage"
  | "kindness"
  | "decisiveness"
  | "expression";

export interface SkillScore {
  skill: SkillId;
  /** 1-5. */
  score: number;
  /** One encouraging sentence of evidence, in the report language. */
  note: string;
}

export interface StudentReport {
  /** One warm headline, e.g. "आरव — नन्हा खोजी!". */
  headline: string;
  /** 2-3 sentence overall summary for a parent/teacher. */
  summary: string;
  strengths: string[];
  growthAreas: string[];
  skills: SkillScore[];
  /** Per-question observation. */
  perAnswer: Array<{ question: string; answer: string; note: string }>;
  /** One suggested follow-up activity. */
  nextActivity: string;
}

/** POST /api/report */
export interface ReportRequest {
  session: StorySession;
}
export interface ReportResponse {
  report: StudentReport;
}

/** POST /api/craft-theme — teacher writes a thought, gets a story world. */
export interface CraftThemeRequest {
  /** Teacher's idea/moral/topic, any language, e.g. "पानी बचाओ". */
  thought: string;
  language: LanguageCode;
}
export interface CraftThemeResponse {
  theme: ThemeDef;
}

/** POST /api/adapt-story — teacher's own story becomes a playable drama. */
export interface AdaptStoryRequest {
  /** The teacher's story text (any language), up to ~8000 chars. */
  storyText: string;
  language: LanguageCode;
  /** When true, add a choice question to each beat (classroom interactive). */
  interactive: boolean;
  /** Optional listener name to weave into the telling. */
  childName?: string;
}
export interface AdaptStoryResponse {
  theme: ThemeDef;
  beats: SceneBeat[];
}
