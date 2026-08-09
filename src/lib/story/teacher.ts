import { parseSceneBeat } from "./director";
import type {
  AdaptStoryRequest,
  AdaptStoryResponse,
  CharacterDef,
  LanguageCode,
  SceneBeat,
  SkillId,
  StudentReport,
  StorySession,
  ThemeDef,
} from "./types";

type TeacherMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  "hi-IN": "Hindi in Devanagari",
  "en-IN": "Indian English",
  "bn-IN": "Bangla in Bengali script",
  "ta-IN": "Tamil in Tamil script",
  "te-IN": "Telugu in Telugu script",
  "mr-IN": "Marathi in Devanagari",
  "gu-IN": "Gujarati in Gujarati script",
  "kn-IN": "Kannada in Kannada script",
  "ml-IN": "Malayalam in Malayalam script",
  "pa-IN": "Punjabi in Gurmukhi",
  "od-IN": "Odia in Odia script",
};

const SKILLS: SkillId[] = [
  "creativity",
  "courage",
  "kindness",
  "decisiveness",
  "expression",
];

const FEMALE_SPEAKERS = [
  "priya",
  "ishita",
  "kavya",
  "roopa",
  "kavitha",
  "ritu",
  "neha",
  "pooja",
  "simran",
  "shreya",
  "tanya",
  "shruti",
  "suhani",
  "rupali",
] as const;

const MALE_SPEAKERS = [
  "varun",
  "anand",
  "kabir",
  "ratan",
  "aayan",
  "sunny",
  "shubh",
  "aditya",
  "rahul",
  "rohan",
  "amit",
  "dev",
  "manan",
  "sumit",
  "ashutosh",
  "advait",
  "tarun",
  "gokul",
  "vijay",
  "mohit",
  "rehan",
  "soham",
] as const;

const VALID_SPEAKERS = new Set<string>([
  ...FEMALE_SPEAKERS,
  ...MALE_SPEAKERS,
]);
const DEFAULT_SPEAKERS = ["varun", "kavya", "kabir", "ishita"] as const;
const DEFAULT_COLORS = ["#f59e0b", "#34d399", "#60a5fa", "#f472b6"] as const;

export const TEACHER_MODEL_HINTS = {
  report: { temperature: 0.5, maxTokens: 2048 },
  craftTheme: { temperature: 0.8, maxTokens: 2000 },
  // The starter Sarvam subscription rejects any max_tokens value above 2048.
  adaptStory: { temperature: 0.6, maxTokens: 2048 },
} as const;

function languageLabel(language: LanguageCode): string {
  return LANGUAGE_LABELS[language];
}

function answeredTurns(session: StorySession) {
  return session.turns.flatMap((turn) => {
    const answer = turn.userReply?.trim();
    const question = turn.beat.choice?.question?.trim();
    return answer && question ? [{ question, answer }] : [];
  });
}

export function buildReportMessages(session: StorySession): TeacherMessage[] {
  const answers = answeredTurns(session);
  const evidence =
    answers.length > 0
      ? answers
          .map(
            (item, index) =>
              `${index + 1}. Question: ${JSON.stringify(item.question)}\n   Child's verbatim answer: ${JSON.stringify(item.answer)}`,
          )
          .join("\n")
      : "(The child gave no answered choices.)";

  return [
    {
      role: "system",
      content: `You write warm, evidence-based learning reports for parents and teachers of children aged 5-10.
Return exactly one JSON object, with no markdown. Write every human-facing string in ${languageLabel(session.language)}.
Be encouraging and specific, never diagnostic or judgmental. Every observation must be grounded in the supplied answer evidence. Quote or clearly reference the actual question and verbatim answer.
Use exactly five skills: creativity, courage, kindness, decisiveness, expression. Give honest integer scores from 1 to 5; do not give all five skills a score of 5. Frame growth areas as inviting opportunities that can bloom further, never as negative labels.
The perAnswer array must have exactly one item for every supplied answered choice, in the same order. Preserve each question and answer verbatim and add a one-sentence evidence note.
BE CONCISE — this is a card, not an essay: headline ≤ 8 words; summary ≤ 2 sentences; each strength/growth item ≤ 8 words (max 3 each); each skill note ONE short sentence (≤ 18 words); each perAnswer note ≤ 15 words; nextActivity ≤ 25 words.
If there are no answers, praise the child's listening gently, use mostly score 3, return an empty perAnswer array, and explain that more spoken answers will unlock richer insights.
Exact shape:
{"headline":string,"summary":string,"strengths":string[],"growthAreas":string[],"skills":[{"skill":"creativity"|"courage"|"kindness"|"decisiveness"|"expression","score":1|2|3|4|5,"note":string}],"perAnswer":[{"question":string,"answer":string,"note":string}],"nextActivity":string}`,
    },
    {
      role: "user",
      content: `Child: ${session.childName.trim() || "the child"}
Report language: ${languageLabel(session.language)}
Theme: ${session.customTheme?.title?.trim() || session.themeId}

ANSWER EVIDENCE
${evidence}

Write the parent/teacher report now. Weave the child's ACTUAL words naturally into notes where it helps; never write placeholder letters like X or Y, and never repeat the full question inside a note (the card already shows it). JSON only.`,
    },
  ];
}

