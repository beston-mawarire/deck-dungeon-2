// Deck Dungeon 2 leaderboard API.
//   POST /session                      a run starts: the server opens its own record of it (returns a session id)
//   POST /session/floor                the run reached a floor: the server checks the step and the pace, and records it
//   POST /runs                         a finished run: checked against the server's record; anything off is kept but hidden
//   GET  /leaderboard?board=..&pid=..  the top players on a board (each player's best verified run), plus your own place
//   POST /vault                        back up a player's Ruin Shards and Vanadium Plates (the device is in charge)
//   GET  /vault?pid=..                 fetch that backup (to restore it on a new device)
//   GET  /health                       ok
//
// The browser can't be trusted, so the server never takes the game's word for how far a run got:
// it only believes floors it watched being reached, one at a time, at a believable pace.
const BOARDS = { floor: "floor", elites: "elites", champions: "champions", damage: "damage", besthit: "best_hit", gold: "gold", abyss: "floor" };
/** Abyss runs only go on the Abyss board; every other board is the campaign's. */
const modeFilter = board => (board === "abyss" ? "mode = 'abyss'" : "mode != 'abyss'");
const ABYSS_FLOORS = 10;
const ORIGINS = ["warrior", "rogue", "mage", "cleric"];
const MAX_FLOOR = 26;
/** No floor (7 rooms and a boss) is cleared faster than this. */
const MIN_SECONDS_PER_FLOOR = 30;

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
    plates: int(b.plates ?? 0, 0, 10000) ?? 0
  };
  for (const [k, v] of Object.entries(row)) if (v === null && k !== "version" && k !== "sid") return `bad ${k}`;
  return row;
}

/** Why a finished run doesn't add up (or null if it does). Generous on purpose: only clear nonsense is caught. */
function discrepancy(row, s, now) {
  if (!row.sid || !s) return "no session (started offline, or not from the game)";
  if (s.pid !== row.pid) return "session belongs to another player";
  if (s.seed !== row.seed) return "seed doesn't match the session";
  if (s.ended) return "session already finished";
  if (row.floor > s.max_floor) return `claims floor ${row.floor}, server saw ${s.max_floor}`;
  if (s.flagged) return `flagged during the run: ${s.flagged}`;
  const secs = (now - s.started_at) / 1000;
  if (secs < MIN_SECONDS_PER_FLOOR * (row.floor - 1)) return `floor ${row.floor} in ${Math.round(secs)}s`;
  const F = row.floor;
  if (row.elites + row.champions > row.kills) return "more Elites/Champions than kills";
  if (row.kills > 14 * F + 6) return `${row.kills} kills by floor ${F}`;
  if (row.best_hit > row.damage) return "biggest hit above total damage";
  if (row.gold > 3000 * F + 150 * F * F) return `${row.gold} Gold by floor ${F}`;
  if (row.level > 6 * F + 10) return `level ${row.level} by floor ${F}`;
  return null;
}

