import type { LanguageCode, Mood, SkillId, ThemeId } from "@/lib/story/types";

/**
 * UI chrome localization. The STORY is always fully in the session language
 * (the director writes it); this covers everything around it: labels, hints,
 * toasts, buttons, cast display names and theme cards.
 *
 * Hand-written, verified copy for hi-IN, gu-IN and en-IN. The remaining
 * languages fall back to English chrome (story still fully localized).
 */

export interface UiStrings {
  brandTitle: string;
  brandTag: string;
  subtitle: string;
  namePrompt: string;
  continueCta: string;
  touchWorldHint: string;
  nameLabel: string;
  namePlaceholder: string;
  langLabel: string;
  pickStory: string;
  startCta: string;
  micHint: string;
  chapter: string;
  weaving: string;
  magicNote: string;
  errorTitle: string;
  retryCta: string;
  youSaid: string;
  micTapHint: string;
  speakNow: string;
  tapToStop: string;
  understanding: string;
  orPick: string;
  micAriaStart: string;
  micAriaStop: string;
  theEnd: string;
  bravo: (name: string) => string;
  yourStory: string;
  replayCta: string;
  toastMicFail: string;
  toastSttEmpty: string;
  toastSttFail: string;
  errEmptyScene: string;
  /* teacher mode */
  tabStudent: string;
  tabTeacher: string;
  teacherThoughtTitle: string;
  teacherThoughtHint: string;
  teacherThoughtPlaceholder: string;
  listenerLabel: string;
  optionalTag: string;
  craftCta: string;
  craftBusy: string;
  craftError: string;
  teacherStoryTitle: string;
  teacherStoryHint: string;
  teacherStoryPlaceholder: string;
  uploadTxt: string;
  interactiveLabel: string;
  adaptCta: string;
  adaptBusy: string;
  adaptError: string;
  castHeading: string;
  beatsCount: (n: number) => string;
  /** Fallback listener name when a teacher leaves the name empty. */
  classroomName: string;
  /* report card */
  reportCta: string;
  reportTitle: string;
  reportLoading: string;
  reportError: string;
  skillLabels: Record<SkillId, string>;
  strengthsHeading: string;
  growthHeading: string;
  answersHeading: string;
  nextActivityHeading: string;
  closeLabel: string;
  moods: Record<Mood, string>;
}

