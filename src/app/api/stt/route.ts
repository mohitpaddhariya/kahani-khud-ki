import { NextResponse } from "next/server";

import { transcribe } from "@/lib/sarvam";
import type { LanguageCode, SttResponse } from "@/lib/story/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form" }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }
  const language = (form.get("language") as LanguageCode | null) ?? "unknown";

  try {
    const { transcript, languageCode } = await transcribe({
      audio,
      language,
      filename: audio instanceof File ? audio.name : "answer.webm",
    });
    return NextResponse.json({ transcript, languageCode } satisfies SttResponse);
  } catch (err) {
    console.error("[stt] transcription failed:", err);
    return NextResponse.json({ error: "STT failed" }, { status: 502 });
  }
}
