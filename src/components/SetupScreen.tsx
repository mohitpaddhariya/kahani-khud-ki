"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { THEMES } from "@/lib/story/themes";
import { postJson } from "@/lib/audio/player";
import type {
  AdaptStoryRequest,
  AdaptStoryResponse,
  CraftThemeRequest,
  CraftThemeResponse,
  LanguageCode,
  SceneBeat,
  ThemeDef,
  ThemeId,
  ThemeRef,
} from "@/lib/story/types";
import { getStrings, getThemeL10n } from "@/lib/i18n";

const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: "hi-IN", label: "हिन्दी" },
  { code: "en-IN", label: "English" },
  { code: "bn-IN", label: "বাংলা" },
  { code: "ta-IN", label: "தமிழ்" },
  { code: "te-IN", label: "తెలుగు" },
  { code: "mr-IN", label: "मराठी" },
  { code: "gu-IN", label: "ગુજરાતી" },
  { code: "kn-IN", label: "ಕನ್ನಡ" },
  { code: "ml-IN", label: "മലയാളം" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ" },
  { code: "od-IN", label: "ଓଡ଼ିଆ" },
];

export interface SetupInfo {
  childName: string;
  language: LanguageCode;
  themeId: ThemeRef;
  /** "live" = the AI director writes each beat; "scripted" = pre-adapted beats. */
  mode: "live" | "scripted";
  /** Present when themeId === "custom" (teacher-crafted world). */
  customTheme?: ThemeDef;
  /** Present in scripted mode: the whole drama, served beat by beat. */
  scriptedBeats?: SceneBeat[];
}

const CRAFT_TIMEOUT_MS = 60000;
const ADAPT_TIMEOUT_MS = 90000;
/** The adapt-story contract caps story text at ~8000 chars. */
const MAX_STORY_CHARS = 8000;

/** Static, pre-generated Nano Banana artwork + Bulbul voice greetings. */
const WORLD_ART: Record<ThemeId, { art: string; greeting: string }> = {
  jungle: { art: "/art/world-jungle.jpg", greeting: "/art/greet-jungle.mp3" },
  space: { art: "/art/world-space.jpg", greeting: "/art/greet-space.mp3" },
  mela: { art: "/art/world-mela.jpg", greeting: "/art/greet-mela.mp3" },
};

const WORLD_GLOW: Record<ThemeId, string> = {
  jungle: "52, 211, 153",
  space: "129, 140, 248",
  mela: "244, 114, 182",
};

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

/* ---------------------------- tilt world card ---------------------------- */

interface WorldCardProps {
  theme: ThemeDef;
  title: string;
  tagline: string;
  index: number;
  onPick: () => void;
  onHover: () => void;
}

function WorldCard({ theme, title, tagline, index, onPick, onHover }: WorldCardProps) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 260, damping: 24 });
  const springY = useSpring(rotateY, { stiffness: 260, damping: 24 });
  const glow = WORLD_GLOW[theme.id];

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 14);
    rotateX.set(py * -14);
  };

  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.button
      type="button"
      onClick={onPick}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onHoverStart={onHover}
      initial={{ opacity: 0, y: 44 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.14, duration: 0.6, ease: "easeOut" }}
      whileTap={{ scale: 0.97 }}
      style={{ rotateX: springX, rotateY: springY, transformPerspective: 900 }}
      className="group relative aspect-[3/4] w-full overflow-hidden rounded-[1.75rem] text-left ring-1 ring-white/10 transition-shadow duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={WORLD_ART[theme.id].art}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full scale-[1.06] object-cover transition-transform duration-700 ease-out group-hover:scale-[1.14]"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-90 transition-opacity duration-300 group-hover:opacity-75"
        style={{
          background:
            "linear-gradient(to top, rgba(8,5,16,0.92) 0%, rgba(8,5,16,0.35) 42%, rgba(8,5,16,0.08) 70%, rgba(8,5,16,0.25) 100%)",
        }}
      />
      {/* Hover glow in the world's own color */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-[1.75rem] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          boxShadow: `inset 0 0 0 1.5px rgba(${glow},0.75), 0 0 60px rgba(${glow},0.28)`,
        }}
      />
      {/* Shine sweep */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 transition-all duration-700 ease-out group-hover:left-[110%] group-hover:opacity-100"
      />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <span className="text-3xl drop-shadow sm:text-4xl">{theme.emoji}</span>
        <h3 className="mt-2 font-display text-2xl leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-[1.7rem]">
          {title}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-white/75 drop-shadow sm:text-sm">
          {tagline}
        </p>
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/0 transition-colors duration-300 group-hover:text-amber-200">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300 opacity-0 transition-opacity duration-300 group-hover:animate-pulse group-hover:opacity-100" />
          ▶
        </div>
      </div>
    </motion.button>
  );
}

