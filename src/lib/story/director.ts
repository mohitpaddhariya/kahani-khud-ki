import type {
  CharacterDef,
  DialogueLine,
  LanguageCode,
  Mood,
  SceneBeat,
  StoryChoice,
  StorySession,
  ThemeDef,
} from "./types";
import { MAX_BEATS, THEMES, resolveTheme } from "./themes";

/**
 * Kahani Khud Ki — the STORY DIRECTOR brain.
 * Pure functions only: builds the LLM chat messages that write the story
 * beat-by-beat, and parses (with aggressive repair) the model's JSON reply
 * into the SceneBeat contract. Transport (fetch) lives in lib/sarvam.ts.
 */

export type DirectorMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Suggested sampling params for the director call; the backend may override.
 * Values match the verified recommendation in docs/sarvam-api.md
 * (sarvam-105b-conversations + JSON mode, temperature 0.7, max_tokens 2000).
 */
export const DIRECTOR_MODEL_HINTS = {
  temperature: 0.7,
  maxTokens: 2000,
} as const;

export class DirectorParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectorParseError";
  }
}

const MOODS = [
  "calm",
  "mystery",
  "tension",
  "adventure",
  "triumph",
  "sad",
] as const satisfies readonly Mood[];

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  "hi-IN": "Hindi, in Devanagari script (हिन्दी)",
  "en-IN": "Indian English, in Latin script",
  "bn-IN": "Bangla, in Bengali script (বাংলা)",
  "ta-IN": "Tamil, in Tamil script (தமிழ்)",
  "te-IN": "Telugu, in Telugu script (తెలుగు)",
  "mr-IN": "Marathi, in Devanagari script (मराठी)",
  "gu-IN": "Gujarati, in Gujarati script (ગુજરાતી)",
  "kn-IN": "Kannada, in Kannada script (ಕನ್ನಡ)",
  "ml-IN": "Malayalam, in Malayalam script (മലയാളം)",
  "pa-IN": "Punjabi, in Gurmukhi script (ਪੰਜਾਬੀ)",
  "od-IN": "Odia, in Odia script (ଓଡ଼ିଆ)",
};

/** Prompt scaffolding stays in English so no Hindi leaks into other-language stories. */
const START_COMMAND = "(Begin the story now.)";

/* ----------------------------- prompt builder ---------------------------- */

/**
 * Builds the full message array for the director LLM:
 * system ruleset → one format-locking few-shot pair → compact turn history
 * (each prior beat as an assistant JSON message, each child reply as a user
 * message) → final request for the next beat with the latest reply verbatim.
 */
export function buildDirectorMessages(
  session: StorySession,
  userReply?: string,
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const theme = resolveTheme(session);
  const childName = session.childName.trim() || "दोस्त";

  const messages: DirectorMessage[] = [
    { role: "system", content: buildSystemPrompt(session, theme, childName) },
    // In-context examples anchor the output language HARD (observed live), so
    // the few-shot must match the session language. Hindi and English ship
    // hand-written examples; other languages rely on the system mandate alone.
    ...(session.language === "hi-IN"
      ? buildFewShotHindi(theme)
      : session.language === "en-IN"
        ? buildFewShotEnglish(theme)
        : []),
  ];

  session.turns.forEach((turn, i) => {
    const content =
      i === 0
        ? START_COMMAND
        : formatReplyMessage(childName, session.turns[i - 1].userReply);
    messages.push({ role: "user", content });
    messages.push({ role: "assistant", content: JSON.stringify(turn.beat) });
  });

  messages.push({
    role: "user",
    content: buildNextBeatRequest(session, childName, userReply),
  });

  return messages;
}

