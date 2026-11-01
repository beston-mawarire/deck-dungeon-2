# Deck Dungeon 2 leaderboard

A Cloudflare Worker (`src/index.js`) in front of a D1 database (`schema.sql`).
It deploys itself through `.github/workflows/leaderboard.yml` whenever this folder changes,
or when you press **Run workflow** on the "Deploy leaderboard" action.

## One-time setup
1. Cloudflare dashboard → **My Profile → API Tokens → Create Token** → template **Edit Cloudflare Workers**.
   Add one more permission row: **Account · D1 · Edit**. Create it and copy the token.
2. Cloudflare dashboard home → your **Account ID** (right-hand side of the Workers & Pages page).
3. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. GitHub repo → **Actions → Deploy leaderboard → Run workflow**.
5. The "Deploy the Worker" step prints the address (`https://deck-dungeon-leaderboard.<you>.workers.dev`).
   Put it in `LEADERBOARD_URL` in `src/ui/leaderboard.ts`.

## Anti-cheat
The server keeps its own record of every run (`sessions`): when it started, and each floor it saw the
run reach, one at a time and no faster than one floor per 30 seconds. A finished run is checked against
that record (floor reached, time taken, kills, Elites/Champions, Gold, level). Anything that doesn't add
up is stored with `suspect = 1` and a `reason`, and never shown on the boards. The player just sees
"couldn't be verified".

See what was caught:
`SELECT name, floor, reason, datetime(created_at/1000, 'unixepoch') FROM runs WHERE suspect = 1 ORDER BY created_at DESC;`
Clear a false alarm: `UPDATE runs SET suspect = 0 WHERE id = 123;`

## Removing a bad entry
Cloudflare dashboard → **Storage & Databases → D1 → deck-dungeon-lb → Console**:
`DELETE FROM runs WHERE name = 'Cheater';`

## API
- `POST /session` — a run starts; the server opens its record
- `POST /session/floor` — the run reached a floor
- `POST /runs` — a finished run (validated; one row per run; one post per 15 s per player)
- `GET /leaderboard?board=floor|elites|champions|damage|besthit|gold&pid=…` — each player's best, top 25, plus your own place
- `GET /health`