const HI: UiStrings = {
  brandTitle: "कहानी खुद की",
  brandTag: "🎭 एक जीवंत AI रेडियो नाटक",
  namePrompt: "तुम्हारा नाम क्या है?",
  continueCta: "आगे चलो",
  touchWorldHint: "किसी दुनिया के पास जाओ — वो तुमसे बोलेगी!",
  subtitle: "जहाँ कहानी आपसे बात करती है",
  nameLabel: "आपका नाम",
  namePlaceholder: "आपका नाम…",
  langLabel: "भाषा",
  pickStory: "कहानी चुनें",
  startCta: "कहानी शुरू करें ▶",
  micHint: "🎙 माइक पास रखिए — किरदार आपसे सवाल पूछेंगे!",
  chapter: "अध्याय",
  weaving: "सूत्रधार अगली कहानी बुन रहे हैं",
  magicNote: "थोड़ा जादू बुनने में एक पल लगता है ✨",
  errorTitle: "अरे! कहानी में अड़चन आ गई",
  retryCta: "फिर कोशिश करें ↻",
  youSaid: "आपने कहा:",
  micTapHint: "🎙 माइक दबाकर बोलिए",
  speakNow: "बोलिए…",
  tapToStop: "रोकने के लिए फिर दबाएँ",
  understanding: "समझ रहे हैं…",
  orPick: "या इनमें से चुनें",
  micAriaStart: "बोलकर जवाब दें",
  micAriaStop: "रिकॉर्डिंग रोकें",
  theEnd: "समाप्त!",
  bravo: (name) => `शाबाश, ${name}! यह कहानी आपने ख़ुद बुनी 🌟`,
  yourStory: "आपकी कहानी",
  replayCta: "फिर से खेलें ↻",
  toastMicFail: "माइक नहीं मिल पाया — नीचे के विकल्प चुनिए",
  toastSttEmpty: "कुछ सुनाई नहीं दिया — फिर बोलिए या विकल्प चुनिए",
  toastSttFail: "आवाज़ समझ में नहीं आई — विकल्प चुनकर आगे बढ़िए",
  errEmptyScene: "सूत्रधार से खाली दृश्य मिला",
  tabStudent: "बच्चे",
  tabTeacher: "शिक्षक",
  teacherThoughtTitle: "अपने विचार से कहानी",
  teacherThoughtHint:
    "कोई सीख, विषय या विचार लिखिए — हम उसे बच्चों की जादुई कहानी की दुनिया बना देंगे",
  teacherThoughtPlaceholder: "जैसे — पानी बचाओ, दोस्ती की ताक़त, सच बोलने का साहस…",
  listenerLabel: "सुनने वालों का नाम",
  optionalTag: "(ज़रूरी नहीं)",
  craftCta: "जादुई दुनिया बनाओ ✨",
  craftBusy: "दुनिया बन रही है…",
  craftError: "जादू में अड़चन आ गई — फिर कोशिश कीजिए",
  teacherStoryTitle: "अपनी कहानी सुनाओ",
  teacherStoryHint:
    "अपनी कहानी लिखिए या चिपकाइए — किरदार उसे आवाज़ों और तस्वीरों के साथ जीवंत कर देंगे",
  teacherStoryPlaceholder: "अपनी कहानी यहाँ लिखें या चिपकाएँ…",
  uploadTxt: "या .txt फ़ाइल चुनें",
  interactiveLabel: "सवालों के साथ — किरदार बच्चों से जवाब पूछेंगे",
  adaptCta: "कहानी तैयार करो 🎭",
  adaptBusy: "कहानी तैयार हो रही है…",
  adaptError: "कहानी तैयार नहीं हो पाई — फिर कोशिश कीजिए",
  castHeading: "किरदार",
  beatsCount: (n) => `${n} दृश्य`,
  classroomName: "दोस्तों",
  reportCta: "📊 रिपोर्ट कार्ड",
  reportTitle: "रिपोर्ट कार्ड",
  reportLoading: "रिपोर्ट बन रही है…",
  reportError: "रिपोर्ट नहीं बन पाई — फिर कोशिश कीजिए",
  skillLabels: {
    creativity: "रचनात्मकता",
    courage: "साहस",
    kindness: "दयालुता",
    decisiveness: "निर्णय-क्षमता",
    expression: "अभिव्यक्ति",
  },
  strengthsHeading: "चमकती ख़ूबियाँ",
  growthHeading: "अगली उड़ान",
  answersHeading: "सवाल-जवाब की झलक",
  nextActivityHeading: "अब यह करके देखिए",
  closeLabel: "बंद करें",
  moods: {
    calm: "शांत",
    mystery: "रहस्य",
    tension: "रोमांच",
    adventure: "साहस",
    triumph: "जीत",
    sad: "भावुक",
  },
};

