// The Great Reset: when RESET_EPOCH goes up, every device wipes its progress once (runs, meta, unlocks, shards,
// plates, gems, the Codex) and starts fresh. Settings, the player's name and id stay. Imported first, before anything reads a save.
export const RESET_EPOCH = 1;
const KEEP = /^dd2-(pid|name|quick|speed|muted|music-.*|epoch)$/;
export let justReset = false;
try {
  if (Number(localStorage.getItem("dd2-epoch") ?? "0") < RESET_EPOCH) {
    const drop: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("dd2-") && !KEEP.test(k)) drop.push(k); }
    for (const k of drop) localStorage.removeItem(k);
    localStorage.setItem("dd2-epoch", String(RESET_EPOCH));
    // A brand-new player has nothing to lose: only tell players who had progress.
    justReset = drop.some(k => k === "dd2-meta-v1" || k.startsWith("dd2-run"));
  }
} catch { /* storage unavailable */ }