export function parseStudentReport(
  raw: string,
  session: StorySession,
): StudentReport {
  const obj = extractJsonObject(raw);
  const answers = answeredTurns(session);
  const rawSkills = asArray(obj.skills);
  const skills = SKILLS.map((skill, index) => {
    const found = rawSkills.find(
      (item) => asObject(item)?.skill === skill,
    );
    const skillObj = asObject(found);
    return {
      skill,
      score: clampScore(skillObj?.score),
      note:
        stringValue(skillObj?.note) ||
        neutralSkillNote(session.language, session.childName),
    };
  });

  if (skills.every((skill) => skill.score === 5)) {
    skills.find((skill) => skill.skill === "decisiveness")!.score = 4;
  }
  if (answers.length === 0) {
    skills.forEach((skill, index) => {
      skill.score = index === 0 ? 4 : 3;
    });
  }

  const modelPerAnswer = asArray(obj.perAnswer);
  const perAnswer = answers.map((answer, index) => {
    const item = asObject(modelPerAnswer[index]);
    return {
      question: answer.question,
      answer: answer.answer,
      note:
        stringValue(item?.note) ||
        neutralAnswerNote(session.language, session.childName),
    };
  });

  const strengths = stringArray(obj.strengths);
  const growthAreas = stringArray(obj.growthAreas);
  if (answers.length === 0) {
    if (strengths.length === 0) strengths.push(listeningStrength(session.language));
    if (growthAreas.length === 0)
      growthAreas.push(moreAnswersOpportunity(session.language));
  }

  return {
    headline:
      stringValue(obj.headline) ||
      `${session.childName.trim() || "Child"} — a thoughtful listener!`,
    summary:
      stringValue(obj.summary) ||
      noAnswerSummary(session.language, session.childName),
    strengths,
    growthAreas,
    skills,
    perAnswer,
    nextActivity:
      stringValue(obj.nextActivity) ||
      neutralActivity(session.language),
  };
}

export function buildCraftThemeMessages(
  thought: string,
  language: LanguageCode,
): TeacherMessage[] {
  return [
    {
      role: "system",
      content: themeSystemPrompt(language),
    },
    {
      role: "user",
      content: `Teacher's idea: ${JSON.stringify(thought)}
Create a complete original story world around this exact topic or moral. Return {"theme": ThemeDef} as JSON only.`,
    },
  ];
}

function themeSystemPrompt(language: LanguageCode): string {
  return `You create safe, memorable audio-drama worlds for children aged 5-10.
All title, tagline, premise, character names, and character roles MUST be in ${languageLabel(language)}. artDirection MUST always be rich English for an image model.
Return JSON only. The cast array MUST contain exactly 4 complete objects total: object 1 is the narrator and objects 2, 3, and 4 are three memorable story characters. Never return only three cast objects. Character ids must be unique lowercase ASCII slugs; narrator id must be "narrator". Give every character a vivid one-line speaking personality, emoji, valid #RRGGBB color, and a distinct Bulbul v3 speaker.
Narrator speaker must be varun or anand. All four speakers must be distinct and selected only from:
${[...FEMALE_SPEAKERS, ...MALE_SPEAKERS].join(", ")}
artDirection must describe the setting, visual style, lighting, and the recurring physical appearance, clothing, colors, and species of all four cast members, including a visible storyteller design for the narrator, for illustration consistency. Do not put story-language prose in artDirection. CRITICAL: artDirection must NEVER contain character names or any famous character/franchise names — describe every character purely by appearance ("a young man in a yellow tunic", never a name); named characters make the image model reject the prompt.
Keep premise under 600 characters. Never include unsafe peril, cruelty, horror, or stereotypes.
Exact ThemeDef shape:
{"id":"jungle","title":string,"tagline":string,"emoji":string,"cast":[{"id":string,"name":string,"role":string,"speaker":string,"pace":number?,"color":"#RRGGBB","emoji":string}],"premise":string,"artDirection":string}`;
}

