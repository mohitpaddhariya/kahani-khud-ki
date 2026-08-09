"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Mood } from "@/lib/story/types";
import { moodBackground } from "./mood";
import { mulberry32 } from "./utils";

const DUST_COUNT = 24;

/**
 * Full-screen theater backdrop: mood-tinted gradient (crossfaded on mood
 * change), a breathing amber spotlight, floating dust, film grain and a
 * vignette. Everything is CSS-cheap.
 */
export default function MoodBackdrop({ mood }: { mood: Mood }) {
  const dust = useMemo(() => {
    const rnd = mulberry32(20260809);
    return Array.from({ length: DUST_COUNT }, (_, i) => ({
      id: i,
      left: rnd() * 100,
      size: 1.5 + rnd() * 3.5,
      duration: 16 + rnd() * 22,
      delay: -rnd() * 30,
      opacity: 0.08 + rnd() * 0.2,
      drift: (rnd() * 8 - 4).toFixed(1),
    }));
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.div
          key={mood}
          className="absolute inset-0"
          style={{ background: moodBackground(mood) }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.8, ease: "easeInOut" }}
        />
      </AnimatePresence>
      <div className="spotlight" />
      {dust.map((d) => (
        <span
          key={d.id}
          className="dust"
          style={
            {
              left: `${d.left}%`,
              width: d.size,
              height: d.size,
              animationDuration: `${d.duration}s`,
              animationDelay: `${d.delay}s`,
              "--dust-opacity": String(d.opacity),
              "--dust-drift": `${d.drift}vw`,
            } as CSSProperties
          }
        />
      ))}
      <div className="grain" />
      <div className="vignette" />
    </div>
  );
}
