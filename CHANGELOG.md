# Changelog

Versions follow MAJOR.MINOR.PATCH:
- **MINOR** (1.x.0) for new content or features: items, events, mechanics, screens.
- **PATCH** (1.1.x) for fixes, balance tweaks and small UI polish.
- The build number (git commit count) still goes up with every deploy.





## 1.71.2
- **Level gates now range from 1 to 5 levels** above you when you find the item, still on about 30% of Crawl finds. Rarer finds can ask for more:
  - Commons 1–2 more.
  - Uncommons 1–3.
  - Rares 1–4.
  - Epics and Legendaries 1–5.

## 1.71.1
- **Level gates, reworked:** about 30% of Crawl finds, of any rarity, want a higher level than you have when you find them: 1 more for a Common, 2 for an Uncommon, 3 (at most) for anything rarer. The rest you can use straight away, even a Legendary.
- **Crawl monsters give a little less XP:** 1 or 2 each.
- **Bigger screens:**
  - On the map, tiles are larger, and so are the bars, buttons and labels.
  - The fight and Merchant screens grow with the screen but keep a sensible width.
  - The fight boxes stay near half-width, so you and the foe keep your corners.

## 1.71.0
- **The Crawl's loot, reworked:**
  - Foes now give XP only: no Gold, no relics, and no heal when you win (unless a relic or item heals you).
  - Some foes leave materials: Scrap, and Elites and Champions now and then some Azure.
  - Elites have a small chance (12%), and Champions a better one (30%), of dropping a weapon or a piece of armour.
  - Weapons and armour otherwise come from chests, Merchants and special encounters (the Treasure Goblin, the dragon and the like).
  - **Level gates:** Rare gear found in the Crawl needs level 3 to equip, Epic level 5, Legendary level 7 (3 more for each layer down). Fight to grow into your finds.
- **Bosses have a treasure room.** Beat a layer's boss and you step into a small chamber: a chest holding the boss's rewards, and the hole down to the next layer.
- **Urns** (🏺) stand around the halls. Smash one for a few coins, now and then a Mana Potion, and very rarely a Healing Potion. Then they're gone.
- **Merchants stay put:** visit as often as you like, and the same stock (and rerolls) will be waiting. The 3rd-floor Merchant now stands in a hall, where it can't block the way.
- **Fewer guards, more ways in:** not every doorway is guarded now. Some floors give their little rooms a second door, so if one way in is blocked you can try another.
- **Little torches on the walls,** each with a flickering pool of light, and a deeper darkness at the edges of the map.
- **In a fight,** a dark shadow pools behind the foe.

## 1.70.0
- **Every layer starts at the Dungeon Entrance (floor 0):** one small room, a Merchant in the middle and the trapdoor down in a corner.
- **Two Merchants a layer:** the one at the entrance, and one somewhere on the 3rd floor.
- **A Crawl starts with 20 Gold:** enough for one Healing Potion at the entrance, not two.
- **The trapdoor** is now a black square hole with a thin, softly glowing yellow rim.
- **A new Merchant screen,** dark and gritty in a rough stone frame:
  - A wooden "Merchant" sign hangs at the top.
  - Tap anything for sale, or anything of yours, to see its full details with Buy or Sell beneath.
  - The stock, and your Equipped / Backpack gear, are rows of names: they scroll sideways on a phone, and the stock becomes a list beside the details on a wide screen.
  - It all fits on one screen.
- **Fights are darker and grittier:**
  - The frame is uneven stone.
  - You and the foe face each other down a torchlit dungeon corridor: a brick back wall, side walls, and a flagstone floor running away in perspective.
  - The foe stands further off (smaller) and you're up close.
  - The boxes, moves and log are dark stone panels.

## 1.69.3
- The potion drawer no longer has a tray. Each potion sits in its own see-through dark circle, with no border.

## 1.69.2
- **Crawl fights:**
  - A crit (or a big reaction) now shakes the struck side's box, yours or the foe's, instead of the whole screen.
  - The dice are dark with a heavy border: blue for yours, red for the foe's, gold on a crit. A die still takes a status's colour when its roll causes one.
  - The background is a deeper parchment.

## 1.69.1
- **Crawl fights:**
  - Your box now matches the foe's: name and level, an HP bar, an MP bar, then your numbers and statuses.
  - The bars no longer sit at the bottom: it's potions, speed and the menu, then your Inventory.
  - You and the foe are drawn a little smaller, closer to the edges, so the boxes have more room.
  - **One die in the middle**, showing the last roll, yours or the foe's. Two appear only when the same side rolls twice running (an off-hand strike, say).
- **On the map:**
  - Your figure is drawn at full strength, with a thicker yellow ring so it's easy to spot.
  - Foes and treasures no longer look faded either.

## 1.69.0
- **The Crawl: six floors to a layer.** Floors 1–5 to explore, the boss alone on the 6th. The campfire is on the 5th.
- **Smaller floors** (19×19): three or four small halls joined by hallways.
- **Every point of interest has a little room of its own** (the trapdoor, chests, services, landmarks), behind a one-tile doorway. Some rooms hold two things, never more.
- **More foes in the way:**
  - Most trapdoor doorways are guarded (85%), and most other little rooms too (70%).
  - One or two foes block hallways as well. A few more wander the halls, and you can walk around those.
- **Tougher foes:**
  - Every foe is close to Elite strength: plain monsters get much more HP and Power. They ease in over a layer's first floors and are at full strength from the 4th.
  - Because of that, true Elites are rarer: none on a layer's first floor, and Champions only from the 3rd.
  - Plain fights pay a little more XP and Gold to match.
- **No Quick Battle in the Crawl.**

## 1.68.0
- **The Crawl's fights get their own screen**, Pokémon-style, on pale parchment inside a brick frame.
  - The foe stands top right with its box (name, HP, traits) to the left. You stand bottom left with your box to the right. Your dice sit between you.
  - Your moves are in a menu box below. Screen shakes, hit numbers and vibrations all still play.
  - Along the bottom: potions (the drawer works in a fight too: Healing and Mana Potions and tonics), your HP / mana / XP bars, and your Inventory.
- **Map HUD:**
  - The bars are narrower, the same height and square, and sit in a square frame like the potion and inventory buttons.
  - The mana bar just shows the number.
- **No floor themes in the Crawl.** The top right now reads simply "1st Layer" / "Floor 1".
- The floors are a shade darker.

## 1.67.0
- **The Crawl: layers and floors.** What used to be a floor is now a **layer**, and each layer has four floors.
  - Floors 1–3: explore and find the **trapdoor** down. Once you drop, there's no way back up.
  - Floor 4: no exploring. You land straight in front of the layer's boss, with a notice.
  - A layer's Merchant, Forge (or Jeweller) and Masterwork are spread over its three floors; the campfire is always on the third.
- **Smaller floors** (21×21, four to six rooms). Some halls are two tiles wide.
- **Foes in the way:**
  - Some foes guard a hallway on the way to the trapdoor, the mouth of a nook with a chest in it, or the way to a landmark. You have to fight them to get past.
  - Others stand in open rooms, and you can walk around them.
  - If something stands in your way, you stop in front of it and it's picked for you: fight it, or go elsewhere.
- **A full-screen view:**
  - The floor fills the screen, with a dark vignette at the edges. The camera is closer.
  - Floors are light-brown flagstones. Walls are lighter brick with dark outlines. What you see is lit like torchlight; what you only remember sits in the gloom.
- **A new HUD over the map:**
  - Top left: HP (number inside the bar), then mana and XP.
  - Top right: the menu, the layer's name, the floor (and danger), and your bounty.
  - Bottom left: a potion button that slides out a drawer of your potions and tonics; tap one to drink it.
  - Bottom right: a big Inventory button.
- The action on a picked thing now just says **Fight**, **Open chest**, **Descend** or **Interact**. The hint text under the map is gone.

## 1.66.0
- **The Crawl, rebuilt:** each floor is now a real dungeon floor. Rooms of different sizes are joined by hallways, with walls between them.
  - Tap anywhere to walk there (or use the arrow keys / WASD). Tap into the dark and you feel your way toward it.
  - You see three tiles around you, and walls block your sight. Whatever you've seen stays on your map, dimmed when it's out of sight.
  - The camera follows you: you stay in the middle and the floor moves around you.
  - Foes, chests, services and landmarks stand in the rooms. Tap one to see what it is, tap again (or "Go") to walk to it; stepping onto it starts the encounter. Your walk stops when something new comes into view.
  - The boss waits in the room furthest from where you start, and won't face you until you've cleared 4 encounters.
  - Turning back from a risky room puts you back where you stood.
  - Fights are a little softer than in the first Crawl: danger rises every 4 encounters.