function buildSystemPrompt(
  session: StorySession,
  theme: ThemeDef,
  childName: string,
): string {
  const langLabel = LANGUAGE_LABELS[session.language] ?? session.language;
  const styleNotes: Partial<Record<LanguageCode, string>> = {
    "hi-IN":
      'Use everyday bolchaal Hindi that a 7-year-old giggles at — call the child "तुम", playful and warm, never bookish (say "डर मत", never "भयभीत न हो"). Light English words kids already use (map, rocket, ready, go) are welcome where natural.',
    "gu-IN":
      'Use everyday spoken Gujarati that a 7-year-old giggles at — call the child "તું/તમે" warmly, playful, never bookish. Light English words kids already use (map, rocket, ready, go) are welcome where natural.',
    "en-IN":
      'Use warm, simple Indian English a 7-year-old giggles at — short musical sentences, playful exclamations ("Whoosh!", "Uh-oh!"). No Hindi words except character names.',
  };
  const styleNote =
    styleNotes[session.language] ??
    "Keep vocabulary simple, musical and friendly for ages 5-10; write exactly how a warm storyteller SPEAKS in this language, not how books are written.";

  const castLines = theme.cast
    .map((c) => `- "${c.id}" — ${c.name}: ${c.role}`)
    .join("\n");

  const moodUnion = MOODS.map((m) => `"${m}"`).join(" | ");

  return `You are the STORY DIRECTOR of "Kahani Khud Ki" (कहानी खुद की) — a live, interactive audio drama for one young child (age 5-10). You write the story ONE beat at a time, each beat as a single JSON object. Every line you write is spoken aloud by a distinct TTS character voice. After each beat the child answers OUT LOUD, and you adapt the next beat to whatever they said.

THE SHOW
- Theme: ${theme.emoji} ${theme.title} — ${theme.tagline}
- Premise (a seed — grow it into a full story): ${theme.premise}
- Hero: ${childName}. The story happens around THEM — they are not watching it, they are IN it.
- Language — ABSOLUTE RULE: every output string — every line, question and option — must be written in ${langLabel} and ONLY that language and script (the "scene"/"scene2" fields are the sole exception: always English). The theme premise and cast notes in this briefing are written in Hindi purely as YOUR reference material — they say nothing about the output language. Writing story text in any language other than ${langLabel} is a broken take. Natural SPOKEN register. ${styleNote}
- Length: the whole story is at most ${MAX_BEATS} beats. Each user message tells you which beat you are writing.

THE CAST — use characterId EXACTLY as written here:
${castLines}
Use "narrator" for scene-setting. Keep every other line true to that character's personality and speech style (their signature sounds translate into the target language). Fun sound-words natural to ${langLabel} are encouraged.

DIRECTING RULES
1. Write for the EAR, not the page: short punchy sentences with rhythm. Read every line aloud in your head — if it does not flow, rewrite it. Never prefix a line's text with the speaker's name — the characterId field already says who speaks.
2. ${childName} IS the hero inside the story, and the story speaks TO them. THE GOLDEN RULE OF PERSPECTIVE: the narrator addresses ${childName} ONLY in 2nd person — "तुमने नक्शा उठाया", NEVER "${childName} ने नक्शा उठाया". The name appears only when a CHARACTER calls out to them ("शाबाश ${childName}!") or in a vocative ("${childName}, देखो!"). Writing "${childName} ने/का/को + verb" in narration is a BROKEN TAKE — recheck every narrator line for this before output.
3. Each beat: 5-7 lines, each ≤ 35 words. The narrator ALWAYS speaks line 1. Vary speakers from line to line — no character hogs the beat. Pack in vivid senses — sounds, smells, colors — and land at least one laugh per beat.
3b. CONTINUITY IS SACRED: every beat continues from the EXACT moment and place the previous beat stopped — same scene, same props, same promises. Re-anchor in line 1 by naming where we are and what just happened because of ${childName}'s answer. Never restart the story, never teleport without showing the journey, never drop a thread you opened (a riddle asked must be answered; a gift promised must be given).
4. Safety, always: cartoon-level peril at most (growly tummies, wobbly bridges). NO gore, horror, romance, cruelty, or anything genuinely scary. Kindness and cleverness always win. Villains reform or flee comically — nobody is truly evil.
5. Every NON-ending beat MUST end with "choice": exactly ONE cast character (askedById) turns to ${childName} and asks what to do next, by name. Make it a REAL fork in the plot — 2 meaningfully different options, each ≤ 8 words, with different FLAVORS (one brave, one clever; or one careful, one wild) so the pick says something about the child. The question lives ONLY in the "choice" field — never repeat it as a dialogue line in "lines" (it would be spoken twice).
5b. CLIFFHANGER RULE: the line right before the choice must be a mini-cliffhanger — a strange sound, a sudden glow, something appearing — and the question must be ABOUT that cliffhanger. The child should be bursting to answer.
5c. CALLBACKS: kids adore being remembered. Later beats should reference the child's earlier answers and ideas ("वही जादुई पिज़्ज़ा वाली चाल फिर चलें?") — their words become the story's inside jokes.
6. THE MAGIC RULE: the child's reply steers the plot. If it matches neither option, or is wild and creative ("मैं ड्रैगन को पिज़्ज़ा दूँगा!"), EMBRACE it — make their idea the smartest thing that could have happened, and have a character react to their words with delight, by name. NEVER say or imply "that's not an option". If the reply is empty or unclear, warmly pick one option and move on.
7. Story arc: beat 1 = WORLD-BUILDING + hook: two narrator lines that paint WHERE we are and WHAT time it is with sounds and smells (kids must see the place with their ears), then introduce characters through ACTIONS, then the hook. Middle beats = rising stakes and ONE gentle twist. Final beat = a warm, triumphant ending where the cast celebrates ${childName} BY NAME and every thread is wrapped up — on that beat set "isEnding": true and "choice": null. Never exceed ${MAX_BEATS} beats in total.
${buildPlanSection(session)}
8. Pick "mood" for each beat from the allowed values so it matches the beat's content.
9. Sneak in ONE tiny wonder-fact or new word per beat where it fits the story naturally (why fireflies glow, what an echo is) — school kids love collecting these. One sentence max, never lecture.
10. "scene" and "scene2" fields: TWO picture-book moments in ENGLISH, 1-2 sentences each — "scene" = how the beat OPENS, "scene2" = the beat's turning point or cliffhanger moment (the image switches mid-beat as the story moves). Describe characters by appearance ("a small brown monkey", "a brave school kid"), NEVER by name. Include the place, the action, the light. No text in the image.

OUTPUT FORMAT — CRITICAL
Reply with ONE minified JSON object on a single line. No markdown fences, no comments, no text before or after it. Exact shape:

{
  "mood": ${moodUnion}, // emotional tone of THIS beat
  "lines": [ { "characterId": string, "text": string } ], // 5-7 spoken lines; characterId must be a cast id from above; narrator speaks first; each text ≤ 35 words
  "choice": { "askedById": string, "question": string, "options": [string, string] } | null, // askedById = the cast member who directly asks ${childName}; options = 2 short, genuinely different paths (≤ 8 words each); null ONLY when isEnding is true
  "isEnding": boolean, // true ONLY on the final beat
  "scene": string, // 1-2 ENGLISH sentences: how this beat OPENS, for a picture-book illustrator; characters by appearance, never by name; place + action + light
  "scene2": string // 1-2 ENGLISH sentences: this beat's turning point / cliffhanger moment, same rules
}

If the JSON is malformed the show crashes on stage. JSON only.`;
}

