"use client";

import { motion } from "framer-motion";
import type { CharacterDef } from "@/lib/story/types";

interface CastRailProps {
  cast: CharacterDef[];
  speakingId: string | null;
  /** Character temporarily "on stage" in the choice panel (its avatar morphs there via layoutId). */
  hiddenId: string | null;
  className?: string;
}

export default function CastRail({ cast, speakingId, hiddenId, className }: CastRailProps) {
  return (
    <div
      className={`flex flex-wrap items-start justify-center gap-4 sm:gap-7 ${className ?? ""}`}
    >
      {cast.map((character) => {
        const speaking = character.id === speakingId;
        const dimmed = speakingId !== null && !speaking;
        return (
          <motion.div
            key={character.id}
            animate={{ scale: speaking ? 1.08 : 1, opacity: dimmed ? 0.6 : 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="flex w-16 flex-col items-center gap-2 sm:w-20"
          >
            {character.id === hiddenId ? (
              <div className="h-14 w-14 rounded-full border border-dashed border-white/10 sm:h-16 sm:w-16" />
            ) : (
              <motion.div
                layoutId={`cast-avatar-${character.id}`}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                animate={{
                  borderColor: speaking ? character.color : "rgba(255,255,255,0.14)",
                  boxShadow: speaking
                    ? `0 0 22px ${character.color}80, 0 0 60px ${character.color}40`
                    : "0 0 0px rgba(0,0,0,0)",
                }}
                className="glass grid h-14 w-14 place-items-center rounded-full text-2xl sm:h-16 sm:w-16 sm:text-3xl"
              >
                <span>{character.emoji}</span>
              </motion.div>
            )}
            <span
              className="max-w-full truncate text-[11px] sm:text-xs"
              style={{ color: speaking ? character.color : "rgba(255,255,255,0.55)" }}
            >
              {character.name}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
