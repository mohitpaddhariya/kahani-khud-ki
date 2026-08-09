import { NextResponse } from "next/server";

import { directorChat } from "@/lib/sarvam";
import {
  buildAdaptBeatsMessages,
  buildAdaptThemeMessages,
  parseAdaptBeats,
  parseTheme,
  TEACHER_MODEL_HINTS,
} from "@/lib/story/teacher";
import type {
  AdaptStoryRequest,
  AdaptStoryResponse,
  LanguageCode,
  SceneBeat,
} from "@/lib/story/types";

export const maxDuration = 90;

const LANGUAGES = new Set<LanguageCode>([
  "hi-IN",
  "en-IN",
  "bn-IN",
  "ta-IN",
  "te-IN",
  "mr-IN",
  "gu-IN",
  "kn-IN",
  "ml-IN",
  "pa-IN",
  "od-IN",
]);

export async function POST(request: Request) {
  let body: AdaptStoryRequest;
  try {
    body = (await request.json()) as AdaptStoryRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body?.storyText !== "string" ||
    !body.storyText.trim() ||
    !LANGUAGES.has(body.language) ||
    typeof body.interactive !== "boolean"
  ) {
    return NextResponse.json(
      { error: "storyText, a supported language, and interactive are required" },
      { status: 400 },
    );
  }

  const input: AdaptStoryRequest = {
    ...body,
    storyText: body.storyText.trim().slice(0, 8000),
    childName:
      typeof body.childName === "string" ? body.childName.trim() : undefined,
  };

  try {
    // Call 1 — extract the theme (small output, always fits the token cap).
    const themeRaw = await directorChat(buildAdaptThemeMessages(input), {
      temperature: TEACHER_MODEL_HINTS.adaptStory.temperature,
      maxTokens: 1200,
    });
    const theme = parseTheme(themeRaw, false);

    // Call 2 — beats get the whole budget; retry once ultra-compact if the
    // output still truncates into fewer than 2 usable beats.
    let beats: SceneBeat[];
    try {
      const beatsRaw = await directorChat(
        buildAdaptBeatsMessages(input, theme, false),
        {
          temperature: TEACHER_MODEL_HINTS.adaptStory.temperature,
          maxTokens: TEACHER_MODEL_HINTS.adaptStory.maxTokens,
        },
      );
      beats = parseAdaptBeats(beatsRaw, theme, input.interactive);
    } catch (firstErr) {
      console.error("[adapt-story] beats attempt 1 failed, retrying compact:", firstErr);
      const beatsRaw = await directorChat(
        buildAdaptBeatsMessages(input, theme, true),
        { temperature: 0.4, maxTokens: TEACHER_MODEL_HINTS.adaptStory.maxTokens },
      );
      beats = parseAdaptBeats(beatsRaw, theme, input.interactive);
    }

    return NextResponse.json({ theme, beats } satisfies AdaptStoryResponse);
  } catch (err) {
    console.error("[adapt-story] story adaptation failed:", err);
    return NextResponse.json(
      { error: "Could not adapt teacher story" },
      { status: 502 },
    );
  }
}