/**
 * One compact few-shot pair that locks the output format and models rule 6
 * (embracing a wild creative reply). Uses the active theme's cast ids so the
 * model never learns wrong ids; the scenario itself is explicitly marked as
 * not being part of the real story.
 */
/**
 * Beat 1 asks the model to also invent a secret plan (one line per remaining
 * beat); later calls inject that plan so the story stops drifting: promises
 * planted early actually pay off, the twist lands where it was planned.
 */
function buildPlanSection(session: StorySession): string {
  if (session.turns.length === 0) {
    return `7b. THE SECRET PLAN: in this first beat's JSON also include "outline" — an array of ${MAX_BEATS - 1} short ENGLISH lines, one per remaining beat, planning the whole story NOW: what rises, where the gentle twist lands, what the ending pays off. Plant something in beat 1 (an object, a sound, a promise) that the finale will pay off. You will follow this plan in later beats while adapting to ${session.childName.trim() || "the child"}'s answers.`;
  }
  if (session.outline?.length) {
    const plan = session.outline
      .map((step, i) => `  beat ${i + 2}: ${step}`)
      .join("\n");
    return `7b. YOUR SECRET PLAN (you wrote this in beat 1 — follow it, bending details to the child's answers but keeping every promise and the planned twist/payoff):\n${plan}`;
  }
  return "";
}

