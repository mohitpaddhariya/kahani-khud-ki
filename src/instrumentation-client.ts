import posthog from "posthog-js";

// PostHog client instrumentation (Next.js instrumentation-client convention).
// Events route through the /ingest reverse proxy (see next.config.ts) so ad
// blockers don't eat them.
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  defaults: "2025-05-24",
  capture_exceptions: true,
  debug: process.env.NODE_ENV === "development",
});