## 1.65.1
- **The Crawl:** altars, shrines and encounters are now **landmarks**. A floor holds none, one or two of them.
  - They glow in the fog from the start, out in the far half of the floor, so you see them and choose whether to walk there (every room on the way raises the danger).
  - They no longer turn up as ordinary rooms: the rest of the floor is fights, chests and the services.

## 1.65.0
- **The Crawl (prototype):** a new option when you pick your class. Each floor becomes a fogged 5×5 grid of rooms instead of a row of paths.
  - You start at the entrance (bottom middle). Rooms next to the ones you've cleared show what they are; tap one to see it, tap again to go in.
  - The boss waits at the top, sealed until you've cleared 5 rooms.
  - Every floor holds one Merchant, one Forge (or the Jeweller), a campfire near the boss, and the Masterwork from floor 2. Altars, shrines, events, chests and fights fill the rest.
  - Fights are one foe, but a tougher one. The floor's foes grow stronger the longer you stay ("Quiet" to "Furious").
  - Risky rooms you turn back from stay unexplored.

## 1.64.2 (test build)
- Heavy gear pays back what it costs: heavy weapons hit 15% harder, and heavy armour and shields carry 30% more Armor (on top of the heavy-only lines in the affix pool). Shown on each heavy item.
## 1.64.1 (test build)
- The Jeweller and the Alchemist now sit in a filled panel, like the Forge and the Masterwork.
- The Transmuter's Crucible is no longer a Champion drop: you get it for beating the Campaign's fifth boss.
## 1.64.0 (test build: Masterwork and loot rework, stages 2–6)
- Rarity is now the number of affix lines: Common 0, Uncommon 1, Rare 2, Epic 3, Legendary 3 plus its ✦ special, Crimson tiers 4 plus their ✦. Lines are shown with "–", specials with "✦".
- One affix pool: the old rolled bonuses, the generator's lines, the Epic powers and the effects of every hand-made item, graded Minor, Major and Grand, each limited to the families (and for heavy and light gear, the weights) it suits. A line-by-line review cut 56 lines, reworded 41 and regraded more.
- Hand-made items now drop as bases (their die, stats and element) at their old rarity or higher; their old effect lives in the pool.
- The item generator, Combine and Infuse are retired; rerolling moved from the Forge to the Masterwork.
- New room, the Masterwork (from floor 2): Rework one line (two new options or keep; one line per item; costs climb), Extract an item's lines into a Scroll of Power, Empower a Common of the same family (bound for good), Refine a Common to hold up to 4 lines (Refined items are bright white, with • dots).
- New materials: 💠 Azure dust (scrap Rares) and 🔶 Orilium (scrap Epics). Scrolls of Power have their own Inventory tab (6 slots).
- Hidden bad-luck ladders for Rare, Epic and Legendary finds, and a safety net across Campaign runs.
## 1.63.0 (test build: Masterwork and loot rework, stage 1)
- Turbo mode is removed.
- Item families: every weapon, armour, shield, off-hand and trinket now has a family (Knife Edge, Short Blade, Great Blade, Blunt Force, Breaker, Arcane, Polearm, Ranged; Light, Standard and Heavy Shields; Light, Medium and Heavy Armour; Focus, Throwable; Rings, Amulets, Charms), a weight and, for weapons, a damage class (Blade, Blunt, Breaking, Spell). Shown on every item.
- Heavy gear: wearing any heavy weapon, armour or shield stops Dodge, Evade and Haste.
- Weak-to-blunt and weak-to-blades foes now go by the weapon's damage class.
## 1.62.5
- Early floors are no longer held back: Legendaries on floors 1–2 stay Legendary, and bosses on floors 1–3 offer the same picks as floors 4–7.
- Fix: after an Ambush, you no longer start the fight in a Counter stance (any class). (It was only the look: the stance did nothing.)

## 1.62.4
- Standard: the "green floors" are gone. Floors 1 and 2 no longer turn Rare and Epic finds into Uncommons.

## 1.62.3
- Standard loot, slightly better: Rare, Epic and Legendary finds 12% more likely, normal monsters drop an item 25% of the time (was 20%), and floors 1–2 turn fewer Rares into Uncommons.
- Turbo loot, toned down: rarity boost ×1.5 / ×1.9 / ×2.2 (was ×1.8 / ×2.4 / ×3), normal monsters drop 50% of the time (was 60%), bosses, the last five bosses, chests and Crimson Elites a little less generous. Foes still drop a rank up.

## 1.62.2
- Turbo loot, much richer:
  - Every foe drops a rank up: normal monsters drop like Elites (and 60% of the time), Elites like Champions, Champions like bosses.
  - Bosses offer 4 picks at far better odds; the last five bosses (from floor 11) offer 5 picks, Epic and Legendary only.
  - Wooden and Iron Chests are far richer.
  - No more "green floors" in Turbo: Rares, Epics and Legendaries turn up from floor 1.
  - Rare, Epic and Legendary odds raised again (×1.8, ×2.4, ×3, more past floor 5).
- The title screen's floating text: "An early Christmas! 🎄"

## 1.62.1
- Turbo: every fight gives 75% more XP (fewer rooms, so levels come faster).
- Turbo: a short "how Turbo works" popup every time the game opens during the event, and whenever the Turbo tab is picked.

## 1.62.0
- ⚡ Turbo, a limited-time event (until 17 November 2026, 18:00 UTC). The class menu has two top tabs, Turbo and Standard; Standard is the usual game.
  - Turbo runs: 6 rooms a floor and 15 floors in all: the same 5-floor Campaign, then Endless goes about two floors deeper each time, with the Horror on floor 12, DEATH on 14 and THE END on 15.
  - Content held back to floors 1–4 is open from floor 1; anything deeper opens from floor 5.
  - Much richer loot: Rare, Epic and Legendary finds are far more likely, more again past floor 5, and normal fights drop items more often. Deeper is still better.
  - No Quick Battles.
  - Its own leaderboard, and a 👍 / 👎 poll at the end of each Turbo run. The Daily Dungeon and the Abyss stay Standard.
  - A run started in Turbo keeps Turbo rules to its end, even after the event closes.
- The leaderboard server now records how many runs of each kind (Standard, Turbo, Daily, Abyss) are played and for how long (GET /stats).

## 1.61.1
- The Mana bar fills its row, sits under your HP line, and is labelled "Mana" (no more 3/3 count).

## 1.61.0
- Talents: a "Take no talent" button on the talent screen.
- 8 new Legendaries (the Snake Eyes family and the ... of the Talentless) that only join the pool when certain things have happened in your run.
- Legendaries can now turn up from floor 1: the first two floors still turn most of them into Epics, but a few get through, and only the strongest Legendaries still wait for deeper floors.

## 1.60.1
- Counter, Barrier and Penance need the enemy to act, so their "doesn't take your turn" relics are gone. In their place: Quickstep Anklet (a Counter that lands is followed by a normal attack), Spellweaver's Loop (a full Barrier block strikes back with a normal attack) and Pilgrim's Stride (suffer anything while kneeling in Penance and you get Haste for your next turn). War Cry keeps its Unbroken Horn.

## 1.60.0
- Mana: class abilities (War Cry, Counter, Barrier, Penance) cost 1 Mana. Every class has 3, refilled at the start of each fight, shown as pips under your HP bar. Out of Mana, the ability button is greyed out.
- War Cry is no longer once a fight; each cry after the first in a fight gives half the Might.
- Mana Potions now refill your Mana (their old spell boost is gone). Carry up to 2. Every shop stocks one, at a higher price than a Healing Potion.
- 80 class gear pieces: for each class ability, 5 weapons, 5 off-hands, 5 armours and 5 trinkets (Uncommon to Epic), found only by that class. They buff the ability, combo with it, or trigger after it.
- New relics: for each class, one that makes its ability not take your turn (you attack too) and one that makes it count as a Guard, plus a small amp per class; Mana Pearl (+1 Max Mana); and Mana Potion carry relics (+1 Uncommon, +2 Rare, +3 Legendary).
- New "Mana and class abilities" entry on the Changes page.