const GU: UiStrings = {
  brandTitle: "કહાની ખુદ કી",
  brandTag: "🎭 એક જીવંત AI રેડિયો નાટક",
  namePrompt: "તમારું નામ શું છે?",
  continueCta: "આગળ ચલો",
  touchWorldHint: "કોઈ દુનિયાની પાસે જાઓ — એ તમારી સાથે બોલશે!",
  subtitle: "જ્યાં વાર્તા તમારી સાથે વાત કરે છે",
  nameLabel: "તમારું નામ",
  namePlaceholder: "તમારું નામ…",
  langLabel: "ભાષા",
  pickStory: "વાર્તા પસંદ કરો",
  startCta: "વાર્તા શરૂ કરો ▶",
  micHint: "🎙 માઇક પાસે રાખો — પાત્રો તમને સવાલ પૂછશે!",
  chapter: "પ્રકરણ",
  weaving: "સૂત્રધાર આગળની વાર્તા વણી રહ્યા છે",
  magicNote: "થોડું જાદુ વણવામાં એક પળ લાગે છે ✨",
  errorTitle: "અરે! વાર્તામાં અડચણ આવી ગઈ",
  retryCta: "ફરી પ્રયત્ન કરો ↻",
  youSaid: "તમે કહ્યું:",
  micTapHint: "🎙 માઇક દબાવીને બોલો",
  speakNow: "બોલો…",
  tapToStop: "રોકવા માટે ફરી દબાવો",
  understanding: "સમજી રહ્યા છીએ…",
  orPick: "અથવા આમાંથી પસંદ કરો",
  micAriaStart: "બોલીને જવાબ આપો",
  micAriaStop: "રેકોર્ડિંગ રોકો",
  theEnd: "સમાપ્ત!",
  bravo: (name) => `શાબાશ, ${name}! આ વાર્તા તમે જાતે વણી 🌟`,
  yourStory: "તમારી વાર્તા",
  replayCta: "ફરીથી રમો ↻",
  toastMicFail: "માઇક ન મળ્યો — નીચેના વિકલ્પો પસંદ કરો",
  toastSttEmpty: "કંઈ સંભળાયું નહીં — ફરી બોલો અથવા વિકલ્પ પસંદ કરો",
  toastSttFail: "અવાજ સમજાયો નહીં — વિકલ્પ પસંદ કરી આગળ વધો",
  errEmptyScene: "સૂત્રધાર તરફથી ખાલી દૃશ્ય મળ્યું",
  tabStudent: "બાળકો",
  tabTeacher: "શિક્ષક",
  teacherThoughtTitle: "તમારા વિચારથી વાર્તા",
  teacherThoughtHint:
    "કોઈ શીખ, વિષય કે વિચાર લખો — અમે તેને બાળકોની જાદુઈ વાર્તાની દુનિયા બનાવી દઈશું",
  teacherThoughtPlaceholder: "જેમ કે — પાણી બચાવો, મિત્રતાની તાકાત, સાચું બોલવાની હિંમત…",
  listenerLabel: "સાંભળનારાઓનું નામ",
  optionalTag: "(જરૂરી નથી)",
  craftCta: "જાદુઈ દુનિયા બનાવો ✨",
  craftBusy: "દુનિયા બની રહી છે…",
  craftError: "જાદુમાં અડચણ આવી ગઈ — ફરી પ્રયત્ન કરો",
  teacherStoryTitle: "તમારી વાર્તા સંભળાવો",
  teacherStoryHint:
    "તમારી વાર્તા લખો કે ચોંટાડો — પાત્રો તેને અવાજો અને ચિત્રો સાથે જીવંત કરી દેશે",
  teacherStoryPlaceholder: "તમારી વાર્તા અહીં લખો કે ચોંટાડો…",
  uploadTxt: "અથવા .txt ફાઇલ પસંદ કરો",
  interactiveLabel: "સવાલો સાથે — પાત્રો બાળકોને જવાબ પૂછશે",
  adaptCta: "વાર્તા તૈયાર કરો 🎭",
  adaptBusy: "વાર્તા તૈયાર થઈ રહી છે…",
  adaptError: "વાર્તા તૈયાર ન થઈ શકી — ફરી પ્રયત્ન કરો",
  castHeading: "પાત્રો",
  beatsCount: (n) => (n === 1 ? "1 દૃશ્ય" : `${n} દૃશ્યો`),
  classroomName: "મિત્રો",
  reportCta: "📊 રિપોર્ટ કાર્ડ",
  reportTitle: "રિપોર્ટ કાર્ડ",
  reportLoading: "રિપોર્ટ બની રહી છે…",
  reportError: "રિપોર્ટ ન બની શકી — ફરી પ્રયત્ન કરો",
  skillLabels: {
    creativity: "સર્જનાત્મકતા",
    courage: "સાહસ",
    kindness: "દયાળુતા",
    decisiveness: "નિર્ણયશક્તિ",
    expression: "અભિવ્યક્તિ",
  },
  strengthsHeading: "ચમકતી ખૂબીઓ",
  growthHeading: "આગલી ઉડાન",
  answersHeading: "સવાલ-જવાબની ઝલક",
  nextActivityHeading: "હવે આ કરી જુઓ",
  closeLabel: "બંધ કરો",
  moods: {
    calm: "શાંત",
    mystery: "રહસ્ય",
    tension: "રોમાંચ",
    adventure: "સાહસ",
    triumph: "જીત",
    sad: "ભાવુક",
  },
};

