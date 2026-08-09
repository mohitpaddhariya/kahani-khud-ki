"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import type { LanguageCode, StoryTurn, ThemeDef } from "@/lib/story/types";
import { getStrings } from "@/lib/i18n";
import { mulberry32, truncate } from "./utils";

const CONFETTI_COLORS = ["#fbbf24", "#f59e0b", "#f472b6", "#818cf8", "#34d399", "#f6f1e7"];

interface EndingScreenProps {
  childName: string;
  theme: ThemeDef;
  language: LanguageCode;
  turns: StoryTurn[];
  onReplay: () => void;
  /** When present, shows the report-card button next to replay. */
  onReport?: () => void;
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

export default function EndingScreen({
  childName,
  theme,
  language,
  turns,
  onReplay,
  onReport,
}: EndingScreenProps) {
  const t = getStrings(language);
  const confetti = useMemo(() => {
    const rnd = mulberry32(97);
    return Array.from({ length: 46 }, (_, i) => ({
      id: i,
      left: rnd() * 100,
      w: 5 + rnd() * 6,
      h: 8 + rnd() * 10,
      color: CONFETTI_COLORS[Math.floor(rnd() * CONFETTI_COLORS.length)],
      duration: 4 + rnd() * 5,
      delay: -rnd() * 9,
      drift: (rnd() * 10 - 5).toFixed(1),
      spin: Math.round(360 + rnd() * 540),
      round: rnd() > 0.6,
    }));
  }, []);

  const firstLine = (turn: StoryTurn) => {
    const line =
      turn.beat.lines.find((l) => l.characterId === "narrator") ?? turn.beat.lines[0];
    return line ? line.text : "";
  };

  return (
    <div className="relative z-10 flex flex-1 flex-col overflow-y-auto">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((piece) => (
          <span
            key={piece.id}
            className="confetti"
            style={
              {
                left: `${piece.left}%`,
                width: piece.w,
                height: piece.round ? piece.w : piece.h,
                backgroundColor: piece.color,
                borderRadius: piece.round ? 9999 : 2,
                animationDuration: `${piece.duration}s`,
                animationDelay: `${piece.delay}s`,
                "--confetti-drift": `${piece.drift}vw`,
                "--confetti-spin": `${piece.spin}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-6 px-6 py-10 text-center"
      >
        <motion.div variants={fadeUp} className="text-6xl sm:text-7xl">
          {theme.emoji}
        </motion.div>
        <motion.h1
          variants={fadeUp}
          className="bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text pb-2 font-display text-6xl leading-[1.15] text-transparent sm:text-8xl"
        >
          {t.theEnd}
        </motion.h1>
        <motion.p variants={fadeUp} className="font-display text-xl text-white/85 sm:text-2xl">
          {t.bravo(childName)}
        </motion.p>

        <motion.div variants={fadeUp} className="glass w-full rounded-3xl p-5 text-left sm:p-7">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <span className="text-xs font-medium tracking-wide text-white/45">{t.yourStory}</span>
            <span className="font-display text-sm text-white/65">{theme.title}</span>
          </div>
          <ol className="recap-scroll relative max-h-[38vh] space-y-5 overflow-y-auto border-l border-white/15 pl-6 pr-2">
            {turns.map((turn, index) => (
              <li key={index} className="relative">
                <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-amber-400 ring-4 ring-amber-400/15" />
                <div className="text-[11px] text-white/40">
                  {t.chapter} {index + 1}
                </div>
                <p className="mt-0.5 font-display text-sm leading-relaxed text-white/85 sm:text-base">
                  {truncate(firstLine(turn), 110)}
                </p>
                {turn.userReply && (
                  <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/15 px-3 py-1 text-xs text-amber-300 sm:text-sm">
                    <span className="shrink-0 opacity-70">{t.youSaid}</span>
                    <span className="truncate font-medium">{turn.userReply}</span>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <motion.button
            type="button"
            onClick={onReplay}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="rounded-full bg-gradient-to-b from-amber-300 to-amber-600 px-10 py-4 font-display text-xl text-ink shadow-[0_12px_40px_rgba(245,158,11,0.35)]"
          >
            {t.replayCta}
          </motion.button>
          {onReport && (
            <motion.button
              type="button"
              onClick={onReport}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="rounded-full border border-white/15 bg-white/5 px-8 py-4 font-display text-xl text-white/85 backdrop-blur-md transition-colors hover:border-amber-400/40 hover:text-amber-200"
            >
              {t.reportCta}
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