## 1.59.5
- Counter: the strike back is plainly shown now: your main hand's crit face, the damage number, and a big "Counter Crit!" burst and shake on the enemy.
- The Counter stance (glow, sway and tag) ends as soon as the enemy has taken its turn, whether it attacked or not.

## 1.59.4
- Reverted: a Counter's Crit can be evaded or dodged again by slippery foes, as before.

## 1.59.3
- Fixed: a Counter's Crit could itself be evaded or dodged by slippery foes (thieves, wisps), so it seemed to do nothing. It can't be evaded or dodged now: it always lands.

## 1.59.2
- Fixed: Counter now answers an attack your Evade turns aside, not only one you Dodge: either way you strike back at once with a Crit.
- Ambush: a foe that strikes first now does it the moment the fight opens, before you choose anything; your buttons are dimmed and locked until its attack is done.

## 1.59.1
- The Counter stance (its glow, sway and tag) ends as soon as it's tested: right after you dodge and strike back, or the moment the hit lands.

## 1.59.0
- 📰 New Changes page: the latest patch notes, from a Changes button on the title screen and in the Info popup. First entry: "The dungeon has changed".

## 1.58.1
- More variety in every class's starting-kit choices: the Rogue can start with a Rapier, Sickle, Throwing Knife, Sai or Leather Jerkin; the Mage with Frost and Storm Wands, a Frost Orb or Tome of Hexes, or a Leather Jerkin; the Cleric with a Mace, Censer Flail or Leather Jerkin.