/* -------------------------------- screen -------------------------------- */

export default function SetupScreen({ onStart }: { onStart: (info: SetupInfo) => void }) {
  const [act, setAct] = useState<"name" | "world">("name");
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<LanguageCode>("hi-IN");
  const [teacherOpen, setTeacherOpen] = useState(false);

  const [thought, setThought] = useState("");
  const [craftBusy, setCraftBusy] = useState(false);
  const [craftError, setCraftError] = useState(false);
  const [crafted, setCrafted] = useState<ThemeDef | null>(null);

  const [storyText, setStoryText] = useState("");
  const [interactive, setInteractive] = useState(true);
  const [adaptBusy, setAdaptBusy] = useState(false);
  const [adaptError, setAdaptError] = useState(false);
  const [adapted, setAdapted] = useState<AdaptStoryResponse | null>(null);

  const greetRef = useRef<HTMLAudioElement | null>(null);
  const lastGreetRef = useRef<{ id: string; at: number }>({ id: "", at: 0 });

  const ready = name.trim().length > 0;
  const t = getStrings(language);
  const listenerName = () => name.trim() || t.classroomName;

  // Warm the world artwork while the child types their name.
  useEffect(() => {
    Object.values(WORLD_ART).forEach(({ art }) => {
      const img = new Image();
      img.src = art;
    });
  }, []);

  const playGreeting = (themeId: ThemeId) => {
    const now = Date.now();
    const last = lastGreetRef.current;
    if (last.id === themeId && now - last.at < 4000) return;
    lastGreetRef.current = { id: themeId, at: now };
    try {
      greetRef.current?.pause();
      const audio = new Audio(WORLD_ART[themeId].greeting);
      audio.volume = 0.95;
      greetRef.current = audio;
      void audio.play().catch(() => undefined);
    } catch {
      // Decorative.
    }
  };

  const goWorld = (event?: FormEvent) => {
    event?.preventDefault();
    if (ready) setAct("world");
  };

  const pickWorld = (themeId: ThemeId) => {
    greetRef.current?.pause();
    onStart({ childName: name.trim(), language, themeId, mode: "live" });
  };

  const craft = async () => {
    const trimmed = thought.trim();
    if (!trimmed || craftBusy) return;
    setCraftBusy(true);
    setCraftError(false);
    setCrafted(null);
    try {
      const request: CraftThemeRequest = { thought: trimmed, language };
      const response = await postJson<CraftThemeResponse>(
        "/api/craft-theme",
        request,
        CRAFT_TIMEOUT_MS,
      );
      setCrafted(response.theme);
    } catch {
      setCraftError(true);
    } finally {
      setCraftBusy(false);
    }
  };

  const adapt = async () => {
    const trimmed = storyText.trim();
    if (!trimmed || adaptBusy) return;
    setAdaptBusy(true);
    setAdaptError(false);
    setAdapted(null);
    try {
      const request: AdaptStoryRequest = {
        storyText: trimmed.slice(0, MAX_STORY_CHARS),
        language,
        interactive,
        ...(name.trim() ? { childName: name.trim() } : {}),
      };
      const response = await postJson<AdaptStoryResponse>(
        "/api/adapt-story",
        request,
        ADAPT_TIMEOUT_MS,
      );
      setAdapted(response);
    } catch {
      setAdaptError(true);
    } finally {
      setAdaptBusy(false);
    }
  };

  const startCrafted = () => {
    if (!crafted) return;
    onStart({
      childName: listenerName(),
      language,
      themeId: "custom",
      customTheme: crafted,
      mode: "live",
    });
  };

  const startAdapted = () => {
    if (!adapted) return;
    onStart({
      childName: listenerName(),
      language,
      themeId: "custom",
      customTheme: adapted.theme,
      scriptedBeats: adapted.beats,
      mode: "scripted",
    });
  };

  const onStoryFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setStoryText(reader.result.slice(0, MAX_STORY_CHARS));
      }
    };
    reader.readAsText(file);
  };

  const canCraft = thought.trim().length > 0 && !craftBusy;
  const canAdapt = storyText.trim().length > 0 && !adaptBusy;

  const startButtonClass =
    "mt-4 w-full rounded-full bg-gradient-to-b from-amber-300 to-amber-600 px-8 py-3 font-display text-lg text-ink shadow-[0_12px_36px_rgba(245,158,11,0.35)]";

  const actionButtonClass = (enabled: boolean) =>
    `inline-flex items-center gap-2 rounded-full px-6 py-2.5 font-display text-base transition ${
      enabled
        ? "bg-gradient-to-b from-amber-300 to-amber-600 text-ink shadow-[0_10px_30px_rgba(245,158,11,0.3)]"
        : "cursor-not-allowed border border-white/10 bg-white/5 text-white/30"
    }`;

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-8 sm:px-8">
      <AnimatePresence mode="wait">
        {act === "name" ? (
          /* ------------------------------ act 1 ------------------------------ */
          <motion.div
            key="act-name"
            className="flex flex-1 flex-col items-center justify-center gap-10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30, transition: { duration: 0.35 } }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="flex flex-col items-center gap-3 sm:gap-4"
            >
              <span className="chip">{t.brandTag}</span>
              <h1 className="animate-glow-pulse bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 bg-clip-text pb-2 font-display text-6xl leading-[1.12] text-transparent drop-shadow-[0_4px_30px_rgba(245,158,11,0.25)] sm:text-8xl">
                {t.brandTitle}
              </h1>
              <p className="font-display text-xl text-white/85 sm:text-2xl">{t.subtitle}</p>
            </motion.div>

            <motion.form
              onSubmit={goWorld}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.7, ease: "easeOut" }}
              className="flex w-full max-w-xl flex-col items-center gap-5"
            >
              <label htmlFor="child-name" className="font-display text-2xl text-white/90 sm:text-3xl">
                {t.namePrompt}
              </label>
              <input
                id="child-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t.namePlaceholder}
                maxLength={24}
                autoComplete="off"
                autoFocus
                className="w-full rounded-3xl border border-white/12 bg-white/[0.06] px-8 py-5 text-center font-display text-3xl text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] outline-none backdrop-blur-sm transition placeholder:text-white/25 focus:border-amber-400/60 focus:bg-white/[0.08] focus:shadow-[0_0_50px_rgba(245,158,11,0.15)] sm:text-4xl"
              />
              <div className="flex min-h-[3.5rem] items-center">
                <AnimatePresence>
                  {ready && (
                    <motion.button
                      key="continue"
                      type="submit"
                      initial={{ opacity: 0, scale: 0.8, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ type: "spring", stiffness: 320, damping: 22 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="rounded-full bg-gradient-to-b from-amber-300 to-amber-600 px-10 py-3.5 font-display text-xl text-ink shadow-[0_14px_44px_rgba(245,158,11,0.4)]"
                    >
                      {t.continueCta} →
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    aria-pressed={language === lang.code}
                    className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                      language === lang.code
                        ? "bg-amber-400/15 text-amber-200 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.45)]"
                        : "text-white/45 hover:bg-white/5 hover:text-white/80"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setTeacherOpen(true)}
                className="text-sm text-white/40 underline-offset-4 transition-colors hover:text-amber-200 hover:underline"
              >
                🧑‍🏫 {t.tabTeacher} →
              </button>
            </motion.div>
          </motion.div>
        ) : (
          /* ------------------------------ act 2 ------------------------------ */
          <motion.div
            key="act-world"
            className="flex flex-1 flex-col justify-center gap-7"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <button
                  type="button"
                  onClick={() => setAct("name")}
                  className="chip transition-colors hover:border-white/30 hover:text-white"
                >
                  ← {name.trim()}
                </button>
                <h2 className="mt-3 font-display text-4xl text-white sm:text-5xl">
                  {t.pickStory}
                </h2>
                <p className="mt-2 text-sm text-white/50">✨ {t.touchWorldHint}</p>
              </div>
              <button
                type="button"
                onClick={() => setTeacherOpen(true)}
                className="text-sm text-white/40 underline-offset-4 transition-colors hover:text-amber-200 hover:underline"
              >
                🧑‍🏫 {t.tabTeacher} →
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
              {Object.values(THEMES).map((theme, index) => {
                const l10n = getThemeL10n(theme.id, language);
                return (
                  <WorldCard
                    key={theme.id}
                    theme={theme}
                    title={l10n?.title ?? theme.title}
                    tagline={l10n?.tagline ?? theme.tagline}
                    index={index}
                    onPick={() => pickWorld(theme.id)}
                    onHover={() => playGreeting(theme.id)}
                  />
                );
              })}
            </div>

            <p className="text-center text-xs text-white/40">{t.micHint}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --------------------------- teacher drawer --------------------------- */}
      <AnimatePresence>
        {teacherOpen && (
          <motion.div
            key="teacher-drawer"
            className="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label={t.closeLabel}
              onClick={() => setTeacherOpen(false)}
              className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="glass relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl sm:p-7"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl text-white">🧑‍🏫 {t.tabTeacher}</h2>
                <button
                  type="button"
                  onClick={() => setTeacherOpen(false)}
                  aria-label={t.closeLabel}
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/60 transition-colors hover:border-white/30 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mb-5 flex flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                  <label
                    htmlFor="listener-name"
                    className="mb-2 block text-xs font-medium text-white/50"
                  >
                    {t.listenerLabel} <span className="text-white/30">{t.optionalTag}</span>
                  </label>
                  <input
                    id="listener-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t.namePlaceholder}
                    maxLength={24}
                    autoComplete="off"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/30 transition focus:border-amber-400/60 focus:outline-none"
                  />
                </div>
                <div className="sm:w-44">
                  <label htmlFor="language" className="mb-2 block text-xs font-medium text-white/50">
                    {t.langLabel}
                  </label>
                  <div className="relative">
                    <select
                      id="language"
                      value={language}
                      onChange={(event) => setLanguage(event.target.value as LanguageCode)}
                      className="w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white transition focus:border-amber-400/60 focus:outline-none"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code} className="bg-plum-950 text-white">
                          {lang.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                      ▾
                    </span>
                  </div>
                </div>
              </div>

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                <h3 className="font-display text-xl text-white">✨ {t.teacherThoughtTitle}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/50">{t.teacherThoughtHint}</p>
                <textarea
                  value={thought}
                  onChange={(event) => setThought(event.target.value)}
                  placeholder={t.teacherThoughtPlaceholder}
                  rows={2}
                  maxLength={300}
                  className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/30 transition focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <motion.button
                    type="button"
                    onClick={() => void craft()}
                    disabled={!canCraft}
                    whileHover={canCraft ? { scale: 1.03 } : undefined}
                    whileTap={canCraft ? { scale: 0.97 } : undefined}
                    className={actionButtonClass(canCraft)}
                  >
                    {craftBusy && <Spinner />}
                    {craftBusy ? t.craftBusy : t.craftCta}
                  </motion.button>
                  {craftError && (
                    <span role="alert" className="text-sm text-rose-300">
                      {t.craftError}
                    </span>
                  )}
                </div>
                <AnimatePresence>
                  {crafted && (
                    <motion.div
                      key="craft-preview"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-4 sm:p-5"
                    >
                      <div className="flex items-start gap-3.5">
                        <span className="text-4xl sm:text-5xl">{crafted.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-display text-lg text-white sm:text-xl">
                            {crafted.title}
                          </div>
                          <div className="mt-0.5 text-xs leading-relaxed text-white/60 sm:text-sm">
                            {crafted.tagline}
                          </div>
                          <div className="mt-2.5 text-[10px] font-medium uppercase tracking-[0.25em] text-white/35">
                            {t.castHeading}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {crafted.cast.map((member) => (
                              <span key={member.id} className="chip">
                                {member.emoji} {member.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <motion.button
                        type="button"
                        onClick={startCrafted}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className={startButtonClass}
                      >
                        {t.startCta}
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                <h3 className="font-display text-xl text-white">🎭 {t.teacherStoryTitle}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/50">{t.teacherStoryHint}</p>
                <textarea
                  value={storyText}
                  onChange={(event) => setStoryText(event.target.value.slice(0, MAX_STORY_CHARS))}
                  placeholder={t.teacherStoryPlaceholder}
                  rows={6}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base leading-relaxed text-white placeholder:text-white/30 transition focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                />
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
                  <label className="chip cursor-pointer transition-colors hover:border-white/25 hover:text-white/85">
                    📄 {t.uploadTxt}
                    <input
                      type="file"
                      accept=".txt,text/plain"
                      onChange={onStoryFile}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={interactive}
                    onClick={() => setInteractive((value) => !value)}
                    className="flex items-center gap-2.5 text-left text-sm text-white/70"
                  >
                    <span
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        interactive ? "bg-amber-400/85" : "bg-white/15"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          interactive ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </span>
                    {t.interactiveLabel}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <motion.button
                    type="button"
                    onClick={() => void adapt()}
                    disabled={!canAdapt}
                    whileHover={canAdapt ? { scale: 1.03 } : undefined}
                    whileTap={canAdapt ? { scale: 0.97 } : undefined}
                    className={actionButtonClass(canAdapt)}
                  >
                    {adaptBusy && <Spinner />}
                    {adaptBusy ? t.adaptBusy : t.adaptCta}
                  </motion.button>
                  {adaptError && (
                    <span role="alert" className="text-sm text-rose-300">
                      {t.adaptError}
                    </span>
                  )}
                </div>
                <AnimatePresence>
                  {adapted && (
                    <motion.div
                      key="adapt-preview"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-4 sm:p-5"
                    >
                      <div className="flex items-start gap-3.5">
                        <span className="text-4xl sm:text-5xl">{adapted.theme.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-display text-lg text-white sm:text-xl">
                            {adapted.theme.title}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-200">
                              {t.beatsCount(adapted.beats.length)}
                            </span>
                            {adapted.theme.tagline && (
                              <span className="text-xs leading-relaxed text-white/55">
                                {adapted.theme.tagline}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <motion.button
                        type="button"
                        onClick={startAdapted}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className={startButtonClass}
                      >
                        {t.startCta}
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
