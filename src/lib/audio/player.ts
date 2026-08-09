import type {
  CharacterDef,
  DialogueLine,
  LanguageCode,
  SceneBeat,
  StoryChoice,
  TtsRequest,
  TtsResponse,
} from "@/lib/story/types";

/** Gap shown between lines when a single TTS call fails — the show must go on. */
const ERROR_GAP_MS = 1200;
/** How many lines ahead of the currently playing one we keep in flight. */
const PREFETCH_AHEAD = 2;

/**
 * Default narration speed, applied as HTMLAudio playbackRate (exact and
 * uniform — Bulbul's own `pace` maps non-linearly to duration). Browsers
 * preserve pitch at moderate rates, so voices stay natural.
 */
const DEFAULT_PLAYBACK_RATE = 1.25;
const TTS_TIMEOUT_MS = 20000;
// Must be a bulbul:v3 speaker (v2 names like "abhilash" return HTTP 400).
const FALLBACK_SPEAKER = "shubh";

export async function postJson<T>(
  url: string,
  body: unknown,
  timeoutMs = 30000,
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${url} failed with HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

function base64ToObjectUrl(base64: string, mime: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime || "audio/wav" }));
}

export interface ScenePlayOptions {
  cast: CharacterDef[];
  language: LanguageCode;
  onLineStart?: (index: number, line: DialogueLine) => void;
  /** Fired right before the beat's choice question is spoken (in the asker's voice). */
  onQuestionStart?: (choice: StoryChoice) => void;
  onLinesDone?: () => void;
  onError?: (index: number, error: unknown) => void;
}

interface PlayItem {
  characterId: string;
  text: string;
  question?: StoryChoice;
}

/**
 * Sequential beat player with a prefetch pipeline: line N+1's TTS request is
 * started the moment line N begins playing, so playback stays gapless.
 */
export class ScenePlayer {
  private token = 0;
  private audio: HTMLAudioElement | null = null;
  private cancelCurrent: (() => void) | null = null;
  private objectUrls: string[] = [];

  async play(beat: SceneBeat, opts: ScenePlayOptions): Promise<void> {
    this.stop();
    const token = ++this.token;

    const items: PlayItem[] = beat.lines.map((line) => ({
      characterId: line.characterId,
      text: line.text,
    }));
    if (beat.choice) {
      items.push({
        characterId: beat.choice.askedById,
        text: beat.choice.question,
        question: beat.choice,
      });
    }

    const voices = new Map(opts.cast.map((c) => [c.id, c]));
    const fallbackVoice = voices.get("narrator") ?? opts.cast[0];
    const fetches = new Map<number, Promise<string>>();

    const ensureFetch = (index: number) => {
      if (index < 0 || index >= items.length || fetches.has(index)) return;
      const item = items[index];
      const voice = voices.get(item.characterId) ?? fallbackVoice;
      const request: TtsRequest = {
        text: item.text,
        speaker: voice?.speaker ?? FALLBACK_SPEAKER,
        language: opts.language,
        ...(voice?.pace !== undefined ? { pace: voice.pace } : {}),
      };
      const promise = this.fetchTts(request, token);
      // Observe rejections of prefetches that may never be awaited (e.g. stop()).
      promise.catch(() => undefined);
      fetches.set(index, promise);
    };

    ensureFetch(0);
    for (let i = 0; i < items.length; i++) {
      if (token !== this.token) return;
      for (let ahead = 1; ahead <= PREFETCH_AHEAD; ahead++) ensureFetch(i + ahead);

      const item = items[i];
      const announce = () => {
        if (item.question) opts.onQuestionStart?.(item.question);
        else opts.onLineStart?.(i, { characterId: item.characterId, text: item.text });
      };

      // The subtitle appears only once its audio is ready to play, so voice
      // and text always start together (no silent text at beat starts).
      try {
        const url = await fetches.get(i)!;
        if (token !== this.token) return;
        announce();
        await this.playUrl(url);
      } catch (error) {
        if (token !== this.token) return;
        announce();
        opts.onError?.(i, error);
        await this.wait(ERROR_GAP_MS);
      }
      if (token !== this.token) return;
    }

    this.revokeUrls();
    opts.onLinesDone?.();
  }

  stop(): void {
    this.token++;
    const cancel = this.cancelCurrent;
    this.cancelCurrent = null;
    cancel?.();
    if (this.audio) {
      try {
        this.audio.pause();
      } catch {
        // best-effort pause
      }
      this.audio = null;
    }
    this.revokeUrls();
  }

  private async fetchTts(request: TtsRequest, token: number): Promise<string> {
    const response = await postJson<TtsResponse>("/api/tts", request, TTS_TIMEOUT_MS);
    if (!response.audioBase64) throw new Error("empty TTS payload");
    const url = base64ToObjectUrl(response.audioBase64, response.mime);
    if (token !== this.token) {
      URL.revokeObjectURL(url);
      throw new Error("playback stopped");
    }
    this.objectUrls.push(url);
    return url;
  }

  private playUrl(url: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      audio.playbackRate = DEFAULT_PLAYBACK_RATE;
      this.audio = audio;
      const cleanup = () => {
        audio.onended = null;
        audio.onerror = null;
        this.cancelCurrent = null;
        if (this.audio === audio) this.audio = null;
      };
      this.cancelCurrent = () => {
        cleanup();
        try {
          audio.pause();
        } catch {
          // best-effort pause
        }
        resolve();
      };
      audio.onended = () => {
        cleanup();
        resolve();
      };
      audio.onerror = () => {
        cleanup();
        reject(new Error("audio playback failed"));
      };
      audio.play().catch((error: unknown) => {
        cleanup();
        reject(error);
      });
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const timer = window.setTimeout(() => {
        this.cancelCurrent = null;
        resolve();
      }, ms);
      this.cancelCurrent = () => {
        window.clearTimeout(timer);
        this.cancelCurrent = null;
        resolve();
      };
    });
  }

  private revokeUrls(): void {
    for (const url of this.objectUrls) URL.revokeObjectURL(url);
    this.objectUrls = [];
  }
}
