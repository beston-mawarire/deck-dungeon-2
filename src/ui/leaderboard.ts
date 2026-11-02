// Leaderboards: finished runs go to a small Cloudflare Worker (see /leaderboard), boards come back from it.
// Until LEADERBOARD_URL is set, everything here quietly does nothing.
import { runSummary, type Run } from "../game/run";

/** The Worker's address, e.g. "https://deck-dungeon-leaderboard.<you>.workers.dev". Empty: leaderboards off. */
export const LEADERBOARD_URL = "https://deck-dungeon-leaderboard.bestondeveloper.workers.dev";

export type Board = "floor" | "elites" | "champions" | "damage" | "besthit" | "gold" | "abyss" | "daily";
export const BOARDS: { id: Board; label: string; icon: string; unit: string }[] = [
  { id: "floor", label: "Deepest", icon: "🕳️", unit: "floor" },
  { id: "elites", label: "Elites", icon: "💀", unit: "elites" },
  { id: "champions", label: "Champions", icon: "👹", unit: "champions" },
  { id: "damage", label: "Damage", icon: "⚔️", unit: "damage" },
  { id: "besthit", label: "Biggest hit", icon: "💥", unit: "in one hit" },
  { id: "gold", label: "Gold", icon: "🪙", unit: "gold earned" },
  { id: "abyss", label: "Abyss", icon: "🕳️", unit: "depth" },
  { id: "daily", label: "Daily", icon: "📅", unit: "floor, in today's Daily Dungeon" }
];
export interface Row { rank: number; name: string; value: number; origin: string; floor: number; plates?: number; you?: boolean }

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
export function setPlayerName(name: string): string {
  const clean = name.replace(/[^\p{L}\p{N} _.\-']/gu, "").trim().slice(0, 16);
  if (clean) store.set("dd2-name", clean);
  return clean;
}

/** Runs that couldn't be sent (offline) wait here and go out later. */
const QUEUE = "dd2-lb-queue";
const queued = (): unknown[] => { try { return JSON.parse(store.get(QUEUE) ?? "[]"); } catch { return []; } };

async function post(body: unknown): Promise<{ ranks?: Partial<Record<Board, number>>; verified?: boolean } | null> {
  const res = await fetch(`${LEADERBOARD_URL}/runs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** A run begins: ask the server to open its own record of it. Scores are only believed for runs it watched. */
export async function startSession(run: Run) {
  if (!leaderboardOn() || run.sid) return;
  try {
    const res = await fetch(`${LEADERBOARD_URL}/session`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pid: playerId(), seed: run.seed }) });
    if (!res.ok) return;
    const d = (await res.json()) as { sid?: string };
    if (d.sid) { run.sid = d.sid; run.reportedFloor = 1; }
  } catch { /* offline: this run can't go on the boards */ }
}

let floorInFlight = false;
/** Tell the server each new floor as you reach it (it checks the pace). Retried on the next screen if it fails. */
export async function reportFloor(run: Run) {
  if (!leaderboardOn() || !run.sid || floorInFlight || run.reportedFloor === run.floor) return;
  floorInFlight = true;
  const floor = run.floor;
  try {
    const res = await fetch(`${LEADERBOARD_URL}/session/floor`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sid: run.sid, pid: playerId(), floor }) });
    if (res.ok) run.reportedFloor = floor;
  } catch { /* try again later */ }
  floorInFlight = false;
}

/** Send a finished run. Returns where it placed you (on each board), or null if it couldn't be sent yet. */
export async function submitRun(run: Run, version: string): Promise<{ ranks?: Partial<Record<Board, number>>; verified?: boolean } | null> {
  if (!leaderboardOn() || run.submitted || !playerName()) return null;
  run.submitted = true;
  const body = { pid: playerId(), sid: run.sid, name: playerName(), version, ...runSummary(run) };
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

export async function fetchBoard(board: Board): Promise<{ rows: Row[]; me: { rank: number; value: number } | null }> {
  const day = new Date().toISOString().slice(0, 10);
  const res = await fetch(`${LEADERBOARD_URL}/leaderboard?board=${board}&limit=25&pid=${playerId()}${board === "daily" ? `&day=${day}` : ""}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { rows: Row[]; me: { rank: number; value: number } | null };
}

// ---------- Abyss items backup (Ruin Shards and Vanadium Plates) ----------
// The device is in charge; the server keeps a copy under this player's id, so it can be restored with a backup code.
export interface Vault { shards: number; plates: number; classPlates: Partial<Record<string, number>> }

let vaultTimer: ReturnType<typeof setTimeout> | undefined;
let vaultPending: Vault | null = null;
/** Back up the vault (debounced; retried later if offline). */
export function backupVault(v: Vault) {
  if (!leaderboardOn()) return;
  vaultPending = { ...v, classPlates: { ...v.classPlates } };
  store.set("dd2-vault-dirty", "1");
  clearTimeout(vaultTimer);
  vaultTimer = setTimeout(() => void sendVault(), 2500);
}
async function sendVault() {
  const v = vaultPending;
  if (!v) return;
  try {
    const res = await fetch(`${LEADERBOARD_URL}/vault`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pid: playerId(), ...v }) });
    if (res.ok) { vaultPending = null; store.set("dd2-vault-dirty", ""); }
    else if (res.status === 429) vaultTimer = setTimeout(() => void sendVault(), 3000);
  } catch { /* offline: sent again next time something changes, or on the next start */ }
}
/** True if the last backup didn't make it to the server. */
export const vaultDirty = () => store.get("dd2-vault-dirty") === "1";

/** The server's copy for a player (this device's by default). */
export async function fetchVault(pid = playerId()): Promise<Vault | null> {
  if (!leaderboardOn()) return null;
  const res = await fetch(`${LEADERBOARD_URL}/vault?pid=${pid}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = (await res.json()) as { found: boolean } & Partial<Vault>;
  return d.found ? { shards: d.shards ?? 0, plates: d.plates ?? 0, classPlates: d.classPlates ?? {} } : null;
}

/** The backup code is the player's id: entering it on another device takes over that identity (and its backup). */
export const backupCode = () => playerId();
export function useBackupCode(code: string): boolean {
  const c = code.trim().toLowerCase();
  if (!/^[0-9a-f]{24}$/.test(c)) return false;
  store.set("dd2-pid", c);
  return true;
}
