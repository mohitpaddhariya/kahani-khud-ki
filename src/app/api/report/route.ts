import { NextResponse } from "next/server";

import { directorChat } from "@/lib/sarvam";
import {
  buildReportMessages,
  parseStudentReport,
  TEACHER_MODEL_HINTS,
} from "@/lib/story/teacher";
import type { ReportRequest, ReportResponse } from "@/lib/story/types";

export const maxDuration = 90;

export async function POST(request: Request) {
  let body: ReportRequest;
  try {
    body = (await request.json()) as ReportRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { session } = body;
  if (
    !session?.childName ||
    !session?.language ||
    !session?.themeId ||
    !Array.isArray(session.turns)
  ) {
    return NextResponse.json({ error: "Incomplete session" }, { status: 400 });
  }

  try {
    const raw = await directorChat(buildReportMessages(session), {
      temperature: TEACHER_MODEL_HINTS.report.temperature,
      maxTokens: TEACHER_MODEL_HINTS.report.maxTokens,
    });
    const report = parseStudentReport(raw, session);
    return NextResponse.json({ report } satisfies ReportResponse);
  } catch (err) {
    console.error("[report] teacher analysis failed:", err);
    return NextResponse.json(
      { error: "Could not generate student report" },
      { status: 502 },
    );
  }
}
