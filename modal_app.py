"""Kahani Khud Ki on Modal — the whole Next.js app (UI + API routes).

Deploy:  modal deploy modal_app.py
The app is built into the image at deploy time; `next start` serves it on
port 8000 inside a Modal Server container.
"""

import subprocess

import modal

app = modal.App("kahani-khud-ki")

# Public client-side token (safe to bake): needed at build time so Next.js
# inlines it into the browser bundle.
POSTHOG_PUBLIC_KEY = "phc_xDhBZZTtJWkfNHzKpbGpGCrStjjmG26WMRK82xTzYa2B"

IGNORE = [
    "node_modules",
    ".next",
    ".git",
    "tmp",
    "submission",
    ".env.local",
    ".env*",
    "modal_app.py",
    "aladdin-ki-kahani.txt",
]

image = (
    modal.Image.from_registry("node:22-slim", add_python="3.11")
    .env({"NEXT_PUBLIC_POSTHOG_KEY": POSTHOG_PUBLIC_KEY})
    .workdir("/app")
    # Dependency layer (cached unless the lockfile changes).
    .add_local_file("package.json", "/app/package.json", copy=True)
    .add_local_file("package-lock.json", "/app/package-lock.json", copy=True)
    # node:22-slim ships npm 10, whose `ci` rejects lockfiles written by npm 11
    # (bundled-dep validation skew around @tailwindcss/oxide-wasm32-wasi).
    .run_commands("npm install -g npm@11", "npm ci")
    # Source + production build.
    .add_local_dir(".", "/app", copy=True, ignore=IGNORE)
    .run_commands("npm run build")
)


@app.server(
    image=image,
    secrets=[modal.Secret.from_name("kahani-secrets")],
    unauthenticated=True,
    # Keep one container warm so the public link never cold-503s.
    min_containers=1,
    target_concurrency=25,
    startup_timeout=120,
)
class Web:
    @modal.enter()
    def start(self) -> None:
        subprocess.Popen(
            "npx next start -p 8000 -H 0.0.0.0",
            shell=True,
            cwd="/app",
        )
