"use client";

import { motion } from "framer-motion";
import type { LanguageCode } from "@/lib/story/types";
import { getStrings } from "@/lib/i18n";

interface DirectorInterstitialProps {
  language: LanguageCode;
  error: string | null;
  onRetry: () => void;
}

/** "Director is thinking" overlay shown while /api/scene is in flight. */
export default function DirectorInterstitial({
  language,
  error,
  onRetry,
}: DirectorInterstitialProps) {
  const t = getStrings(language);
  return (
    <motion.div
      className="absolute inset-0 z-30 grid place-items-center bg-ink/55 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex max-w-md flex-col items-center gap-5 px-6 text-center">
        {error ? (
          <>
            <div className="text-5xl">🎭</div>
            <h2 className="font-display text-2xl text-white sm:text-3xl">
              {t.errorTitle}
            </h2>
            <p className="text-sm text-white/50">{error}</p>
            <motion.button
              type="button"
              onClick={onRetry}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="rounded-full bg-gradient-to-b from-amber-300 to-amber-600 px-8 py-3 font-display text-lg text-ink shadow-lg shadow-amber-500/30"
            >
              {t.retryCta}
            </motion.button>
          </>
        ) : (
          <>
            <div className="relative">
              <motion.div
                className="text-6xl"
                animate={{ rotate: [-9, 7, -9], y: [0, -7, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              >
                🪶
              </motion.div>
              <motion.span
                className="absolute -right-5 -top-2 text-xl"
                animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.15, 0.8] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              >
                ✨
              </motion.span>
              <motion.span
                className="absolute -left-6 bottom-0 text-sm"
                animate={{ opacity: [1, 0.15, 1], scale: [1.1, 0.8, 1.1] }}
                transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut" }}
              >
                ✨
              </motion.span>
            </div>
            <h2 className="font-display text-2xl text-white sm:text-3xl">
              {t.weaving}
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0.15, 1, 0.15] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.25 }}
                >
                  .
                </motion.span>
              ))}
            </h2>
            <div className="h-1 w-44 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full w-1/4 rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent"
                style={{ animation: "slide-bar 1.5s ease-in-out infinite" }}
              />
            </div>
            <p className="text-xs text-white/40">{t.magicNote}</p>
          </>
        )}
      </div>
    </motion.div>
  );
}
