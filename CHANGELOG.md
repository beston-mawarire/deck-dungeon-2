# Changelog

Versions follow MAJOR.MINOR.PATCH:
- **MINOR** (1.x.0) for new content or features: items, events, mechanics, screens.
- **PATCH** (1.1.x) for fixes, balance tweaks and small UI polish.
- The build number (git commit count) still goes up with every deploy.

## 1.11.4
- Story buttons are lavender. The chosen mode now has a ✓, a bright edge and a gold glow; the other mode is greyed back.

## 1.11.3
- More space between the origin cards; the story buttons have their own teal fill.

## 1.11.2
- Origin cards: softer carved-stone look (dusky lavender with a faint grain) instead of bright white; still pressable.
- Story buttons are larger and read "Click to read story".

## 1.11.1
- Origin choices are now cool white, gradient, pressable cards with dark text (they sink when tapped).
- The mode story buttons read "Read story".

## 1.11.0
- Duplicate relics merge silently again (no popup).
- Jeweller: **two tries per visit**. Trinket fusion now needs **Rare, Epic or Legendary** trinkets that haven't been upgraded, and costs ✴️ Starmetal plus much more Gold and Scrap (more for Epic and Legendary). Relic fusion keeps its smaller fee.
- **Infuse** (new Jeweller tab): put a trinket into a weapon, off-hand or armour of the same rarity (Rare+, neither upgraded). The trinket's effects and bonuses move into the gear and the trinket is gone. Costs Gold and Starmetal, rising with rarity. Item cards show "💠 Infused".
- Items now remember being upgraded (Forge, Blacksmith, altar, Combine); cards show it.
- The plain fusing trinkets are now Rare and Epic. New Epic trinkets: War Totem, Sunstone, Serpent Ring, Gilded Thimble (each fuses with something) and three that can never be fused, infused or combined: Heartseeker Brooch, Pilgrim's Token, Stormcaller Torc. 15 secret trinket recipes in all.

