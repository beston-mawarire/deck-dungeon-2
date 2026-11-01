// Deck Dungeon 2 leaderboard API.
//   POST /runs                         a finished run (validated, one per run, rate-limited per player)
//   GET  /leaderboard?board=..&pid=..  the top players on a board (each player's best run), plus your own place
//   GET  /health                       ok
const BOARDS = { floor: "floor", elites: "elites", champions: "champions", damage: "damage", besthit: "best_hit", gold: "gold" };
const ORIGINS = ["warrior", "rogue", "mage", "cleric"];
const MAX_FLOOR = 26;

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400"
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "content-type": "application/json" } });

const int = (v, lo, hi) => (Number.isFinite(v) && Math.floor(v) === v && v >= lo && v <= hi ? v : null);

function validate(b) {
  if (!b || typeof b !== "object") return "bad body";
  if (typeof b.pid !== "string" || !/^[0-9a-f]{24}$/.test(b.pid)) return "bad pid";
  const name = typeof b.name === "string" ? b.name.replace(/[^\p{L}\p{N} _.\-']/gu, "").trim().slice(0, 16) : "";
  if (!name) return "bad name";
  if (!ORIGINS.includes(b.origin)) return "bad origin";
  if (b.mode !== "campaign" && b.mode !== "endless") return "bad mode";
  const row = {
    pid: b.pid, name, origin: b.origin, mode: b.mode,
    seed: int(b.seed, 0, 2 ** 31), floor: int(b.floor, 1, MAX_FLOOR), level: int(b.level, 1, 500), kills: int(b.kills, 0, 20000),
    elites: int(b.elites, 0, 5000), champions: int(b.champions, 0, 5000), damage: int(b.damage, 0, 1e13),
    best_hit: int(b.bestHit, 0, 1e13), gold: int(b.gold, 0, 1e9), won: b.won ? 1 : 0,
    version: typeof b.version === "string" ? b.version.slice(0, 40) : null
  };
  for (const [k, v] of Object.entries(row)) if (v === null && k !== "version") return `bad ${k}`;
  // Sanity: a run can't beat more Elites or Champions than it had fights.
  if (row.elites + row.champions > row.kills) return "bad counts";
  if (row.best_hit > row.damage) return "bad hit";
  return row;
}

async function placeOf(db, col, value) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM (SELECT pid, MAX(${col}) AS v FROM runs GROUP BY pid) WHERE v > ?`).bind(value).first();
  return (r?.n ?? 0) + 1;
}

async function postRun(req, env) {
  let body;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const row = validate(body);
  if (typeof row === "string") return json({ error: row }, 400);
  const now = Date.now();
  // One run every 15 seconds per player is plenty.
  const last = await env.DB.prepare("SELECT created_at FROM runs WHERE pid = ? ORDER BY created_at DESC LIMIT 1").bind(row.pid).first();
  if (last && now - last.created_at < 15000) return json({ error: "slow down" }, 429);
  // One row per run: a run that carries on into Endless after a Campaign win updates its row.
  await env.DB.prepare(`INSERT INTO runs (pid, name, seed, origin, mode, floor, won, level, kills, elites, champions, damage, best_hit, gold, version, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (pid, seed) DO UPDATE SET mode = excluded.mode, floor = MAX(floor, excluded.floor), won = MAX(won, excluded.won), level = MAX(level, excluded.level),
      kills = MAX(kills, excluded.kills), elites = MAX(elites, excluded.elites), champions = MAX(champions, excluded.champions), damage = MAX(damage, excluded.damage),
      best_hit = MAX(best_hit, excluded.best_hit), gold = MAX(gold, excluded.gold), version = excluded.version, created_at = excluded.created_at`)
    .bind(row.pid, row.name, row.seed, row.origin, row.mode, row.floor, row.won, row.level, row.kills, row.elites, row.champions, row.damage, row.best_hit, row.gold, row.version, now).run();
  // A player's latest name sticks to all their runs.
  await env.DB.prepare("UPDATE runs SET name = ? WHERE pid = ?").bind(row.name, row.pid).run();
  const ranks = {};
  for (const [board, col] of Object.entries(BOARDS)) ranks[board] = await placeOf(env.DB, col, row[col]);
  return json({ ok: true, ranks });
}

async function getBoard(url, env) {
  const board = url.searchParams.get("board") ?? "floor";
  const col = BOARDS[board];
  if (!col) return json({ error: "bad board" }, 400);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 25));
  const pid = url.searchParams.get("pid") ?? "";
  const best = `WITH best AS (
      SELECT pid, name, origin, floor, ${col} AS value, created_at,
        ROW_NUMBER() OVER (PARTITION BY pid ORDER BY ${col} DESC, created_at ASC) AS rn
      FROM runs)
    SELECT pid, name, origin, floor, value, created_at FROM best WHERE rn = 1 ORDER BY value DESC, created_at ASC`;
  const { results } = await env.DB.prepare(`${best} LIMIT ?`).bind(limit).all();
  const rows = results.map((r, i) => ({ rank: i + 1, name: r.name, value: r.value, origin: r.origin, floor: r.floor, you: r.pid === pid || undefined }));
  let me = null;
  if (pid && !rows.some(r => r.you)) {
    const mine = await env.DB.prepare(`SELECT MAX(${col}) AS v FROM runs WHERE pid = ?`).bind(pid).first();
    if (mine && mine.v !== null) me = { rank: await placeOf(env.DB, col, mine.v), value: mine.v };
  }
  return json({ board, rows, me });
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(req.url);
    try {
      if (url.pathname === "/health") return json({ ok: true });
      if (url.pathname === "/runs" && req.method === "POST") return await postRun(req, env);
      if (url.pathname === "/leaderboard" && req.method === "GET") return await getBoard(url, env);
      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: "server error" }, 500);
    }
  }
};