async function placeOf(db, board, value) {
  const col = BOARDS[board];
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM (SELECT pid, MAX(${col}) AS v FROM runs WHERE suspect = 0 AND ${modeFilter(board)} GROUP BY pid) WHERE v > ?`).bind(value).first();
  return (r?.n ?? 0) + 1;
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
  await env.DB.prepare("INSERT INTO sessions (sid, pid, seed, started_at, floor, max_floor, floor_at) VALUES (?, ?, ?, ?, 1, 1, ?)").bind(sid, b.pid, seed, now, now).run();
  return json({ sid });
}

/** The run reached a floor. One floor at a time (going back is allowed: the Crossroads), never too fast. */
async function floorReached(req, env) {
  const b = await body(req);
  if (!b || typeof b.sid !== "string" || !SID.test(b.sid) || typeof b.pid !== "string") return json({ error: "bad request" }, 400);
  const floor = int(b.floor, 1, MAX_FLOOR);
  if (floor === null) return json({ error: "bad floor" }, 400);
  const s = await env.DB.prepare("SELECT * FROM sessions WHERE sid = ?").bind(b.sid).first();
  if (!s || s.pid !== b.pid || s.ended) return json({ error: "no such run" }, 404);
  const now = Date.now();
  let flag = null;
  if (floor > s.floor + 1) flag = `jumped from floor ${s.floor} to ${floor}`;
  else if (floor === s.floor + 1 && floor > s.max_floor && (now - s.floor_at) / 1000 < MIN_SECONDS_PER_FLOOR) flag = `floor ${floor} after ${Math.round((now - s.floor_at) / 1000)}s`;
  // A flagged step isn't believed: the server's floor only moves on believable steps.
  const believed = flag ? s.floor : floor;
  await env.DB.prepare("UPDATE sessions SET floor = ?, max_floor = MAX(max_floor, ?), floor_at = ?, flagged = COALESCE(flagged, ?) WHERE sid = ?")
    .bind(believed, believed, now, flag, b.sid).run();
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
  // A Campaign win that carries on deeper posts again under the same session: allow that one follow-up.
  const followUp = s && s.ended && s.pid === row.pid && row.floor >= (s.posted_floor ?? 0);
  const why = discrepancy(row, followUp ? { ...s, ended: 0 } : s, now);
  const suspect = why ? 1 : 0;
  await env.DB.prepare(`INSERT INTO runs (pid, name, seed, origin, mode, floor, won, level, kills, elites, champions, damage, best_hit, gold, version, created_at, sid, suspect, reason, plates)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (pid, seed) DO UPDATE SET mode = excluded.mode, floor = MAX(floor, excluded.floor), won = MAX(won, excluded.won), level = MAX(level, excluded.level),
      kills = MAX(kills, excluded.kills), elites = MAX(elites, excluded.elites), champions = MAX(champions, excluded.champions), damage = MAX(damage, excluded.damage),
      best_hit = MAX(best_hit, excluded.best_hit), gold = MAX(gold, excluded.gold), version = excluded.version, created_at = excluded.created_at,
      sid = excluded.sid, suspect = MAX(suspect, excluded.suspect), reason = COALESCE(excluded.reason, reason)`)
    .bind(row.pid, row.name, row.seed, row.origin, row.mode, row.floor, row.won, row.level, row.kills, row.elites, row.champions, row.damage, row.best_hit, row.gold, row.version, now, row.sid, suspect, why, row.plates).run();
  if (s && s.pid === row.pid) await env.DB.prepare("UPDATE sessions SET ended = 1, posted_floor = ? WHERE sid = ?").bind(row.floor, row.sid).run();
  await env.DB.prepare("UPDATE runs SET name = ? WHERE pid = ?").bind(row.name, row.pid).run();
  if (suspect) return json({ ok: true, verified: false });
  const ranks = {};
  const boards = row.mode === "abyss" ? ["abyss"] : Object.keys(BOARDS).filter(k => k !== "abyss");
  for (const board of boards) ranks[board] = await placeOf(env.DB, board, row[BOARDS[board]]);
  return json({ ok: true, verified: true, ranks });
}

async function getBoard(url, env) {
  const board = url.searchParams.get("board") ?? "floor";
  const col = BOARDS[board];
  if (!col) return json({ error: "bad board" }, 400);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 25));
  const pid = url.searchParams.get("pid") ?? "";
  const best = `WITH best AS (
      SELECT pid, name, origin, floor, plates, ${col} AS value, created_at,
        ROW_NUMBER() OVER (PARTITION BY pid ORDER BY ${col} DESC, created_at ASC) AS rn
      FROM runs WHERE suspect = 0 AND ${modeFilter(board)})
    SELECT pid, name, origin, floor, plates, value, created_at FROM best WHERE rn = 1 ORDER BY value DESC, created_at ASC`;
  const { results } = await env.DB.prepare(`${best} LIMIT ?`).bind(limit).all();
  const rows = results.map((r, i) => ({ rank: i + 1, name: r.name, value: r.value, origin: r.origin, floor: r.floor, plates: board === "abyss" ? r.plates ?? 0 : undefined, you: r.pid === pid || undefined }));
  let me = null;
  if (pid && !rows.some(r => r.you)) {
    const mine = await env.DB.prepare(`SELECT MAX(${col}) AS v FROM runs WHERE pid = ? AND suspect = 0 AND ${modeFilter(board)}`).bind(pid).first();
    if (mine && mine.v !== null) me = { rank: await placeOf(env.DB, board, mine.v), value: mine.v };
  }
  return json({ board, rows, me });
}

/** Back up a player's Ruin Shards and Vanadium Plates. The device is in charge: this just keeps the latest copy. */
async function putVault(req, env) {
  const b = await body(req);
  if (!b || typeof b.pid !== "string" || !PID.test(b.pid)) return json({ error: "bad pid" }, 400);
  const shards = int(b.shards, 0, 100000), plates = int(b.plates, 0, 100000);
  if (shards === null || plates === null) return json({ error: "bad counts" }, 400);
  const cp = {};
  if (b.classPlates && typeof b.classPlates === "object") for (const o of ORIGINS) { const n = int(b.classPlates[o] ?? 0, 0, 100000); if (n) cp[o] = n; }
  const now = Date.now();
  const last = await env.DB.prepare("SELECT updated_at FROM vault WHERE pid = ?").bind(b.pid).first();
  if (last && now - last.updated_at < 2000) return json({ error: "slow down" }, 429);
  await env.DB.prepare(`INSERT INTO vault (pid, shards, plates, class_plates, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (pid) DO UPDATE SET shards = excluded.shards, plates = excluded.plates, class_plates = excluded.class_plates, updated_at = excluded.updated_at`)
    .bind(b.pid, shards, plates, JSON.stringify(cp), now).run();
  return json({ ok: true });
}

async function getVault(url, env) {
  const pid = url.searchParams.get("pid") ?? "";
  if (!PID.test(pid)) return json({ error: "bad pid" }, 400);
  const r = await env.DB.prepare("SELECT shards, plates, class_plates, updated_at FROM vault WHERE pid = ?").bind(pid).first();
  if (!r) return json({ found: false });
  let classPlates = {};
  try { classPlates = JSON.parse(r.class_plates); } catch { /* keep empty */ }
  return json({ found: true, shards: r.shards, plates: r.plates, classPlates, updatedAt: r.updated_at });
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(req.url);
    try {
      if (url.pathname === "/health") return json({ ok: true });
      if (url.pathname === "/session" && req.method === "POST") return await startSession(req, env);
      if (url.pathname === "/session/floor" && req.method === "POST") return await floorReached(req, env);
      if (url.pathname === "/runs" && req.method === "POST") return await postRun(req, env);
      if (url.pathname === "/leaderboard" && req.method === "GET") return await getBoard(url, env);
      if (url.pathname === "/vault" && req.method === "POST") return await putVault(req, env);
      if (url.pathname === "/vault" && req.method === "GET") return await getVault(url, env);
      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: "server error" }, 500);
    }
  }
};