## 1.10.0
- **The Jeweller**: a new path that takes turns with the Forge. Put two things on the bench (left, right), press Combine, and pay Gold and Scrap — even if nothing happens. Relic fusions now happen here (the Forge just tells you a Jeweller could do it).
- **6 new relic fusions** (Windwalker, Reaper's Toll, Thunderhead, Warlord's Banner, Undying Pack, Witch's Altar) from 10 new relics plus War Drum and Battle Standard. Relics that can fuse are labelled 🔗 Fusable in your inventory.
- **Secret trinket fusions**: 9 plain new trinkets (Uncommon to Epic) and 12 hidden recipes, some with older trinkets, that make 12 Epic trinkets you can't find any other way. Never labelled.
- Finding a relic you already own now says so: "Relics combined", ×2 and stronger.
- Burn and Smoulder relics turn up a little less often.

## 1.9.3
- How to play redesigned: a row of coloured section chips to jump around, each section in its own coloured card with a bright heading and one point per block, and the Reference as bright panels with one entry per row.

## 1.9.2
- The floor boss no longer breaks the plain-fight streak.

## 1.9.1
- Transformation odds now climb 10% per plain fight after the 14th (10%, 20%, 30%… up to 90%).
- Only fighting something other than a normal monster breaks the streak; every non-combat room (events, shops, chests, campfires, boards…) leaves it alone.

## 1.9.0
- **The endgame is now floors 20–26** (it was 30–90): the Horror on floor 20 (also the first Epic Crimson boss), Epic Crimson bosses on 21–24, DEATH on 25, THE END on 26.
- From floor 20, every floor scales up hard (monster HP ×1.3 and boss HP ×1.4 per floor, with power to match).
- DEATH is still built as its old floor-80 self. The Crossroads' black-screen card now reads "Floor 25".

## 1.8.1
- Auto-battle only from floor 3.
- Transformation odds raised: 10% at 14 plain fights in a row, +6% per fight after (up to 90%).

## 1.8.0
- Potion gear now adds **potion slots** by rarity — Uncommon +1, Rare +2, Epic +3, Legendary +4 — and each slot lets you both carry and drink one more Healing Potion per fight.
- **Auto-battle**: against normal foes, Elites and Champions, a ⚡ Auto-battle button appears when plain attacks are sure to win (checked against the real dice and two dozen other rolls, with a safety margin). It plays the fight out instantly, attacking only, and tells you the result. Never offered for bosses, dragons, Treasure Goblins, named foes or DEATH.

## 1.7.0
- Healing Potions: carry at most 3, and drink at most 3 per fight. The top bar shows potions carried / capacity; the Merchant won't sell you one you can't carry.
- 15 new potion items, each letting you carry 1 more:
  - Trinkets: Flask Chain (Uncommon), Apothecary's Ring (Rare), Vial of Plenty (Epic), The Endless Alembic (Legendary).
  - Armour: Bandolier Vest (Uncommon), Alchemist's Coat (Rare), Brewmaster's Mail (Epic), Mantle of the Flaskwarden (Legendary).
  - Off-hands: Potion Satchel (Uncommon), Tincture Lantern (Rare), Brewer's Buckler (Epic shield), Chalice of Plenty (Legendary).
  - Relics: Potion Belt (Uncommon), Spare Vial (Rare), The Grail of Plenty (Legendary).

## 1.6.1
- Meeting DEATH early (the Crossroads' future): the music stops, the screen goes black, "Floor 80" fills it, fades, and then DEATH arrives. The music returns after.

## 1.6.0
- **The Crossroads**: a very rare encounter, once per run, from floor 2. It hides among "Something Strange" events and, rarer still, appears as an extra path of its own. It never looks the same: it wears one of nine disguises (names, icons, text and choices). Choose the past (back to the first room of the previous floor, keeping everything), the future (a fight with DEATH), or walk away.
- DEATH now arrives with a deep-purple dark and its name in red, fading in and out.
- At most two Dragon Hearts drop per run (the second raises the first to level 2).

## 1.5.0
- **Dragon Heart**: torn from any dragon you slay (the Chained Dragon, or the Sleeping Dragon, which now fights you when it wakes). Each further dragon raises its level. It has its own slot in Extras.
- **Dragon Sanctum**: while you hold a heart you haven't unified, a very common extra path. Unify with the heart: every stat +50% for the rest of the run.
- **Bounty Board**: a rare extra path from floor 1 (can recur). Pick one of three contracts and finish it within 14 rooms: flawless wins, Crits, Elites, Champions, class-action uses, applying a status, reactions, kills or quick wins. Pays Gold (usually), Scrap, or an Uncommon to Epic item. Track it with the 📋 button in the top bar.
- Small screens: the top-bar buttons show icons only, to make room.
- Fix: Crimson Vault and Treasure Goblin paths show their colours again.

## 1.4.3
- Sanguine Altar: tempering now gives +4 levels. (Still one sacrifice per altar.)

## 1.4.2
- Event descriptions no longer show odds or heal percentages; they use words ("a chance to…", "heals a fair share…").

## 1.4.1
- Sanguine Altar: tempering now gives +3 levels, the Max HP offer starts at +8, and the curse offer simply reads "Take on a random curse".

## 1.4.0
- Withering Breath (Parched) is now only used by bosses below floor 5.
- 8 new curses, from light to heavy: Butterfingers, Tarnished, Scrap Rot, Leaky Purse, Restless, Stripped, Dulled Edge, Overburdened.
- New event, **The Sanguine Altar**: pay a share of your Max HP in blood for Gold (10%), Max HP (20%), +2 levels on a random equipped item (30%), cleansing every curse (40%), a curse (50%), a Common relic (60%), a slim chance at a Crimson Key (70%), a Rare-or-better item (80%) or an Epic-or-better item (90%). You can't pay what would kill you.

## 1.3.0
- New curse, **Parched**: you can't drink Healing or Mana Potions. It bites the moment it lands and lasts the run.
  - Normal foes: the new Dust Leech and Ash Wight (Parching Touch: their 3rd hit in a fight parches you).
  - Elites and Champions: the new Parching affix (2nd hit).
  - Bosses: the new Withering Breath move (the Mother of Rot, and generated bosses deeper down); once per fight, then it Burns.
  - Parching foes count as Unholy.
- Campfires no longer cleanse curses; they only heal.
- New event, **The Well of Cleansing** (rare, only while cursed): lifts every curse.
- New event, **Holy Tribute** (only while cursed): pay Gold to lift curses one at a time; each costs double the last, and the price scales with the floor and your purse.

## 1.2.2
- The "Deeper Still" popup now mentions the new gear and encounters below floor 5, Keepsakes and Blessings.

## 1.2.1
- Shop rerolls also cost more the more Gold you carry.
- The Forge's reroll button is red.
- Shops, campfires, forges, shrines, chests and the floor boss no longer break a plain-fight streak (only events, elites, champions, vaults, altars and other special rooms do).
- The Merchant no longer announces his markup.

## 1.2.0
- Shop prices now also rise with the Gold you carry (+1% per 5 Gold, up to +75%), on top of the floor. The Merchant tells you when he's marking up.
- Transformation: after 14 plain monster fights in a row, a beaten monster may rise again as a Champion of its kind that you must fight at once (3% chance, +2% per further fight; resets when it happens or when you pick any other room).

## 1.1.2
- The Talents tab is now **Aspects**, holding the Talents and Curses sub-tabs; removed the extra headings inside them.

## 1.1.1
- Brighter section headings in the inventory (Blessings, Statuses & reactions, Relics, Talents…).

## 1.1.0
- Inventory: Gear · Stats · Relics · Talents · Extras tabs; reactions live at the bottom of Extras.
- Talents tab has Talents and Curses sub-tabs; talent names in Rare blue, curses in purple, relic names in gold.
- Equipped and Backpack gear shown in bordered groups (inventory, shop, forge, blacksmith); brighter slot labels.
- Backpack holds 6 items.
- Haste stacks (one extra action per turn); enemies cap at 4.
- Dice take the colour of the status or reaction their roll caused.

## 1.0.0
- The full game up to build 101.