## 1.58.0
- 🗡️ Counter: dodge the attack and you strike back at once with a Crit (your die's crit face, no roll), before your next turn.
- Stances show: while Guarding your panel glows steel-blue with a shield and your Armor; while Countering it sways with a teal shimmer and says what a dodge will do.

## 1.57.2
- Fixed: starting a new run straight after a death could leave a "Continue" button on the menu that led back to the old run's results (a late leaderboard reply saved the finished run again).

## 1.57.1
- The Abyss is harder again: tougher, harder-hitting foes from the first depth, growing a little faster as you go down.
- A path to a cleansing is rarer still after you pick up a curse.
- HP-costing choices are back to how they were (options you can't afford were already greyed out).

## 1.57.0
- Elites and Champions drop better loot: Rare, Epic and Legendary finds are a little more likely from both.
- A path to a cleansing is a little rarer after you pick up a curse.
- New achievement: Walking Curse (carry 5 or more curses at once).
- A found trinket gets an Equip button for each trinket slot (and says which are empty).
- The Warrior's off-hand starting-kit choices include a Hatchet and a Shortsword (clumsy in the off-hand) in place of two of the shields.

## 1.56.0
- 🎯 Foe weaknesses: a rare few foes have a weak spot, shown in their tags. Brittle-boned (blunt weapons: hammers, maces, clubs, flails, staves), Soft-hided (bladed weapons: swords, axes, daggers, spears), Ungainly (two-handers), Spell-touched (spells), Thin-blooded (Bleed) and Fragile (Fracture shatters, Lacerate and Spikes). Each favours a different kind of build, and bosses have them a little more often.
- ✝️ Holy weapons do a little less extra damage to Unholy foes (+15%, was +25%), and Unholy foes turn up less often in the Campaign.

## 1.55.12
- The top bar is a plain near-black band, edge to edge (no stone texture).
- In a fight, the potion, mana, bounty and inventory buttons sit together on the left, and sound and menu on the far right.

## 1.55.11
- The top bar is a slab of dungeon stone brick, edge to edge, darkened so everything on it stays easy to read. The floor's colours only start below it, at the floor name and Fortune row.
- In a fight, the sound and menu buttons sit apart from the potion and inventory buttons.

## 1.55.10
- The floor's name and the Fortune row are part of the top bar now, under the Inventory row, on every screen of a run (not only the map).

## 1.55.9
- The top bar in a run sits at the top of the page and scrolls with it, instead of staying fixed over the content.
- Every new room, chest or reward screen opens at the top of the page, so the floor name and Fortune row are never hidden.

## 1.55.8
- The Inventory keeps its own colours on every floor: no theme colour or fill on its items, sections, tabs or buttons.

## 1.55.7
- Crimson foes (Crimson Elites, Crimson bosses) and Crimson paths on the map are magenta now, with a deep magenta fill and a slow pulsing glow, so they stand out even on red floors.

## 1.55.6
- Leaderboards: the main tabs are slim folder tabs sitting on the boards' shelf (the open one joins it), all on one row.
- Music has just its volume sliders now (no separate on/off switch): slide to 0 for silence. Music you'd switched off starts at 0.
- Items in your Inventory keep their own look on every floor.

## 1.55.5
- Options opens as its own page from the title screen (with a Back button), not a popup.
- Leaderboards: the main tabs are big stone banners (the open one gold), and the boards under them are small chips on a gold-lined shelf, so it's clear which is which.
- In a run, everything sits a little lower, clear of the top of the screen, and the bar with your inventory, potions, help, sound and menu buttons uses the dungeon's stone buttons.

## 1.55.4
- Shops, the Forge, the Jeweller and every encounter use the dungeon's buttons: stone slabs, gold slabs for the main actions, and a gold rim on the open tab.
- On small screens, Leave (and Move on / Continue) buttons fill their row, studs and all.

## 1.55.3
- Floor Cleared: bigger text, the fallen boss's name in red and the next floor's name in gold, and a brighter "Check your inventory" note.
- The in-run Menu is a slab of dungeon wall: carved title, gold Resume slab and stone buttons with iron studs.
- The Abyss "How it works" button is a studded stone slab like the title screen's.

## 1.55.2
- The Floor Cleared panel has a backing fill so it reads clearly over the dungeon wall, and its Descend button is the title screen's gold stone slab. Its note reads: Check your inventory 🎒 before you go.

## 1.55.1
- Mastery stars appear from Mastery 2 (two stars); at Mastery 1 there are none.
- Your Inventory shows your class (and level) at the top.
- The reward notes after a fight or a boss ("+40 Gold · a relic to choose…", "Pick one…") take the floor theme's colour instead of gold.

## 1.55.0
- 🧱 Runs take place in the dungeon now: a stone-brick wall and a dark vignette behind everything, tinted by the floor's theme.
- The enemy's panel (its border, glow and fill) and its name, bosses included, take the floor theme's colour.
- The Abyss tab's "How it works" guide is there even while the Abyss is still sealed.

## 1.54.0
- ⭐ Mastery XP per run is about half what it was: winning the Campaign is worth about 6.
- 📯 War Cry (Warrior) is much stronger: a bigger swell of Might, and the enemy is left Weak for longer and Exposed too.
- 🗡️ Counter (Rogue) is stronger: +35% Dodge (was +20%), the strike back lands 50% harder, and a failed Counter leaves you only a little off-balance.
- ✝️ Penance (Cleric) is stronger: you take a quarter less while kneeling, and what you suffered comes back half as much again.
- The Mage's Elemental Barrier is unchanged.

## 1.53.0
- ⭐ Class Mastery takes much longer to grow, and each level takes longer than the last. Every class's Mastery has been reset to 1 on every device (starting kits go back to each class's own).
- 🎒 Starting-kit choices are a short list picked for each class: per rarity, a plain well-made piece, a few that suit the class, and one wildcard. At Mastery 10, Rares join the list.
- 🕳️ The first time you open the Abyss tab, a short guide explains how it works and what you keep for good (Ruin Shards, Vanadium Plates, Ruin Gems). It's there any time from the new "How it works" button.
- The Abyss is harder at every depth: more HP and harder hits from the first depth, growing faster as you go down.

## 1.52.6
- Mastery past 6 stars turns into crowns: levels 7 to 10 (the most a class can reach) show 1 to 4 crowns above the crest instead of stars.

## 1.52.5
- The title screen's line now says: Welcome to the dungeon!

## 1.52.4
- Class Mastery shows as stars above each crest: one star for every Mastery level.

## 1.52.3
- Menus sit lower on the screen, so the back and sound buttons are clear of phone notches and status bars.
- The class menu's buttons and tabs match the title screen's stone slabs, iron studs included (on wider screens for the Info row).

## 1.52.2
- The Mastery badge on each class crest is bigger and easier to read, on a deep colour that matches its shield.

## 1.52.1
- The class menu matches the title screen: stone-slab buttons and tabs (the open tab rimmed in gold), stone panels, and a gold Start button.
- The Cleric's line under its crest is one sentence, like the others.

## 1.52.0
- 🛡️ The classes in the menu are heraldic crests now: each one a shield in its own colours (Warrior crimson and steel, Rogue forest and black, Mage royal blue and violet, Cleric white and gold), its emblem in the middle, its Mastery on the corner and its name on a ribbon.

## 1.51.1
- The Victory and Floor Cleared panels (their border, glow, title and buttons) take on the floor's theme colours instead of always being gold.
- When a relic popup appears, the loot fanfares wait: they play one after another once you close it, instead of behind it.
- The floor's colours now fill the whole screen, all the way down.

## 1.51.0
- 🏰 The main menu is a torch-lit dungeon hall now: stone walls, a great archway, flickering torches, drifting embers, a carved-stone title and stone-slab buttons.
- 👑 Plain Legendaries and Crimson items hit far harder: the Sovereign Blade 24 Damage, Titanfall 38, Kingsfang 16 (15 off-hand), the Unbroken Bulwark +18 Armor and +35 Max HP, Aegis of the First King +24 Armor and +60 Max HP, Windcutter Mantle +10 Armor, +20 Max HP and +22% Dodge, Heart of the Mountain +6 Damage, +7 Armor and +60 Max HP; Bloodsteel Sabre 26, the Crimson Executioner 44, Crimson Bastion +20 Armor and +45 Max HP, Bloodforged Plate +26 Armor and +70 Max HP, Heart of Crimson +8 Damage and +75 Max HP.
- The title line reads: Dungeon sightseeing.

## 1.50.0
- 🗺️ Three more floor themes: 🍄 The Fungal Hollow, 🩸 The Blood Pits and 🕯️ The Shattered Reliquary, each with its own foes, Elite, boss and trait (Sporecloud, Frenzied, Sanctified). Floors 1–10 now each get a different theme; past floor 10, every floor draws one at random (never the same twice in a row).
- 👑 Plain Legendaries and Crimson items: no effects at all, just enormous numbers. The Sovereign Blade, Titanfall, Kingsfang, the Unbroken Bulwark, Aegis of the First King, Windcutter Mantle and Heart of the Mountain; Bloodsteel Sabre, the Crimson Executioner, Crimson Bastion, Bloodforged Plate and Heart of Crimson.
- 🎒 Your backpack holds 2 more items.
- Fixed: the game could slow down and freeze after several runs (every music change left an audio player behind). Very long fights and huge piles of effects no longer stall the screen either, and a turn that hits an error is skipped instead of locking the fight.
- The title screen's line is bigger, and says: Dungeon site seeing.

## 1.49.0
- 🗺️ Floor themes: every run deals floors 1–7 a theme each, drawn at random from ten (no repeats), and deeper floors reuse them in turn, so no two runs look or play the same. Each theme recolours the whole game, brings its own monsters, Elites and boss, makes some families more common, marks some of its foes with its own trait, and twists their attributes a little:
  - 🌋 The Smouldering Depths · ⚰️ The Dark Catacombs · 🌿 The Overgrown Pathways · ❄️ The Icy Labyrinth · ⚙️ The Corridor of Constructs
  - ⛓️ The Underkeep Prison · 🏚️ The Necropolis · 🕳️ The Endless Chasm · 🌊 The Drowned Ruins · 🏰 The Sunken Stronghold
  - 30 new foes (two monsters and an Elite per theme) and 10 new bosses, with new traits: Cinder-touched, Rime-touched, Doom-bearer, Drenched, Jailer, Thornhide, Plated, Lurker, Garrisoned and Deathless.
  - The Daily Dungeon's themes are the same for everyone that day. The Abyss keeps its own look.
- 🛡️ Plain kits: four tiers of well-made gear with no special effects, just strong numbers: Fine (Common), Tempered (Uncommon), Masterwork (Rare) and Exalted (Epic) Longswords, Greatswords, Daggers, Quarterstaves, Heater Shields, Leathers, Plate and Signets. The Fine and Tempered pieces can also be chosen as starting kit.

## 1.48.0
- 🧭 A big batch of new ways to build, at the usual odds: 46 new items across weapons, off-hands, armour and trinkets (Common to Epic), 5 Legendaries, 12 relics, 13 talents and 6 new Talisman sets.
  - 👊 Brawler (Bash, Stun, Might): Knuckle Club, Bashing Shield, Brawler's Wraps, Skullsplitter Mace, Concussion Charm, War Gauntlet, Earthshaker Maul, Gladiator's Harness, the Fist of the Mountain; Brass Knuckles, Iron Jaw; Haymaker, Pummel, Heavy Hands, Bloodied Knuckles; the Iron Fist set.
  - 💪 Might: Iron Bracer, Sledge, Brute's Signet, Titan's Plate, Horn of the Warlord, the Colossus Blade; Ox Yoke.
  - 🔪 Butcher (Bleed, Cleave): Meat Cleaver, Gristle Hook, Slaughterhouse Leathers, the Carver, Throwing Hatchets, Bone Saw, Abattoir Mail, Hemorrhage Seal, Gorehowl; Butcher's Ledger, Leech Hook; Rend, Carver; the Butcher's Guild set.
  - 🌘 Duelist (Dodge): Fencer's Jerkin, Dueling Rapier, Parrying Cloak, Feather Charm, Shadowsilk Garb, Whisperwind, Mirage Lantern, the Veil of the Untouched; Dancer's Bell, Quickstep Anklet; Evasion, Blade Dance; the Shadow Dance set.
  - 🪨 Stonebreaker (Fracture): Quarry Pick, Fault Line Ring, Masonry Mail, Rockbreaker, Tremor Stone, Shatterglass Eye, Worldbreaker; Keystone, Mason's Chisels; Fault Finder, Splinter; the Stonebreakers set.
  - More for Briar, Mercenary, Executioner and Gambler: Briar Whip, Hedgehog Shield, Thornheart Amulet, Sellsword's Coat, Paymaster's Flail, Iron Coffer, Headsman's Knife, Executioner's Hood, Deathknell Plate, Coin-Flip Cutlass, Hustler's Deck, Jester's Motley; Bramble Crown, Loaded Purse, Headsman's Tally; Thorn Dance, Bounty Hunter, Double Down; the Thornwood and Gilded Hand sets.
- ✴️ Four new reactions that aren't elemental: Lacerate (Bleed + Fracture), Crushed (Fracture + Weak), Hamstring (Bleed + Weak) and Bristle (Might + Spikes, on you).
- Bosses, Champions and Elites steady themselves for a while after losing a turn to a Stun, so they can't be Stun-locked.

## 1.47.0
- 🧭 Four new ways to build, none of them about stacking elemental statuses. Each has gear across rarities, a Legendary, relics and talents, all at the usual odds:
  - 🌵 Briar: Spikes that punish whatever hits you. Briar Vest, Thorned Buckler, Bramble Heart, Thornlash, Ironbark Plate, the Mantle of the Briar King; Thorn Ring and Porcupine Quill; the Barbed talent.
  - 🪙 Mercenary: the Gold you carry is your strength. Coin Purse, Moneylender's Cudgel, Golden Aegis, Mercenary's Brigandine, Midas Blade, the Dragon's Tithe; Tax Collector's Seal and War Chest; the Mercenary talent.
  - 🪓 Executioner: finish what's wounded. Hangman's Noose, Headsman's Axe, Reaper's Shroud, Guillotine Blade, the Final Word; Trophy Rack; the Coup de Grâce talent.
  - 🎲 Gambler: bend your dice. Bone Charm, Weighted Dice Pouch, Gambler's Saber, Lucky Jacket, Snake-Eye Talisman, Fortune's Favour; Lucky Seven; the Loaded Dice talent.
- 🎭 The Changeling is rarer, and sometimes it ambushes you: it strikes first.

## 1.46.0
- 🎭 New Elite: the Changeling Doppelgänger, from floor 5. It's you, exactly as you walk in: your HP, stats, statuses, gear, passives, talents and relics (and your off-hand). Beat it and it always leaves a Legendary, plus Gold and a Scroll of Revelation. New achievement: Know Thyself.
- Quiet stretches have three encounters of their own: the Sacred Spring, a Fallen Adventurer and the Starving Pilgrim (out of Something Strange).

## 1.45.0
- 🗺️ Six encounters have their own paths on the map now, out of Something Strange: the Alchemist, the Wandering Blacksmith, the Gambling Den, the Fortune Teller, the Mirror Pool and the Card Sharp. They're only offered when they can happen (once-a-run ones until you've met them, Gold ones when you can pay).
- 🌿 Quiet stretches: from floor 1 on, now and then no path ahead is a fight: only chests, shops, camps, shrines and encounters.

