# Changelog

Versions follow MAJOR.MINOR.PATCH:
- **MINOR** (1.x.0) for new content or features: items, events, mechanics, screens.
- **PATCH** (1.1.x) for fixes, balance tweaks and small UI polish.
- The build number (git commit count) still goes up with every deploy.

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
