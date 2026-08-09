import type { Mood } from "@/lib/story/types";

export interface MoodScene {
  label: string;
  mid: string;
  glowA: string;
  glowB: string;
  accent: string;
}

export const MOOD_SCENE: Record<Mood, MoodScene> = {
  calm: { label: "शांत", mid: "#161028", glowA: "#31215c", glowB: "#3d2350", accent: "#c4b5fd" },
  mystery: { label: "रहस्य", mid: "#0e0c20", glowA: "#1c2a52", glowB: "#301c4f", accent: "#93c5fd" },
  tension: { label: "तनाव", mid: "#170716", glowA: "#4c1030", glowB: "#331347", accent: "#fda4af" },
  adventure: { label: "रोमांच", mid: "#0f1526", glowA: "#0e4a41", glowB: "#31215c", accent: "#5eead4" },
  triumph: { label: "विजय", mid: "#1c1126", glowA: "#5b3a06", glowB: "#4a1d5e", accent: "#fcd34d" },
  sad: { label: "उदासी", mid: "#0d0d1d", glowA: "#16264a", glowB: "#231a3e", accent: "#a5b4fc" },
};

export function moodBackground(mood: Mood): string {
  const m = MOOD_SCENE[mood];
  return [
    `radial-gradient(90% 70% at 16% 6%, ${m.glowA}d9 0%, transparent 62%)`,
    `radial-gradient(85% 65% at 86% 90%, ${m.glowB}c4 0%, transparent 64%)`,
    `radial-gradient(52% 42% at 50% 48%, ${m.mid} 0%, transparent 100%)`,
    `linear-gradient(180deg, ${m.mid} 0%, #0b0714 76%)`,
  ].join(", ");
}
