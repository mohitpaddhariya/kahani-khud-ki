"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { CharacterDef, LanguageCode, StoryChoice } from "@/lib/story/types";
import { getStrings } from "@/lib/i18n";

export type ChoiceStatus = "asking" | "recording" | "processing" | "confirm";

interface ChoicePanelProps {
  choice: StoryChoice;
  asker: CharacterDef;
  language: LanguageCode;
  status: ChoiceStatus;
  transcript: string | null;
  maxRecordMs: number;
  onChip: (text: string) => void;
  onMicToggle: () => void;
}

function MicIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
    </svg>
  );
}

export default function ChoicePanel({
  choice,
  asker,
  language,
  status,
  transcript,
  maxRecordMs,
  onChip,
  onMicToggle,
}: ChoicePanelProps) {
  const t = getStrings(language);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (status !== "recording") return;
    const startedAt = performance.now();
    const update = () => setElapsedMs(performance.now() - startedAt);
    const firstTick = window.requestAnimationFrame(update);
    const timer = window.setInterval(update, 100);
    return () => {
      window.cancelAnimationFrame(firstTick);
      window.clearInterval(timer);
    };
  }, [status]);

  const recording = status === "recording";
  const seconds = Math.min(elapsedMs, maxRecordMs) / 1000;

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-5 px-4 text-center">
      <motion.div
        layoutId={`cast-avatar-${asker.id}`}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        className="glass grid h-20 w-20 place-items-center rounded-full text-4xl sm:h-24 sm:w-24 sm:text-5xl"
        style={{
          borderColor: asker.color,
          boxShadow: `0 0 28px ${asker.color}66, 0 0 80px ${asker.color}33`,
        }}
      >
        <span>{asker.emoji}</span>
      </motion.div>
      <div className="text-sm font-semibold" style={{ color: asker.color }}>
        {asker.name}
      </div>

      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
        className="font-display text-2xl leading-snug text-white sm:text-4xl [text-shadow:0_2px_28px_rgba(0,0,0,0.55)]"
      >
        {choice.question}
      </motion.p>

      {status === "confirm" && transcript ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="glass rounded-2xl px-6 py-4"
        >
          <div className="text-xs text-white/50">{t.youSaid}</div>
          <div className="mt-1 font-display text-xl text-amber-300 sm:text-2xl">
            “{transcript}”
          </div>
        </motion.div>
      ) : (
        <>
          <div className="relative mt-1 inline-block">
            {recording && (
              <>
                <span className="pulse-ring" />
                <span className="pulse-ring" style={{ animationDelay: "0.5s" }} />
                <svg className="absolute -inset-2.5" viewBox="0 0 100 100" aria-hidden>
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="47"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: maxRecordMs / 1000, ease: "linear" }}
                  />
                </svg>
              </>
            )}
            <motion.button
              type="button"
              onClick={onMicToggle}
              disabled={status === "processing"}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.93 }}
              aria-label={recording ? t.micAriaStop : t.micAriaStart}
              className={`relative grid h-20 w-20 place-items-center rounded-full text-ink shadow-xl transition-colors sm:h-24 sm:w-24 ${
                recording
                  ? "bg-gradient-to-b from-rose-400 to-rose-600 shadow-rose-500/40"
                  : "bg-gradient-to-b from-amber-300 to-amber-600 shadow-amber-500/40"
              } ${status === "processing" ? "opacity-80" : ""}`}
            >
              {status === "processing" ? (
                <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-ink/25 border-t-ink" />
              ) : recording ? (
                <StopIcon />
              ) : (
                <MicIcon />
              )}
            </motion.button>
          </div>

          <div className="min-h-10 text-sm text-white/70">
            {status === "asking" && <span>{t.micTapHint}</span>}
            {recording && (
              <div className="flex flex-col items-center gap-0.5">
                <span className="font-semibold text-rose-300">
                  {t.speakNow} {seconds.toFixed(1)}s
                </span>
                <span className="text-xs text-white/40">{t.tapToStop}</span>
              </div>
            )}
            {status === "processing" && <span>{t.understanding}</span>}
          </div>

          {status !== "processing" && (
            <div className="flex flex-col items-center gap-2.5">
              <div className="text-xs text-white/40">{t.orPick}</div>
              <div className="flex flex-wrap justify-center gap-3">
                {choice.options.map((option) => (
                  <motion.button
                    key={option}
                    type="button"
                    onClick={() => onChip(option)}
                    whileHover={{ y: -2, scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="glass rounded-full px-5 py-2.5 font-display text-base text-white/90 transition-colors hover:border-amber-300/50 hover:bg-amber-400/10 sm:text-lg"
                  >
                    {option}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