function buildFewShotHindi(theme: ThemeDef): [DirectorMessage, DirectorMessage] {
  const buddy: CharacterDef = theme.cast[1];
  const third: CharacterDef = theme.cast[2];

  const exampleBeat: SceneBeat = {
    mood: "adventure",
    lines: [
      {
        characterId: "narrator",
        text: "तुमने झट से बैग से गरम-गरम जादुई पिज़्ज़ा निकाला! चीज़ की खुशबू पूरे मैदान में फैल गई।",
      },
      {
        characterId: buddy.id,
        text: "वाह गोलू, क्या धमाकेदार आइडिया! देखो-देखो, ड्रैगन की पूँछ खुशी से हिलने लगी!",
      },
      {
        characterId: third.id,
        text: "हम्म… वो बड़ा वाला टुकड़ा मेरा! …मतलब… अगर तुम दो तो, प्लीज़?",
      },
      {
        characterId: third.id,
        text: "पता है गोलू, ड्रैगन आग इसलिए उगलते हैं क्योंकि उनके पेट में चिंगारी-पत्थर होते हैं। और तुमने उसे पिज़्ज़ा दे दिया — जीनियस!",
      },
      {
        characterId: "narrator",
        text: "ड्रैगन ने पिज़्ज़ा खाया, ज़ोरदार डकार ली — और दोस्त बन गया! तभी झाड़ियों के पीछे से कुछ सुनहरा चमका… और एक धीमी घरघराहट सुनाई दी।",
      },
    ],
    choice: {
      askedById: buddy.id,
      question: "गोलू, वो चमकती चीज़़ देखी? अब क्या करें?",
      options: ["चुपके से झाड़ियों के पीछे झाँको!", "ज़ोर से पूछो — कौन है वहाँ?"],
    },
    isEnding: false,
    scene:
      "A brave school kid pulls a steaming magic pizza from a backpack on a grassy meadow at sunset, a huge friendly green dragon leaning in curiously, a small furry companion cheering.",
    scene2:
      "Something golden glinting behind dark bushes at the meadow's edge at dusk, the school kid and the friendly green dragon turning toward it, warm firefly light.",
  };

  return [
    {
      role: "user",
      content:
        'FORMAT EXAMPLE — study the JSON shape and the 2nd-person narration, then forget this mini-story (it is NOT your theme, and if your target language is not Hindi, write YOUR beats entirely in the target language — this example is Hindi only to show the shape). A child named गोलू faced a grumpy dragon. The last question offered "भागो!" or "छुपो!", but गोलू replied: "मैं ड्रैगन को पिज़्ज़ा दूँगा!" — a wild, creative answer. Show the perfect next beat: consequence first, cliffhanger before the choice.',
    },
    { role: "assistant", content: JSON.stringify(exampleBeat) },
  ];
}

