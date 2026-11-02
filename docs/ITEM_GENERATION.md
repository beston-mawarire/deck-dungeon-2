# Item Generation Engine — proposal

Status: **built (first version, v1.25.0)**. Proposal written 2026-11-02; decisions below. Code: `src/game/gen.ts` (engine), `src/data/genparts.ts` (parts), `src/data/talisman.ts` (Talisman).

Goal: generated gear that adds huge variety to the hand-made pool (weapons, off-hands, armour, trinkets, Common → Crimson),
stays fair, runs instantly on a phone, and never breaks saves or the leaderboard.

---

## 1. What the big loot games do (research summary)

| Game | Idea worth taking | How it applies here |
|---|---|---|
| **Path of Exile** | Mods are split into prefixes and suffixes; better rarities allow more of each (magic: 1+1, rare: up to 3+3). Mods have **tiers**, and the **item level** decides which tiers can roll. Mods in the same **mod group** can't stack. Each mod has a spawn **weight**. | Module slots per rarity; tiers gated by depth; weights; "one per group" rule. |
| **Diablo II** | An **affix level** (from item level and base quality) gates which affixes can appear; the number of affixes rolls from a table that shifts with item level. | Depth gates module tiers; module count rolls from a per-rarity table, not a fixed number. |
| **Borderlands** | Guns are assembled from **parts** (body, barrel, grip…), one per part type; parts from the same **manufacturer give synergy bonuses**; BL4 mixes manufacturers on one gun. Billions of combinations from a modest part library. | Items = form + material + modules. **Materials act like manufacturers**: wearing several pieces of one material gives a small set bonus. |
| **Last Epoch** | Normal tiers T1–T5; **T6–T7 only on rare "Exalted" drops**, so a great drop is visibly great. | **Greater** module tiers (✦) that only roll rarely, mostly from Champions, bosses, Heat and the Abyss. |
| **Diablo IV** | **Greater Affixes**: an affix rolled at 1.5× its normal max, marked with a star. **Aspects**: one signature power on Legendaries. | Greater tiers ✦; Epic+ items get one **signature** module (like an Aspect / our current Epic powers). |
| **World of Warcraft** | Every item has a **stat budget** from item level × quality, multiplied by a **slot modifier** (2-handers and chests get the most, off-hands and one-handers less). Each stat has a **cost**, and stacking one stat costs more (budgets combine to the 3/2 power). | A **power budget** per item: rarity × depth × slot. Each module tier has a cost; repeated themes cost more, so items spread out instead of spiking. |
| **Indie roguelikes** | Balance by **Monte Carlo simulation**: generate millions of combinations, let a bot play them, look for outliers. The aim is that broken builds need deliberate construction, not luck. | We already have a bot (`tests/sim.test.ts`); add a generator stress test plus bot runs with generated loot. |

Sources are listed at the end.

---

## 2. What Deck Dungeon 2 already has (and can reuse)

- **565 non-Legendary gear forms** (201 weapons, 119 off-hands, 113 armours, 132 trinkets) with dice faces, slots and tags.
- **23 bonuses** (`BONUSES`, the "of Might / of Embers…" suffixes) and **26 Epic powers**. These already roll at random on Uncommon+ drops.
- **Every combat hook already takes a magnitude (`stacks`)**: `onHit`, `onCrit`, `onKill`, `whenHit`, `onGuard`, `onDodge`, `onFightStart/End`, `onRoundStart/End`, `face`, `modifyAttack`, `modifyRoll`, `stats`, `incomingStatus`, `reactionMult`, `healMult`, `onWard`, `onStatusApplied`… A module is just a hook definition plus a magnitude, so the engine plugs straight into the existing combat code.
- `GearItem.bonuses` already stores `moduleId → magnitude`. A generated item only needs a few extra fields, so **old saves keep working**.
- Tag-weighted rolling (loot leans toward tags your build already uses) exists in `loot.ts` and can steer generated items too.

So this isn't a new system bolted on; it's the existing bonus system grown up.

---

## 3. The design

