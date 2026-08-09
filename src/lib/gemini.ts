import "server-only";

/**
 * Nano Banana 2 Lite (gemini-3.1-flash-lite-image) client — generates one
 * storybook illustration per beat. Verified live: returns 1408x768 JPEG in
 * roughly 4-7s via the classic generateContent API.
 */

const MODEL = "gemini-3.1-flash-lite-image";

const STYLE_PREFIX =
  "Children's storybook illustration, warm painterly watercolor style, soft " +
  "golden light, rich saturated colors, gentle rounded character shapes, cozy " +
  "and magical, cinematic wide composition. Absolutely no text, no words, no " +
  "letters, no captions anywhere in the image.";

export async function illustrateScene(params: {
  scene: string;
  artDirection: string;
}): Promise<{ imageBase64: string; mime: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");

  const prompt = [
    STYLE_PREFIX,
    `World and characters: ${params.artDirection}`,
    `Illustrate this exact moment: ${params.scene}`,
  ].join("\n\n");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini image failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }>;
      };
    }>;
  };
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) {
    throw new Error("Gemini image returned no inline image data");
  }
  return {
    imageBase64: part.inlineData.data,
    mime: part.inlineData.mimeType ?? "image/jpeg",
  };
}
