import { NextResponse } from "next/server";

import { directorChat } from "@/lib/sarvam";
import {
  buildCraftThemeMessages,
  parseTheme,
  TEACHER_MODEL_HINTS,
} from "@/lib/story/teacher";
import type {
  CraftThemeRequest,
  CraftThemeResponse,
  LanguageCode,
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
  let body: CraftThemeRequest;
  try {
    body = (await request.json()) as CraftThemeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body?.thought !== "string" ||
    !body.thought.trim() ||
    !LANGUAGES.has(body.language)
  ) {
    return NextResponse.json(
      { error: "thought and a supported language are required" },
      { status: 400 },
    );
  }

  try {
    const raw = await directorChat(
      buildCraftThemeMessages(body.thought.trim(), body.language),
      {
        temperature: TEACHER_MODEL_HINTS.craftTheme.temperature,
        maxTokens: TEACHER_MODEL_HINTS.craftTheme.maxTokens,
      },
    );
    const theme = parseTheme(raw);
    return NextResponse.json({ theme } satisfies CraftThemeResponse);
  } catch (err) {
    console.error("[craft-theme] theme generation failed:", err);
    return NextResponse.json(
      { error: "Could not craft story theme" },
      { status: 502 },
    );
  }
}
