"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MAX_BEATS, resolveTheme } from "@/lib/story/themes";
import type {
  IllustrateRequest,
  IllustrateResponse,
  Mood,
  ReportRequest,
  ReportResponse,
  SceneBeat,
  SceneRequest,
  SceneResponse,
  StorySession,
  StoryTurn,
  StudentReport,
} from "@/lib/story/types";
import { Ambience } from "@/lib/audio/ambience";
import { ScenePlayer, postJson } from "@/lib/audio/player";
import { recordAnswer, stopRecording, sttUpload } from "@/lib/audio/recorder";
import { getStrings, getThemeL10n } from "@/lib/i18n";
import EndingScreen from "./EndingScreen";
import MoodBackdrop from "./MoodBackdrop";
import ReportCard from "./ReportCard";
import SetupScreen, { type SetupInfo } from "./SetupScreen";
import StoryStage, { type StagePhase } from "./StoryStage";

type Phase = "setup" | "scene-loading" | "playing" | "choice" | "listening" | "ending";

const RECORD_MAX_MS = 6000;
const SCENE_TIMEOUT_MS = 45000;
const CONFIRM_LINGER_MS = 1600;
const ILLUSTRATE_TIMEOUT_MS = 30000;
// Devanagari/Indic reports are token-heavy; generation can take 60-90s.
const REPORT_TIMEOUT_MS = 150000;
/** Scripted beats are local; a short beat gives the interstitial a heartbeat. */
const SCRIPTED_BEAT_DELAY_MS = 450;

/** Loose matching between a spoken/tapped answer and a prefetched option. */
const normalizeReply = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

