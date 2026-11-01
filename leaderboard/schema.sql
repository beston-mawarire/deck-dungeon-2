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
  UNIQUE (pid, seed)
);
CREATE INDEX IF NOT EXISTS runs_pid_time ON runs (pid, created_at);
