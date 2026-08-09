"use client";

import { motion } from "framer-motion";
import type { LanguageCode, StudentReport } from "@/lib/story/types";
import { getStrings } from "@/lib/i18n";

interface ReportCardProps {
  report: StudentReport;
  childName: string;
  language: LanguageCode;
  onClose: () => void;
}

const clampScore = (score: number) => Math.max(0, Math.min(5, score));

export default function ReportCard({
  report,
  childName,
  language,
  onClose,
}: ReportCardProps) {
  const t = getStrings(language);

  return (
    <motion.div
      key="report-card"
      className="fixed inset-0 z-40 overflow-y-auto bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
    >
      <div className="flex min-h-full items-start justify-center px-4 py-8 sm:py-12">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={t.reportTitle}
          onClick={(event) => event.stopPropagation()}
          className="glass w-full max-w-2xl rounded-3xl p-6 sm:p-8"
          initial={{ opacity: 0, y: 26, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-200">
              📊 {t.reportTitle} · {childName}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.closeLabel}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          <h2 className="mt-4 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text pb-1 font-display text-3xl leading-[1.2] text-transparent sm:text-4xl">
            {report.headline}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-base">
            {report.summary}
          </p>

          <div className="mt-6 space-y-4">
            {report.skills.map((skill, index) => (
              <div key={skill.skill}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-base text-white/90 sm:text-lg">
                    {t.skillLabels[skill.skill]}
                  </span>
                  <span className="text-xs font-semibold text-amber-300">
                    {clampScore(skill.score)}/5
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(clampScore(skill.score) / 5) * 100}%` }}
                    transition={{
                      duration: 0.7,
                      delay: 0.2 + index * 0.1,
                      ease: "easeOut",
                    }}
                  />
                </div>
                <p className="mt-1 text-xs leading-relaxed text-white/55">{skill.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {report.strengths.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
                  {t.strengthsHeading}
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {report.strengths.map((strength, index) => (
                    <span
                      key={index}
                      className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs leading-relaxed text-emerald-200"
                    >
                      {strength}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {report.growthAreas.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300/80">
                  {t.growthHeading}
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {report.growthAreas.map((area, index) => (
                    <span
                      key={index}
                      className="rounded-full border border-indigo-400/25 bg-indigo-400/10 px-3 py-1 text-xs leading-relaxed text-indigo-200"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {report.perAnswer.length > 0 && (
            <div className="mt-6">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                {t.answersHeading}
              </h3>
              <ol className="mt-3 space-y-4 border-l border-white/15 pl-5">
                {report.perAnswer.map((entry, index) => (
                  <li key={index} className="relative">
                    <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-4 ring-amber-400/15" />
                    <p className="text-xs leading-relaxed text-white/50">{entry.question}</p>
                    <p className="mt-1 font-display text-sm text-amber-200 sm:text-base">
                      “{entry.answer}”
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-white/70">{entry.note}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 sm:p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300/90">
              💡 {t.nextActivityHeading}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-amber-100/90 sm:text-base">
              {report.nextActivity}
            </p>
          </div>

          <motion.button
            type="button"
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="mt-6 w-full rounded-full bg-gradient-to-b from-amber-300 to-amber-600 px-8 py-3.5 font-display text-lg text-ink shadow-[0_10px_32px_rgba(245,158,11,0.3)]"
          >
            {t.closeLabel}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