export default function KahaniApp() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [setup, setSetup] = useState<SetupInfo | null>(null);
  const [turns, setTurns] = useState<StoryTurn[]>([]);
  const [beat, setBeat] = useState<SceneBeat | null>(null);
  const [lineIndex, setLineIndex] = useState(-1);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [waveActive, setWaveActive] = useState(false);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [sttProcessing, setSttProcessing] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [illustration, setIllustration] = useState<{ url: string; seq: number } | null>(
    null,
  );
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<StudentReport | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const playerRef = useRef<ScenePlayer | null>(null);
  const ambienceRef = useRef<Ambience | null>(null);
  const setupRef = useRef<SetupInfo | null>(null);
  const turnsRef = useRef<StoryTurn[]>([]);
  const beatRef = useRef<SceneBeat | null>(null);
  const lastReplyRef = useRef<string | undefined>(undefined);
  /** Bumped on start/replay so stale async continuations bail out. */
  const genRef = useRef(0);
  /** Bumped per answer attempt so an abandoned recording can't finish the turn. */
  const answerGenRef = useRef(0);
  const toastTimerRef = useRef<number | null>(null);
  /**
   * Speculative branch prefetch: both option beats are generated while the
   * current beat's audio is still playing, keyed by normalized option text.
   * A matching answer starts the next chapter almost instantly.
   */
  const prefetchRef = useRef<Map<string, Promise<SceneResponse | null>> | null>(null);
  /** One illustration per narration line, launched with limited lookahead. */
  const lineImagesRef = useRef<{
    forBeat: SceneBeat;
    urls: (string | null)[];
    launched: boolean[];
  } | null>(null);
  const lineIndexRef = useRef(-1);
  const illustrationSeqRef = useRef(0);
  /** The director's secret plan, captured from the first live beat. */
  const outlineRef = useRef<string[] | undefined>(undefined);

  const player = () => (playerRef.current ??= new ScenePlayer());
  const ambience = () => (ambienceRef.current ??= new Ambience());
  const t = getStrings(setup?.language ?? "hi-IN");

  useEffect(() => {
    const p = (playerRef.current ??= new ScenePlayer());
    const a = (ambienceRef.current ??= new Ambience());
    return () => {
      p.stop();
      a.stop();
      stopRecording();
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4200);
  };

  const appendTurn = (turn: StoryTurn) => {
    turnsRef.current = [...turnsRef.current, turn];
    setTurns(turnsRef.current);
  };

  /** Session payload for /api/scene and /api/report — carries the custom
   * theme (teacher worlds) and the stored outline once beat 1 delivered it. */
  const buildSession = (info: SetupInfo, sessionTurns: StoryTurn[]): StorySession => ({
    childName: info.childName,
    language: info.language,
    themeId: info.themeId,
    ...(info.themeId === "custom" && info.customTheme
      ? { customTheme: info.customTheme }
      : {}),
    ...(outlineRef.current ? { outline: outlineRef.current } : {}),
    turns: sessionTurns,
  });

  const requestScene = async (userReply?: string) => {
    const info = setupRef.current;
    if (!info) return;
    const gen = genRef.current;
    lastReplyRef.current = userReply;
    setSceneError(null);
    setPhase("scene-loading");
    setWaveActive(false);
    setSpeakingId(null);

    // Scripted mode (teacher's adapted story): beats are already on the
    // client — serve the next one locally, no director round-trip.
    if (info.mode === "scripted") {
      const next = info.scriptedBeats?.[turnsRef.current.length];
      window.setTimeout(() => {
        if (gen !== genRef.current) return;
        if (!next || !Array.isArray(next.lines) || next.lines.length === 0) {
          // Ran past the script (last beat missing isEnding) — close warmly.
          setPhase("ending");
          return;
        }
        startBeat(next);
      }, SCRIPTED_BEAT_DELAY_MS);
      return;
    }

    const request: SceneRequest = {
      session: buildSession(info, turnsRef.current),
      ...(userReply === undefined ? {} : { userReply }),
    };
    const prefetched =
      userReply !== undefined
        ? prefetchRef.current?.get(normalizeReply(userReply))
        : undefined;
    prefetchRef.current = null;
    try {
      const response =
        (prefetched ? await prefetched : null) ??
        (await postJson<SceneResponse>("/api/scene", request, SCENE_TIMEOUT_MS));
      if (gen !== genRef.current) return;
      const nextBeat = response.beat;
      if (!nextBeat || !Array.isArray(nextBeat.lines) || nextBeat.lines.length === 0) {
        throw new Error(t.errEmptyScene);
      }
      startBeat(nextBeat);
    } catch (error) {
      if (gen !== genRef.current) return;
      setSceneError(error instanceof Error ? error.message : t.errEmptyScene);
    }
  };

  const showIllustration = (url: string) => {
    illustrationSeqRef.current += 1;
    setIllustration({ url, seq: illustrationSeqRef.current });
  };

  const illustrate = async (request: IllustrateRequest) => {
    const res = await postJson<IllustrateResponse>(
      "/api/illustrate",
      request,
      ILLUSTRATE_TIMEOUT_MS,
    );
    return `data:${res.mime};base64,${res.imageBase64}`;
  };

  /** How many upcoming lines may have image requests in flight. */
  const IMAGE_LOOKAHEAD = 2;

  const launchLineImage = (forBeat: SceneBeat, index: number) => {
    const info = setupRef.current;
    const slot = lineImagesRef.current;
    if (!info || !slot || slot.forBeat !== forBeat) return;
    if (index < 0 || index >= forBeat.lines.length || slot.launched[index]) return;
    slot.launched[index] = true;

    const gen = genRef.current;
    const line = forBeat.lines[index];
    const cast = resolveTheme(info).cast;
    const speaker = cast.find((c) => c.id === line.characterId)?.name ?? "narrator";
    const midpoint = Math.ceil(forBeat.lines.length / 2);
    const context =
      index < midpoint ? forBeat.scene : (forBeat.scene2 ?? forBeat.scene);
    // Teacher stories can star famous characters whose names trip the image
    // model's content filter — send cast names for server-side neutralizing.
    const scrub =
      info.themeId === "custom" ? { scrub: cast.map((c) => c.name) } : {};
    const custom =
      info.themeId === "custom" && info.customTheme
        ? { artDirection: info.customTheme.artDirection }
        : {};

    // Line 0 uses the beat's establishing shot directly — it is richer than
    // a single line and anchors the visual continuity of the whole beat.
    const request: IllustrateRequest =
      index === 0 && forBeat.scene
        ? { scene: forBeat.scene, themeId: info.themeId, ...custom, ...scrub }
        : {
            line: { text: line.text, speaker },
            context,
            themeId: info.themeId,
            ...custom,
            ...scrub,
          };

    void illustrate(request)
      .then((url) => {
        if (gen !== genRef.current || beatRef.current !== forBeat) return;
        const current = lineImagesRef.current;
        if (!current || current.forBeat !== forBeat) return;
        current.urls[index] = url;
        // Show immediately if narration is on (or already past) this line and
        // nothing newer has been shown.
        if (lineIndexRef.current === index) showIllustration(url);
      })
      .catch(() => undefined);
  };

  const setupLineIllustrations = (forBeat: SceneBeat) => {
    lineImagesRef.current = {
      forBeat,
      urls: new Array<string | null>(forBeat.lines.length).fill(null),
      launched: new Array<boolean>(forBeat.lines.length).fill(false),
    };
    for (let i = 0; i <= Math.min(IMAGE_LOOKAHEAD, forBeat.lines.length - 1); i++) {
      launchLineImage(forBeat, i);
    }
  };

  const onNarrationLine = (forBeat: SceneBeat, index: number) => {
    const slot = lineImagesRef.current;
    if (slot && slot.forBeat === forBeat) {
      const ready = slot.urls[index];
      if (ready) showIllustration(ready);
      launchLineImage(forBeat, index + IMAGE_LOOKAHEAD);
    }
  };

  const prefetchBranches = (forBeat: SceneBeat) => {
    prefetchRef.current = null;
    const info = setupRef.current;
    if (!info || info.mode === "scripted" || forBeat.isEnding || !forBeat.choice) return;
    const map = new Map<string, Promise<SceneResponse | null>>();
    for (const option of forBeat.choice.options) {
      const request: SceneRequest = {
        session: buildSession(info, [
          ...turnsRef.current,
          { beat: forBeat, userReply: option },
        ]),
        userReply: option,
      };
      map.set(
        normalizeReply(option),
        postJson<SceneResponse>("/api/scene", request, SCENE_TIMEOUT_MS).catch(
          () => null,
        ),
      );
    }
    prefetchRef.current = map;
  };

  const startBeat = (nextBeat: SceneBeat) => {
    const info = setupRef.current;
    if (!info) return;
    // The first live beat carries the director's plan — store it before
    // prefetching branches so every follow-up session includes it.
    if (nextBeat.outline && !outlineRef.current) outlineRef.current = nextBeat.outline;
    beatRef.current = nextBeat;
    setBeat(nextBeat);
    setLineIndex(-1);
    setTranscriptPreview(null);
    setSttProcessing(false);
    // Stay on the interstitial until the first line's audio is fetched — the
    // subtitle and the voice must start together.
    ambience().setMood(nextBeat.mood);
    lineIndexRef.current = -1;
    setupLineIllustrations(nextBeat);
    prefetchBranches(nextBeat);
    const theme = resolveTheme(info);
    player()
      .play(nextBeat, {
        cast: theme.cast,
        language: info.language,
        onLineStart: (index, line) => {
          if (index === 0) setPhase("playing");
          lineIndexRef.current = index;
          setLineIndex(index);
          setSpeakingId(line.characterId);
          setWaveActive(true);
          ambience().duck(true);
          onNarrationLine(nextBeat, index);
        },
        onQuestionStart: (choice) => {
          setSpeakingId(choice.askedById);
          setWaveActive(true);
          setPhase("choice");
        },
        onError: () => {
          setWaveActive(false);
        },
        onLinesDone: () => {
          setWaveActive(false);
          setSpeakingId(null);
          ambience().duck(false);
          if (nextBeat.isEnding) {
            appendTurn({ beat: nextBeat });
            setPhase("ending");
          } else if (!nextBeat.choice) {
            appendTurn({ beat: nextBeat });
            void requestScene(undefined);
          } else {
            setPhase("choice");
          }
        },
      })
      .catch(() => undefined);
  };

  const finalizeAnswer = (reply: string) => {
    const current = beatRef.current;
    if (!current) return;
    answerGenRef.current++;
    stopRecording();
    player().stop();
    ambience().duck(false);
    setWaveActive(false);
    setSpeakingId(null);
    setTranscriptPreview(null);
    setSttProcessing(false);
    appendTurn({ beat: current, userReply: reply });
    void requestScene(reply);
  };

  const captureAnswer = async () => {
    const gen = genRef.current;
    const answerGen = ++answerGenRef.current;
    let blob: Blob;
    try {
      blob = await recordAnswer(RECORD_MAX_MS);
    } catch {
      if (gen !== genRef.current || answerGen !== answerGenRef.current) return;
      showToast(t.toastMicFail);
      setPhase("choice");
      return;
    }
    if (gen !== genRef.current || answerGen !== answerGenRef.current) return;
    setSttProcessing(true);
    try {
      const info = setupRef.current;
      if (!info) return;
      const transcript = await sttUpload(blob, info.language);
      if (gen !== genRef.current || answerGen !== answerGenRef.current) return;
      if (!transcript) {
        showToast(t.toastSttEmpty);
        setSttProcessing(false);
        setPhase("choice");
        return;
      }
      setTranscriptPreview(transcript);
      window.setTimeout(() => {
        if (gen === genRef.current && answerGen === answerGenRef.current) {
          finalizeAnswer(transcript);
        }
      }, CONFIRM_LINGER_MS);
    } catch {
      if (gen !== genRef.current || answerGen !== answerGenRef.current) return;
      showToast(t.toastSttFail);
      setSttProcessing(false);
      setPhase("choice");
    }
  };

  const handleMicToggle = () => {
    if (phase === "choice") {
      player().stop();
      ambience().duck(false);
      setWaveActive(false);
      setSpeakingId(null);
      setPhase("listening");
      void captureAnswer();
    } else if (phase === "listening" && !sttProcessing) {
      stopRecording();
    }
  };

  const handleChip = (text: string) => {
    if (sttProcessing || transcriptPreview) return;
    finalizeAnswer(text);
  };

  const handleStart = (info: SetupInfo) => {
    genRef.current++;
    answerGenRef.current++;
    setupRef.current = info;
    turnsRef.current = [];
    beatRef.current = null;
    prefetchRef.current = null;
    lineImagesRef.current = null;
    outlineRef.current = undefined;
    setIllustration(null);
    setSetup(info);
    setTurns([]);
    setBeat(null);
    setLineIndex(-1);
    setSpeakingId(null);
    setTranscriptPreview(null);
    setSttProcessing(false);
    setReportData(null);
    setReportOpen(false);
    setReportLoading(false);
    ambience().start();
    ambience().setMood("calm");
    void requestScene(undefined);
  };

  const handleReplay = () => {
    genRef.current++;
    answerGenRef.current++;
    player().stop();
    ambience().stop();
    stopRecording();
    setupRef.current = null;
    turnsRef.current = [];
    beatRef.current = null;
    prefetchRef.current = null;
    lineImagesRef.current = null;
    outlineRef.current = undefined;
    setIllustration(null);
    setSetup(null);
    setTurns([]);
    setBeat(null);
    setLineIndex(-1);
    setSpeakingId(null);
    setWaveActive(false);
    setSceneError(null);
    setSttProcessing(false);
    setTranscriptPreview(null);
    setReportData(null);
    setReportOpen(false);
    setReportLoading(false);
    setPhase("setup");
  };

  const handleRetry = () => {
    void requestScene(lastReplyRef.current);
  };

  const handleReport = () => {
    const info = setupRef.current;
    if (!info) return;
    // Cached from a previous open — instant.
    if (reportData) {
      setReportOpen(true);
      return;
    }
    if (reportLoading) return;
    const gen = genRef.current;
    setReportLoading(true);
    const request: ReportRequest = { session: buildSession(info, turnsRef.current) };
    postJson<ReportResponse>("/api/report", request, REPORT_TIMEOUT_MS)
      .then((response) => {
        if (gen !== genRef.current) return;
        setReportData(response.report);
        setReportOpen(true);
      })
      .catch(() => {
        if (gen !== genRef.current) return;
        showToast(t.reportError);
      })
      .finally(() => {
        if (gen !== genRef.current) return;
        setReportLoading(false);
      });
  };

  const macro = phase === "setup" ? "setup" : phase === "ending" ? "ending" : "stage";
  const baseTheme = setup ? resolveTheme(setup) : null;
  const theme = useMemo(() => {
    if (!baseTheme || !setup) return baseTheme;
    // Custom themes are already written in the session language.
    if (setup.themeId === "custom") return baseTheme;
    const l10n = getThemeL10n(setup.themeId, setup.language);
    if (!l10n) return baseTheme;
    return {
      ...baseTheme,
      title: l10n.title,
      tagline: l10n.tagline,
      cast: baseTheme.cast.map((c) => ({
        ...c,
        name: l10n.castNames[c.id] ?? c.name,
      })),
    };
  }, [baseTheme, setup]);
  const totalBeats =
    setup?.mode === "scripted" && setup.scriptedBeats?.length
      ? setup.scriptedBeats.length
      : MAX_BEATS;
  const visualMood: Mood = phase === "setup" ? "calm" : beat?.mood ?? "mystery";

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col overflow-hidden">
      <MoodBackdrop mood={visualMood} />
      <AnimatePresence>
        {macro === "stage" && illustration && (
          <motion.div
            key={illustration.seq}
            aria-hidden
            className="pointer-events-none fixed inset-0 overflow-hidden"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={illustration.url}
              alt=""
              className="h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(8,5,16,0.5) 0%, rgba(8,5,16,0.62) 55%, rgba(8,5,16,0.88) 100%)",
              }}
            />
            <div className="grain" />
            <div className="vignette" />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {macro === "setup" && (
          <motion.section
            key="setup"
            className="flex flex-1 flex-col"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <SetupScreen onStart={handleStart} />
          </motion.section>
        )}
        {macro === "stage" && theme && setup && (
          <motion.section
            key="stage"
            className="flex flex-1 flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <StoryStage
              theme={theme}
              language={setup.language}
              beat={beat}
              phase={phase as StagePhase}
              lineIndex={lineIndex}
              beatNumber={Math.min(turns.length + 1, totalBeats)}
              totalBeats={totalBeats}
              speakingId={speakingId}
              waveActive={waveActive}
              sceneError={sceneError}
              onRetry={handleRetry}
              choiceUi={{
                processing: sttProcessing,
                transcript: transcriptPreview,
                maxRecordMs: RECORD_MAX_MS,
                onChip: handleChip,
                onMicToggle: handleMicToggle,
              }}
            />
          </motion.section>
        )}
        {macro === "ending" && theme && setup && (
          <motion.section
            key="ending"
            className="flex flex-1 flex-col"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <EndingScreen
              childName={setup.childName}
              theme={theme}
              language={setup.language}
              turns={turns}
              onReplay={handleReplay}
              onReport={handleReport}
            />
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reportLoading && (
          <motion.div
            key="report-loading"
            className="fixed inset-0 z-40 grid place-items-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="glass flex items-center gap-3 rounded-full px-6 py-4">
              <span
                aria-hidden
                className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300/40 border-t-amber-300"
              />
              <span className="font-display text-lg text-white/85">{t.reportLoading}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reportOpen && reportData && setup && (
          <ReportCard
            report={reportData}
            childName={setup.childName}
            language={setup.language}
            onClose={() => setReportOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 16, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 10, x: "-50%" }}
            className="glass fixed bottom-6 left-1/2 z-50 max-w-[92vw] rounded-full px-5 py-3 text-sm text-white/85"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
