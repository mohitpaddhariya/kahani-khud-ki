import type { SceneBeat, ThemeId } from "./types";

/**
 * Kahani Khud Ki — demo insurance.
 *
 * A complete, hand-written 5-beat "जंगल का ख़ज़ाना" story served when the
 * director LLM is unreachable or unparseable. Character ids match the jungle
 * cast in themes.ts (narrator / chiku / kalu / dadi) — keep them in sync.
 * Character quirks match the cast roles: chiku is a banana-obsessed scaredy
 * monkey, kalu barks "कट-कट!" but is lonely inside, dadi hoots "हूँ-हूँ!".
 * Forks are written to converge, so the story flows no matter which option
 * the child picked.
 */

export const FALLBACK_THEME_ID: ThemeId = "jungle";

export function getFallbackBeat(turnIndex: number, childName: string): SceneBeat {
  const beats = buildFallbackStory(childName.trim() || "दोस्त");
  const safeIndex = Number.isFinite(turnIndex) ? Math.floor(turnIndex) : 0;
  const index = Math.min(Math.max(safeIndex, 0), beats.length - 1);
  return beats[index];
}

function buildFallbackStory(name: string): SceneBeat[] {
  return [
    // Beat 1 — setup + hook: the map, the monkey, the river fork.
    {
      mood: "adventure",
      lines: [
        {
          characterId: "narrator",
          text: `${name}, आज तुम्हारे हाथ कमाल की चीज़ लगी है — दादी की पुरानी पेटी से निकला जंगल के ख़ज़ाने का नक्शा! तुमने नक्शा थामा और घने जंगल में कदम रखा।`,
        },
        {
          characterId: "narrator",
          text: "पेड़ों के ऊपर से सर्र-सर्र की आवाज़ आई… और धड़ाम! एक बंदर छलाँग मारकर ठीक तुम्हारे सामने आ गिरा।",
        },
        {
          characterId: "chiku",
          text: "अरे अरे अरे! केला तो नहीं गिरा ना? ओह, तुम हो! मैं हूँ चीकू — इस जंगल का सबसे स्मार्ट बंदर! ये नक्शा… कहीं ख़ज़ाने का तो नहीं?",
        },
        {
          characterId: "narrator",
          text: "चीकू की आँखें सिक्कों जैसी गोल हो गईं। नक्शे का तीर झरने की तरफ़ इशारा कर रहा था — पर बीच में बहती थी एक चौड़ी नदी!",
        },
        {
          characterId: "chiku",
          text: `${name}, नदी पार करनी पड़ेगी! डरो मत, मैं पूरी तरह साथ हूँ… बस थोड़ा तुम्हारे पीछे-पीछे चलूँगा!`,
        },
      ],
      choice: {
        askedById: "chiku",
        question: `बोलो ${name}, नदी कैसे पार करें?`,
        options: ["पुराने लकड़ी के पुल से", "पत्थरों पर कूदकर"],
      },
      isEnding: false,
      scene:
        "A brave school kid holding a torn old treasure map at the edge of a lush jungle, a skinny excitable brown monkey landing in front of them with a thud, golden afternoon light.",
      scene2:
        "The school kid and the brown monkey standing before a wide sparkling river cutting through dense jungle, an old wooden bridge and stepping stones both visible, late golden light on the water.",
    },

    // Beat 2 — the wise owl, the riddle-hint, the guard who pinches.
    {
      mood: "mystery",
      lines: [
        {
          characterId: "narrator",
          text: "थोड़ी हिम्मत, थोड़ी उछल-कूद — और नदी पार! चीकू ने ज़ोर से ताली बजाई। तभी ऊपर पेड़ की डाल से दो बड़ी-बड़ी सुनहरी आँखें चमकीं।",
        },
        {
          characterId: "dadi",
          text: `हूँ-हूँ! कौन जा रहा है मेरे जंगल से होकर? अरे… ख़ज़ाने का नक्शा! बरसों बाद कोई इतनी दूर आया है, ${name}।`,
        },
        {
          characterId: "chiku",
          text: "द-द-दादी उल्लू! मैंने कुछ नहीं किया! केले भी नहीं चुराए… कम-से-कम आज तो बिल्कुल नहीं!",
        },
        {
          characterId: "dadi",
          text: `शांत, चीकू! सुनो ${name} — झरने के पीछे एक गुफा है, और गुफा में ख़ज़ाना। पर याद रखना, उसका एक पहरेदार है… जो चुटकी काटता है!`,
        },
        {
          characterId: "narrator",
          text: "चुटकी काटने वाला पहरेदार? चीकू ने घबराकर अपनी ही पूँछ कसकर पकड़ ली। दूर से झरने की आवाज़ आने लगी — झर-झर-झर!",
        },
      ],
      choice: {
        askedById: "dadi",
        question: `बताओ ${name}, उस पहरेदार का दिल कैसे जीतोगे?`,
        options: ["सीधे जाकर बात करूँगा", "उसके लिए तोहफ़ा ढूँढूँगा"],
      },
      isEnding: false,
      scene:
        "A wise plump grey owl with big golden eyes on a mossy branch speaking to a brave school kid and a nervous brown monkey below, mysterious teal twilight in a dense jungle.",
      scene2:
        "A glowing waterfall in the distance between dark jungle trees with a hidden cave mouth behind it, the school kid and monkey gazing toward it, fireflies drifting in deep blue dusk.",
    },

    // Beat 3 — meet Kalu; the gentle twist: he's not mean, he's lonely.
    {
      mood: "tension",
      lines: [
        {
          characterId: "narrator",
          text: "झरने की ठंडी फुहारों के पीछे सचमुच एक गुफा थी! तुमने अपना प्लान याद किया, गहरी साँस ली और अंदर कदम रखा। अंदर से आवाज़ आई — खट-खट-खट!",
        },
        {
          characterId: "kalu",
          text: "खबरदार! जो ख़ज़ाने की तरफ़ एक कदम भी बढ़ाया! मैं हूँ कालू केकड़ा — पूरे सौ साल से इस ख़ज़ाने का पहरेदार! कट-कट!",
        },
        {
          characterId: "chiku",
          text: `हाय मेरे केले! ${name}, ये सच में चुटकी काटता है! मैं तुम्हारे पीछे छिपा हूँ — शाबाश हीरो, आगे बढ़ो!`,
        },
        {
          characterId: "narrator",
          text: "पर तुमने ग़ौर से देखा — कालू की आँखों में ग़ुस्सा नहीं था। वे तो उदास थीं! सौ साल से बेचारा यहाँ बिल्कुल अकेला बैठा था।",
        },
        {
          characterId: "kalu",
          text: "अ-अकेला? कौन बोला? पहरेदार कभी अकेले नहीं होते! बस… मेरे साथ कोई खेलता नहीं। सब मुझे देखते ही भाग जाते हैं।",
        },
      ],
      choice: {
        askedById: "kalu",
        question: `अच्छा ${name}, सच-सच बताओ — मेरी पहेली बूझोगे या मेरे साथ खेलोगे?`,
        options: ["पहेली बूझूँगा!", "तुम्हारे साथ खेलूँगा!"],
      },
      isEnding: false,
      scene:
        "Inside a glowing cave behind a waterfall, a big round red crab with one huge claw blocks the way before a brave school kid, a scared brown monkey hiding behind the kid, cool blue light.",
      scene2:
        "Close inside the waterfall cave: the big red crab's eyes turning soft and lonely instead of angry, the brave school kid stepping closer kindly, warm torch glow meeting cool blue light.",
    },

    // Beat 4 — laughter wins; the chest opens: a golden whistle, not gold.
    {
      mood: "adventure",
      lines: [
        {
          characterId: "narrator",
          text: "और फिर जो हुआ, वो इस जंगल ने पहले कभी नहीं देखा था — गुफा में ठहाके गूँज उठे! कालू केकड़ा ख़ुशी से साइड-साइड डांस करने लगा।",
        },
        {
          characterId: "kalu",
          text: `हा-हा! क्या दिमाग़, क्या मज़ा! सौ साल में इतनी हँसी कभी नहीं आई। चलो ${name}, ख़ज़ाना तुम्हारा — और चाबी? चाबी तो मेरा चिमटा है! कट-कट!`,
        },
        {
          characterId: "narrator",
          text: "कालू ने संदूक पर चिमटा घुमाया — खट्! ढक्कन खुला और सुनहरी रोशनी से पूरी गुफा जगमगा उठी। चीकू की आँखें फटी की फटी रह गईं।",
        },
        {
          characterId: "chiku",
          text: "केले?! नहीं… ये तो केलों से भी बढ़िया है! एक सुनहरी सीटी! और साथ में एक चमकती चिट्ठी भी!",
        },
        {
          characterId: "dadi",
          text: `हूँ-हूँ! उड़ती-उड़ती मैं भी आ गई! चिट्ठी में लिखा है — जो इस सीटी को बजाएगा, पूरा जंगल उसका दोस्त बन जाएगा। यही असली ख़ज़ाना है, ${name}!`,
        },
      ],
      choice: {
        askedById: "chiku",
        question: `${name}, अब बताओ — सीटी कैसे बजाओगे?`,
        options: ["एकदम ज़ोर से!", "धीरे से, प्यार से!"],
      },
      isEnding: false,
      scene:
        "A happy red crab dancing sideways with joy inside a waterfall cave, a brave school kid and a brown monkey laughing together, warm light filling the cave.",
      scene2:
        "A treasure chest bursting open with golden light inside the cave, revealing a shining golden whistle and a glowing letter, the school kid, monkey and red crab leaning in amazed, sparkles everywhere.",
    },

    // Beat 5 — finale: the whole jungle gathers, the hero is celebrated.
    {
      mood: "triumph",
      lines: [
        {
          characterId: "narrator",
          text: "तुमने गहरी साँस भरी और अपने अंदाज़ में सीटी बजाई — सूऽऽऽ! आवाज़ झरने के पार, पेड़ों के ऊपर, पूरे जंगल में फैल गई।",
        },
        {
          characterId: "narrator",
          text: "और देखते-ही-देखते सारा जंगल गुफा के बाहर जमा हो गया — हाथी, हिरन, तोते, तितलियाँ! सब नाच रहे थे, सब गा रहे थे।",
        },
        {
          characterId: "chiku",
          text: "पार्टी! असली वाली जंगल पार्टी! और सबसे बड़ी ख़बर सुनो — कालू भाई अपने चिमटे से सबके लिए केले छील रहे हैं! कट-कट-छिल!",
        },
        {
          characterId: "kalu",
          text: "अब मैं अकेला पहरेदार नहीं — पार्टी वाला केकड़ा हूँ! और ये सब हुआ है हमारे हीरो की वजह से!",
        },
        {
          characterId: "dadi",
          text: `हूँ-हूँ! सुन लो पूरे जंगल वालो — ${name} ने आज साबित कर दिया कि सबसे बड़ा ख़ज़ाना सोना नहीं, दोस्ती है! बोलो — ${name} ज़िंदाबाद!`,
        },
        {
          characterId: "narrator",
          text: `${name} ज़िंदाबाद! ${name} ज़िंदाबाद! और इस तरह जंगल का ख़ज़ाना मिल गया — और जंगल को मिल गया उसका सबसे प्यारा हीरो। शाबाश, ${name}!`,
        },
      ],
      choice: null,
      isEnding: true,
      scene:
        "A brave school kid blowing a shining golden whistle outside a waterfall cave, the sound rippling across the jungle as birds rise into a warm golden sky.",
      scene2:
        "A joyful jungle celebration: elephants, deer, parrots and butterflies dancing around the school kid, a happy red crab peeling bananas with its claw, a brown monkey cheering, a wise grey owl flying overhead, festive golden light.",
    },
  ];
}
