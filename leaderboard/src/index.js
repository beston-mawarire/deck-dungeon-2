// Deck Dungeon 2 leaderboard API.
//   POST /session                      a run starts: the server opens its own record of it (returns a session id)
//   POST /session/floor                the run reached a floor: the server checks the step and the pace, and records it
//   POST /runs                         a finished run: checked against the server's record; anything off is kept but hidden
//   GET  /leaderboard?board=..&scope=campaign|daily|dailyall|abyss&origin=..&pid=..  the top players on a board (each player's best verified run), plus your own place
//   GET  /killers                      the Bounty board: the foes that have ended the most runs
//   POST /vault                        back up a player's progress: Ruin Shards, Vanadium Plates and the whole save (the device is in charge)
//   GET  /vault?pid=..                 fetch that backup (to restore it on a new device)
//   POST /session/ping                 the run is still being played (play time, for Turbo vs Standard)
//   POST /poll                         the end-of-run Turbo poll (👍 / 👎)
//   GET  /stats?since=..               plays and play time per kind (standard, turbo, daily, abyss), and the Turbo poll
//   GET  /health                       ok
//
// The browser can't be trusted, so the server never takes the game's word for how far a run got:
// it only believes floors it watched being reached, one at a time, at a believable pace.
const BOARDS = { floor: "floor", elites: "elites", champions: "champions", damage: "damage", besthit: "best_hit", gold: "gold", abyss: "floor", daily: "floor" };
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const utcDay = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
/** Abyss runs only go on the Abyss board, Daily Dungeon runs only on that day's Daily board; every other board is the campaign's. */
const modeFilter = (board, day) => (board === "abyss" ? "mode = 'abyss'" : board === "daily" ? `daily = '${DAY.test(day ?? "") ? day : utcDay()}'` : "mode != 'abyss' AND daily IS NULL AND turbo = 0");
/** Turbo (a limited-time event): 15 floors, each standing for a deeper "real" floor (the checks below use that one). */
const TURBO_DEPTHS = [0, 1, 2, 3, 4, 5, 7, 9, 11, 13, 15, 17, 20, 22, 25, 26];
const KINDS = ["standard", "turbo", "daily", "abyss"];
const ABYSS_FLOORS = 10;
const ORIGINS = ["warrior", "rogue", "mage", "cleric"];
const MAX_FLOOR = 26;
/** No floor (7 rooms and a boss) is cleared faster than this, even with Quick Battles. */
const MIN_SECONDS_PER_FLOOR = 12;
/** A full backup (progress + run in progress) is at most this many characters. */
const MAX_SAVE = 900000;

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400"
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "content-type": "application/json" } });
const int = (v, lo, hi) => (Number.isFinite(v) && Math.floor(v) === v && v >= lo && v <= hi ? v : null);
const PID = /^[0-9a-f]{24}$/;
const SID = /^[0-9a-f]{32}$/;
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
/** The Great Reset count: bump it (with RESET_EPOCH in the game) to wipe everything and start afresh. */
const EPOCH = 2;
const body = async req => { try { return await req.json(); } catch { return null; } };

