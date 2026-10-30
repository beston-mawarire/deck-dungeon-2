# Deck Dungeon 2

A browser roguelike with a simple card-and-dice look and a deep item library. Design lives in the
"Deck Dungeon 2" doc (tabs: Design v0.2, Library).

## Run it

```bash
npm install
npm run dev           # local dev server
npm test              # engine tests
npm run typecheck
npm run build         # site in dist/ (GitHub Pages)
npm run build:single  # one self-contained HTML file in dist-single/
```

## How it's built

- `src/engine/` — rules, no UI.
  - `types.ts` — tags, statuses, fighters, and the item hook interface.
  - `combat.ts` — the die-face attack, Guard, class rules (King's Carnage, Jack's two dice,
    Queen's HP-based damage, Ace's three-card tarot hand) and the round loop.
  - `statuses.ts` — 18 statuses (10 negative, 8 positive), 10 reactions, per-round ticks.
  - `fighters.ts` — heroes and enemies (suit traits, Elites, J/Q/K bosses).
  - `registry.ts` — item lookup and hook dispatch.
- `src/data/` — the library as data: each item is an id, name, rarity, tags, text and small hooks
  (`face`, `onHit`, `onCrit`, `onKill`, `whenHit`, `incomingStatus`, `onStatusApplied`, …).
  Adding an item means adding an entry here.
- `src/ui/` — the Combat Lab, a test page for builds and fights.
- `tests/` — Vitest tests for faces, classes, statuses and reactions.

## Status

Implemented: the faces, all statuses and reactions, the four classes, 47 relics, 18 talents,
4 suit traits and 8 Elite affixes.

Not yet: the run (map, path cards, shops, Gold economy, level-ups), fusions and the Forge,
events, curses, cursed relics, Major Arcana, bosses' special moves, the rest of the Library doc,
and the simulation bot for balance.
