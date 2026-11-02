-- One row per finished run. Each board shows every player's best.
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pid TEXT NOT NULL,
  name TEXT NOT NULL,
  seed INTEGER NOT NULL,
  origin TEXT NOT NULL,
  mode TEXT NOT NULL,
  floor INTEGER NOT NULL,
  won INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  kills INTEGER NOT NULL DEFAULT 0,
  elites INTEGER NOT NULL DEFAULT 0,
  champions INTEGER NOT NULL DEFAULT 0,
  damage INTEGER NOT NULL DEFAULT 0,
  best_hit INTEGER NOT NULL DEFAULT 0,
  gold INTEGER NOT NULL DEFAULT 0,
  version TEXT,
  created_at INTEGER NOT NULL,
  sid TEXT,
  suspect INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  plates INTEGER NOT NULL DEFAULT 0,
  daily TEXT,
  title TEXT,
  UNIQUE (pid, seed)
);
CREATE INDEX IF NOT EXISTS runs_pid_time ON runs (pid, created_at);

-- The server's own record of each run: when it began and which floors it was seen to reach.
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  pid TEXT NOT NULL,
  seed INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  floor INTEGER NOT NULL DEFAULT 1,
  max_floor INTEGER NOT NULL DEFAULT 1,
  floor_at INTEGER NOT NULL,
  flagged TEXT,
  ended INTEGER NOT NULL DEFAULT 0,
  posted_floor INTEGER
);
CREATE INDEX IF NOT EXISTS sessions_pid_time ON sessions (pid, started_at);

-- A backup of each player's Abyss items (Ruin Shards and Vanadium Plates). The device is in charge; this copy lets them be restored.
CREATE TABLE IF NOT EXISTS vault (
  pid TEXT PRIMARY KEY,
  shards INTEGER NOT NULL DEFAULT 0,
  plates INTEGER NOT NULL DEFAULT 0,
  class_plates TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL,
  save TEXT
);
