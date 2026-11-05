// Leaderboards: finished runs go to a small Cloudflare Worker (see /leaderboard), boards come back from it.
// Until LEADERBOARD_URL is set, everything here quietly does nothing.
import { runSummary, type Run } from "../game/run";
import { RESET_EPOCH } from "./reset";

/** The Worker's address, e.g. "https://deck-dungeon-leaderboard.<you>.workers.dev". Empty: leaderboards off. */
export const LEADERBOARD_URL = "https://deck-dungeon-leaderboard.bestondeveloper.workers.dev";

export type Board = "floor" | "elites" | "champions" | "damage" | "besthit" | "gold" | "abyss" | "daily" | "alltime";
/** Main tabs: the Campaign's boards, the Daily Dungeon's, the Abyss's, and the Bounty board of deadliest foes. */
export type Scope = "campaign" | "daily" | "abyss" | "heat" | "bounty";
const STAT_BOARDS: { id: Board; label: string; icon: string; unit: string }[] = [
  { id: "floor", label: "Deepest", icon: "🕳️", unit: "layer" },
  { id: "elites", label: "Elites", icon: "💀", unit: "elites" },
  { id: "champions", label: "Champions", icon: "👹", unit: "champions" },
  { id: "damage", label: "Damage", icon: "⚔️", unit: "damage" },
  { id: "besthit", label: "Biggest hit", icon: "💥", unit: "in one hit" },
  { id: "gold", label: "Gold", icon: "🪙", unit: "gold earned" }
];
/** The sub-tabs under each main tab. Today's Daily boards reset every day; "All time" keeps the deepest Daily runs ever. */
export const SUB_BOARDS: Record<Exclude<Scope, "bounty">, { id: Board; label: string; icon: string; unit: string }[]> = {
  campaign: STAT_BOARDS,
  heat: [{ id: "floor", label: "Deepest", icon: "🔥", unit: "layer reached at Heat 1 or higher" }],
  abyss: STAT_BOARDS.map(b => (b.id === "floor" ? { ...b, unit: "depth reached in the Abyss" } : { ...b, unit: `${b.unit}, in the Abyss` })),
  daily: [{ id: "alltime", label: "All time", icon: "🏛️", unit: "layer, deepest Daily runs ever" }, ...STAT_BOARDS.map(b => ({ ...b, unit: `${b.unit}, today` }))]
};
/** Every board, for code that still lists them all. */
export const BOARDS = [...SUB_BOARDS.campaign, ...SUB_BOARDS.daily];
export interface Row { rank: number; name: string; title?: string; value: number; origin: string; floor: number; plates?: number; day?: string; heat?: number; you?: boolean }
export interface KillerRow { rank: number; name: string; kills: number; players: number }

export const leaderboardOn = () => LEADERBOARD_URL.length > 0;

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
};

