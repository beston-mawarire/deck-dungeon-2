# Deck Dungeon 2

A browser dungeon crawler where **you are what you wear and what you find**. Your weapon is your die,
gear and relics bend it, and the best builds come from lucky finds that click together.
Design lives in the "Deck Dungeon 2" doc (tab: Design v0.3).

## Run it

```bash
npm install
npm run dev           # local dev server
npm test              # tests + a 400-run balance probe (prints win rates)
npm run typecheck
npm run build         # site in dist/ (GitHub Pages)
npm run build:single  # one self-contained HTML file in dist-single/
```

## How it's built

- `src/engine/` — rules only, no content.
  - `types.ts` — tags, statuses, fighters, faces, gear, and the hook interface every item uses.
  - `combat.ts` — roll the weapon's die, fire the face and every item's face effects, deal damage; off-hand
    second die; Guard, Flee, Haste, Stun, Chronoglass rewind; the round loop.
  - `statuses.ts` — 18 statuses (10 negative, 8 positive), 10 reactions, per-round ticks.
  - `registry.ts` — looks items up and runs their hooks.
- `src/data/` — the content library. Adding an item means adding an entry here.
  - `gear.ts` — 14 weapons (each with its own six faces), 8 off-hands, 8 armours, 10 trinkets.
  - `affixes.ts` — 22 rolled bonuses (3 of them Rare-only twists on the old classes), 10 Epic powers,
    7 Legendaries.
  - `relics.ts` (51), `talents.ts` (12), `origins.ts` (4 origins with kit + passive, 6 curses),
    `monsters.ts` (11 monsters in 4 families, 8 Elite affixes, 3 bosses).
- `src/game/` — the run.
  - `hero.ts` — equipping, two-handers, backpack (4), salvage, reveal, stat rebuild.
  - `loot.ts` — rarity tables, item rolling with tag weighting, Resplendent chests, bad-luck protection.
  - `run.ts` — floors, path choices, rooms (fights, chests, Mimics, vaults, altars, shrines, shops,
    forges, campfires, bosses), XP and Talents.
- `src/ui/` — the game screen (plain DOM, mobile-first).

## Rarity

Common (base) → Uncommon (+1 bonus) → Rare (+2 bonuses) → Epic (+2 bonuses and an Epic power) →
Legendary (one of a kind; found unrevealed and works as a Common until a Scroll of Revelation reveals it).
Item level follows the floor; the Forge raises it.

## Next

More of everything in the library, events, fusions, boss move sets, meta-progression (unlocks, Codex),
sound and visual feedback, and a smarter balance bot.