const EN: UiStrings = {
  brandTitle: "Kahani Khud Ki",
  brandTag: "🎭 A living AI radio drama",
  namePrompt: "What's your name?",
  continueCta: "Let's go",
  touchWorldHint: "Move close to a world — it will speak to you!",
  subtitle: "Where the story talks back to you",
  nameLabel: "Your name",
  namePlaceholder: "Your name…",
  langLabel: "Language",
  pickStory: "Pick your story",
  startCta: "Start the story ▶",
  micHint: "🎙 Keep the mic close — the characters will ask YOU questions!",
  chapter: "Chapter",
  weaving: "The narrator is weaving the next chapter",
  magicNote: "A little magic takes a moment to weave ✨",
  errorTitle: "Oops! The story hit a bump",
  retryCta: "Try again ↻",
  youSaid: "You said:",
  micTapHint: "🎙 Tap the mic and speak",
  speakNow: "Speak…",
  tapToStop: "Tap again to stop",
  understanding: "Understanding…",
  orPick: "or pick one",
  micAriaStart: "Answer by voice",
  micAriaStop: "Stop recording",
  theEnd: "The End!",
  bravo: (name) => `Bravo, ${name}! You wove this story yourself 🌟`,
  yourStory: "Your story",
  replayCta: "Play again ↻",
  toastMicFail: "Couldn't reach the mic — pick an option below",
  toastSttEmpty: "Didn't catch that — speak again or pick an option",
  toastSttFail: "Couldn't understand — pick an option to continue",
  errEmptyScene: "The narrator sent an empty scene",
  tabStudent: "Student",
  tabTeacher: "Teacher",
  teacherThoughtTitle: "A story from your idea",
  teacherThoughtHint:
    "Write a moral, topic or thought — we'll turn it into a magical story world for kids",
  teacherThoughtPlaceholder:
    "e.g. — save water, the power of friendship, courage to speak the truth…",
  listenerLabel: "Listeners' name",
  optionalTag: "(optional)",
  craftCta: "Craft the magic world ✨",
  craftBusy: "Crafting the world…",
  craftError: "The magic hit a bump — try again",
  teacherStoryTitle: "Tell your own story",
  teacherStoryHint:
    "Write or paste your story — the characters will bring it alive with voices and pictures",
  teacherStoryPlaceholder: "Write or paste your story here…",
  uploadTxt: "or pick a .txt file",
  interactiveLabel: "With questions — characters will ask the kids",
  adaptCta: "Prepare the story 🎭",
  adaptBusy: "Preparing the story…",
  adaptError: "Couldn't prepare the story — try again",
  castHeading: "Characters",
  beatsCount: (n) => (n === 1 ? "1 scene" : `${n} scenes`),
  classroomName: "Friends",
  reportCta: "📊 Report card",
  reportTitle: "Report Card",
  reportLoading: "Preparing the report…",
  reportError: "Couldn't create the report — try again",
  skillLabels: {
    creativity: "Creativity",
    courage: "Courage",
    kindness: "Kindness",
    decisiveness: "Decisiveness",
    expression: "Expression",
  },
  strengthsHeading: "Shining strengths",
  growthHeading: "Room to grow",
  answersHeading: "Question by question",
  nextActivityHeading: "Try this next",
  closeLabel: "Close",
  moods: {
    calm: "Calm",
    mystery: "Mystery",
    tension: "Thrill",
    adventure: "Adventure",
    triumph: "Triumph",
    sad: "Tender",
  },
};