/** A random id per browser, so the boards can show each player's best (not their name, which anyone can reuse). */
export function playerId(): string {
  let id = store.get("dd2-pid");
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, "0")).join("");
    store.set("dd2-pid", id);
  }
  return id;
}
export const playerName = () => store.get("dd2-name") ?? "";
/** The achievement title shown next to your name on the boards (empty: none). */
export const playerTitle = () => store.get("dd2-title") ?? "";
export const setPlayerTitle = (t: string) => store.set("dd2-title", t.slice(0, 24));
export function setPlayerName(name: string): string {
  const clean = name.replace(/[^\p{L}\p{N} _.\-']/gu, "").trim().slice(0, 16);
  if (clean) store.set("dd2-name", clean);
  return clean;
}

/** Runs that couldn't be sent (offline) wait here and go out later. */
const QUEUE = "dd2-lb-queue";
const queued = (): unknown[] => { try { return JSON.parse(store.get(QUEUE) ?? "[]"); } catch { return []; } };

async function post(body: unknown): Promise<{ ranks?: Partial<Record<Board, number>>; verified?: boolean } | null> {
  const res = await fetch(`${LEADERBOARD_URL}/runs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...(body as object), epoch: RESET_EPOCH }) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** A run begins: ask the server to open its own record of it. Scores are only believed for runs it watched. */
export async function startSession(run: Run) {
  if (!leaderboardOn() || run.sid) return;
  try {
    const kind = run.daily ? "daily" : run.mode === "abyss" ? "abyss" : "standard";
    const res = await fetch(`${LEADERBOARD_URL}/session`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pid: playerId(), seed: run.seed, kind, epoch: RESET_EPOCH }) });
    if (!res.ok) return;
    const d = (await res.json()) as { sid?: string };
    if (d.sid) { run.sid = d.sid; run.reportedFloor = 1; }
  } catch { /* offline: this run can't go on the boards */ }
}

/** A request that gives up after a while, so a stalled connection can't block later ones. */
const timed = (ms: number): AbortSignal | undefined => {
  try { return AbortSignal.timeout(ms); } catch { return undefined; }
};
let floorInFlight: Promise<void> | null = null;
/** Tell the server each new floor as you reach it (it checks the pace). Retried on the next screen if it fails. */
export function reportFloor(run: Run): Promise<void> {
  if (!leaderboardOn() || !run.sid || run.reportedFloor === run.floor) return Promise.resolve();
  if (floorInFlight) return floorInFlight;
  const floor = run.floor;
  floorInFlight = (async () => {
    try {
      const res = await fetch(`${LEADERBOARD_URL}/session/floor`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sid: run.sid, pid: playerId(), floor: run.floor, epoch: RESET_EPOCH }), signal: timed(8000) });
      if (res.ok) run.reportedFloor = floor;
    } catch { /* try again later */ } finally { floorInFlight = null; }
  })();
  return floorInFlight;
}

/** Send a finished run. Returns where it placed you (on each board), or null if it couldn't be sent yet. */
export async function submitRun(run: Run, version: string): Promise<{ ranks?: Partial<Record<Board, number>>; verified?: boolean } | null> {
  if (!leaderboardOn() || run.submitted || !playerName()) return null;
  run.submitted = true;
  // Make sure the server has heard about the floor this run reached before the run itself arrives.
  if (run.sid && run.reportedFloor !== run.floor) { await reportFloor(run); if (run.reportedFloor !== run.floor) await reportFloor(run); }
  const body = { pid: playerId(), sid: run.sid, name: playerName(), title: playerTitle() || undefined, version, ...runSummary(run) };
  try {
    return await post(body);
  } catch {
    store.set(QUEUE, JSON.stringify([...queued(), body].slice(-20)));
    return null;
  }
}

/** Try the waiting runs again (call when back online). */
export async function flushQueue() {
  if (!leaderboardOn()) return;
  const q = queued();
  if (!q.length) return;
  const left: unknown[] = [];
  for (const body of q) { try { await post(body); } catch { left.push(body); } }
  store.set(QUEUE, JSON.stringify(left));
}

export async function fetchBoard(scope: Exclude<Scope, "bounty">, board: Board, origin = ""): Promise<{ rows: Row[]; me: { rank: number; value: number } | null }> {
  const day = new Date().toISOString().slice(0, 10);
  const q = board === "alltime" ? `board=floor&scope=dailyall` : `board=${board}&scope=${scope}${scope === "daily" ? `&day=${day}` : ""}`;
  const res = await fetch(`${LEADERBOARD_URL}/leaderboard?${q}&limit=25&pid=${playerId()}${origin ? `&origin=${origin}` : ""}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { rows: Row[]; me: { rank: number; value: number } | null };
}
/** The Bounty board: the foes that have ended the most runs. */
export async function fetchKillers(): Promise<KillerRow[]> {
  const res = await fetch(`${LEADERBOARD_URL}/killers`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return ((await res.json()) as { rows: KillerRow[] }).rows;
}

// ---------- Backup: Ruin Shards, Vanadium Plates and the whole save ----------
// The device is in charge; the server keeps a copy under this player's id, so it can be restored with a backup code.
export interface Vault { shards: number; plates: number; classPlates: Partial<Record<string, number>> }

/** Everything this game keeps in the browser, except what belongs to this device alone (its id, send queues, reload marks). */
const DEVICE_ONLY = /^dd2-(pid|vault-dirty|lb-queue|reloaded-.*|epoch)$/;
function snapshotSave(): string {
  const keys: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("dd2-") && !DEVICE_ONLY.test(k)) keys[k] = localStorage.getItem(k) ?? "";
    }
  } catch { /* storage unavailable */ }
  return JSON.stringify({ v: 1, epoch: RESET_EPOCH, keys });
}
/** Put a backed-up save in place of this device's (the page reloads afterwards). */
export function applySave(save: string): boolean {
  try {
    const o = JSON.parse(save) as { v?: number; epoch?: number; keys?: Record<string, string> };
    if (!o || typeof o.keys !== "object") return false;
    if ((o.epoch ?? 0) < RESET_EPOCH) return false; // from before the Great Reset
    const drop: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("dd2-") && !DEVICE_ONLY.test(k)) drop.push(k); }
    for (const k of drop) localStorage.removeItem(k);
    for (const [k, v] of Object.entries(o.keys)) if (k.startsWith("dd2-") && !DEVICE_ONLY.test(k)) localStorage.setItem(k, v);
    lastSent = save;
    return true;
  } catch { return false; }
}

