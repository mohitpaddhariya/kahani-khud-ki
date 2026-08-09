import { NextResponse } from "next/server";

import { directorChat } from "@/lib/sarvam";
import {
  buildDirectorMessages,
  parseSceneBeat,
  DIRECTOR_MODEL_HINTS,
} from "@/lib/story/director";
import { getFallbackBeat } from "@/lib/story/fallback";
import { resolveTheme } from "@/lib/story/themes";
import type {
  SceneBeat,
  SceneRequest,
  SceneResponse,
  ThemeDef,
} from "@/lib/story/types";

export const maxDuration = 90;

/**
 * Fallback beats are written for the jungle cast; remap any characterId that
 * does not exist in the active theme's cast to the narrator so the show goes on.
 */
function remapToCast(beat: SceneBeat, theme: ThemeDef): SceneBeat {
  const validIds = new Set(theme.cast.map((c) => c.id));
  return {
    ...beat,
    lines: beat.lines.map((line) =>
      validIds.has(line.characterId) ? line : { ...line, characterId: "narrator" },
    ),
    choice:
      beat.choice && !validIds.has(beat.choice.askedById)
        ? { ...beat.choice, askedById: "narrator" }
        : beat.choice,
  };
}

export async function POST(request: Request) {
  let body: SceneRequest;
  try {
    body = (await request.json()) as SceneRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { session, userReply } = body;
  if (!session?.childName || !session?.themeId || !session?.language) {
    return NextResponse.json({ error: "Incomplete session" }, { status: 400 });
  }

  const theme = resolveTheme(session);

  try {
    const messages = buildDirectorMessages(session, userReply);
    const raw = await directorChat(messages, {
      temperature: DIRECTOR_MODEL_HINTS.temperature,
      maxTokens: DIRECTOR_MODEL_HINTS.maxTokens,
    });
    const beat = parseSceneBeat(
      raw,
      theme.cast.map((c) => c.id),
    );
    return NextResponse.json({ beat } satisfies SceneResponse);
  } catch (err) {
    // Demo insurance: never let the show die. Serve the hand-written story.
    console.error("[scene] director failed, serving fallback:", err);
    const beat = remapToCast(
      getFallbackBeat(session.turns.length, session.childName),
      theme,
    );
    return NextResponse.json({ beat } satisfies SceneResponse);
  }
}