### 3.1 Anatomy of a generated item

```
[Material] [Form] of [Suffix]            e.g.  Frost-forged Hatchet of the Vigil ✦
 ├─ Form       one of the 565 existing bases (dice, slot, base damage/armour)
 ├─ Material   ~24 materials: theme tags + a small innate effect + a set bonus
 ├─ Minor mods  flat stat lines (Damage, Armor, Max HP, Crit, Dodge, Spell Amp…)
 ├─ Major mods  trigger → payload effects (the interesting part)
 ├─ Signature   Epic and up: one big power (today's Epic powers + new ones)
 └─ Drawback    optional: a downside that buys extra budget (Crimson-veined always has one)
```

Stored on the item as a short recipe, e.g.
`gen: { m: "frostforged", mods: [["min_hp",3],["maj_crit_chill",4],["sig_shatter",1]], g: [1] }`
(module ids + tiers; `g` marks which ones are Greater). Everything else (name, card text, hooks) is rebuilt from the recipe.

### 3.2 How many modules per item (your "three is too little")

To clear this up: "one to three" in my first note meant **per item**, not the size of the library. The library would hold **150+ modules**. Per item, I now suggest more, and a range rather than a fixed count (Diablo II-style):

| Rarity | Minor | Major | Signature | Drawback | Total effects |
|---|---|---|---|---|---|
| Common | 0–1 | 0 | – | – | material + 0–1 |
| Uncommon | 1–2 | 0–1 | – | – | 1–3 |
| Rare | 1–2 | 1–2 | – | rare, optional | 2–4 |
| Epic | 1–2 | 2–3 | 1 | optional | 4–6 |
| Crimson-veined | 2 | 3 | 1 | always 1 | 6–7 |

Hand-made Legendaries, Crimson, Epic Crimson and Legendary Crimson items stay hand-made (with lore). Generated "Crimson-veined" items are a new generated tier *beside* Crimson, never replacing it.

### 3.3 The module library (≈150 to start, grows easily)

**Minor mods (~30):** Damage, Off-hand Damage, Armor, Max HP, Crit, Crit Damage, Dodge, Bash, Spell Amp, Status Amp, Healing, Gold find, Scrap find, Potion strength, Thorns, Barrier at fight start, Regen at fight start… Each has 7 tiers.

**Major mods (~80), built as trigger × payload** with a whitelist, so new ones are cheap to add:
- **Triggers (~16):** on hit, on crit, on a specific face (1–6), on kill, when hit, when hit while Guarding, on Guard, on Dodge, fight start, every Nth round, below half HP (once a fight), when you apply a status, when a reaction fires, on Ward block, first attack each fight, on Stagger.
- **Payloads (~20):** apply a negative status (Bleed, Burn, Poison, Chill, Shock, Static, Weak, Exposed, Fracture, Doom…), gain a positive status (Might, Haste, Barrier, Regen, Evade, Spikes, Ward, Focus…), heal X or X% Max HP, deal flat damage back, extra damage %, gold, scrap.
- 16 × 20 = 320 raw pairs. A compatibility table keeps the ~80 that make sense (no "on Guard: apply Bleed to yourself"). Each pair gets its own tier values and cost.

**Signatures (~30, Epic+):** today's 26 Epic powers plus new rule-benders ("your 1s count as Hits", "the first status each fight is doubled", "kills explode for 20% overkill"). Only one per item.

**Drawbacks (~15):** "−10% Max HP", "your 1s miss", "start fights Exposed", "potions heal less", "shops cost more"… Each refunds budget. Crimson-veined always rolls one, so a huge item has a real cost.

**Materials (~24):** Iron, Bronze, Bone, Ashwood, Frost-forged, Stormglass, Bloodsteel, Sunsteel, Grave-iron, Venomwood, Saint's Silver, Gilded, Obsidian, Starmetal, Dragonscale, Abyssal… Each has theme tags, a tiny innate effect and a **2/4-piece set bonus** (Borderlands-style manufacturer synergy). That gives builds a reason to chase a material, not only a stat.