export function parseTheme(
  raw: string | Record<string, unknown>,
  requireThreeCharacters = true,
): ThemeDef {
  const root = typeof raw === "string" ? extractJsonObject(raw) : raw;
  const candidate = asObject(root.theme) ?? root;
  const rawCast = asArray(candidate.cast);
  const narrator =
    rawCast.find((item) => asObject(item)?.id === "narrator") ?? rawCast[0];
  const others = rawCast.filter((item) => item !== narrator).slice(0, 3);
  const castInputs = [narrator, ...others];
  if (requireThreeCharacters) {
    while (castInputs.length < 4) castInputs.push(undefined);
  }

  const usedIds = new Set<string>();
  const usedSpeakers = new Set<string>();
  const cast = castInputs.map((item, index) =>
    repairCharacter(item, index, usedIds, usedSpeakers),
  );

  // Custom sessions are identified by StorySession.themeId === "custom".
  // ThemeDef.id cannot represent "custom", so its vestigial catalog id is jungle.
  return {
    id: "jungle",
    title: stringValue(candidate.title) || "नई कहानी",
    tagline: stringValue(candidate.tagline) || "एक नई सीख, एक नया रोमांच",
    emoji: stringValue(candidate.emoji) || "✨",
    cast,
    premise: clampText(
      stringValue(candidate.premise) || "एक सुरक्षित और मज़ेदार बाल कहानी।",
      600,
    ),
    artDirection:
      stringValue(candidate.artDirection) ||
      "A warm, colorful Indian picture-book world with four visually distinct recurring characters, expressive faces, soft cinematic light, and child-friendly detail.",
  };
}

function repairCharacter(
  value: unknown,
  index: number,
  usedIds: Set<string>,
  usedSpeakers: Set<string>,
): CharacterDef {
  const obj = asObject(value);
  let id = index === 0 ? "narrator" : slug(stringValue(obj?.id));
  if (index > 0 && (!id || id === "narrator" || usedIds.has(id))) {
    id = `character-${index}`;
  }
  usedIds.add(id);

  let speaker = stringValue(obj?.speaker).toLowerCase();
  if (
    index === 0 &&
    (!["varun", "anand"].includes(speaker) || usedSpeakers.has(speaker))
  ) {
    speaker = usedSpeakers.has("varun") ? "anand" : "varun";
  } else if (
    index > 0 &&
    (!VALID_SPEAKERS.has(speaker) || usedSpeakers.has(speaker))
  ) {
    speaker =
      DEFAULT_SPEAKERS.find((candidate) => !usedSpeakers.has(candidate)) ??
      [...VALID_SPEAKERS].find((candidate) => !usedSpeakers.has(candidate))!;
  }
  usedSpeakers.add(speaker);

  const color = stringValue(obj?.color);
  const paceValue = Number(obj?.pace);
  return {
    id,
    name:
      stringValue(obj?.name) || (index === 0 ? "सूत्रधार" : `पात्र ${index}`),
    role:
      stringValue(obj?.role) ||
      (index === 0 ? "Warm, clear storyteller" : "Friendly story companion"),
    speaker,
    color: /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_COLORS[index],
    emoji: stringValue(obj?.emoji) || (index === 0 ? "📖" : "✨"),
    ...(Number.isFinite(paceValue)
      ? { pace: Math.min(2, Math.max(0.5, paceValue)) }
      : {}),
  };
}

/**
 * Adaptation is split into TWO LLM calls because the Sarvam tier caps output
 * at 2048 tokens: call 1 extracts the theme (small, always fits), call 2 gets
 * the whole budget for beats. A compact retry handles residual truncation.
 */
export function buildAdaptThemeMessages(
  request: AdaptStoryRequest,
): TeacherMessage[] {
  return [
    {
      role: "system",
      content: `${themeSystemPrompt(request.language)}

OVERRIDE for this task: you are EXTRACTING the world from the supplied teacher story, not inventing one. Title = the story's title if evident, else a short faithful one. Cast = narrator plus ONLY the story's actual speaking characters, up to 3 (fewer than 3 is correct when the source has fewer; never invent characters, never cast the listener/class/audience). Premise = a faithful 1-2 sentence summary of the story (≤ 200 characters). artDirection ≤ 350 characters. Return ONLY the ThemeDef JSON object.`,
    },
    {
      role: "user",
      content: `Story language: ${languageLabel(request.language)}

TEACHER'S ORIGINAL STORY
${request.storyText.slice(0, 8000)}

Extract the theme now. JSON only.`,
    },
  ];
}