const STRINGS: Partial<Record<LanguageCode, UiStrings>> = {
  "hi-IN": HI,
  "gu-IN": GU,
  "en-IN": EN,
};

export function getStrings(lang: LanguageCode): UiStrings {
  return STRINGS[lang] ?? EN;
}

/* ------------------------- theme & cast display ------------------------- */

export interface ThemeL10n {
  title: string;
  tagline: string;
  /** characterId → localized display name. */
  castNames: Record<string, string>;
}

type ThemeL10nTable = Record<ThemeId, ThemeL10n>;

const THEME_GU: ThemeL10nTable = {
  jungle: {
    title: "જંગલનો ખજાનો",
    tagline: "એક જૂનો નકશો, ઊંડું જંગલ — અને સોના કરતાં પણ મોટો ખજાનો",
    castNames: {
      narrator: "સૂત્રધાર",
      chiku: "ચીકુ વાંદરો",
      kalu: "કાળુ કરચલો",
      dadi: "દાદી ઘુવડ",
    },
  },
  space: {
    title: "ચાંદનું રહસ્ય",
    tagline: "અડધી રાતની ઉડાન, બીપ-બીપ સિગ્નલ, અને ચાંદ પર એક એકલી દોસ્ત",
    castNames: {
      narrator: "સૂત્રધાર",
      captain: "કૅપ્ટન તારા",
      beepu: "રોબો બીપુ",
      chandni: "ચાંદની",
    },
  },
  mela: {
    title: "જાદુઈ મેળો",
    tagline: "હીંચકા જે બોલે છે, જલેબીઓ જે ઇચ્છા પૂરી કરે છે",
    castNames: {
      narrator: "સૂત્રધાર",
      jalebi: "જલેબી બાઈ",
      jhoola: "ઝૂલા રાજા",
      gubbara: "ગુબ્બારુ",
    },
  },
};

const THEME_EN: ThemeL10nTable = {
  jungle: {
    title: "The Jungle Treasure",
    tagline: "An old map, a deep jungle — and a treasure bigger than gold",
    castNames: {
      narrator: "The Narrator",
      chiku: "Chiku the Monkey",
      kalu: "Kalu the Crab",
      dadi: "Grandma Owl",
    },
  },
  space: {
    title: "The Moon's Secret",
    tagline: "A midnight flight, beep-beep signals, and a lonely friend on the moon",
    castNames: {
      narrator: "The Narrator",
      captain: "Captain Tara",
      beepu: "Robo Beepu",
      chandni: "Chandni",
    },
  },
  mela: {
    title: "The Magic Fair",
    tagline: "Rides that talk, jalebis that grant wishes",
    castNames: {
      narrator: "The Narrator",
      jalebi: "Jalebi Bai",
      jhoola: "Jhoola Raja",
      gubbara: "Gubbaru",
    },
  },
};

const THEME_L10N: Partial<Record<LanguageCode, ThemeL10nTable>> = {
  "gu-IN": THEME_GU,
  "en-IN": THEME_EN,
};

/**
 * Localized theme display strings. Hindi returns null (themes.ts is already
 * the Hindi source of truth); unknown languages fall back to English.
 */
export function getThemeL10n(
  themeId: ThemeId,
  lang: LanguageCode,
): ThemeL10n | null {
  if (lang === "hi-IN") return null;
  const table = THEME_L10N[lang] ?? THEME_EN;
  return table[themeId];
}
