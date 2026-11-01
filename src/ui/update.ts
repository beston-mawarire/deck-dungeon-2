// Auto-update: the game checks version.json now and then. When a newer build is out, it reloads
// at a safe moment (never mid-fight), and only once per build so a stale cache can't loop it.
const MINE = __APP_BUILD__;
let newer: string | null = null;
let onFound: (() => void) | null = null;

export const updateReady = () => newer;

async function check() {
  if (typeof location === "undefined" || location.protocol === "file:") return;
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const v = (await res.json()) as { build?: string };
    if (v.build && v.build !== MINE && Number(v.build) > Number(MINE) && v.build !== newer) {
      newer = v.build;
      onFound?.();
    }
  } catch { /* offline, or no version file: ignore */ }
}

/** Start polling (every 2 minutes, and whenever the tab comes back into view). */
export function watchForUpdates(found: () => void) {
  onFound = found;
  void check();
  setInterval(() => void check(), 120000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void check(); });
}

/** Reload into the new build (once per build). */
export function applyUpdate() {
  if (!newer) return;
  const key = `dd2-reloaded-${newer}`;
  try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
  location.replace(`${location.pathname}?v=${newer}`);
}