export function buildAdaptBeatsMessages(
  request: AdaptStoryRequest,
  theme: ThemeDef,
  compact: boolean,
): TeacherMessage[] {
  const listener = request.childName?.trim() || "the class as a friendly plural";
  const beatCount = compact ? 2 : 3;
  const lineCount = compact ? 3 : 4;
  const lineChars = compact ? 110 : 140;
  const castLines = theme.cast
    .map((c) => `- "${c.id}" — ${c.name}: ${c.role}`)
    .join("\n");

  return [
    {
      role: "system",
      content: `You convert a teacher's story into a fixed, playable children's audio drama (ages 5-10), spoken aloud by TTS voices.
Return exactly {"beats":[SceneBeat,...]} as ONE MINIFIED JSON object. No markdown, no commentary.
HARD OUTPUT BUDGET — the response is cut off beyond ~2000 tokens, so a long answer is a broken answer. Output EXACTLY ${beatCount} beats with EXACTLY ${lineCount} spoken lines each. Each line ≤ ${lineChars} characters. Each "scene"/"scene2" ≤ 100 characters.
Faithfully cover the WHOLE story arc across the ${beatCount} beats — compress, never cut the ending. Do not invent, branch, or extend the plot. Tighten prose so it sounds natural aloud.
THE CAST — use characterId EXACTLY as written (any other speaker's content goes to "narrator"):
${castLines}
The narrator must speak line 1 of every beat. Every spoken line, question and option must be in ${languageLabel(request.language)}. The "scene" and "scene2" values are the absolute exception: ENGLISH ONLY, Latin script, describing a visible moment, no written text in the image — and they must NEVER contain character names (describe by appearance only: "a young man in a yellow tunic", never a name).
The last beat alone has "isEnding":true and "choice":null.
${
  request.interactive
    ? `Every non-final beat has one "choice" asked by a cast character directly to ${listener}, with exactly two short options (≤ 8 words). It is a comprehension or imagination question, NOT a plot branch; either answer must flow naturally into the already-fixed next beat.`
    : `Every beat has "choice":null.`
}
Allowed moods: calm, mystery, tension, adventure, triumph, sad.
SceneBeat shape: {"mood":string,"lines":[{"characterId":string,"text":string}],"choice":{"askedById":string,"question":string,"options":[string,string]}|null,"isEnding":boolean,"scene":string,"scene2":string}. JSON only.`,
    },
    {
      role: "user",
      content: `Target language: ${languageLabel(request.language)}
Listener: ${listener}

TEACHER'S ORIGINAL STORY
${request.storyText.slice(0, 8000)}

Write the ${beatCount} beats now. JSON only.`,
    },
  ];
}

export function parseAdaptBeats(
  raw: string,
  theme: ThemeDef,
  interactive: boolean,
): SceneBeat[] {
  const root = extractJsonObject(raw);
  const rawBeats = asArray(root.beats ?? root.scenes).slice(0, 6);

  // Salvage what parses instead of failing everything: a truncated response
  // may end with a partial trailing beat.
  const castIds = theme.cast.map((character) => character.id);
  const salvaged: SceneBeat[] = [];
  for (const value of rawBeats) {
    const beatObject = asObject(value);
    if (!beatObject) continue;
    try {
      const parsed = parseSceneBeat(JSON.stringify(beatObject), castIds);
      if (parsed.lines.length < 3) continue;
      const lines = parsed.lines.slice(0, 7);
      lines[0] = { ...lines[0], characterId: "narrator" };
      salvaged.push({ ...parsed, lines });
    } catch {
      // Skip unparseable (usually truncated) beats.
    }
  }
  if (salvaged.length < 2) {
    throw new Error(
      `Adapted story yielded only ${salvaged.length} usable beat(s)`,
    );
  }

  return salvaged.map((beat, index) => {
    const isLast = index === salvaged.length - 1;
    return {
      ...beat,
      isEnding: isLast,
      choice: isLast || !interactive ? null : beat.choice,
    } satisfies SceneBeat;
  });
}

