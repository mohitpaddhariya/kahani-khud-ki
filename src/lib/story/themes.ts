import type { ThemeDef, ThemeId, ThemeRef } from "./types";

/**
 * Kahani Khud Ki — theme catalog.
 * Three story worlds, each with a narrator + 3 characters cast for maximum
 * vocal contrast (Bulbul TTS speaker per character).
 *
 * Export names/shapes are a stable contract used by the API routes and UI.
 * NOTE: jungle cast ids ("narrator", "chiku", "kalu", "dadi") are also
 * used by the hand-written story in fallback.ts — keep them in sync.
 *
 * Speakers: cast from the VERIFIED bulbul:v3 roster (see docs/sarvam-api.md,
 * "Full bulbul:v3 speaker list"). v2-only ids (abhilash/anushka/manisha/vidya/
 * arya/karun/hitesh) hard-fail on v3 — do not reintroduce them.
 */

export const MAX_BEATS = 6;

/**
 * Resolves a session's theme: teacher-crafted custom worlds win, otherwise
 * the built-in catalog. Falls back to jungle if a custom ref has no ThemeDef.
 */
export function resolveTheme(ref: {
  themeId: ThemeRef;
  customTheme?: ThemeDef;
}): ThemeDef {
  if (ref.themeId === "custom") return ref.customTheme ?? THEMES.jungle;
  return THEMES[ref.themeId];
}

