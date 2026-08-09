"use client";

import dynamic from "next/dynamic";

/**
 * The whole experience is interactive and audio-driven; server-rendering it
 * buys nothing and repeatedly caused hydration mismatches (form restore,
 * animated style attributes). Render client-only with a themed splash.
 */
const KahaniApp = dynamic(() => import("./KahaniApp"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-dvh place-items-center bg-[#0B0714]">
      <p className="animate-pulse font-display text-3xl text-amber-300/80">
        कहानी खुद की…
      </p>
    </div>
  ),
});

export default function AppShell() {
  return <KahaniApp />;
}