### 3.4 How a roll happens (all from the run's seeded RNG, so Daily Dungeon stays fair)

1. **Rarity** is decided by the existing tables (Heat and the Abyss still boost it).
2. **Form**: pick a base for the slot (existing weights).
3. **Material**: weighted by depth (Starmetal, Dragonscale and Abyssal only deep down) and your build's tags.
4. **Budget** = `base[rarity] × depthCurve(level) × slotMod[slot]`, with WoW-style slot mods: 2H weapon 1.0, 1H weapon 0.85, armour 0.85, off-hand 0.65, trinket 0.6.
5. **Counts**: roll how many minor/major/signature modules from the table in 3.2.
6. **Pick modules** one at a time. Weight = base weight × tag affinity (form + material + your build). Skip anything in a group already on the item, or not allowed on this slot. **Tier** is the best one the remaining budget and the depth gate allow, minus a random 0–2 steps so items aren't all maxed. Each repeat of a theme (e.g. a second Burn module) costs ×1.5.
7. **Greater roll**: each module has a small chance to roll a Greater tier ✦ (1.5× value). The chance rises with depth, Heat, Champions, bosses and the Abyss.
8. **Drawback** (optional or forced) adds budget back; leftover budget becomes minor-mod tiers.
9. **Validate**: compute the item's power score (below). If it's outside the band for its rarity, reroll (rejection sampling). That's the hard ceiling that stops "god items by accident".
10. **Name** it from the material, form, best module's suffix and ✦ markers.

Performance: ~150 small module definitions (a few KB of code). A roll is ~10 weighted picks plus a score check: microseconds, once per drop.

---

## 4. Reliable balancing

1. **Power score per module tier, computed rather than guessed.** Each module declares its expected value per round in a common currency ("damage-equivalents"). For example: on a 6, apply 3 Burn ≈ ⅙ × 3 Burn × average ticks; +4 Armor ≈ hits stopped at this depth's average enemy damage. Costs come from this, so a new module is balanced the moment it's written.
2. **Anchor to the hand-made items.** Score every existing hand-made item the same way. Generated items of a rarity must land in the **same band** (target: 80–115% of the hand-made median for that rarity and slot). Hand-made Legendaries stay the peak.
3. **Rejection sampling at roll time** (step 9 above): an item outside its band is rerolled. That guarantees no runaway outliers.
4. **Generator stress test:** a test generates 200,000 items across rarities, depths and slots. It checks the score distributions, that every module and material appears, that the text renders, and that the hooks run in a real fight without errors. It fails the build if any band is violated.
5. **Bot runs:** the existing balance bot plays a few thousand runs with generated loot at 0%, 25% and 50% of drops. Win rates and average depth must stay within agreed limits of today's numbers (Campaign and Abyss).
6. **Synergy watch-list:** a small list of known dangerous pairs (e.g. extra attacks + on-hit healing) that the generator either blocks on one item or charges extra for.
7. **Caps stay in force:** Dodge 60%, Crit 50%, Bash 30%, and so on.
8. **Live tuning:** costs, weights and bands live in one data file, so rebalancing is a numbers change, not a code change.

---

## 5. How it fits the rest of the game