function buildFewShotEnglish(theme: ThemeDef): [DirectorMessage, DirectorMessage] {
  const buddy: CharacterDef = theme.cast[1];
  const third: CharacterDef = theme.cast[2];

  const exampleBeat: SceneBeat = {
    mood: "adventure",
    lines: [
      {
        characterId: "narrator",
        text: "Quick as a wink, you pulled a steaming magic pizza out of your bag! The cheesy smell floated all across the meadow.",
      },
      {
        characterId: buddy.id,
        text: "Golu, what a smashing idea! Look, look — the dragon's tail is wagging with joy!",
      },
      {
        characterId: third.id,
        text: "Hmm… the big slice is mine! I mean… only if you share, please?",
      },
      {
        characterId: third.id,
        text: "You know, Golu, dragons breathe fire because of spark-stones in their tummies. And you gave him pizza — genius!",
      },
      {
        characterId: "narrator",
        text: "The dragon gobbled the pizza, let out a giant burp — and became your friend! Just then, something golden glinted behind the bushes… and a low growl rumbled.",
      },
    ],
    choice: {
      askedById: buddy.id,
      question: "Golu, did you see that shiny thing? What now?",
      options: ["Peek behind the bushes quietly!", "Call out — who's there?"],
    },
    isEnding: false,
    scene:
      "A brave school kid pulls a steaming magic pizza from a backpack on a grassy meadow at sunset, a huge friendly green dragon leaning in curiously, a small furry companion cheering.",
    scene2:
      "Something golden glinting behind dark bushes at the meadow's edge at dusk, the school kid and the friendly green dragon turning toward it, warm firefly light.",
  };

  return [
    {
      role: "user",
      content:
        'FORMAT EXAMPLE — study the JSON shape and the 2nd-person narration, then forget this mini-story (it is NOT your theme). A child named Golu faced a grumpy dragon. The last question offered "Run!" or "Hide!", but Golu replied: "I will give the dragon a pizza!" — a wild, creative answer. Show the perfect next beat: consequence first, cliffhanger before the choice.',
    },
    { role: "assistant", content: JSON.stringify(exampleBeat) },
  ];
}

function formatReplyMessage(childName: string, reply?: string): string {
  const trimmed = reply?.trim();
  return trimmed
    ? `${childName}'s spoken reply: "${trimmed}"`
    : "(No reply was heard.)";
}

function buildNextBeatRequest(
  session: StorySession,
  childName: string,
  userReply?: string,
): string {
  const beatNumber = session.turns.length + 1;

  if (session.turns.length === 0) {
    return `${START_COMMAND}

Write beat 1 of ${MAX_BEATS} entirely in ${LANGUAGE_LABELS[session.language]}: hook ${childName} by name in the very first line, then BUILD THE WORLD — two narrator lines rich with place, time, sounds and smells — introduce the characters through what they DO, and end with the first choice. 5-7 lines. Include BOTH "scene" and "scene2" (English) AND the "outline" secret plan (rule 7b). Output ONLY the minified JSON.`;
  }

  const lastTurn = session.turns[session.turns.length - 1];
  const reply = (userReply ?? lastTurn.userReply ?? "").trim();
  const replyLine = reply
    ? `${childName}'s spoken reply: "${reply}"`
    : `(${childName} gave no reply — move the story forward yourself and keep the next question easy.)`;

  const langReminder = `Write entirely in ${LANGUAGE_LABELS[session.language]}.`;
  let guidance: string;
  if (beatNumber >= MAX_BEATS) {
    guidance = `Write beat ${MAX_BEATS} of ${MAX_BEATS} — the FINAL beat. ${langReminder} Continue from the exact moment the last beat stopped, react to the reply, then land a warm, triumphant ending where the cast celebrates ${childName} by name. Set "isEnding": true and "choice": null. Include BOTH "scene" and "scene2" (English).`;
  } else if (beatNumber === MAX_BEATS - 1) {
    guidance = `Write beat ${beatNumber} of ${MAX_BEATS}. ${langReminder} Continue from the exact moment the last beat stopped and show the CONSEQUENCE of the reply in line 1 — if it was creative or off-script, weave it in as a brilliant move. Only one beat remains after this, so steer into the climax now. 5-7 lines, end with a choice, include BOTH "scene" and "scene2" (English).`;
  } else {
    guidance = `Write beat ${beatNumber} of ${MAX_BEATS}. ${langReminder} Continue from the exact moment the last beat stopped and show the CONSEQUENCE of the reply in line 1 — if it was creative or off-script, weave it in as a brilliant move. Raise the stakes a little. 5-7 lines, end with a choice, include BOTH "scene" and "scene2" (English).`;
  }

  return `${replyLine}

${guidance} Output ONLY the minified JSON.`;
}

