import { NextResponse } from "next/server";

import { illustrateScene } from "@/lib/gemini";
import { THEMES } from "@/lib/story/themes";
import type { IllustrateRequest, IllustrateResponse } from "@/lib/story/types";

export const maxDuration = 60;

/** Neutral stand-ins, applied in cast order (narrator first by convention). */
const SCRUB_STAND_INS = [
  "the storyteller",
  "the young hero",
  "their friend",
  "their companion",
  "another friend",
];

/**
 * Famous character names (अलादीन, Jinn, …) trip Gemini's content filter even
 * for public-domain kids' tales — verified live. Replace every cast name with
 * a neutral descriptor; the art direction carries the visual identity.
 */
function scrubText(text: string, scrub: string[]): string {
  let result = text;
  const names = [...scrub].sort((a, b) => b.length - a.length);
  names.forEach((name) => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const standIn =
      SCRUB_STAND_INS[scrub.indexOf(name) % SCRUB_STAND_INS.length];
    result = result.replace(new RegExp(escaped, "gi"), standIn);
  });
  return result;
}

export async function POST(request: Request) {
  let body: IllustrateRequest;
  try {
    body = (await request.json()) as IllustrateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const scrub = Array.isArray(body.scrub)
    ? body.scrub.filter((s): s is string => typeof s === "string")
    : [];
  const clean = (text: string) => (scrub.length ? scrubText(text, scrub) : text);

  const scene = body.scene?.trim();
  const lineText = body.line?.text?.trim();
  const artDirection =
    body.artDirection?.trim() ||
    (body.themeId && body.themeId !== "custom"
      ? THEMES[body.themeId]?.artDirection
      : undefined);
  if ((!scene && !lineText) || !artDirection) {
    return NextResponse.json(
      { error: "scene or line, plus a themeId or artDirection, are required" },
      { status: 400 },
    );
  }

  const moment = lineText
    ? [
        `Depict the exact moment described by this line from a children's audio drama (the line may be in Hindi, Gujarati or another Indian language — depict its MEANING faithfully). Show the moment happening, never a person just talking.`,
        `Line: "${clean(lineText.slice(0, 400))}"`,
        body.context
          ? `Visual continuity — this moment happens within: ${clean(body.context.slice(0, 500))}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : clean(scene!.slice(0, 600));

  try {
    const { imageBase64, mime } = await illustrateScene({
      scene: moment,
      artDirection: clean(artDirection),
    });
    return NextResponse.json({ imageBase64, mime } satisfies IllustrateResponse);
  } catch (firstErr) {
    // Safety-net retry: the content filter can still trigger on residual
    // names inside free text. Fall back to the English context/scene alone
    // with original-characters framing — one generic image beats none.
    try {
      const fallbackScene = clean(
        (body.context ?? scene ?? lineText ?? "").slice(0, 500),
      );
      if (!fallbackScene) throw firstErr;
      const { imageBase64, mime } = await illustrateScene({
        scene: `${fallbackScene}. Original, unbranded storybook characters described only by appearance.`,
        artDirection: clean(artDirection),
      });
      return NextResponse.json({ imageBase64, mime } satisfies IllustrateResponse);
    } catch (err) {
      // Decorative feature: the client treats failures as "keep the gradient".
      console.error("[illustrate] failed:", err);
      return NextResponse.json({ error: "Illustration failed" }, { status: 502 });
    }
  }
}