- **Drop share:** start at about 25% of non-Legendary drops being generated (a single number to tune); hand-made items stay the backbone.
- **Forge:** Reroll can re-roll one module (keeping the rest); Combine merges two of the same form and material; Offering treats generated items like others; Scrap and Sell are unchanged.
- **Jeweller:** generated trinkets can be fused or infused like hand-made ones (their modules come along).
- **Codex:** materials and signature modules get Codex entries (found / not found).
- **Achievements:** e.g. "Find a ✦✦ Greater item", "Complete a 4-piece material set", "Find a Crimson-veined item".
- **Leaderboard and saves:** items carry their recipe, nothing changes server-side.
- **Item cards:** module lines show values like today. Tiers can stay hidden (matching the game's habit of not exposing hidden mechanics); only ✦ marks a Greater roll.

---

## 6. Rollout

| Phase | Contents | Size |
|---|---|---|
| **1** | Engine, recipe storage, naming, 12 materials, ~30 minor + ~40 major modules, Common → Rare, 25% drop share, stress test | biggest step |
| **2** | Epic signatures (~30), Greater ✦ tiers, material set bonuses, Forge/Jeweller support, Codex, ~40 more major modules | medium |
| **3** | Crimson-veined tier with drawbacks, deep materials (Starmetal, Dragonscale, Abyssal), achievements, bot-run tuning pass | medium |

---

## 7. Decisions (Beston, 2026-11-02) and what was built

1. **Drop share: half and half.** 50% of Common–Epic drops come from the generator, 35% of Legendaries and 40% of Crimson (the rest stay hand-made). One number per rarity in `GEN_SHARE`.
2. **Drawbacks:** uncommon on Rare (8%), Epic (10%) and Legendary (12%); near-certain on Crimson-veined (85%). Each refunds budget.
3. **No material set bonuses.** Instead: the **Talisman**, sigils outside the gear slots (inspired by Diablo IV's Talisman: Diablo II charms + Diablo III set bonuses). Plain sigils carry one passive; **6 sigil sets × 4 pieces** unlock 2/3/4-piece bonuses. Slots: 2 at the start of a run, +1 on floors 3, 6, 10 and 15. Plain sigils from Elites and chests; set pieces mostly from Champions, bosses (more in the Abyss and with Heat).
4. **Show the mark:** only the grade marks are shown, no tier numbers.
5. **Crimson-veined: yes**, a generated tier beside Crimson.

Also asked for and built:
- **More than three effects from Epic up:** Epic 5–7, Legendary 7–9, Crimson-veined 7–10 effects (counting the material's innate effect, modules and signatures; a flaw comes on top).
- **More materials:** 51 (plus Crimson-veined), from Iron and Bronze on floor 1 to Starmetal, Dragonscale, Voidtouched and Abyssal deep down.
- **More Greater tiers:** ✦ Greater (×1.5), ✦✦ Grand (×2), ✦✦✦ Mythic (×3), each much rarer than the last; more likely from Champions, bosses, Uber bosses, the Abyss and Heat.
- **Broken items, rarely:** ⚡ Overcharged items (~1 in 300 generated drops, more from bosses and in the Abyss) get 2.5× budget, an extra module, higher tiers and three times the Greater chance. Nothing stops them: that's the point.
- **Module library:** 16 minor stat lines, 396 trigger → payload majors (21 triggers × 22 payloads, filtered for sense), 14 flaws, and the 26 Epic powers as signatures.

## Sources

- Path of Exile 2 modifiers and item level: https://mobalytics.gg/poe-2/guides/crafting-basics-part-1 · prefix/suffix rules: https://pathofexile.fandom.com/wiki/Modifiers?oldid=4899 · mod groups and spawn weights: https://www.poe2wiki.net/wiki/Module:Modifier_compatibility
- Diablo II affix levels and affix counts: https://wiki.projectdiablo2.com/wiki/Item_Affixes · https://classic.battle.net/DIABLO2EXP/ITEMS/crafteditems.shtml
- Borderlands parts and manufacturer synergies: https://borderlands.fandom.com/wiki/Borderlands_4_Parts_System · https://www.gfinityesports.com/article/borderlands-4-will-have-30-billion-guns-and-i-wish-i-was-making-this-up
- Last Epoch tiers T6–T7 on Exalted items: https://forum.lastepoch.com/t/introducing-tier-6-and-7-item-affixes/22279
- Diablo IV Greater Affixes and Aspects: https://www.purediablo.com/diablo4/Items
- WoW stat budgets and slot modifiers: https://warcraft.wiki.gg/wiki/Stat_budget · https://wow.allakhazam.com/wiki/Itemization_Formulas_(WoW)
- Monte Carlo balancing for a dice roguelike: https://reddit.sentinel-team.org/posts/1sl0u16/snapshots/2026-04-14T17%3A44%3A31.44232Z