/* --------------------------------- parser -------------------------------- */

const MAX_LINE_CHARS = 240;
const MAX_OPTION_CHARS = 60;
const MAX_LINES = 8;
const FALLBACK_OPTIONS = ["कुछ और सोचो!", "आगे बढ़ो!"];
const FALLBACK_QUESTION = "अब हमें क्या करना चाहिए?";

/**
 * Parses raw LLM output into a valid SceneBeat, repairing whatever it can:
 * markdown fences and chatter around the JSON, unknown character ids,
 * overlong lines, missing/duplicate options, bad moods, truncated output.
 * Throws DirectorParseError only when no usable JSON object can be recovered.
 *
 * @param validCharacterIds Cast ids of the active theme. Defaults to the
 * union of all theme cast ids; pass the session's cast for strict checking.
 */
export function parseSceneBeat(
  raw: string,
  validCharacterIds?: Iterable<string>,
): SceneBeat {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new DirectorParseError("Director output is empty — nothing to parse.");
  }

  const obj = extractFirstJsonObject(raw);
  const validIds = validCharacterIds
    ? new Set(validCharacterIds)
    : allCharacterIds();

  const isEnding = obj.isEnding === true || obj.isEnding === "true";
  const lines = repairLines(obj.lines, validIds);
  if (lines.length === 0) {
    throw new DirectorParseError(
      "Recovered a JSON object but it contains no usable dialogue lines.",
    );
  }

  const scene = firstString(obj, ["scene", "imagePrompt", "visual"]);
  const scene2 = firstString(obj, ["scene2", "sceneTwo", "visual2"]);
  const outline = repairOutline(obj.outline ?? obj.plan);

  return {
    mood: coerceMood(obj.mood),
    lines,
    choice: isEnding ? null : repairChoice(obj.choice, validIds),
    isEnding,
    ...(scene ? { scene: clampText(scene, 600) } : {}),
    ...(scene2 ? { scene2: clampText(scene2, 600) } : {}),
    ...(outline ? { outline } : {}),
  };
}

function repairOutline(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const steps = value
    .filter((s): s is string => typeof s === "string" && s.trim() !== "")
    .map((s) => clampText(s, 180))
    .slice(0, MAX_BEATS - 1);
  return steps.length > 0 ? steps : null;
}

/**
 * Coerces any characterId not present in `castIds` to "narrator", both in
 * lines and in choice.askedById. parseSceneBeat already does this when given
 * the cast; this standalone helper covers beats from other sources (e.g. the
 * fallback story served under a non-jungle theme).
 */
export function validateBeatAgainstCast(
  beat: SceneBeat,
  castIds: string[],
): SceneBeat {
  const known = new Set(castIds);
  return {
    ...beat,
    lines: beat.lines.map((line) =>
      known.has(line.characterId) ? line : { ...line, characterId: "narrator" },
    ),
    choice:
      beat.choice === null
        ? null
        : known.has(beat.choice.askedById)
          ? beat.choice
          : { ...beat.choice, askedById: "narrator" },
  };
}

let allIdsCache: Set<string> | null = null;
function allCharacterIds(): Set<string> {
  if (!allIdsCache) {
    allIdsCache = new Set<string>();
    for (const theme of Object.values(THEMES)) {
      for (const c of theme.cast) allIdsCache.add(c.id);
    }
  }
  return allIdsCache;
}

function coerceMood(value: unknown): Mood {
  if (typeof value === "string") {
    const m = value.trim().toLowerCase();
    if ((MOODS as readonly string[]).includes(m)) return m as Mood;
  }
  return "adventure";
}

