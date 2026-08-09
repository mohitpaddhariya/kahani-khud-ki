"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CharacterDef, LanguageCode, SceneBeat, ThemeDef } from "@/lib/story/types";
import { MAX_BEATS } from "@/lib/story/themes";
import { getStrings } from "@/lib/i18n";
import CastRail from "./CastRail";
import ChoicePanel, { type ChoiceStatus } from "./ChoicePanel";
import DirectorInterstitial from "./DirectorInterstitial";
import Waveform from "./Waveform";

export type StagePhase = "scene-loading" | "playing" | "choice" | "listening";

export interface ChoiceUiState {
  processing: boolean;
  transcript: string | null;
  maxRecordMs: number;
  onChip: (text: string) => void;
  onMicToggle: () => void;
}

interface StoryStageProps {
  theme: ThemeDef;
  language: LanguageCode;
  beat: SceneBeat | null;
  phase: StagePhase;
  lineIndex: number;
  beatNumber: number;
  /** Total beats shown in the chapter chip; scripted stories may differ from MAX_BEATS. */
  totalBeats?: number;
  speakingId: string | null;
  waveActive: boolean;
  sceneError: string | null;
  onRetry: () => void;
  choiceUi: ChoiceUiState;
}

export default function StoryStage({
  theme,
  language,
  beat,
  phase,
  lineIndex,
  beatNumber,
  totalBeats,
  speakingId,
  waveActive,
  sceneError,
  onRetry,
  choiceUi,
}: StoryStageProps) {
  const choice = beat?.choice ?? null;
  const showChoice = !!choice && (phase === "choice" || phase === "listening");
  const asker: CharacterDef | null =
    showChoice && choice
      ? theme.cast.find((c) => c.id === choice.askedById) ?? theme.cast[0] ?? null
      : null;
  const line =
    beat && phase !== "scene-loading" && lineIndex >= 0 && lineIndex < beat.lines.length
      ? beat.lines[lineIndex]
      : null;
  const speaker = line ? theme.cast.find((c) => c.id === line.characterId) : null;
  const waveColor = (showChoice ? asker?.color : speaker?.color) ?? "#F59E0B";
  const t = getStrings(language);
  const moodLabel = beat ? t.moods[beat.mood] : null;
  const status: ChoiceStatus = choiceUi.transcript
    ? "confirm"
    : choiceUi.processing
      ? "processing"
      : phase === "listening"
        ? "recording"
        : "asking";

  return (
    <div className="relative z-10 flex flex-1 flex-col px-4 pb-5 pt-5 sm:px-8">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="text-xl sm:text-2xl">{theme.emoji}</span>
          <span className="truncate font-display text-base text-white/75 sm:text-lg">
            {theme.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {moodLabel && <span className="chip">{moodLabel}</span>}
          <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-200">
            {t.chapter} {beatNumber}/{totalBeats ?? MAX_BEATS}
          </span>
        </div>
      </header>

      <CastRail
        cast={theme.cast}
        speakingId={speakingId}
        hiddenId={showChoice ? asker?.id ?? null : null}
        className="mt-6 sm:mt-8"
      />

      <div className="grid flex-1 place-items-center py-6">
        <AnimatePresence mode="wait">
          {showChoice && choice && asker ? (
            <motion.div
              key="choice"
              className="flex w-full justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.35 }}
            >
              <ChoicePanel
                choice={choice}
                asker={asker}
                language={language}
                status={status}
                transcript={choiceUi.transcript}
                maxRecordMs={choiceUi.maxRecordMs}
                onChip={choiceUi.onChip}
                onMicToggle={choiceUi.onMicToggle}
              />
            </motion.div>
          ) : line ? (
            <motion.div
              key={`line-${beatNumber}-${lineIndex}`}
              className="max-w-4xl text-center"
              initial={{ opacity: 0, y: 26, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -18, filter: "blur(6px)" }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <div className="rounded-3xl bg-[#0B0714]/60 px-6 py-5 ring-1 ring-white/10 backdrop-blur-md sm:px-10 sm:py-7">
                {speaker && (
                  <div
                    className="mb-3 text-xs font-semibold sm:text-sm"
                    style={{ color: speaker.color }}
                  >
                    {speaker.name}
                  </div>
                )}
                <p className="font-display text-3xl leading-[1.4] text-white sm:text-4xl lg:text-[2.85rem] [text-shadow:0_2px_18px_rgba(0,0,0,0.8)]">
                  {line.text}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" />
          )}
        </AnimatePresence>
      </div>

      <div className="flex h-12 items-end justify-center">
        <Waveform active={waveActive} color={waveColor} />
      </div>

      <AnimatePresence>
        {phase === "scene-loading" && (
          <DirectorInterstitial
            key="interstitial"
            language={language}
            error={sceneError}
            onRetry={onRetry}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