function validate(b) {
  if (!b || typeof b !== "object") return "bad body";
  if (typeof b.pid !== "string" || !PID.test(b.pid)) return "bad pid";
  const name = typeof b.name === "string" ? b.name.replace(/[^\p{L}\p{N} _.\-']/gu, "").trim().slice(0, 16) : "";
  if (!name) return "bad name";
  if (!ORIGINS.includes(b.origin)) return "bad origin";
  if (b.mode !== "campaign" && b.mode !== "endless" && b.mode !== "abyss") return "bad mode";
  if (b.mode === "abyss" && !(b.floor <= ABYSS_FLOORS)) return "bad floor";
  const row = {
    pid: b.pid, name, origin: b.origin, mode: b.mode, sid: typeof b.sid === "string" && SID.test(b.sid) ? b.sid : null,
    seed: int(b.seed, 0, 2 ** 31), floor: int(b.floor, 1, MAX_FLOOR), level: int(b.level, 1, 500), kills: int(b.kills, 0, 20000),
    elites: int(b.elites, 0, 5000), champions: int(b.champions, 0, 5000), damage: int(b.damage, 0, 1e16),
    best_hit: int(b.bestHit, 0, 1e16), gold: int(b.gold, 0, 1e9), won: b.won ? 1 : 0,
    version: typeof b.version === "string" ? b.version.slice(0, 40) : null,
    plates: int(b.plates ?? 0, 0, 10000) ?? 0,
    // The Heat a Campaign run was played at (0: none; never for the Abyss or the Daily).
    heat: b.mode === "abyss" || b.daily ? 0 : int(b.heat ?? 0, 0, 10) ?? 0,
    turbo: b.turbo && b.mode !== "abyss" && !b.daily ? 1 : 0,
    title: typeof b.title === "string" ? b.title.replace(/[^\p{L}\p{N} _.\-']/gu, "").trim().slice(0, 24) || null : null,
    // What ended the run (a death, not a win or giving up): for the Bounty board.
    killer: !b.won && typeof b.killer === "string" ? b.killer.replace(/[^\p{L}\p{N} _.,\-'’!]/gu, "").trim().slice(0, 48) || null : null,
    // A Daily Dungeon run: only today's (or yesterday's, for a run finished after midnight) counts.
    daily: typeof b.daily === "string" && DAY.test(b.daily) && [utcDay(), utcDay(Date.now() - 864e5)].includes(b.daily) && b.mode !== "abyss" ? b.daily : null
  };
  if (row.turbo && row.floor > TURBO_DEPTHS.length - 1) return "bad floor";
  for (const [k, v] of Object.entries(row)) if (v === null && k !== "version" && k !== "sid" && k !== "daily" && k !== "title" && k !== "killer") return `bad ${k}`;
  return row;
}

/** Why a finished run doesn't add up (or null if it does). Generous on purpose: only clear nonsense is caught. */
function discrepancy(row, s, now) {
  if (!row.sid || !s) return "no session (started offline, or not from the game)";
  if (s.pid !== row.pid) return "session belongs to another player";
  if (s.seed !== row.seed) return "seed doesn't match the session";
  if (s.ended) return "session already finished";
  // One floor of slack: the "reached floor N" message can arrive a moment after the run itself.
  if (row.floor > s.max_floor + 1) return `claims floor ${row.floor}, server saw ${s.max_floor}`;
  if (s.flagged) return `flagged during the run: ${s.flagged}`;
  const secs = (now - s.started_at) / 1000;
  if (secs < MIN_SECONDS_PER_FLOOR * (row.floor - 1)) return `floor ${row.floor} in ${Math.round(secs)}s`;
  const F = row.turbo ? TURBO_DEPTHS[row.floor] ?? row.floor : row.floor;
  if (row.elites + row.champions > row.kills) return "more Elites/Champions than kills";
  if (row.kills > 14 * F + 6) return `${row.kills} kills by floor ${F}`;
  if (row.best_hit > row.damage) return "biggest hit above total damage";
  if (row.gold > 3000 * F + 150 * F * F) return `${row.gold} Gold by floor ${F}`;
  if (row.level > 6 * F + 10) return `level ${row.level} by floor ${F}`;
  return null;
}

/** Which runs a board covers. Scopes: the Campaign (incl. the Abyss board), today's Daily, or every Daily ever. An origin narrows it to one class. */
function boardFilter(board, day, scope, origin) {
  let f = scope === "dailyall" ? "daily IS NOT NULL"
    : scope === "daily" ? `daily = '${DAY.test(day ?? "") ? day : utcDay()}'`
    : scope === "abyss" ? "mode = 'abyss'"
    : scope === "heat" ? "mode != 'abyss' AND daily IS NULL AND heat >= 1 AND turbo = 0"
    : scope === "turbo" ? "mode != 'abyss' AND daily IS NULL AND turbo = 1"
    : scope === "campaign" ? (board === "abyss" ? "mode = 'abyss'" : "mode != 'abyss' AND daily IS NULL AND turbo = 0")
    : modeFilter(board, day);
  if (ORIGINS.includes(origin)) f += ` AND origin = '${origin}'`;
  return f;
}

async function placeOf(db, board, value, day, scope, origin) {
  // (The ranks a Turbo run gets are on the Turbo board.)
  const col = BOARDS[board];
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM (SELECT pid, MAX(${col}) AS v FROM runs WHERE suspect = 0 AND ${boardFilter(board, day, scope, origin)} GROUP BY pid) WHERE v > ?`).bind(value).first();
  return (r?.n ?? 0) + 1;
}

/** The Bounty board: the foes that have ended the most runs. */
async function getKillers(env) {
  const { results } = await env.DB.prepare(`SELECT killer, COUNT(*) AS kills, COUNT(DISTINCT pid) AS players FROM runs
    WHERE killer IS NOT NULL AND won = 0 GROUP BY killer ORDER BY kills DESC, players DESC LIMIT 10`).all();
  return json({ rows: results.map((r, i) => ({ rank: i + 1, name: r.killer, kills: r.kills, players: r.players })) });
}

/** A run starts: open the server's own record of it. */
async function startSession(req, env) {
  const b = await body(req);
  if (!b || typeof b.pid !== "string" || !PID.test(b.pid)) return json({ error: "bad pid" }, 400);
  const seed = int(b.seed, 0, 2 ** 31);
  if (seed === null) return json({ error: "bad seed" }, 400);
  const now = Date.now();
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM sessions WHERE pid = ? AND started_at > ?").bind(b.pid, now - 60000).first();
  if ((recent?.n ?? 0) >= 6) return json({ error: "slow down" }, 429);
  const sid = newId();
  const kind = KINDS.includes(b.kind) ? b.kind : "standard";
  await env.DB.prepare("INSERT INTO sessions (sid, pid, seed, started_at, floor, max_floor, floor_at, kind, last_seen) VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?)").bind(sid, b.pid, seed, now, now, kind, now).run();
  return json({ sid });
}

/** The run reached a floor. Going back is allowed (the Crossroads); going forward is checked against the time taken. */
async function floorReached(req, env) {
  const b = await body(req);
  if (!b || typeof b.sid !== "string" || !SID.test(b.sid) || typeof b.pid !== "string") return json({ error: "bad request" }, 400);
  const floor = int(b.floor, 1, MAX_FLOOR);
  if (floor === null) return json({ error: "bad floor" }, 400);
  const s = await env.DB.prepare("SELECT * FROM sessions WHERE sid = ?").bind(b.sid).first();
  // A Campaign win posts and closes the session; delving deeper after it keeps reporting floors under the same session.
  const continuing = s && s.ended && s.posted_floor != null && floor >= s.posted_floor;
  if (!s || s.pid !== b.pid || (s.ended && !continuing)) return json({ error: "no such run" }, 404);
  const now = Date.now();
  let flag = null;
  // Several floors at once is fine if enough time has passed for them (a missed "reached floor" message, a dropped connection);
  // only a pace no one could play at is flagged.
  const gap = floor - s.floor, secs = (now - s.floor_at) / 1000;
  if (gap >= 1 && floor > s.max_floor && secs < MIN_SECONDS_PER_FLOOR * gap) flag = gap > 1 ? `jumped from floor ${s.floor} to ${floor} in ${Math.round(secs)}s` : `floor ${floor} after ${Math.round(secs)}s`;
  // A flagged step isn't believed: the server's floor only moves on believable steps.
  const believed = flag ? s.floor : floor;
  await env.DB.prepare("UPDATE sessions SET floor = ?, max_floor = MAX(max_floor, ?), floor_at = ?, flagged = COALESCE(flagged, ?), last_seen = ? WHERE sid = ?")
    .bind(believed, believed, now, flag, now, b.sid).run();
  return json({ ok: true });
}

async function postRun(req, env) {
  const b = await body(req);
  if (!b) return json({ error: "bad json" }, 400);
  const row = validate(b);
  if (typeof row === "string") return json({ error: row }, 400);
  const now = Date.now();
  const last = await env.DB.prepare("SELECT created_at FROM runs WHERE pid = ? ORDER BY created_at DESC LIMIT 1").bind(row.pid).first();
  if (last && now - last.created_at < 15000) return json({ error: "slow down" }, 429);
  const s = row.sid ? await env.DB.prepare("SELECT * FROM sessions WHERE sid = ?").bind(row.sid).first() : null;
  // A run that carries on after posting (a Campaign win going deeper) posts again under the same session; the latest, furthest post decides
  // whether it is verified, so a hiccup early on does not stick (anything flagged during the run is remembered by the session itself).
  const followUp = s && s.ended && s.pid === row.pid && row.floor >= (s.posted_floor ?? 0);
  const why = discrepancy(row, followUp ? { ...s, ended: 0 } : s, now);
  const suspect = why ? 1 : 0;
  await env.DB.prepare(`INSERT INTO runs (pid, name, seed, origin, mode, floor, won, level, kills, elites, champions, damage, best_hit, gold, version, created_at, sid, suspect, reason, plates, daily, title, killer, heat, turbo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (pid, seed) DO UPDATE SET mode = excluded.mode, floor = MAX(floor, excluded.floor), won = MAX(won, excluded.won), level = MAX(level, excluded.level),
      kills = MAX(kills, excluded.kills), elites = MAX(elites, excluded.elites), champions = MAX(champions, excluded.champions), damage = MAX(damage, excluded.damage),
      best_hit = MAX(best_hit, excluded.best_hit), gold = MAX(gold, excluded.gold), version = excluded.version, created_at = excluded.created_at, heat = MAX(heat, excluded.heat),
      sid = excluded.sid, killer = CASE WHEN excluded.floor >= runs.floor THEN excluded.killer ELSE runs.killer END,
      suspect = CASE WHEN excluded.floor >= runs.floor THEN excluded.suspect ELSE MAX(runs.suspect, excluded.suspect) END,
      reason = CASE WHEN excluded.floor >= runs.floor THEN excluded.reason ELSE COALESCE(excluded.reason, runs.reason) END`)
    .bind(row.pid, row.name, row.seed, row.origin, row.mode, row.floor, row.won, row.level, row.kills, row.elites, row.champions, row.damage, row.best_hit, row.gold, row.version, now, row.sid, suspect, why, row.plates, row.daily, row.title, row.killer, row.heat, row.turbo).run();
  if (s && s.pid === row.pid) await env.DB.prepare("UPDATE sessions SET ended = 1, posted_floor = ?, last_seen = ? WHERE sid = ?").bind(row.floor, now, row.sid).run();
  await env.DB.prepare("UPDATE runs SET name = ?, title = ? WHERE pid = ?").bind(row.name, row.title, row.pid).run();
  if (suspect) return json({ ok: true, verified: false });
  const ranks = {};
  const boards = row.mode === "abyss" ? ["abyss"] : row.daily ? ["daily"] : Object.keys(BOARDS).filter(k => k !== "abyss" && k !== "daily");
  for (const board of boards) ranks[board] = await placeOf(env.DB, board, row[BOARDS[board]], row.daily, row.turbo ? "turbo" : undefined);
  return json({ ok: true, verified: true, ranks });
}

async function getBoard(url, env) {
  const board = url.searchParams.get("board") ?? "floor";
  const col = BOARDS[board];
  if (!col) return json({ error: "bad board" }, 400);
  if ((url.searchParams.get("scope") ?? "") === "heat" && board !== "floor") return json({ error: "the Heat board only ranks depth" }, 400);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 25));
  const pid = url.searchParams.get("pid") ?? "";
  const day = url.searchParams.get("day") ?? "";
  const scope = url.searchParams.get("scope") ?? "";
  const origin = url.searchParams.get("origin") ?? "";
  const where = boardFilter(board, day, scope, origin);
  const best = `WITH best AS (
      SELECT pid, name, title, origin, floor, plates, daily, heat, ${col} AS value, created_at,
        ROW_NUMBER() OVER (PARTITION BY pid ORDER BY ${col} DESC, created_at ASC) AS rn
      FROM runs WHERE suspect = 0 AND ${where})
    SELECT pid, name, title, origin, floor, plates, daily, heat, value, created_at FROM best WHERE rn = 1 ORDER BY value DESC, created_at ASC`;
  const { results } = await env.DB.prepare(`${best} LIMIT ?`).bind(limit).all();
  const rows = results.map((r, i) => ({ rank: i + 1, name: r.name, title: r.title ?? undefined, value: r.value, origin: r.origin, floor: r.floor, plates: board === "abyss" || scope === "abyss" ? r.plates ?? 0 : undefined, day: scope === "dailyall" ? r.daily ?? undefined : undefined, heat: scope === "heat" ? r.heat ?? undefined : undefined, you: r.pid === pid || undefined }));
  let me = null;
  if (pid && !rows.some(r => r.you)) {
    const mine = await env.DB.prepare(`SELECT MAX(${col}) AS v FROM runs WHERE pid = ? AND suspect = 0 AND ${where}`).bind(pid).first();
    if (mine && mine.v !== null) me = { rank: await placeOf(env.DB, board, mine.v, day, scope, origin), value: mine.v };
  }
  return json({ board, rows, me });
}

/** The run is still being played: keep its play time up to date (at most once every 30 seconds counts). */
async function pingSession(req, env) {
  const b = await body(req);
  if (!b || typeof b.sid !== "string" || !SID.test(b.sid) || typeof b.pid !== "string" || !PID.test(b.pid)) return json({ error: "bad request" }, 400);
  await env.DB.prepare("UPDATE sessions SET last_seen = ? WHERE sid = ? AND pid = ? AND (last_seen IS NULL OR last_seen < ?)").bind(Date.now(), b.sid, b.pid, Date.now() - 30000).run();
  return json({ ok: true });
}

/** The end-of-run Turbo poll: one vote per run (the latest counts). */
async function postPoll(req, env) {
  const b = await body(req);
  if (!b || typeof b.pid !== "string" || !PID.test(b.pid)) return json({ error: "bad pid" }, 400);
  const vote = b.vote === 1 ? 1 : b.vote === -1 ? -1 : 0;
  if (!vote) return json({ error: "bad vote" }, 400);
  const kind = KINDS.includes(b.kind) ? b.kind : "turbo";
  const sid = typeof b.sid === "string" && SID.test(b.sid) ? b.sid : newId();
  await env.DB.prepare(`INSERT INTO polls (sid, pid, kind, vote, floor, created_at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (sid) DO UPDATE SET vote = excluded.vote, created_at = excluded.created_at`).bind(sid, b.pid, kind, vote, int(b.floor ?? 0, 0, 100) ?? 0, Date.now()).run();
  return json({ ok: true });
}

/** How much each kind of run is played: runs started, players, and play time (a run's time stops counting after 15 quiet minutes). */
async function getStats(url, env) {
  const since = Number(url.searchParams.get("since")) || Date.UTC(2026, 10, 3);
  const { results } = await env.DB.prepare(`SELECT COALESCE(kind, 'standard') AS kind, COUNT(*) AS runs, COUNT(DISTINCT pid) AS players,
      SUM(MIN(MAX(COALESCE(last_seen, floor_at) - started_at, 0), 4 * 3600000)) AS ms, AVG(max_floor) AS floor
    FROM sessions WHERE started_at >= ? GROUP BY COALESCE(kind, 'standard')`).bind(since).all();
  const kinds = {};
  for (const r of results) kinds[r.kind] = { runs: r.runs, players: r.players, minutes: Math.round((r.ms ?? 0) / 60000), avgMinutes: r.runs ? Math.round((r.ms ?? 0) / 60000 / r.runs * 10) / 10 : 0, avgFloor: Math.round((r.floor ?? 0) * 10) / 10 };
  const p = await env.DB.prepare("SELECT SUM(vote = 1) AS up, SUM(vote = -1) AS down FROM polls WHERE kind = 'turbo' AND created_at >= ?").bind(since).first();
  return json({ since: new Date(since).toISOString(), kinds, turboPoll: { up: p?.up ?? 0, down: p?.down ?? 0 } });
}

/** Back up a player's Ruin Shards and Vanadium Plates. The device is in charge: this just keeps the latest copy. */
async function putVault(req, env) {
  const b = await body(req);
  if (!b || typeof b.pid !== "string" || !PID.test(b.pid)) return json({ error: "bad pid" }, 400);
  const shards = int(b.shards, 0, 100000), plates = int(b.plates, 0, 100000);
  if (shards === null || plates === null) return json({ error: "bad counts" }, 400);
  const cp = {};
  if (b.classPlates && typeof b.classPlates === "object") for (const o of ORIGINS) { const n = int(b.classPlates[o] ?? 0, 0, 100000); if (n) cp[o] = n; }
  // The whole save (progress, settings and any run in progress), kept as the device sent it.
  let save = null;
  if (b.save !== undefined && b.save !== null) {
    if (typeof b.save !== "string" || b.save.length > MAX_SAVE) return json({ error: "bad save" }, 400);
    try { const o = JSON.parse(b.save); if (!o || typeof o !== "object") throw 0; if (Number(o.epoch ?? 0) < EPOCH) return json({ error: "this save is from before the Great Reset", reset: true }, 410); } catch { return json({ error: "bad save" }, 400); }
    save = b.save;
  }
  const now = Date.now();
  const last = await env.DB.prepare("SELECT updated_at FROM vault WHERE pid = ?").bind(b.pid).first();
  if (last && now - last.updated_at < 2000) return json({ error: "slow down" }, 429);
  await env.DB.prepare(`INSERT INTO vault (pid, shards, plates, class_plates, updated_at, save) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (pid) DO UPDATE SET shards = excluded.shards, plates = excluded.plates, class_plates = excluded.class_plates, updated_at = excluded.updated_at, save = COALESCE(excluded.save, vault.save)`)
    .bind(b.pid, shards, plates, JSON.stringify(cp), now, save).run();
  return json({ ok: true });
}

async function getVault(url, env) {
  const pid = url.searchParams.get("pid") ?? "";
  if (!PID.test(pid)) return json({ error: "bad pid" }, 400);
  const r = await env.DB.prepare("SELECT shards, plates, class_plates, updated_at, save FROM vault WHERE pid = ?").bind(pid).first();
  if (!r) return json({ found: false });
  // Nothing from before the Great Reset is ever handed back (a backup code from then restores nothing).
  let epoch = 0;
  try { epoch = Number(JSON.parse(r.save ?? "{}").epoch ?? 0); } catch { /* not a save */ }
  if (epoch < EPOCH) return json({ found: false });
  let classPlates = {};
  try { classPlates = JSON.parse(r.class_plates); } catch { /* keep empty */ }
  return json({ found: true, shards: r.shards, plates: r.plates, classPlates, updatedAt: r.updated_at, save: r.save ?? null });
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(req.url);
    try {
      if (url.pathname === "/health") return json({ ok: true, epoch: EPOCH });
      // The Great Reset: anything sent by a game from before the current epoch is turned away (its progress was wiped).
      if (req.method === "POST") {
        const b = await req.clone().json().catch(() => null);
        if (!b || Number(b.epoch ?? 0) < EPOCH) return json({ error: "this save is from before the Great Reset", reset: true }, 410);
      }
      if (url.pathname === "/session" && req.method === "POST") return await startSession(req, env);
      if (url.pathname === "/session/floor" && req.method === "POST") return await floorReached(req, env);
      if (url.pathname === "/session/ping" && req.method === "POST") return await pingSession(req, env);
      if (url.pathname === "/poll" && req.method === "POST") return await postPoll(req, env);
      if (url.pathname === "/stats" && req.method === "GET") return await getStats(url, env);
      if (url.pathname === "/runs" && req.method === "POST") return await postRun(req, env);
      if (url.pathname === "/leaderboard" && req.method === "GET") return await getBoard(url, env);
      if (url.pathname === "/killers" && req.method === "GET") return await getKillers(env);
      if (url.pathname === "/vault" && req.method === "POST") return await putVault(req, env);
      if (url.pathname === "/vault" && req.method === "GET") return await getVault(url, env);
      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: "server error" }, 500);
    }
  }
};