function repairLines(value: unknown, validIds: Set<string>): DialogueLine[] {
  const rawLines = Array.isArray(value) ? value : [];
  const lines: DialogueLine[] = [];

  for (const item of rawLines) {
    let text = "";
    let characterId = "";

    if (typeof item === "string") {
      text = item;
      characterId = "narrator";
    } else if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      text = firstString(o, ["text", "line", "dialogue"]) ?? "";
      characterId =
        firstString(o, ["characterId", "character", "speaker", "id"]) ?? "";
    }

    text = text.trim();
    if (!text) continue;
    if (!validIds.has(characterId)) characterId = "narrator";

    lines.push({ characterId, text: clampText(text, MAX_LINE_CHARS) });
    if (lines.length >= MAX_LINES) break;
  }

  return lines;
}

/**
 * Non-ending beats must carry a question or the interaction loop dead-ends,
 * so a fully missing/broken choice is synthesized rather than dropped.
 */
function repairChoice(value: unknown, validIds: Set<string>): StoryChoice {
  const c =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  let askedById =
    firstString(c, ["askedById", "askedBy", "characterId", "speaker"]) ?? "";
  if (!validIds.has(askedById)) askedById = "narrator";

  const question = clampText(
    firstString(c, ["question", "prompt", "text"]) ?? FALLBACK_QUESTION,
    MAX_LINE_CHARS,
  );

  const rawOptions = Array.isArray(c.options)
    ? c.options
    : Array.isArray(c.answers)
      ? c.answers
      : [];
  const options: string[] = [];
  for (const opt of rawOptions) {
    const text = optionText(opt);
    if (text && !options.includes(text)) {
      options.push(clampText(text, MAX_OPTION_CHARS));
    }
    if (options.length >= 2) break;
  }
  for (const fallback of FALLBACK_OPTIONS) {
    if (options.length >= 2) break;
    if (!options.includes(fallback)) options.push(fallback);
  }

  return { askedById, question, options: [options[0], options[1]] };
}

function optionText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    return (
      firstString(value as Record<string, unknown>, ["text", "label", "option"]) ?? ""
    );
  }
  return "";
}

function firstString(
  obj: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return undefined;
}

const SENTENCE_ENDERS = "।॥.!?…";

/** Clamp to `max` chars, preferring to cut at the last full sentence. */
function clampText(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;

  const window = t.slice(0, max);
  for (let i = window.length - 1; i >= Math.floor(max * 0.4); i--) {
    if (SENTENCE_ENDERS.includes(window[i])) {
      return window.slice(0, i + 1).trim();
    }
  }
  return window.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Finds the first {...} block that parses as a JSON object, ignoring markdown
 * fences and chatter. If the block never closes (token-limit truncation),
 * attempts to close open strings/brackets and parse again.
 */
function extractFirstJsonObject(raw: string): Record<string, unknown> {
  let idx = raw.indexOf("{");
  while (idx !== -1) {
    const scan = scanBalanced(raw, idx);
    const candidates = scan.complete
      ? [scan.text]
      : [repairTruncatedJson(scan.text)];

    for (const candidate of candidates) {
      try {
        const value: unknown = JSON.parse(candidate);
        if (value && typeof value === "object" && !Array.isArray(value)) {
          return value as Record<string, unknown>;
        }
      } catch {
        // Not valid JSON starting at this brace — keep scanning.
      }
    }
    idx = raw.indexOf("{", idx + 1);
  }

  throw new DirectorParseError(
    `No JSON object could be recovered from director output (starts with: ${JSON.stringify(raw.trim().slice(0, 120))}).`,
  );
}

function scanBalanced(
  text: string,
  start: number,
): { text: string; complete: boolean } {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return { text: text.slice(start, i + 1), complete: true };
      }
    }
  }
  return { text: text.slice(start), complete: false };
}

/** Best-effort completion of JSON cut off mid-stream by a token limit. */
function repairTruncatedJson(fragment: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const ch of fragment) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  let repaired = fragment;
  if (escaped) repaired = repaired.slice(0, -1);
  if (inString) repaired += '"';
  repaired = repaired.replace(/[,:\s]+$/, "");
  while (stack.length) repaired += stack.pop();
  return repaired;
}