function extractJsonObject(raw: string): Record<string, unknown> {
  if (typeof raw !== "string" || !raw.trim()) throw new Error("LLM output is empty");
  const start = raw.indexOf("{");
  if (start < 0) throw new Error("LLM output contains no JSON object");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < raw.length; index++) {
    const char = raw[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) {
        const parsed: unknown = JSON.parse(raw.slice(start, index + 1));
        const object = asObject(parsed);
        if (!object) throw new Error("LLM JSON root is not an object");
        return object;
      }
    }
  }

  // Incomplete JSON — the response hit the token cap mid-stream. Close open
  // strings/brackets and strip the trailing partial token so the intact
  // prefix (theme + full beats) survives.
  const object = asObject(repairTruncatedJson(raw.slice(start)));
  if (!object) throw new Error("LLM output contains incomplete JSON");
  return object;
}

function repairTruncatedJson(fragment: string): unknown {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (const char of fragment) {
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") stack.push("}");
    else if (char === "[") stack.push("]");
    else if (char === "}" || char === "]") stack.pop();
  }

  let repaired = fragment;
  if (escaped) repaired = repaired.slice(0, -1);
  if (inString) repaired += '"';
  repaired = repaired.replace(/[,:\s]+$/, "");
  while (stack.length) repaired += stack.pop();
  try {
    return JSON.parse(repaired);
  } catch {
    // Drop the trailing partial value (e.g. `"text": "half a wor`) but keep
    // the closing brackets that follow it, then retry once.
    const lastComma = repaired.lastIndexOf(",");
    if (lastComma <= 0) return undefined;
    const closers = repaired.slice(lastComma).replace(/[^\]}]/g, "");
    try {
      return JSON.parse(repaired.slice(0, lastComma) + closers);
    } catch {
      return undefined;
    }
  }
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown): string[] {
  return asArray(value)
    .map(stringValue)
    .filter(Boolean);
}

function clampScore(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.min(5, Math.max(1, Math.round(numeric)))
    : 3;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clampText(value: string, max: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

function neutralSkillNote(language: LanguageCode, name: string): string {
  if (language === "hi-IN")
    return `${name || "बच्चे"} की अगली प्रतिक्रियाओं से इस गुण की और साफ़ झलक मिलेगी।`;
  if (language === "gu-IN")
    return `${name || "બાળક"}ના વધુ જવાબોથી આ કૌશલ્યની વધુ સ્પષ્ટ ઝલક મળશે.`;
  return `More answers from ${name || "the child"} will reveal this skill more clearly.`;
}

function neutralAnswerNote(language: LanguageCode, name: string): string {
  if (language === "hi-IN")
    return `${name || "बच्चे"} के इस जवाब से उनकी सोच की एक प्यारी झलक मिलती है।`;
  if (language === "gu-IN")
    return `${name || "બાળક"}ના આ જવાબથી તેમની વિચારસરણીની સરસ ઝલક મળે છે.`;
  return `This answer gives a helpful glimpse into ${name || "the child"}'s thinking.`;
}

function noAnswerSummary(language: LanguageCode, name: string): string {
  if (language === "hi-IN")
    return `${name || "बच्चे"} ने कहानी ध्यान से सुनी। आगे कुछ जवाब मिलने पर उनकी सोच और पसंद के बारे में और समृद्ध जानकारी मिलेगी।`;
  if (language === "gu-IN")
    return `${name || "બાળકે"} વાર્તા ધ્યાનથી સાંભળી. વધુ જવાબો મળતાં તેમની વિચારસરણી વિશે વધુ સમૃદ્ધ સમજ મળશે.`;
  return `${name || "The child"} listened thoughtfully. A few spoken answers next time will unlock richer insights.`;
}

function neutralActivity(language: LanguageCode): string {
  if (language === "hi-IN")
    return "कहानी का पसंदीदा पल चित्र बनाकर बताइए कि वह खास क्यों लगा।";
  if (language === "gu-IN")
    return "વાર્તાની મનપસંદ ક્ષણનું ચિત્ર દોરીને કહો કે તે ખાસ કેમ લાગી.";
  return "Draw a favorite story moment and explain why it felt special.";
}

function listeningStrength(language: LanguageCode): string {
  if (language === "hi-IN") return "कहानी को शांत मन से सुनने की प्यारी शुरुआत।";
  if (language === "gu-IN") return "વાર્તા શાંતિથી સાંભળવાની સુંદર શરૂઆત.";
  return "A lovely start as a thoughtful story listener.";
}

function moreAnswersOpportunity(language: LanguageCode): string {
  if (language === "hi-IN")
    return "अगली कहानी में कुछ जवाबों के साथ उनकी सोच अभी और खिलेगी।";
  if (language === "gu-IN")
    return "આગલી વાર થોડા જવાબો સાથે તેમની વિચારસરણી વધુ ખીલશે.";
  return "Their thinking will bloom further with a few answers next time.";
}