## 1.44.0
- 🗡️ Eleven new daggers, all usable in the off-hand, at normal drop odds: Cutpurse Knife, Serrated Shiv and Quickblade (Uncommon); Moonsilver Dirk, Frostbite Kris and Backstabber (Rare); Scorpion's Sting, Misericorde and Shadowstep Blade (Epic); and two Legendaries, Nightfall and Kingslayer. Rogues find the new ones a little more often.

## 1.43.0
- ⚔️ Gauntlets: from floor 3, now and then every path ahead is a hard fight and nothing else: three Elites; an Elite and two Champions; three Champions; or an Elite, a Champion and a Guarded Vault (a Champion before a Resplendent chest).

## 1.42.2
- Potions are rarer finds: Healing Potions turn up far less often after fights and in Wooden Chests, and Mana Potions less often after fights and Elites.

## 1.42.1
- Campaign boss picks grow richer as you go deeper: early bosses mostly offer Uncommons, and a Rare is a treat. Richer picks come from floor 4, and the full boss table from floor 15.

## 1.42.0
- 🌅 A second, complete wipe to be sure: every device clears everything the game keeps in the browser once more (progress, settings, name, player id, session data and caches), and the leaderboards and backups start empty again. Older backup codes restore nothing.
- 🔥 New Heat leaderboard: the deepest floor reached in a Campaign at Heat 1 or higher, with each run's Heat shown.
- Bosses, Champions and Elites can no longer be one-shot by stacked statuses.
- The title screen now says: The Great Reset is here!!

## 1.41.0
- 🔥 Heatforged gear: 12 new items and 2 Legendaries that only drop in Campaign runs at Heat 1 or more, at normal odds for their rarity. Branding Iron, Forge Bellows, Ashen Cloak, Tinderbox Charm, Cinderblade and Coal Heart from Heat 1; Ember Lantern, Cinderweave Robe, Magma Maul, Furnace Plate, Phoenix Feather and the Crown of Embers from Heat 3; the Infernal Brazier and Hearthfall at Heat 5.
- Heat achievements, in their own group: Feel the Heat, Forged in Fire, Smith of Cinders, Crowned in Embers, Ashborn, Slow Burn and Dry Heat (Trial by Fire and Inferno join them).
- The Heat boons from 1.40.0 are gone: Heat is back to its twists, with Heatforged gear as the reward.
- Backup codes from before the Great Reset restore nothing (and leave your device as it was).

