// Save and resume: the run is saved to this browser every time you reach a path choice (the map),
// so a refresh or a closed tab doesn't lose it. Mid-room progress isn't saved: you resume at the last choice.
import { makeRng, type Rng } from "../engine/rng";
import { type Hero, recompute } from "./hero";
import { getDropped, setDropped, setLocked } from "./loot";
import type { Run } from "./run";

const KEY = "dd2-run-v1";

interface SavedRun {
  v: 1;
  run: Omit<Run, "rng" | "found" | "locked" | "seenBosses" | "scene"> & { found: string[]; locked: string[]; seenBosses: string[] };
  rngState: number;
  dropped: string[];
  extra: { banked: number };
}

/** Save the run (only at the map, between rooms). */
export function saveRun(run: Run, banked = 0) {
  if (run.scene.t !== "map") return;
  try {
    const { rng, found, locked, seenBosses, scene, ...rest } = run;
    void scene;
    const data: SavedRun = {
      v: 1,
      run: { ...rest, found: [...found], locked: [...locked], seenBosses: [...seenBosses] },
      rngState: (rng as Rng).state?.() ?? 0,
      dropped: getDropped(),
      extra: { banked }
    };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch { /* storage unavailable or full */ }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** A short description of the saved run for the title screen, or null. */
export function savedSummary(): { origin: string; floor: number; level: number; mode: string } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SavedRun;
    return { origin: d.run.hero.origin, floor: d.run.floor, level: d.run.hero.level, mode: d.run.mode };
  } catch { return null; }
}

/** Load the saved run, or null if there isn't one (or it can't be read). */
export function loadRun(): { run: Run; banked: number } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SavedRun;
    if (d.v !== 1) return null;
    const hero = d.run.hero as Hero;
    hero.f.statuses = {};
    hero.f.flags = {};
    recompute(hero);
    const run: Run = {
      ...d.run,
      hero,
      rng: makeRng(d.rngState),
      found: new Set(d.run.found),
      locked: new Set(d.run.locked),
      seenBosses: new Set(d.run.seenBosses),
      scene: { t: "map" }
    };
    setLocked(run.locked);
    setDropped(d.dropped);
    return { run, banked: d.extra?.banked ?? 0 };
  } catch {
    return null;
  }
}