let vaultTimer: ReturnType<typeof setTimeout> | undefined;
let vaultPending: Vault | null = null;
let lastSent = "";
let lastVault: Vault | null = null;
/** Back up now-ish (debounced; retried later if offline). */
export function backupVault(v: Vault) {
  if (!leaderboardOn()) return;
  vaultPending = lastVault = { ...v, classPlates: { ...v.classPlates } };
  store.set("dd2-vault-dirty", "1");
  clearTimeout(vaultTimer);
  vaultTimer = setTimeout(() => void sendVault(), 2500);
}
const payload = (v: Vault, save: string) => JSON.stringify({ pid: playerId(), ...v, save, epoch: RESET_EPOCH });
async function sendVault() {
  const v = vaultPending;
  if (!v) return;
  const save = snapshotSave();
  try {
    const res = await fetch(`${LEADERBOARD_URL}/vault`, { method: "POST", headers: { "content-type": "application/json" }, body: payload(v, save) });
    if (res.ok) { vaultPending = null; lastSent = save; store.set("dd2-vault-dirty", ""); }
    else if (res.status === 429) vaultTimer = setTimeout(() => void sendVault(), 3000);
  } catch { /* offline: sent again next time something changes, or on the next start */ }
}
/** Keep the online copy fresh: every half-minute if anything changed, and as the page is hidden or closed. */
export function watchBackup(current: () => Vault) {
  if (!leaderboardOn()) return;
  lastSent = lastSent || "";
  setInterval(() => { if (snapshotSave() !== lastSent) backupVault(current()); }, 30000);
  const flush = () => {
    const save = snapshotSave();
    if (save === lastSent || !navigator.sendBeacon) return;
    // A beacon survives the tab closing; plain text keeps it a simple request.
    if (navigator.sendBeacon(`${LEADERBOARD_URL}/vault`, new Blob([payload(lastVault ?? current(), save)], { type: "text/plain" }))) lastSent = save;
  };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  window.addEventListener("pagehide", flush);
}
/** True if the last backup didn't make it to the server. */
export const vaultDirty = () => store.get("dd2-vault-dirty") === "1";

/** The server's copy for a player (this device's by default). */
export async function fetchVault(pid = playerId()): Promise<(Vault & { save: string | null }) | null> {
  if (!leaderboardOn()) return null;
  const res = await fetch(`${LEADERBOARD_URL}/vault?pid=${pid}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = (await res.json()) as { found: boolean; save?: string | null } & Partial<Vault>;
  // A backup from before the Great Reset counts as nothing at all.
  if (d.found) { let ep = 0; try { ep = Number(JSON.parse(d.save ?? "{}").epoch ?? 0); } catch { /* not a save */ } if (ep < RESET_EPOCH) return null; }
  return d.found ? { shards: d.shards ?? 0, plates: d.plates ?? 0, classPlates: d.classPlates ?? {}, save: d.save ?? null } : null;
}

/** The backup code is the player's id: entering it on another device takes over that identity (and its backup). */
export const backupCode = () => playerId();
export function useBackupCode(code: string): boolean {
  const c = code.trim().toLowerCase();
  if (!/^[0-9a-f]{24}$/.test(c)) return false;
  store.set("dd2-pid", c);
  return true;
}

/** Play time: while a run is on screen, tell the server now and then that it's still being played (how long each kind of run lasts). */
export function pingSession(run: Run) {
  if (!leaderboardOn() || !run.sid) return;
  void fetch(`${LEADERBOARD_URL}/session/ping`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sid: run.sid, pid: playerId(), epoch: RESET_EPOCH }), signal: timed(8000) }).catch(() => { /* offline */ });
}