export const THEMES: Record<ThemeId, ThemeDef> = {
  jungle: {
    id: "jungle",
    title: "जंगल का ख़ज़ाना",
    tagline: "एक पुराना नक्शा, एक गहरा जंगल — और सोने से भी बड़ा ख़ज़ाना",
    emoji: "🌴",
    premise:
      "दादी की पुरानी पेटी से बच्चे को एक फटा-पुराना नक्शा मिलता है, जो घने जंगल में झरने के पीछे छुपे ख़ज़ाने तक ले जाता है। रास्ते में डरपोक-बड़बोला चीकू बंदर, सबकुछ जानने वाली दादी उल्लू, और ख़ज़ाने का सौ साल पुराना अकेला पहरेदार कालू केकड़ा मिलते हैं। आख़िर में पता चलता है कि असली ख़ज़ाना सोना नहीं — दोस्ती है, और पूरा जंगल हीरो का दोस्त बन जाता है।",
    artDirection:
      "A lush, magical Indian jungle: giant banyan and mango trees, hanging vines, ferns, wildflowers, a sparkling waterfall and ancient mossy stone ruins, golden-hour light filtering through leaves. Recurring characters: a brave Indian school kid (the hero) in shorts and a little explorer vest holding a torn old treasure map; a skinny excitable brown monkey with huge eyes who clutches bananas; a big round red crab with one comically oversized claw and shy, kind eyes; a plump wise grey owl grandmother with large golden spectacles-like eyes perched on branches.",
    cast: [
      {
        id: "narrator",
        name: "सूत्रधार",
        role: "गरमजोशी वाला किस्सागो मामा; छोटे चटपटे वाक्य बोलता है; हर सीन की आवाज़ें और खुशबू ज़िंदा कर देता है",
        speaker: "varun",
        color: "#f59e0b",
        emoji: "📖",
      },
      {
        id: "chiku",
        name: "चीकू बंदर",
        role: "डरपोक पर बड़बोला बंदर; केलों का दीवाना; डर में भी मज़ाक सूझता है; मुसीबत आते ही हीरो के पीछे छिप जाता है",
        speaker: "kavya",
        pace: 1.1,
        color: "#34d399",
        emoji: "🐒",
      },
      {
        id: "kalu",
        name: "कालू केकड़ा",
        role: "ख़ज़ाने का सौ साल पुराना पहरेदार केकड़ा; कड़क आवाज़ में 'कट-कट!' बोलता है; असल में अकेला, खेलने को तरसता नरम दिल",
        speaker: "kabir",
        pace: 0.9,
        color: "#f87171",
        emoji: "🦀",
      },
      {
        id: "dadi",
        name: "दादी उल्लू",
        role: "जंगल की सबसे बुज़ुर्ग, सबकुछ जानने वाली उल्लू दादी; 'हूँ-हूँ!' करके बोलती हैं; धीमी, ममता-भरी, राज़दार आवाज़",
        speaker: "roopa",
        pace: 0.95,
        color: "#60a5fa",
        emoji: "🦉",
      },
    ],
  },

  space: {
    id: "space",
    title: "चाँद का रहस्य",
    tagline: "आधी रात की उड़ान, बीप-बीप सिग्नल, और चाँद पर एक अकेली दोस्त",
    emoji: "🚀",
    premise:
      "आधी रात को बच्चे की खिड़की पर एक नन्हा रॉकेट उतरता है — चाँद से कोई रहस्यमयी सिग्नल आ रहा है: बीप… बीप… बीप! कैप्टन तारा और रोबो बीपू के साथ बच्चा चाँद की उड़ान भरता है। वहाँ मिलती है चाँदनी — एक अकेली, सपनीली दोस्त, जिसे बस कोई चाहिए जो उसके साथ खेले और उसकी कहानी सुने।",
    artDirection:
      "A dreamy night-sky adventure: deep indigo space full of twinkling stars, a small cozy red-and-white cartoon rocket with round windows, silvery moon craters that glow softly, Earth hanging like a blue marble in the sky. Recurring characters: a brave Indian school kid (the hero) in pajamas with a tiny astronaut helmet; a confident young Indian woman rocket captain in an orange space suit with star badges; a small clumsy silver robot co-pilot with one antenna and glowing round eyes; a gentle glowing moon-girl made of soft silver moonlight with flowing hair of stardust.",
    cast: [
      {
        id: "narrator",
        name: "सूत्रधार",
        role: "गरमजोशी वाला किस्सागो मामा; छोटे चटपटे वाक्य; तारों-भरे आसमान को आवाज़ से चमका देता है",
        speaker: "varun",
        color: "#818cf8",
        emoji: "📖",
      },
      {
        id: "captain",
        name: "कैप्टन तारा",
        role: "बहादुर रॉकेट कैप्टन; छोटी-कड़क कमांड देती है और हर बड़े काम से पहले काउंटडाउन बोलती है — 'तीन, दो, एक… गो!'",
        speaker: "priya",
        color: "#38bdf8",
        emoji: "👩‍🚀",
      },
      {
        id: "beepu",
        name: "रोबो बीपू",
        role: "भोला-प्यारा रोबोट को-पायलट; हर वाक्य 'बीप-बीप!' से शुरू करता है; हिसाब हमेशा थोड़ा गलत, पर दिल हमेशा सही",
        speaker: "aayan",
        pace: 1.05,
        color: "#94a3b8",
        emoji: "🤖",
      },
      {
        id: "chandni",
        name: "चाँदनी",
        role: "चाँद पर रहने वाली अकेली, सपनीली दोस्त; धीमी, मुलायम, गाने जैसी आवाज़; उसे कहानियाँ और सितारों की धूल बहुत पसंद है",
        speaker: "ishita",
        pace: 0.95,
        color: "#fcd34d",
        emoji: "🌙",
      },
    ],
  },

  mela: {
    id: "mela",
    title: "जादुई मेला",
    tagline: "झूले जो बोलते हैं, जलेबियाँ जो विश पूरी करती हैं",
    emoji: "🎡",
    premise:
      "गाँव में जादुई मेला लगा है — रात होते ही झूले ज़िंदा हो जाते हैं और जलेबी बाई की गरम जलेबियाँ विश पूरी करती हैं! पर इस बार झूला राजा उदास है और मेले का जादू धीरे-धीरे बुझ रहा है। बच्चे को गुब्बारू और जलेबी बाई के साथ मिलकर मेले की हँसी वापस लानी है।",
    artDirection:
      "A magical Indian village fair at night: strings of warm fairy lights, striped tents, glowing food stalls with sizzling jalebis, fireworks and lanterns in a deep purple sky. Recurring characters: a brave Indian school kid (the hero) in festive kurta; a jolly Indian grandmother sweet-seller in a bright orange saree stirring a giant pan of golden spiral jalebis; a giant living ferris wheel with a gentle sleepy face and glowing purple spokes; a round bright-red balloon with a tiny happy face and a string tail who floats everywhere.",
    cast: [
      {
        id: "narrator",
        name: "सूत्रधार",
        role: "गरमजोशी वाला किस्सागो मामा; छोटे चटपटे वाक्य; ढोल, भीड़ और जलेबी की खुशबू आवाज़ में घोल देता है",
        speaker: "varun",
        color: "#f472b6",
        emoji: "📖",
      },
      {
        id: "jalebi",
        name: "जलेबी बाई",
        role: "जादुई जलेबी वाली नानी; गा-गाकर आवाज़ लगाती है — 'गरम गरम, करारी करारी!'; खनकती हँसी; उसकी जलेबी खाओ तो एक विश पूरी",
        speaker: "kavitha",
        color: "#f97316",
        emoji: "🍥",
      },
      {
        id: "jhoola",
        name: "झूला राजा",
        role: "ज़िंदा हो चुका बड़ा-सा चरखी झूला; गहरी, गूँजती, धीमी आवाज़; बच्चों की हँसी से उसे गुदगुदी होती है — 'घर्र… घूम!'",
        speaker: "kabir",
        pace: 0.9,
        color: "#a855f7",
        emoji: "🎡",
      },
      {
        id: "gubbara",
        name: "गुब्बारू",
        role: "बातूनी लाल गुब्बारा; पतली, तेज़, उत्साही आवाज़; नुकीली चीज़ों से डरता है और घबराकर 'ओ माँ!' चिल्लाता है",
        speaker: "sunny",
        pace: 1.1,
        color: "#ef4444",
        emoji: "🎈",
      },
    ],
  },
};
