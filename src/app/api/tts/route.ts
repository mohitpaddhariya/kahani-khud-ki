import { NextResponse } from "next/server";

import { synthesize } from "@/lib/sarvam";
import type { TtsRequest, TtsResponse } from "@/lib/story/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  let body: TtsRequest;
  try {
    body = (await request.json()) as TtsRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text || !body.speaker || !body.language) {
    return NextResponse.json(
      { error: "text, speaker and language are required" },
      { status: 400 },
    );
  }

  try {
    const { audioBase64, mime } = await synthesize({
      text,
      speaker: body.speaker,
      language: body.language,
      pace: body.pace,
    });
    return NextResponse.json({ audioBase64, mime } satisfies TtsResponse);
  } catch (err) {
    console.error("[tts] synthesis failed:", err);
    return NextResponse.json({ error: "TTS failed" }, { status: 502 });
  }
}
