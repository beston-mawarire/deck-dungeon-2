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
  - `gear.ts` — 42 weapons (each with its own faces; 7 wands, 7 Holy), 39 off-hands (11 shields, 7 grimoires), 25 armours, 35 trinkets. `kits.ts` — 24 greater starter-kit items (an Uncommon and a Rare of each starting item). `basics.ts` — 20 everyday Common/Uncommon-only items, plus 24 plain-but-strong Uncommon/Rare items. `blades.ts` — daggers, throwing knives, kunai, shuriken, grenades, crit relics, thrower gear, Dodge weapons, heavy armour. `arsenal.ts` — Dodge gear (Uncommon+), elemental weapons (Rare+), Doom weapons (Epic+), and 5 Keepsakes.
  - `affixes.ts` — 22 rolled bonuses (3 of them Rare-only twists on the old classes), 22 Epic powers,
    45 Legendaries (7 of them boss trophies). `crimson.ts` — 15 Crimson items, the tier above Legendary (Crimson bosses only).
  - `relics.ts` (86, 10 of them Legendary), `fusions.ts` (8 recipes), `talents.ts` (47), `origins.ts` (4 origins, 14 curses),
    `events.ts` (10), `monsters.ts` (11 monsters in 4 families, 8 Elite affixes),
    `bosses.ts` (a move library, 10 named bosses — 5 per campaign, the rest return in Endless — generated Endless bosses and the floor-30 wall).
- `src/game/` — the run.
  - `hero.ts` — equipping, two-handers, backpack (5), salvage, reveal, stat rebuild.
  - `loot.ts` — rarity tables, item rolling with tag weighting, Resplendent chests, bad-luck protection.
  - `run.ts` — 5 floors (or Endless), path choices, rooms (fights, chests, Mimics, vaults, altars,
    shrines, shops, forges with fusions, campfires, events, bosses), XP and Talents.
  - `meta.ts` — Renown, unlock tiers and the Codex, saved in the browser.
- `src/ui/` — the game screen (plain DOM, mobile-first): turn-by-turn combat playback with dice rolls,
  floating numbers and status text, item comparison, sound (`sound.ts`, synthesized).

## Rarity

Common (base) → Uncommon (+1 bonus) → Rare (+2 bonuses) → Epic (+2 bonuses and an Epic power) →
Legendary (one of a kind; found unrevealed and works as a Common until a Scroll of Revelation reveals it).
Item level follows the floor; the Forge raises it.

## Forge

Upgrade (level +1), reroll a bonus (each reroll of an item costs more), fuse relic pairs, make an
Offering (sacrifice 2+ items for one — or, 20% of the time, nothing; more and rarer items give better odds), combine two of the same
item (stronger, 30% chance to rise a rarity), and — with the rare Transmuter's Crucible — turn a Common
into a Legendary with 4 Starmetal (dropped by Champions, or from scrapping Legendaries).

## Balance

`npm test` runs a bot through 400 campaigns. Current: about 11% wins for the bot (Rogue 21%, Warrior 12%,
Mage 7%, Cleric 6%); a thoughtful player should do noticeably better.