## 1.40.0
- 🌅 The Great Reset: with the loot rework settled, everyone starts afresh. Every device's progress is cleared once (your settings and name stay), and the leaderboards start empty. The title screen says so.
- 🔥 Heat is a trade now, not just a punishment: every level adds its twist and stokes a boon. Kindled (start fights with 1 Might), Cinders (your crits set foes Burning), Cauterize (a killing hit leaves you at 1 HP, then it rests for 3 fights), Feast (your killing blow's overkill heals you) and Spoils (Elites and Champions drop an extra item).
- The Daily Dungeon is a level field again: Ruin Gems don't apply there.
- Warrior: Battle-Hardened now gives +1 Damage per 5 Armor (was per 3).

## 1.39.0
- New: 💎 Ruin Gems. Every Uber boss in the Abyss drops one. Put gems on any class from its popup in the menu: each gives +10% Max HP, Damage and Armor in every mode, for good. Gems aren't locked in: take one off a class and give it to another whenever you like. Starting an Abyss run explains it all.
- Vanadium Plates matter far more: the first two still add 6% each, and from the 3rd plate on, each adds 30%.
- The Abyss costs 5 Ruin Shards, every depth adds +40% enemy HP and +30% damage (compounding), and your Armor wears down 15% per depth, up to 90%.
- Statuses you put on foes land half as heavy and tick for half the damage; reactions you cause deal half the damage.
- Regen you gain is half as strong and stacks to at most 8. Barrier you gain is half as strong, and yours holds at most 15% of your Max HP.

## 1.38.0
- True Strike also ignores Dazzle. True Strike and the Causality Mirror now recharge: once used, they come back a few rounds later.
- Statuses and reactions are weaker across the board: Burn, Poison, Bleed, Chill, Static, Soaked, Smoulder and Fracture you put on foes land 20% lighter and tick 20% softer; reactions you cause hit 30% softer; and every bonus to reactions or status damage counts half.
- Regen you gain is a quarter weaker and stacks to at most 10. Barrier you gain is weaker still, and yours holds at most 35% of your Max HP.
- At 0 HP you're down, even if the enemy falls in the same moment: no healing, Regen or life steal from there.
- Holy is toned down against Unholy foes: +25% damage (was +50%), Smite takes 12% of Max HP (was 20%), Purify deals 1.4× Damage per status (was 2×), and Consecration adds 20% (was 30%).
- New foes and traits: Dispelling bosses strip your positive statuses and block new ones for 2 rounds; Punishing foes hit harder for every blessing you carry; Grievous foes halve your healing; Blighting hits stop it for a round. New monsters: Rot Leech, Blight Priest, Gloomcaller; Ghouls are Grievous too.
- The Abyss: fewer Unholy foes, your Armor wears down 10% at every depth (up to 60%), and every depth scales much harder.

## 1.37.0
- Barrier you gain is a quarter weaker, and yours holds at most 40% of your Max HP. Your Haste now caps at 3 stacks.
- Foes wear more Armor the deeper you go, in every mode (bosses most of all). From Campaign floor 15, every floor scales harder; Abyss depths scale harder still.
- Trinkets do less: hand-made trinkets carry one rolled effect fewer, generated trinkets get a smaller budget, and the most overloaded ones are toned down (Coal-Heart Amulet, Tally Beads, Holy Water, Zealot's Brand, Kindling Heart, Heart of the Mountain, Echoing Charm, Hearth of Silver, Lunar Heart, Crown of the Tenth Gate, Manacles of the Warden, Swelling Heart).
- The Abyss: entering costs 3 Ruin Shards; Merchants there charge double; and the 7th Elite fight in a row draws a boss.
- The Sanguine Altar is its own 🩸 path on the map, no longer hidden in Something Strange.
- New enemy defences on Elites, Champions, bosses and Uber bosses: immunities (Fireproof, Antitoxic, Bloodless, Insulated, Frostproof, Hexproof), 🎯 True Strike (its attacks ignore Blind, Evade and Dodge) and 🪞 Causality Mirror (the first hit it takes is reflected back in full, past Evade and Dodge). Neither can be removed. Uber bosses always carry at least one.

## 1.36.0
- Relics: 39 new small, steady relics join the pool (a point of Max HP, Damage or Armor, a few % of crit damage, Dodge, Spell Amp, healing, a little Barrier or Regen to start a fight, and so on). They turn up often, and extra copies keep adding up.
- Relics that change the rules, set up combos or are simply powerful are now far rarer finds; useful conditional tricks sit in between.
- Talents: 19 new small talents (Max HP, Damage, crit damage, Dodge, Spell Amp, healing, Barrier, Gold and more), offered often. Build-defining and combo talents are offered far less often.
- Curse cleansing has its own path: while you carry a curse, a ⛲ Cleansing room (the Well of Cleansing or a Holy Tribute) is often offered on the map. They're no longer hidden inside Something Strange.
- No more Legendaries on floor 1: anything that would be Legendary or Crimson there comes out Epic, and floor 2 lets only a few through. The Abyss is unaffected.
- The Abyss is now a proper endgame: foes start much tougher, grow faster with each depth, hit harder and carry more Armor. Vanadium Plates are how you keep up.
- Heat quietly makes every foe a little tougher at each level, on top of its listed effects.

## 1.35.0
- Loot is a little stingier: Rare, Epic and Legendary drops are about 20% less likely from monsters, Elites, Champions, bosses, Iron chests, the Merchant and Resplendent chests, and Fortune grows more slowly past floor 5. Abyss chests and foes are trimmed a little too. Lucky runs still happen.
- Generated gear is less overloaded: smaller power budgets from Uncommon up, fewer triggered effects per item (Rares get one, Epics one or two, Legendaries two or three), Greater grades are rarer, and the strongest tiers open more slowly with depth.
- "of Alchemy" no longer grows out of control with item level: it's +(4 × level + 10)% to reactions (a level 13 item gives +62%, not +325%).
- The Abyss hits harder: every foe starts 15% tougher and grows faster with each depth, so Vanadium Plates matter.
- DEATH's farewell line is new.

## 1.34.2
- Leaderboards: a run that skipped a floor check-in (a dropped connection, or the old bug after delving deeper) was marked unverified for the rest of the run. The server now accepts several floors at once when enough time has passed for them, and only flags a pace no one could play at. The run this hid is back on the boards.

## 1.34.1
- The Mage now favours the new one-handed staffs: they turn up about twice as often for a Mage, in hand-made and generated loot alike.

## 1.34.0
- 12 new one-handed staffs: spell-casting weapons that leave your off-hand free for an orb, a tome or a shield. Two at every rarity:
  - Common: Ashwood Wand, Rimewood Rod.
  - Uncommon: Stormcaller Rod, Bogwood Staff.
  - Rare: Prism Scepter, Bloodwood Cane.
  - Epic: Magister's Rod, Hexwood Scepter.
  - Legendary: two to discover.
  - Crimson: Scepter of the Red Tide, Rod of Ruin.
- The Common and Uncommon ones can also be picked for any class's starting kit once mastery allows.

## 1.33.3
- Inventory: the Scrap button on backpack items (and on sigils in your Sigil bag) is now red.

## 1.33.2
- Found trinkets get a ⚖️ Compare button for each trinket slot that holds something (Compare trinket 1, Compare trinket 2, and trinket 3 if you have it). The popup can equip it into that exact slot.

## 1.33.1
- Fixed: when the Merchant had a Mana Potion in stock (about half of visits), the shop failed to open on the first tap, and Mana Potions could never be bought. The shop now opens first time and sells them properly.

## 1.33.0
- A finished run (won or lost) now stays saved on its results screen until you press New run (or start another run). If the game reloads or you close it, the menu offers ▶ Back to your run's results: everything is still there, including Delve deeper after a win, and a leaderboard post that didn't make it is sent again. Rewards aren't counted twice.

## 1.32.6
- Fixed: an update arriving the moment a run ended (a win or a death) reloaded the game straight away, skipping the results screen, the leaderboard post and Delve deeper. Updates now wait until you're back at a path choice or the main menu.

## 1.32.5
- Found loot: the Scrap button is now red (on item cards and in the Compare popup).

## 1.32.4
- Jeweller: the Leave button is now a full-width gold 🚪 Leave the Jeweller, so it's easy to find.

## 1.32.3
- Compare buttons only show when there's something to compare against: a find headed for an empty slot has no Compare button (for weapons that fit either hand, only the hand that's holding something gets one).

## 1.32.2
- Options are easier to read: grouped into Sound, Gameplay, Progress & backup, and a Danger zone, with each setting on its own line (name and a short note on the left, its control on the right).

## 1.32.1
- Merchant rerolls get expensive fast: each one costs triple the last (was double), starting a little higher.
- Rerolling no longer brings a new relic: the relic on offer stays (sold stays sold). Merchant relics cost more: about 75% more at every rarity.

## 1.32.0
- Rooms with Quick Battle now also have a red ⚔️ Fight button beside it, so it's clear you can still fight them yourself (clicking the card works too).
- Options: Quick Battle can be switched On or Off. Off hides the Quick Battle buttons on the map and in fights.

## 1.31.4
- Phones: Resplendent chest cards are stacked one under the other instead of side by side.

## 1.31.3
- Inventory: the selected sub-tab (Equipped, Backpack, Sigils and the others) is a softer, muted gold.

## 1.31.2
- Starting-kit picker: each option is now its own block, with the option on top, what's in your kit now underneath, and an Equip button. Your current item no longer gets a block of its own; your class's own item is offered as an option whenever you've swapped it out.

## 1.31.1
- Starting kit: the "(your own)" note is gone from the slot list.

## 1.31.0
- Starting kits: instead of dropdowns, each slot shows what you start with and a Change button. Change opens a picker with every option as a full item card, compared against your current kit, with an Equip button. On phones the cards scroll sideways; on bigger screens it's a full-screen grid.

## 1.30.4
- Compare popup: the stats column "With it" is now "New item".

## 1.30.3
- Compare popup: the new find's card has brighter text and a lighter, slightly thicker border, so it stands apart from what you're wearing.

## 1.30.2
- The Compare popup has a Scrap button (showing the Scrap you'd get) next to Equip.

## 1.30.1
- ⚖️ Compare buttons now have a muted Rare-blue fill.

## 1.30.0
- Found weapons that fit either hand now have ✔ Equip main hand and ✔ Equip off-hand buttons, plus ⚖️ Compare main hand and ⚖️ Compare off-hand.
- Every other find has a ⚖️ Compare equipped button. Merchant gear has the Compare buttons too.
- Compare opens a side-by-side popup: the new find next to what's in that slot, a before → after table of your stats, and every effect you'd gain or lose. You can equip it straight from there.

## 1.29.3
- Merchant: rerolling the stock no longer restocks potions. Gear, relics and scrolls are rerolled; Healing and Mana Potions stay as they were, so one you've bought stays sold.

## 1.29.2
- Item comparison: the "Two-handed: your off-hand goes to your backpack" note now wraps inside the card instead of running out of it on large screens.

## 1.29.1
- Leaderboards: the Abyss is now its own main tab (🏰 Campaign · 📅 Daily · 🕳️ Abyss · 🎯 Bounty), with Deepest, Elites, Champions, Damage, Biggest hit and Gold for Abyss runs, and the class filter. After an Abyss run, See the leaderboards opens there.

## 1.29.0
- Leaderboards reorganised into three main tabs:
  - 🏰 Campaign: Deepest, Elites, Champions, Damage, Biggest hit, Gold and Abyss, as before.
  - 📅 Daily: the same boards for today's Daily Dungeon (they reset at midnight UTC), plus a new All time board with the deepest Daily runs ever, so a great Daily run never disappears.
  - 🎯 Bounty: the 10 foes that have ended the most runs, and how many players each has claimed. Counting starts with this update.
- Campaign and Daily boards can be filtered by class: All, Warrior, Rogue, Mage or Cleric.
- After a Daily run, See the leaderboards opens on the Daily tab.

## 1.28.2
- Leaderboards: a run could be wrongly marked unverified if it was sent a moment before the server heard you'd reached a new floor, and an early hiccup stuck to the run even after it later checked out. The game now tells the server your floor before sending the run, the server allows for that timing, and a run's latest post decides whether it's verified. The minimum time per floor is lowered, so Quick Battles can't trip it. Runs hidden by this are back.

## 1.28.1
- Ward now stacks. Every source adds a stack, and each stack blocks one negative status. Items whose Ward "returns every round" top you back up to one rather than piling up.

## 1.28.0
- Dual wielding, more of it:
  - 9 new weapons that work in either hand, from Common to Epic: Shortsword, Hatchet, Sai, Moon Sickle, Parrying Dagger, Duellist's Rapier, Flicker Blade, Wyrmtooth Scimitar and Tempest Twinblade.
  - 2 new Legendaries for two-weapon fighters.
  - 4 new talents: Crossed Blades, Ambidextrous, Whirlwind and Parrying Blades.
  - 4 new relics: Whetstone Pair, Paired Scabbards, Scissor Strike and Tempo Blades.
- Something on floor 25 has learned some new tricks.

## 1.27.0
- Full online backup: all your progress (Renown, mastery, kits, achievements, titles, Heat, history, Shards, Plates, settings and the run you're on) is now backed up under your backup code, not just Shards and Plates. It syncs every half-minute when something has changed, and as you close or leave the page.
- Restore from a code brings everything back (after clearing your browser, or on a new device). The backup panel is now in Options too, not only on the Abyss tab.

## 1.26.18
- Leaderboards: runs that won the Campaign and then delved deeper were wrongly marked unverified (the server stopped tracking floors after the win). Fixed, and the runs it hid are back on the boards.

## 1.26.17
- Merchant: new 🛒 Buy and 🪙 Sell tabs (every visit opens on Buy). Sell has Equipped and Backpack sub-tabs; bulk selling sits in Backpack. The heading and text are brighter.

## 1.26.16
- Evade now stacks. Every source adds a stack, and each stack makes one hit miss (so two Evade sources at fight start dodge the first two hits).

## 1.26.15
- Sigils have moved: they now have their own 🔮 Sigils tab in Inventory › Gear, next to Equipped and Backpack. The Talisman tab is gone from Spoils. New sigils light the Gear tab's dot.

## 1.26.14
- Sigils you find now show as a slim, glowing violet strip at the top of the reward screen ("🔮 Sigil found", its name, and where it went), instead of a plain line among the Gold. Boss sigils show there too, rather than in the message bar.
- The Delve deeper button after winning the Campaign is redesigned: a full-width glowing portal with a 🌀 swirl, a gold title, a short line beneath and a passing shimmer.

## 1.26.13
- Resplendent chests: "You passed up" is now "Lost out on", in a brighter, red-tinted heading.

## 1.26.12
- The gold heading on pick-one rewards now reads "CHOOSE ONE REWARD".

## 1.26.11
- After a fight, "Leave the rest" is now 🚫 Take nothing, with the same muted grey fill as Add to backpack. The Take nothing button on pick-one rewards matches it.

## 1.26.10
- Pick-one rewards (bosses, Iron chests with the Skeleton Key): the heading is now bright, with a glowing gold "CHOOSE ONE" on its own line.
- The "Choose ·" prefix is gone from loot buttons on every screen size.

## 1.26.9
- Loot buttons are now ✔ Equip (orange-yellow), Add to backpack (muted stone grey) and Scrap, with more space between them; they stretch to fill the card.
- On larger screens, pick-one rewards drop the "Choose ·" prefix on those buttons.

## 1.26.8
- The border around rooms with ⚡ Quick Battle is now green, matching the button.

## 1.26.7
- The in-combat ⚡ Auto-battle button is now ⚡ Quick Battle too, as is the result message it shows.

## 1.26.6
- The map's ⚡ Auto-fight button is now called ⚡ Quick Battle.

## 1.26.5
- Rooms that offer ⚡ Auto-fight now have a thin red border around both the room card and its Auto-fight button.

## 1.26.4
- In combat, the ⚡ Auto-battle button now has its own row, with its note underneath, on every screen size.
- The combat speed button now has the same stone fill as the Inventory button.

## 1.26.3
- End-of-run screen: the New run button (and Keep delving, after a win) now fills the whole row.
- On wider screens the ⚡ Auto-fight button sits under its room card at the same width; phones keep it beside the card.

## 1.26.2
- The ⚡ Auto-fight button is now filled in the same green as the health bar.

## 1.26.1
- The ⚡ Auto-fight button now sits beside its room in the same row, at the same height and in the same style as the room cards.

## 1.26.0
- Auto-battle now works from floor 1 (was floor 2).
- New ⚡ Auto-fight button under Monster, Elite and Champion rooms on the map. It enters the room and plays the fight out instantly, but only if it's one you can't lose. Otherwise it drops you into the fight with a warning.

## 1.25.5
- Item comparison: the ▲/▼ stat chips are back as they were; the green "+" / red "−" list of effects gained and lost sits underneath them.

## 1.25.4
- Item comparison: every stat that would improve shows a green "+", every one that would drop a red "−". Below the stats, each effect you'd gain (or that gets stronger) is listed in green with a "+", and each effect you'd lose (or that gets weaker) in red with a "−".

## 1.25.3
- Heat 5: the plain monster fight on the map is sometimes replaced by an Elite (about 30%) or a Champion (about 10%), from each floor's second step on.

## 1.25.2
- Heat 2 now halves all Gold you gain (was a quarter less).
- Heat 3 ("Dim fires") now halves all healing: potions, Campfires, heals after fights, items and relics.

## 1.25.1
- Challenges: the Abyss weekly twist stays locked (and hidden) until you've opened the Abyss.
- Heat retuned: Heat 1 gives enemies 30% more HP (was 20%); Heat 2 ("Lean pickings") also cuts all Gold you gain by a quarter — fights, chests, events, mid-fight item Gold and sales — on top of pricier shops; Heat 4 removes the heal after won fights entirely; Heat 5 enemies hit 20% harder (was 15%).

## 1.25.0
- **Gear forged by chance** (the item generator): half of all Common–Epic drops (and some Legendaries and Crimson) are now made fresh from a form, one of 51 materials (each with its own innate effect) and a set of effects drawn from 400+ modules. Rarer items get more: Epics 5–7 effects including a signature power, Legendaries 7–9, and the new **Crimson-veined** tier up to 10 (usually with a drawback ⛓️). Drawbacks also turn up now and then on Rare, Epic and Legendary rolls and pay for extra power.
- **Greater rolls**: ✦ Greater, ✦✦ Grand and ✦✦✦ Mythic effects are 1.5×, 2× and 3× as strong, each much rarer than the last, and likelier from Champions, bosses, Uber bosses, the Abyss and Heat. Mythic rolls get their own fanfare.
- **⚡ Overcharged** items: about one generated drop in 300 breaks every rule (far more power, extra effects). Rare on purpose.
- Generated gear works with the Forge (upgrade, reroll keeps the material, scrap, sell, offer) but can't be Combined or taken to the Jeweller.
- **The Talisman** (Spoils → Talisman): sigils that sit outside your gear. Plain sigils from Elites and chests, set pieces mostly from Champions and bosses. Six sets (Ember Court, Frozen Saint, Storm Choir, Red Tithe, Iron Vigil, Gambler's Hand) with 2-, 3- and 4-piece bonuses. 2 slots, +1 on floors 3, 6, 10 and 15.
- 6 new achievements (Greater, Mythic, Overcharged, Crimson-veined, matching pair, full Talisman set). How to play explains both systems.

## 1.24.1
- Main menu: a ⚔️ Challenges button between Info and Leaderboards. It holds the Daily Dungeon (a red dot until you've played today's), your Nemesis, Heat and this week's Abyss twist, so the Campaign tab is just the classes now.

## 1.24.0
- **Encounter achievements**: one for every event (rare and once-a-run ones are worth more), one for trying every choice at each event (counted across your runs), and one for each special room: resting at a Campfire, buying from the Merchant, upgrading at the Forge, a Shrine, an Altar, a Resplendent Vault, a Crimson Vault, a Bounty Board contract and unifying with a Dragon Heart. The Achievements list groups them under Feats and Encounters (117 in all).
- **8 new Epics**: Widowmaker, Sunderer, Wall of Retribution, Plague Lantern, Wolfhide Coat, Glacial Plate, Executioner's Signet, Vampire's Fang.
- **6 new Legendaries** (each with lore): Thunderclap, Scythe of the Blood Moon, The Unbroken Vow, Robes of the Eclipse, Fortune's Favour, The Endless Hunger.

## 1.23.0
- **Merchant**: buys as much as you like now. New "Sell all Commons" / "Commons + Uncommons" buttons; selling something you're wearing takes a second tap.
- **Campaign tab redesigned**: a short header with a Story button, the four classes as a compact 2×2 grid (with their mastery level), and an "Also waiting" list for the Daily Dungeon, your Nemesis and Heat. The Abyss tab uses the same layout.
- **Heat** moved into the class popup, and each level now also makes Rare-and-better finds slightly more likely.
- **30 new achievements** (52 in all), including: win a fight under 10% HP; wear only Legendaries / Epics / Rares; win the Campaign with a Common equipped or an empty slot; hold 2,000 / 10,000 Gold; mastery 10 with every class; beat a dragon; get a blessing; die to one hit; die without hurting the enemy; die to the floor 1 boss; 3 misses / 3 Crits / 6 Crits in a row; scrap or sell a Legendary; sell everything you wear; combine, infuse, transmute, fuse; and a no-class-move Campaign win for each class (no Guard, no Elemental Barrier, no Counter, no Penance). The Achievements list has To earn / Earned tabs.

## 1.22.0
- **Class Mastery**: each class earns mastery from floors reached and bosses beaten (10 levels). From mastery 2 you can choose its starting weapon, off-hand and armour from the Commons; from mastery 6, from the Uncommons too. Shown in each class's popup.
- **14 new Common items** (Woodsman's Hatchet, Boar Spear, Butcher's Knife, Chain Flail, Cracked Wand, Pilgrim's Cane, Pot Lid, Smoke Stick, Prayer Card, Scrap Mail, Fur Cloak, Rough Robe, Rabbit's Foot, Whetstone), in the loot pool and as kit choices.
- **Achievements**: 22 to earn, each paying Renown once; many give a title you can show beside your name on the leaderboards (Info → Achievements).
- **Heat**: after your first Campaign win, five stacking difficulty levels for +20% Renown each (tougher foes, greedy merchants, cold campfires, hungry dark, elite swarm). Not used in the Daily Dungeon or the Abyss.
- **Abyss weekly twist**: one of eight twists each week (some help, some hurt), shown on the Abyss tab and in the run's header.
- How to play has a "Between runs" section.

## 1.21.0
- **Relic choice**: bosses always, Champions and other big foes half the time, and Elites a quarter of the time offer a choice of two relics instead of one.
- **Nemesis**: whatever kills your Campaign run waits in your next one (from floor 2), tougher than a Champion and stronger every time it wins. Beat it for its bounty: Gold, an Epic or Legendary, a relic to choose and a Scroll. The title screen shows who your Nemesis is.
- **Legendary lore**: the first time you hold each revealed Legendary, a line of its story.
- **Build moments**: quick banners the first time each run you set off a reaction, Smite, land a massive or colossal hit, or one-shot an Elite, Champion or boss.

## 1.20.0
- "New" dots: the Inventory button and its tabs get a red dot when something new lands there (bag items, relics, artefacts, talents, curses, blessings, keepsakes, tonics), until you open that tab.
- Combat speed toggle under the fight (Normal / Fast / Very fast), same setting as in Options.
- Bulk scrap: "Scrap all Commons" (and Commons + Uncommons) in Inventory → Gear → Backpack and in the Forge's Scrap → Backpack tab. Two taps.

## 1.19.0
- **Loot comparison**: every item you could equip (drops, boss picks, the shop, your backpack) shows ▲/▼ for how your Damage, Armor, Max HP, Crit, Dodge, Bash and Spell Amp would change, against the item it would replace (or "Fills your empty slot"). It's worked out from your whole build, so set bonuses and relics count.
- **Daily Dungeon**: on the Campaign tab. The same dungeon (seed and class) for everyone each day (UTC), one attempt, with every item unlocked. New 📅 Daily leaderboard for today's runs.
- **Run history**: Info → 📜 Run history shows your last 10 runs: class, how far, how it ended (and who killed you), and your final build.
- Fixed: weapons showed an "Armor" line from their level that they never actually gave.
- BACKLOG.md lists the other suggested improvements.

## 1.18.5
- Auto-battle is available from floor 2 (was floor 3).

## 1.18.4
- DEATH scaled down drastically: it now has fixed stats wherever you meet it (40,000 HP, 40 Armor) instead of the old floor-80 numbers (trillions of HP). Its Reap is unchanged. Still extremely hard, but a truly broken build can win.
- The "couldn't be verified" leaderboard note now says why: no server session (offline, or the run began before verification existed) or the server couldn't confirm the run.

## 1.18.3
- Title screen: Campaign and Abyss Run look like real tabs. Info and Leaderboards are quieter and sit further from the tabs. The "You are what you wear…" line moved under "Choose an origin".

## 1.18.2
- Title screen: Renown, unlocks, the Codex and How to play now live behind an ℹ️ Info button, beside 🏆 Leaderboards (on both the Campaign and Abyss Run tabs).

## 1.18.1
- Abyss chests are much richer: Wooden chests give Uncommon to Epic, Iron chests Rare to Legendary.
- Trinket slots are labelled Trinket 1, Trinket 2 (and Trinket 3 ★) everywhere.
- Inventory → Stats has two tabs: Attributes (the old Stats page) and Statuses & reactions (moved from Extras, with the reaction guide and the list of all statuses).

## 1.18.0
- New game mode: **Abyss Run**. The title screen now has Campaign and Abyss Run tabs. The Abyss opens once you've beaten floor 15, and each run costs a Ruin Shard.
  - Ten depths, each counting as two floors deep. Every plain fight is a rank tougher (monsters are Elites, Elites are Champions, Champions are bosses) and every depth ends with an Uber boss: an empowered boss with far more HP, harder hits, more Armor and two extra traits.
  - Much richer loot, richest from Champions, bosses and Uber bosses (Uber bosses always offer Epics or Legendaries). The map labels rooms by what's really in them.
- Ruin Shards: every Campaign boss from floor 20 drops one. Vanadium Plates: those bosses sometimes drop one too.
- Vanadium Plates are given to a class for good. In Abyss runs only, each plate makes that class's Max HP, Armor and Damage stronger.
- Shards and Plates are kept on the device the moment they drop, and backed up online. A backup code on the Abyss tab restores them on another device.
- New Abyss leaderboard (deepest depth reached, with plates shown). Abyss runs don't count on the Campaign boards.
- How to play has an Abyss section.

## 1.17.0
- The Forge now asks before you scrap or offer gear you're wearing ("Keep it" backs out).
- Spoils → Artefacts now shows your Starmetal.
- Inventory → Gear has Equipped and Backpack sub-tabs.

## 1.16.0
- Every Forge tab now has Equipped and Backpack sub-tabs. Scrap, Upgrade and Transmute work on either.
- Offering and Combine keep what you've picked across both sub-tabs, so you can offer worn and carried items together, or combine an equipped item with its twin in your bag (the result stays equipped). The number picked shows on each sub-tab.
- Inventory: the Relics tab is now Spoils, with Relics and Artefacts sub-tabs. Artefacts moved there from Extras.

## 1.15.1
- Key items are now called Artefacts. The Extras tab has an Artefacts group with three slots: the Transmuter's Crucible, plus two still-unknown ones. The Forge's locked Transmute tab now says you're missing an artefact.

## 1.15.0
- New Scrap tab in the Forge: break down items from your bag for Scrap (and Starmetal for the rarest), with the reward shown on each button. Equipped gear is never offered.
- Each Forge tab's contents now sit in a bordered frame, and the description at the top of each tab is brighter and easier to read.

## 1.14.2
- The Forge no longer shows percentages. Offering odds are now described in words (likely, possible, unlikely, a slim chance) for each rarity it might give, and the Offering and Combine descriptions no longer give exact chances.

## 1.14.1
- The Transmuter's Crucible is now a key item instead of a relic. It still drops from Champions at the same rate and has its own slot in the Extras tab, which shows as empty until you find it. Saves that already have the Crucible relic are converted automatically.
- The Forge's Transmute tab is always shown. Without the Crucible it's locked and says you're missing a key item.

## 1.14.0
- Leaderboard anti-cheat: the server now keeps its own record of every run (start time and each floor reached, one at a time, at a believable pace). Finished runs are checked against it (floor, time, kills, Elites/Champions, Gold, level); anything that doesn't add up is kept but hidden from the boards, with the reason recorded. Runs started offline can't be verified.

## 1.13.7
- Inventory and Potion buttons use the carved-stone look of the class cards, with dark text.

## 1.13.6
- Close buttons (and the corner ✕ on popups) have their own dusky-rose fill.

## 1.13.5
- The Inventory button is brighter (lighter fill, bright text, raised).

## 1.13.4
- Close buttons show an ✕ (Inventory, How to play, Leaderboards, Bounty, Story).

## 1.13.3
- How to play → Loot: "Uncommon" is shown in Uncommon green.

## 1.13.2
- Leaderboard names can be changed again (undoes 1.13.1).

## 1.13.1
- (Undone in 1.13.2.) Leaderboard names were made permanent.

## 1.13.0
- One mode: the Campaign (you can still keep delving after the fifth boss). The mode picker and Endless option are gone; the story has its own button.
- 🏆 Leaderboards button on the title page.
- Menu: Codex, How to play and Leaderboards are bigger, brighter buttons, each on its own row on phones.

## 1.12.1
- Leaderboards are live (deck-dungeon-leaderboard.bestondeveloper.workers.dev).

## 1.12.0
- **Leaderboards** (switched on once the server is live): Deepest floor, Elites, Champions, Damage (whole run), Biggest hit and Gold earned. Each board shows every player's best. A 🏆 Leaderboards button on the title screen; the end-of-run screen asks for a name once, then every finished run goes up by itself (and waits if you're offline).
- The game now tracks total damage dealt, your true biggest single hit, and all Gold earned in a run; the end-of-run screen shows them.
- New `/leaderboard` folder: the Cloudflare Worker + D1 database and a GitHub Action that deploys them.

## 1.11.6
- After choosing a class, the start button says "Start Campaign" or "Start Endless" to match the chosen mode.

## 1.11.5
- The Endless mode button reads "Endless · how far?".

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
