# Changelog

Versions follow MAJOR.MINOR.PATCH:
- **MINOR** (1.x.0) for new content or features: items, events, mechanics, screens.
- **PATCH** (1.1.x) for fixes, balance tweaks and small UI polish.
- The build number (git commit count) still goes up with every deploy.





## 2.5.0
- Guard is stronger, so a shield is worth carrying for any class. A Guard now doubles your Armor and adds +2 more (shield bonuses still stack on top). With 3 Armor, a Guard stops 43% of a hit, up from 34%.
- New: Riposte. After you Guard, your next attack deals 25% more damage, so Guarding no longer just costs you a turn.

## 2.4.6
- Small screens: the top half of the backpack area is a dotted box for your throwables (it reads "Throwables" when you have none). The 🛡️ Armoury button sits centred in the bottom half.

## 2.4.5
- A beaten monster only rises again as a Champion after 17 plain fights in a row (was 14). The odds then start at 10% and rise 10% with each plain fight after that, as before.

## 2.4.4
- On small screens the backpack has room to breathe. The Gear tab's backpack area lists your throwables, and your backpack gear moves to the 🛡️ Armoury: a page of its own, one full-width card per row, each with Equip and ⚖️ Compare, and Back to return. Wider screens are unchanged.

## 2.4.3
- Backpack gear has a ⚖️ Compare button. It opens the Compare page with the item beside what you wear in that slot, your stats before and after, and what changes. You can equip it from there, or go Back to the backpack. In a fight you can still compare, just not equip.

## 2.4.2
- A class's base attribute (★: Strength for the Warrior, Intellect for the Mage, and so on) gives +1 base Damage for every 2 points, down from every 3.

## 2.4.1
- Throwables have their own blocks in the backpack instead of a chip in the materials row. They're half-height, two stacked per column, after your gear. Each shows its icon, name, how many you hold and what it does. They don't use backpack slots.

## 2.4.0
- The Daily Dungeon opens once you've unlocked every class (the Rogue by beating layer 1 as the Warrior, the Cleric by beating it as the Mage). Until then it shows 🔒 in Challenges, with no "new today" dot.
- The Passive Tree waits for the same thing. A class's tree opens once every class is unlocked and that class has beaten a layer. Its spot in the Camp is shaded as locked until then, and the tree says what's missing.

## 2.3.6
- Champions glow brighter on the map: a wider, stronger orange aura, a brighter outline and a faint pulsing ring, so they don't blend into the torchlit floor.

## 2.3.5
- Two-handed weapons hit 20% harder, to make up for the off-hand they shut out. Their damage line reads "two-handed (+20%)". This is for every two-handed weapon (axes, hammers, greatswords, greatstaves, bows), heavy or not.

## 2.3.4
- Weapons no longer carry the 🪨 Heavy rule. A big weapon doesn't halve your Dodge or block Evade and Haste, and it no longer hits 15% harder. Heavy armour and heavy shields keep the rule (half Dodge, no Evade or Haste, 30% more Armor). The 🔨 Stagger of hammers and mauls is unchanged.

## 2.3.3
- Hide, Bone Dust and Cult Sigils drop less often: a normal foe 20% (was 35%), an Elite 45% (was 70%) with a smaller chance of a second, and a Champion 1–2 (was 2–3). Cogs and the boss handfuls are unchanged.
- The Merchant's Ledger (Knowledge Table) now takes 30% off Merchants' prices (was 10%).
- A Merchant never pays more than 90% of what they'd charge for an item, so buying and selling straight back always loses a little.

## 2.3.2
- The backpack's Gear tab shows your equipped items on parchment, with names in darker rarity colours so they read well on the light background.

## 2.3.1
- Toxic sludge pools poison you for 2 steps after you leave them, not 4. Lava still burns for 4.
- The doors to Something Strange glow a pale, otherworldly blue, like the special foes do in their own colours.
- The Merchant buys gear at 80% of its value (it was 40%), plus a little for the item's level.

## 2.3.0
- New: the Cleansing Potion 🫧. Drink it in a fight to wash away your worst negative status (the one with the most stacks). It uses your action, like any potion, and you can carry 2. It's in your potion drawer, and in the Artefacts tab when you have one.
- It's rare: Elites drop one 4% of the time, Champions 10%, urns 1%. About one Merchant in three stocks it, at 80 Gold before the shop's price modifier (a Mana Potion is 35).

## 2.2.5
- The mini comparison on item pages is always in colour: green for ▲ gains, red for ▼ losses. This covers chest finds, shop items and the backpack, on parchment and on the Epic and Legendary pages.

## 2.2.4
- Barrier lash is for better charms now. No Common off-hand has it, so the Mage's starting Ember Charm just applies its Burn on a 2. Only two Uncommons keep it, Cinderfrost and Marshlight. Rare and better charms keep theirs. A Barrier from anywhere still works as a plain Barrier.
- Four new Common charms, all without an element: Warding Charm (start each fight with 3 Barrier), Mirror Charm (on a 1: gain 2 Barrier), Quartz Charm (+5% Spell Amp) and Hourstone Charm (on a 6: gain Focus).
- A level requirement disappears once you reach that level. The 🔒 line goes from gear you carry, and isn't shown on any item you could already use.

## 2.2.3
- Common and Uncommon staves no longer cast a spell on a 1. The Apprentice Staff, Greatstaff, Adept's Staff and Bogwood Staff now Graze on a 1. Spells on a 1 stay on the better staves (Rare and up).

## 2.2.2
- Charms no longer promise an Elemental Barrier button (that old Mage skill was retired with the move to paths). They now say what they really do: "Barrier lash: a foe that hits your Barrier takes 2 Burn (4 each if the Barrier stops the whole hit)". This works with any Barrier you have.
- Spell faces show their effect on the item, e.g. the Apprentice Staff reads "1 Spark (1 Burn) · 2 Fire Bolt (3 Burn) · … · 6 Arc (1 Shock)". So a Burn on a 1 is no longer a mystery.

## 2.2.1
- Epic and Legendary finds get a page of their own look. A Legendary's page is darker and warms into orange, with an orange edge. An Epic's does the same in violet. This covers chest finds, shop items and gear in the backpack.
- Scrap no longer shows in the backpack's Gear tab. It's in the Artefacts tab.

## 2.2.0
- Scrolls of Revelation are gone. Every Legendary arrives revealed, with its power shown and working from the moment you find it. Hidden Legendaries in an older save are revealed when it loads.
- No more Scrolls in shops, chests, Resplendent cards, boss rewards or events. The Forge's Reveal tab and the Scrolls tiles are gone too. The Blind Scribe has packed up, and the Card Sharp now wagers a Rare item (sometimes Epic) against your potion.
- Levelling up heals you a little: a fifth of your Max HP. Curses that cut healing still apply, and the level-up note says how much you got.

## 2.1.0
- The leaderboards know the new dungeon. Deepest ranks by layer, then by the floor reached inside it, and shows it as "2nd Layer · Floor 3" (or the Entrance). Every other board shows how deep each run got under the player's name.
- A find that asks for a higher level now asks for at most one level above yours (it was up to five). Gear you already carry is capped the same way when a run loads.
- The retired Vanadium Plates no longer show on the boards.

## 2.0.17
- Skeleton Keys no longer show in the backpack's Gear tab. They're in the Artefacts tab.

## 2.0.16
- At the Merchant, switching between Equipped and Backpack (or tapping anything) no longer scrolls you back to the top. The backpack screen holds its place too.

## 2.0.15
- Starmetal and Orilium live in the backpack's Artefacts tab now, not the Gear tab. Orilium has its own tile beside Starmetal.

## 2.0.14
- Fixed "Unknown item: fx_…" after Continue. Rolled effect lines on saved gear are now known from the moment the game starts, not just after the first new loot. This was also what froze the screen after an update reload.

## 2.0.13
- Updates mid-run are safer. The game waits until you've stopped walking, saves exactly where you stand, then loads the new version. Continue puts you back on that tile.
- The dungeon map always answers taps after Continue, even if drawing it hits a problem.
- If a screen ever fails to draw, a red note says so (with a button back to the menu) instead of the game silently freezing.

## 2.0.12
- On small screens the Descend button keeps only its left arrow.

## 2.0.11
- The Compare page has Add to backpack, alongside Equip and Leave it (the same choices as the find itself).

## 2.0.10
- Item views are pages now, not popups. A shop item, an equipped item from the backpack, a chest's find and rewards each fill the screen and have a Back button.
- Compare equipped is a page of its own. Nothing else is drawn under it, so it can't end up hidden. It has the wooden sign, dotted rarity cards, and Equip, Scrap and Back along the bottom.

## 2.0.9
- Compare equipped opens on top of the Merchant's item popup too, on every browser (the earlier fix relied on CSS that some browsers ignore).

## 2.0.8
- The Resplendent Chest has the dungeon look: a wooden sign, studded wooden card backs with a glowing seal, the revealed find shown large, and a Claim plank.
- "Lost out on" items now sit in their own framed box, each in a dotted frame of its rarity's colour.
- Long popups in the Crawl scroll as a whole, so the parchment always reaches the bottom and nothing spills past its edge.

## 2.0.7
- Compare equipped works again. The comparison now opens on top of the found-item popup, the backpack and item popups instead of behind them, and tips stay hidden while it's open.

## 2.0.6
- The Achievements page now matches the dungeon look: a wooden sign, a progress bar, gold tabs, and achievements grouped by kind. Earned ones are parchment cards with a Wear button for their title. Locked ones are dark dotted cards that show the title you'd get.

## 2.0.5
**Deck Dungeon 3 goes live.**
- The game moves from the test link to the main page.
- **Everyone starts fresh:** every save, Camp, achievement and leaderboard is wiped once (Great Reset, epoch 3).

## 2.0.4
- **A softer start.**
  - **Catch your breath:** each trapdoor drop restores 25% of your Max HP on the 1st Layer, and 10% deeper down.
  - **A sure first find:** the first chest you open on the 1st Layer always holds a weapon or armour, Uncommon or better, that you can wear straight away (and it's never a Mimic).
- The end-of-run screen no longer shows the run's last leftover message.

## 2.0.3
- **Where seeds come from:** Champions (30%) and Elites (8%) as before, plain Beasts now and then (5%), urns rarely (3%), and the Merchant, who often has one on the shelf (rarer plants cost more). Chests no longer hold seeds, and the "tucked in a corner" message is gone.
- **Special foes glow** instead of wearing a thin ring: a pulsing aura and a lit outline in their colour. Elites are violet, Champions orange, Crimson foes red-magenta, named Uniques gold, your Nemesis blood-red, Treasure Goblins green-gold and the Changeling cyan.
- **The trapdoor glows brighter,** with a halo of light spilling onto the floor around it.

## 2.0.2
- **The Garden and the Brewery, grown up.** Nine plants now, up from three, and their seeds turn up more often: Champions (30%), Elites, and now and then a chest. New brews:
  - **Draughts** you carry in your pack and drink outside a fight (🎒 → Artefacts). Each lasts the floor you're on and the next few:
    - 🕯️ Glowcap Tonic: see 1 tile further, 3 floors
    - 🪵 Ironbark Draught: +2 Armor, 2 floors
    - 🍃 Fleetfoot Tonic: +5% Dodge, 2 floors
    - 🪙 Prospector's Tea: +25% Gold, 3 floors
    - 📖 Sage's Tea: +50% XP, 2 floors
    - 🔥 Firebrand Oil: your hits apply 1 Burn, 1 floor
  - Healing Potions, Mana Potions and Blightcap Brews brew as before.
  - The Garden has a herbalist's book listing all nine plants.
- **Barrier lash.** Elemental charms (and a few off-hands) now work with Barrier from any source: while you have Barrier, a hit on it throws the item's elements back at the attacker (2 stacks each, 4 if the Barrier soaked the whole hit; once a round).
- **The Tavern's parting gift** is now one of the three, at random.
- **The Tavern keeper** has 15 lines, picked at random each time you walk in.
- **The Quest Board's notices** are parchment pinned to the post, and readable. The old "Use War Cry 5 times" contract is now "Use your skill 4 times".
- **When a run ends**, what you carried shows as full item cards in their rarity's dotted frame.
- **No more tips during fights.** The fight, Mana and throwable tips now come up on the map.
- The Drills yard has a weapon rack, drawn from the game's own weapon art.

## 2.0.1
- **The trapdoor, explained.** Pressing Descend now shows the trapdoor up close, with a line on how it works: walk into it to drop a floor, and there's no way back up. Tick "Don't show this again" to skip it.
- **Descend stands out.** A deep red plank with gold lettering, a soft ember glow and bobbing arrows.
- **The Camp's Enter Dungeon ribbon** is red, with gold letters.
- **Totems are retired.** Class-sorted loot and Weapon Mastery already lean your finds. Guardians no longer drop totems, and the Totem button is gone from Enter Dungeon.
- **Ruin Shards, Vanadium Plates and Ruin Gems are gone,** with their panels and buttons. The Abyss explainer now describes the Abyss as it is: one layer, Omens and Tarot cards.
- **Drills give the Camp nothing:** no Crown Shards, materials, Scrolls of Knowledge or seeds.
- The Great Reset notice now welcomes players to Deck Dungeon 3.

## 2.0.0
Deck Dungeon 3 is now version 2.
- **Merchant popups** now have the dungeon's wood-and-brass buttons (no more yellow, blue and pink), and so does the popup for gear you're wearing.
- **A systems check-up:**
  - **Transmuting works again.** The Knowledge Table's "Crucible's Secret" now adds a Transmute tab at the Forge; it was a dead purchase.
  - **Leftovers retired.** Guardians no longer drop Talisman sigils (the Crawl has no Talisman). The Crossroads Dealer, which trades relics, no longer turns up in the dungeon.
  - **Achievements trimmed.** Five that could no longer be earned are gone: Grandmaster, Master of All, Two Become One, Matching Pair and Full Talisman.
  - **Text updated.** The Codex drops Keepsakes, Relics and Fusions and retired gear, and calls talents "Passives (Passive Tree)". The weekly Abyss twist is gone from the reference (it no longer applies). The backup text no longer mentions Shards and Plates.
  - **Drills in the Challenges list.** Challenges now shows your Drill clears and gold medals.

## 1.100.0
Phase 4 begins: first impressions.
- **The Merchant, redone.** A market stall with the Merchant behind it. Wares are tiles framed in their rarity's colour, potions and throwables sit on a shelf, and your own gear sits below to sell. Tap anything to see it in full in a popup. On wide screens, selling sits beside the stall.
- **Tips for your first run.** A short tip the first time each thing happens: the Camp, walking, trapdoors, fights, finds, levelling up, your level-5 skill, Mana and throwables, and a cleared layer. Tap "Got it", or "Hide tips"; Options can turn them back on or show them all again.
- **How to play, rewritten** for the game as it is now: trapdoors, the parting gift, a new Paths and skills section, 2 Mana that carries over, free throwables, 1 attribute point a level, chest odds, the Camp's Tarot Room, Drills, Heat pacts and the Abyss. The reference and the 2.0 patch note are updated too.
- **Gear built on the old skills no longer drops.** The 80 War Cry / Counter / Barrier / Penance items are retired. Four Legendaries that leaned on old skills now work with any skill: the Horn of Ruin, the Riposte Charm (now on a dodge), the Martyr's Shroud and the Warhorn Bulwark.

## 1.99.0
Phase 3, part 3: Drills.
- **Drills.** A new Camp room, next to the Passive Tree, with ten short challenge runs of one rule each: Boss Rush, Glass Cannon, Bare Hands, Dry Throat, Elite Gauntlet, Cursed Pilgrim, Against the Clock, Silent Hands, Lights Out and Borrowed Steel.
  - **Length:** a Drill runs 3 layers; the Boss Rush runs all five guardians.
  - **Same footing for everyone:** no Heat, no Tarot, no Hall upgrades and no Passive Tree. You pick your class and path.
  - **Unlocking:** the room opens once any class beats the 1st Layer. Three Drills are open at first, and each one you clear opens another.
  - **Rewards:** a Drill's first clear gives 👑 3 Crown Shards and a title. Medals: 🥉 one class, 🥈 two, 🥇 all four.
  - **Kept apart:** Drills don't count towards layers beaten, wins, your Nemesis, bounties, the Ledger or the leaderboards.
- **Class passives are now Passive Tree nodes.** Battle-Hardened, Opportunist, Arcane Spark and Devotion no longer come with a class (they clashed with the paths). Each is now a 3-rank node any class can take.
- **Fishing.** The real bite can come on the 1st, 2nd, 3rd or 4th movement of the float. The Camp's pool is now the stingiest water: fewer bites, and often nothing on the hook. A fish only goes in the Trophy Room's tank once you've caught it twice.
- **Parting gift:** a Healing Potion, a Mana Potion or a Skeleton Key (the Gold option is gone).
- **Main menu:** ⚔️ Start ⚔️ and 🏆 Leaderboards 🏆, and the buttons get a little darker one after the next.

## 1.98.1
- **The Tavern's parting gift** is now your choice of 40 Gold, a Healing Potion, a Mana Potion or a Skeleton Key (it was a choice of trinkets).
- The Paths room no longer says "something gained and something given up".

## 1.98.0
Phase 3, part 2: a livelier 1st Layer, the Camp Ledger, and achievements that fit the dungeon as it is now.
- **A parting gift.** Setting out from the 1st Layer, the Tavern offers three Uncommon trinkets, ready to wear. Take one with you.
- **The 1st Layer's own named foes.** One waits on every 1st Layer, somewhere on its 2nd to 4th floor, in a room of its own: the Rat King, the Rusted Foreman, Old Widow Moss or Brother Candlewick. Each is tougher than a Champion and softer than the guardian, and drops a Rare (often an Epic). The deeper Uniques are unchanged.
- **No bare floors up top.** Every floor of the 1st Layer now has at least one landmark (an altar, a shrine, an encounter…).
- **The Camp Ledger.** In the Trophy Room: all 8 paths, and the marks each has earned. The marks are: 1st Layer, 3rd Layer, the dungeon, Heat 4, Heat 8, and the Abyss.
- **Achievements cleaned up.** Ones that asked for the 7th or 10th layer now ask for the 5th Layer or the Abyss's last floor. THE END (out of reach now) is replaced by Head Hunter: beat 3 Unique foes in one run. The "never use Barrier/Counter/Penance" ones now mean "never use a skill". New: Big Name, Bigger Fall, and A Path Chosen.
- **Fix:** an urn or chest could end up standing in the open when its little room got a second doorway.
- Pick titles on the Crawl's parchment popups are now dark ink (they were pale and hard to read).

## 1.97.1
- **Every class starts with 2 Mana** (was 3), so Mana Potions, Intellect and Max Mana gear matter more.
- **Backpack items** now sit in a dotted frame in their rarity's colour, instead of a parchment scroll.
- **Class cards in the Tavern** match the new rules: your two paths, the level-5 skill, 2 Mana that only potions refill.
- The Tavern keeper now says "Grab a drink before you go."

## 1.97.0
Phase 3 begins: paths, skills and a new look for the inventory.
- **Paths.** Each class has two, chosen in the Camp's Paths room before a run: Bulwark or Berserker, Duelist or Assassin, Elementalist or Arcanist, Penitent or Zealot. A path is passive, something gained and something given up. The second path opens once that class beats the 1st Layer.
- **Skills at level 5.** The old class skills are gone. At level 5 you choose one of your path's two skills (16 new ones in all) in the Attributes tab.
- **The old skills live on in Legendaries.** War Cry, Crush, Shield Wall, Counter, Envenom, Smoke Bomb, Barrier, Frost Nova, Arcane Bolt, Penance, Smite and Sanctuary each come with one of 12 new Legendary weapons, off-hands and armours. Random "grants a skill" lines no longer roll on gear.
- **Chests feel special.** Every chest now has at least a 5% Epic and 2% Legendary chance on the first floor, rising to 10% and 7% on the last.
- **Intellect is back to its old job.** It makes statuses and reactions hit harder, and still gives 1 Max Mana for every 3 points. The base-damage boost from your class's own attribute is passive, so it's no longer listed in the tab.
- **Attributes tab, on parchment.** Each attribute shows its name, level and a + button; tap the name for what it gives. Your skill choice sits below.
- **Gear tab.** The portrait has a gold frame, equipped items are plain rows (tap one to see it), and the backpack fills the rest of the screen: full item cards that scroll sideways, two at a time on a phone and more on bigger screens. On a phone the tabs show icons only.
- **Magik tab.** A new inventory tab shows the Tarot cards you carry (and, in the Abyss, your Omens).
- **The Tarot Room.** A new Camp room under the night sky, next to Weapon Mastery: all 21 cards, the locked ones face down. Choose and reverse the cards you carry here.
- **The Passive Tree, updated.** 11 nodes built on a single old skill have left the tree. There are 8 new ones: Deep Well (Mana back each fight), Practised Hand, Steadied, Thrifty Casting, Spark of Insight, Prayerful, Deepening and Windfall (each triggered by using your skill).

## 1.96.0
Phase 2 of the endgame rework: loot.
- **Richer finds, layer by layer.** Every chest, Elite, Champion, guardian and Merchant now rolls on odds that grow with the layer. Rares are common from the 2nd Layer, Epics are a regular find from the 3rd, and by the 5th a full Epic-and-Legendary kit is a real possibility. Normal monsters still drop no gear.
- Elites drop gear more often (22%, was 12%), and so do Champions (45%, was 30%).
- **Guardians always pay out.** A layer's guardian leaves one item, and it's never below Rare: Rare or better on the 1st Layer, at least Epic from the 3rd, and a Legendary 35% of the time on the 5th.
- **24 new class Legendaries**, six per class, three for each of two ways to play:
  - Warrior: the Bulwark (Aegis of the Unmoved, Bastion Plate, Oathkeeper's Torc) and the Berserker (Twinfang Cleaver, Horn of Ruin, Berserker's Hide).
  - Rogue: the Duelist (Mirrorstep, Whisperweave, Riposte Charm) and the Assassin (Viper's Kiss, Nightshade Vial, Shadowsilk Wraps).
  - Mage: the Elementalist (Prism of Ruin, Stormglass Robe, Wand of Kindled Ash) and the Arcanist (Codex of the Deep Well, Aetherbound Robes, Sigil of Overflow).
  - Cleric: the Penitent (Flagellant's Chain, Martyr's Shroud, Thorned Reliquary) and the Zealot (Censer of Dawn, Hallowed Hammer, Seraph's Seal).
- A class's own Legendaries turn up three times as often as general ones, and only ever drop for that class.
- **12 new Epic powers** leaning the same ways: Rampart, Frenzied, Shadowed, Viperous, Resonant, Wellspring, Penitent, Radiant, Shattering, Bloodletting, Sparking and Steadfast.
- Weapon mastery opens more of each weapon family from the start (65%, was 40%), so the pool is wider without a grind.
- Main menu: **Continue** takes you straight back into your run, and **Start** begins a new one.
- Warrior: Battle-Hardened no longer gives 2 Might when you Guard. It still gives +2 Armor when you Guard, and +1 Damage for every 5 Armor you wear.

## 1.95.0
Phase 1 of the endgame rework: Tarot, a new Abyss, and Heat as a pact.
- **Tarot cards.** 21 Major Arcana, from the Fool to Judgement. You can carry two into a normal run (pick them at the Enter Dungeon door, under Tarot). Every card pairs a boon with a bane: the Emperor adds Elites that always drop gear but hit harder; the Moon turns more iron chests into Mimics with richer hoards; the Tower makes layer bosses tougher and their hoards richer; and so on. "Edict" cards (the High Priestess, Judgement) bend a rule and add Heat.
- Cards level up to III: II strengthens the boon by a quarter and lets the card be **Reversed** (twice the boon, twice the bane); III is a gold frame and adds no further power. No card switches off a class's mana, skills or dice.
- **The Abyss** is now a single dark layer below the 5th. You set out at a deep level with good gear (whatever beats your kit goes straight on). Its foes are a little deadlier than the 5th Layer's, its warden at the bottom is an Uber boss, and its floors are darker with few torches.
- **Omens:** on each Abyss floor, three Omens are offered. Accept one (a boon and a bane for the rest of the run) or turn them all away. Accept four or more and the reward offer grows to four cards.
- **Abyss reward:** each clear offers Tarot cards you don't own yet. Once you own them all, it offers level-ups instead. No currency is involved. Ruin Shards, Vanadium Plates, Ruin Gems and the weekly Abyss twist are gone, and the Abyss costs nothing to enter.
- **Heat is a pact.** Instead of 5 fixed levels, you pick from 12 conditions (Hardened Foes, Lean Purse, Elite Swarm, Cruel Masters and more), each worth Heat. Total Heat makes Rare-or-better finds likelier (+4% a point, up to 20 points).
- **Heat bounties:** the first time each class beats the dungeon at a new Heat level (up to Heat 10), the Camp gets Crown Shards, plus a Scroll of Knowledge at every even level.
- Heatforged gear now drops from Heat 2, and its finest pieces need Heat 6 and 10. Heat achievements are rescaled to match.
- Beating the 5th Layer ends the run as a win. "Delve deeper" is gone.

## 1.94.1
- Levelling is back to its old pace (3 XP for level 2, then 2 more each level), but each level-up now gives 1 attribute point instead of 2.
- Drinking a potion (healing or mana) makes a sound: a clink, then a few gulps.

## 1.94.0
- Fixed: tapping a node on the passive tree no longer throws you back to the top-left corner.
- Attributes give much less per point, and levelling is slower (8 XP for level 2, 4 more each level after that). A class's base attribute adds +1 Damage for every 3 points, not every point.
- Intellect no longer boosts status or reaction damage (that comes from gear and the passive tree now). Instead it gives +1 Max Mana for every 3 points.
- Mana carries over from fight to fight. Only Mana Potions refill it (a new run starts full).
- Throwables cost no turn: tap one to ready it, and it flies right after your action. Tap again to put it back.
- The Jeweller no longer takes relics. It now has an Upgrade tab, and only the Jeweller upgrades trinkets: the Forge and the Blacksmith won't.
- Blood Oath: −40% Max HP for an Epic, or −65% for a Legendary that brings a random curse with it. Both say your Max HP can never rise again.
- The Blood Fountain now costs 45% of your Max HP.
- The class card is short: the skill, the passive, the base attribute, HP and starting kit.
- Enter Dungeon buttons are in muted dungeon shades (oak, stone, charred wood, old moss).
- The curse skull sits under your health bars.
- The class skill button no longer shows a mana cost. The level-up popup lost its "nothing changes until you do" line.
- Strange doors no longer glow.

## 1.93.0
- Class Mastery is gone. Class skills now unlock as you beat layers: the 2nd after the 1st Layer, the 3rd after the 3rd. No more starting-kit swaps.
- Renown is gone as a mechanic: all loot is in the pools from the start.
- You start with 16 Gold. Events that ask for Gold now ask for about half as much.
- Blood Oath is harsher: give up 30% of your Max HP for an Epic, or 70% for a Legendary, and your Max HP can never rise above what's left. It shows under Curses in Artefacts.
- A level-up changes nothing by itself: no Max HP, no healing. You only get points to spend.
- War Cry gets stronger with Strength. New Epics (Bannered Wall, Vanguard Plate) and a Legendary (Warhorn Bulwark) make War Cry count as guarding.
- Penance also gives you Regen (3, +1 for every 2 Faith).
- The Causality Mirror now reflects half the damage.
- Cleansing wells no longer appear straight away when you're cursed. The odds are unchanged.
- When you're cursed, a purple skull shows under the map. Tap it to see your curses.
- The class skill button has its own look in combat.
- Enter Dungeon: Descend is gold, and Layer, Heat and Totem each get their own colour.
- Paper panels (merchant, bag, popups) size to what's on them. The merchant's Equipped and Backpack lists are taller.
- Main menu buttons scale up on big screens.
- Passive nodes no longer say they were once a relic or sigil.
- Sounds: hits, crits and reactions are back to the original punchier sounds. Grazes have their own lighter sound, and chests play an opening sound.

## 1.92.0

- **Deck Dungeon 3.** A new main menu: a torchlit hall drawn from the dungeon's own tiles, the title on a hanging sign, and plank buttons. Options and Changes match it, and Changes has notes for the new game.
- **Music:** six new tracks. Two quiet ones play at the Camp, three cycle on the dungeon floors, and two play in guardian fights. They're compressed small and only load when needed.
- **Layers are stages.** Beating a layer's guardian shows a victory screen: go deeper, or head back to the Camp with the run counted as a success, not a death.
- **Start deeper:** at Enter Dungeon, the new Layer button lets you start from any layer up to the one after your class's best. You set out a few levels up, with a potion, some Gold and three pieces of gear.
- **Harder the deeper you go:** every layer is tougher than the last, every floor within a layer a little tougher than the one before, and from the 4th layer foes carry much more HP.
- **Below the first layer:** Crimson foes (in rooms of their own, with a red-magenta glow), dragons and Blessings, all more likely the deeper you go.
- **Relics are gone from the dungeon's floors.** Every relic's effect is in the Passive Tree now, common ones near the top and Legendary ones deep. The tree opens once a class beats the 1st Layer.
- Heavy gear halves your Dodge instead of removing it.
- The Merchant buys as many things as you like.
- The inventory's Spoils tab is gone, and Extras is now **Artefacts**: what you carry, any Blessings on you, and your curses.
- The Enter Dungeon buttons have no emoji.

## 1.91.1

- **Springs, altars, fountains and other fixtures stay put once used**, a little dimmer, instead of vanishing. A campfire you've rested at is left as ash and embers.
- **The Forge is easy to spot:** an anvil on a stump with a hot bar on it, a hammer, a glowing brazier and sparks. It always gets a little room of its own. A used Forge goes cold.
- The potion drawer's counts sit inside each potion's circle.

## 1.91.0

- **Crit damage and staff damage come from gear and the tree now**, not from attributes. Agility gives Dodge and Crit chance; Intellect gives status and reaction damage. Look for "Crits deal +%" lines on gear, a new "Staves and wands deal +%" line on staves, wands and foci, and Keen Edge and Staff Lore in the Passive Tree.
- **The Abyss's depths are shorter:** three floors and the Uber boss's.
- **Fights:**
  - The moves are wooden planks with a nail at each end, and their colour runs along the bottom edge.
  - Guarding is calmer: just a soft blue glow at your feet.
  - With one or two throwables, their buttons don't stretch across the row.
  - With nothing to drink, the potion button doesn't open an empty drawer.
  - On big screens like a 13-inch iPad, your hero can't slide under the buttons any more.
- Wolves are gone (the dungeon never had any): they're **Flayed** now, and Frost Wolves are Frostbitten Flayed.
- An item's type (Short Blade · Medium · Blade, Light Armour…) sits in a thin box of its own, with no tag icon.

## 1.90.0

- **Balance:** the first layer eases you in more gently. Its plain foes reach full strength only on its last floors, and its Elites are a little softer on the first two floors.
- **The Mage is sturdier:** 34 HP (was 32), and the Apprentice Staff hits a little harder; its Fizzle face is now a Spark (a graze that sets a little Burn).
- Under the hood: unused old code and styles cleared out, so the game is a little smaller.

## 1.89.0

- **The Abyss and the Daily Dungeon are walked now**, like the main dungeon. The Abyss is ten depths, each a layer of floors with an Uber boss at the bottom; the Daily is the same dungeon and hero for everyone that day.
- **The Abyss opens once any of your heroes beats the dungeon's last layer.** Each run costs one Ruin Shard, and every guardian from the last layer on (when you Delve deeper) leaves one; Vanadium Plates come from the same guardians.
- **Achievements count layers now**, not the old floors (Reach the 7th layer, the 10th, a Champion on the first layer, and so on), and say "Beat the dungeon" where they said "Win the Campaign".
- Heat unlocks after your first win, and says so.
- The leaderboards count layers, and accept the dungeon's kill counts.
- Bounty contracts count encounters (anything you walk into), and say so.
- Text that still talked about the Campaign, floor 20 or the old Crucible now matches the dungeon. The title screen's old holiday tag is gone.

## 1.88.0

- **Attributes on gear.** Uncommon and better gear sometimes comes with a flat bonus to an attribute: +1 on an Uncommon, more on Rares, Epics and Legendaries. What it raises depends on the piece: light armour leans to Agility, heavy gear to Strength and Vitality, robes and staves to Intellect and Faith, but there's always a chance of something else. Your Attributes tab shows what your gear adds.
- **The Talisman's sigils are in the Passive Tree now.** Set pieces sit mid-tree; the old set bonuses go deeper the stronger they are (a set's "Crown" is near the bottom). The ones that only repeated what attributes give were left out, and the Gilded Hand's Gold thresholds are lower.
- **The Knowledge Table teaches useful things now**, not damage: Angler's Notes (Still Pools turn up in the dungeon), Fireside Craft (a campfire before each guardian), Merchant's Road (a third Merchant every layer) and The Crucible's Secret (transmute at the dungeon's Forges).
- **Bestiary records open once you've beaten a kind of foe 10 times.** Until then it shows how many you have.
- **Backpack: 8 slots to start**, and each rank of Packmule's Straps adds 4. The backpack is taller, too.
- The class popup shows your class's base attribute, and what each point of it gives.
- The Attributes tab is simpler: your class attribute's base Damage shows in your ⚔️ Damage instead.
- **The Camp:** "Tap a tile to walk there" is a speech bubble above your hero, room names are on gold ribbons in bigger text, and the class name is gone from the top corner.
- Something Strange doors stand in a little nook of their own, off a hall.
- Fights use the old hit sounds again.
- Fixes: you could win a fight and be left standing at 0 HP; the Mimic's hoard used the old container (and ran off small screens); and dealing with the last item in a hoard no longer leaves a Continue button.

## 1.87.0

- **The Passive Tree, reworked.** Every branch now opens with a row of attribute nodes (+1 to an attribute each, on every run with that class). Below them, the passives run from the gentler ones at the top to the strongest deep down. The small stat bumps that attributes now give have left the tree, along with a couple of passives the dungeon had no room for. Any points in nodes that are gone come back to you.
- The tree's node card is a scrap of night sky now, and the tree stays in view behind it.
- **Levelling up heals you a little.**
- **New end screens.** A cleared layer shows its guardian lying dead beside the glowing stairs; a fallen hero lies where they fell, with whoever did it standing over them; a win shows your hero with the spoils. Each shows the run's numbers on stone tiles, and the gear you carried.
- **How to play** is rewritten for the dungeon as it is now, and it and the Leaderboards have the dungeon's look.
- The Way Down is now **Enter Dungeon**. Every hanging sign hangs from the top of the screen, and room signs have no emoji.
- The Camp shows "Tap a tile to walk there" when you arrive, until your first step.
- The stairs down use the tileset's own stairs, with the same glow.
- Fighters are bigger in fights on large screens.
- Smaller fixes: "Open chest" has no chest emoji, the "You must be level…" note is gone (the greyed Equip button says it), and a new layer's welcome calls it a layer, not a floor.

## 1.86.0

- **Fishing.** Still Pools now turn up in the dungeon. Cast your line, watch the float, and strike only on the deep tug: twitches are just the water teasing you, and most casts bring up nothing. Each pool gives you three casts.
- Fish can be eaten on the spot for healing (some raise your Max HP for the run), or carried home. The Gilded Koi sells for a good pile of Gold. Now and then you'll hook a sunken purse or a rusted lockbox instead.
- **The Camp has its own Still Pool,** by the fire. It gives you three casts between runs, and anything you land there goes straight home.
- **The Trophy Room has a Tank** showing every kind of fish you've brought home, with the ones you haven't caught yet left as a mystery.

## 1.85.0
- Fights sound like what's hitting: blades ring, blunt weapons thud, staves chime, and foes sound like what they are (beasts, the undead, constructs, cultists). Crits, blocks, statuses and reactions have their own sounds too (Kenney's Impact Sounds).
- Strange doors stand in the walls now, with a faint violet glow.
- Shields join Weapon Mastery: winning with one in your off-hand masters it, and opens more of them to your loot.
- The Way Down is a dark archway with Descend, Heat and Totem in its mouth.
- The heroes' descriptions match how they play now (base attributes, their own gear).
- Epics and Legendaries drop a little more often, and an iron chest can now hold one.
- The wooden and iron chests swap looks; chests no longer say what they might hold.
- Chest popups are a shade darker with firmer writing, a darker comparison box, and the level an item needs in its own dark plate. If you're not high enough yet, Equip is greyed out and says why.
- Taking, bagging or leaving a chest's item closes the popup straight away.

## 1.84.0
- Something Strange is an open door now. Tap it and choose "Enter the strange room?": what's inside plays out in a dark room of its own.
- The class popup no longer shows Heat, and its buttons are studded wooden planks.
- The Camp's options each have a little room of their own, off a firelit hall, and the view follows you as you walk.
- Two new Camp rooms: the Bestiary (every foe you've beaten, how often and how tough) and the Trophy Room (a trophy for each kind of foe beaten 10, 25 or 50 times, and one for every layer guardian).
- The Passive Tree fills the screen under a night sky and scrolls every way. Each branch starts five nodes wide. Ranked talents are now chains: the first rank is small, and II and III hang below it, each needing the one before.
- Beating a layer earns 1 tree point.

## 1.83.0
- The Camp is a place you walk now: a firelit cavern drawn from the tileset. Tap a spot and your hero walks over to it: the Way Down, the Quest Board, the Hall's door, the Skills trainer, the Knowledge scholar, the Garden's plots, the Brewery's cauldron, the Passive Tree, the Weapon Mastery rack and the Abyss. Each opens as its own page over the Camp. On wide screens the Camp lies on its side to fill the screen.

## 1.82.1
- Attributes reworked. Strength: Max HP and Bash. Agility: Dodge, Crit chance and crit damage. Intellect: status damage, reaction damage, and harder hits with staves and wands. Faith: reactions and statuses hurt you less, and altars that lift curses turn up more often. Vitality: all healing goes further, and Regen heals more. Fortune: unchanged.
- Each class has a base attribute (Warrior Strength, Mage Intellect, Rogue Agility, Cleric Faith): every point in it also adds +1 base Damage.
- In the Crawl, Healing Potions heal 8 and campfires a little less.
- Weapon Mastery now opens more of a family's weapons to your loot as you master it (two-fifths at first, all of them at mastery 10) instead of adding damage.
- The Passive Tree is drawn as nodes and links; tap a node to read it and add a point.
- In the Crawl, the menu button sits in the middle, between the potions and the inventory.

## 1.82.0
- The Passive Tree, a new Camp room: one great tree for every hero, the old talents grown into seven branches (Might, Bulwark, Grace, Affliction, Arcana, Devotion and Fortune), in tiers that open as you spend. A class's tree opens once it has beaten layer 5; from then on every run earns it points (2 for each layer beaten, or 1 for getting halfway through the first layer). Points can be taken back for free.
- Weapon Mastery, a new Camp room: every weapon family learns from the fights won with it. Each level adds 2% damage with that family, and levels 5 and 10 add its own perk.
- Totems: from the third layer down, a layer's guardian sometimes leaves one. Set it at the dungeon door before a run to lean the loot toward its kind (the Giant, Spellcraft, the Shadow, Embers, Venom, the Dawn, the Bulwark). It's used up as you go in.

## 1.81.1
- The landmarks wear the tileset now: people where someone's there (the Alchemist, the Blacksmith, the Card Sharp, the Fortune Teller and more), fountains for the blood altars and springs, a column for the Cursed Shrine, a crackling campfire, and so on.
- Chests hold one item and nothing else: no more extra finds tucked inside.
- The Tavern's sign hangs from the top of the screen, and Continue is a studded wooden plank, centred.

## 1.81.0
- The Tavern: Play now leads to a tavern where your heroes sit at their tables. Pick one, then go on to the Camp.
- Classes unlock: the Warrior and the Mage are there from the start. Beat the first layer's boss as the Mage and the Cleric joins; beat it as the Warrior and the Rogue does. Locked heroes sit in the shadows with how to bring them in.
- Each class has its own loot in the Crawl: its own weapons and off-hands (armour, rings, amulets and charms are shared).
- Abilities on items: some gear grants an ability, a button of its own in a fight that costs Mana (Shield Wall on shields, Crushing Blow on heavy weapons, Envenom on daggers, Smoke Bomb on light armour, Arcane Bolt on wands and staves, and more). Frost Nova, Smite and Sanctuary only turn up once your class has beaten a layer.
- Every popup has the dungeon look: dark wood, a bronze frame and muted buttons.

## 1.80.1
- Chests are the tileset's chests in every popup, in their own metals: wood, iron, gold for Vaults, violet for secret chests, red for a boss's hoard. Opened chests stay where they were, open and empty.
- A chest's popup shows the chest and its name in a frame.
- Seeds for the Garden now come only from Champions, and not often (no more seeds in chests or urns).
- Buttons on popups, events, the Merchant and the framed screens are dark wood and old bronze.
- Walls are paler stone with a lighter rim, so they read apart from the floor.
- Pages and popups grow on bigger screens. The Attributes tab reads "Attr" on phones.

## 1.80.0
- Attributes replace talents in the Crawl: Strength, Agility, Intellect, Faith, Vitality and Fortune. Each level-up gives 2 points, spent in the inventory's new Attributes tab, where every attribute shows what it gives now and what the next point adds. Your class's favoured attributes are half as strong again.
- More things to throw: Fire Flasks, Frost Flasks, Throwing Knives, Holy Water and Weighted Nets join the Bomb and the Smoke Bomb.
- The Vile Brew is now the Blightcap Brew: grown from Blightcap Spores in the Camp's Garden, brewed at the Brewery and carried into the dungeon to throw.
- The inventory is back on the dark dungeon colour, its equipped slots have a firmer frame, and items no longer say how many lines they hold.

## 1.79.0
- Things to throw in a fight: Bombs (damage through Armor, more on deeper layers), Vile Brews (Poison and Weak) and Smoke Bombs (Blind the foe and cover your escape, even from an Elite). Merchants sell them, and they turn up in urns and chests. Carry up to three of each.
- Fleeing costs a hit: the foe gets a free swing as you run, unless smoke covers you. It stays where it stood on the map, healed back to full, and you step back to where you came from.
- The Rogue's Smoke Bomb covers an escape too.
- Weapons that don't need crits: new main-hand lines reward counting 4s, a steady run of hits without a crit, rolling the same face twice, and low rolls that charge up the next big one.
- Healing lines on gear turn up far less often.

## 1.78.1
- Tabs everywhere are bookmarks now, standing up from the parchment page they open (the inventory's hang from the bottom).
- Popups (chests, events and the like), the inventory's item details and the Merchant's are torn pages.
- The Forge keeps Upgrade, Scrap and Reveal. Offerings moved to a new landmark, the Offering Altar (one offering each). Transmuting moved to the Masterwork, and no longer needs the Crucible.
- At most four hazards on a floor, and about a third of floors have none.

## 1.78.0
- Floors with teeth: spike traps (2 HP each time you step on one) and pools of sludge or lava (you burn for 1 HP a step for the next 4 steps), often right across a hallway you need. Walks go around them when there's a way. They never quite kill you.
- Blood Oaths: a standing stone that takes Max HP for good in return for a Rare or an Epic item.
- Locked doors with a rich secret chest behind them (rare materials, a great deal of Gold, or very good loot). Elites very rarely carry a Skeleton Key to open one.
- Cracked walls: lean on one and it may give way to a hidden nook.
- Each layer has its own foes and its own colour of stone: the crypt, the sewers, the molten deep, the cold vaults, the shadow.
- A minimap of the floor, top right, with the layer and floor beneath it.

## 1.77.2
- Chest finds and events now open as a popup over the map instead of a new screen.
- Forge, Masterwork, Jeweller, Alchemist, Blacksmith, Sanctum, Bounty Board, Level Up and end screens use the gritty stone frame with a hanging sign.
- Item cards on the inventory and reward screens are now off-white scrolls; the item name's colour shows its rarity.
- Backpack tabs moved to the bottom row beside the close button; Stats tab removed.
- Scrap and Scrolls of Revelation are now backpack items, off the top bar.
- Legendaries are revealed only at the Forge's new Reveal tab: Legendary in one slot, scroll in the other.
- Urns drop gold a little less often.

## 1.77.1
- **A new inventory for the Crawl,** a full page in the dungeon's colours:
  - **Top:** your stats (HP, Damage, Armor, Dodge, Crit, level), your Gold, materials and potions, and any curses.
  - **Middle:** your hero in the middle, with your equipped gear (names only) to its left.
  - **Detail block:** it stays empty until you tap an item, then shows its full details with Equip or Take it off.
  - **Backpack:** your backpack runs along the bottom as a row of names.
  - **Tabs:** Stats, Spoils, Aspects and Extras are still there as tabs.

## 1.77.0
- **Real art:** the Crawl's map and fights now use 0x72's 16×16 DungeonTileset II (CC0). It brings stone floors and brick walls (warmed toward brown), animated heroes and monsters, chests and the Merchant.
  - Every foe on the map is the monster you'll fight.
  - Elites and Champions wear a coloured ring.
  - Urns, shrines and a few others are still emoji for now.
- **Real sound:** footsteps, hits, crits and chest creaks from Kenney's RPG Audio (CC0).
- **The trapdoor to the boss glows red.**
- **One item per chest, and per drop:** iron chests, Mimics, the Treasure Goblin and the boss's hoard all give a single item (the best of what they'd have given).
- **Fewer urns and chests** on each floor.
- **Backpack:** 12 slots to start. In the Crawl you can't scrap from the backpack any more; scrap at a Forge, or tap "Leave it" on a find you don't want.
- **Map buttons:** the menu sits just left of the inventory. While the inventory is open, its button becomes an ✕.
- **Camp:** no arrows on phones; swipe between archways.

## 1.76.0
- **Scrolls of Knowledge** 📜: every boss's hoard holds one. Champions (1 in 4) and iron chests (about 1 in 12) sometimes carry one too. They go straight to the Camp.
- **The Knowledge Table is open:** spend scrolls on insights that last for every hero.
  - **Lore** (1 scroll each): Beast Lore, Grave Lore, Engine Lore and Cult Lore. Each makes your hits deal 10% more to foes of that kind.
  - **Herbalism** (2): every Garden harvest gives one more herb.
  - **Keen Eye** (2): on every floor, you know where the trapdoor is from the start.
  - **Merchant's Ledger** (2): Merchants charge you 10% less.
  - **Treasure Sense** (3): on every floor, you can sense where its chests lie.
- Every Camp archway now works; none is "coming soon" any more.

## 1.75.0
- **Seeds:** now and then an urn (about 1 in 8) or a chest (about 1 in 3) holds a seed: 🌰 Heartleaf or 🫘 Moonbell. They go straight to the Camp, kept even if you die.
- **The Garden is open:** sow seeds in its plots (two to start). They grow while you're down in the dungeon (Heartleaf in one run, Moonbell in two), then give two or three herbs each.
- **The Brewery is open:** two herbs make a brew. Each Stir heats the pot by a die.
  - Bottle it between 10 and 14 for a potion, or at the 12–13 sweet spot for two.
  - Go past 14 and it spoils; bottle it under 10 and you get nothing.
  - Heartleaf makes Healing Potions, Moonbell makes Mana Potions, and brewed potions come with you on your next run.
- **Two new Hall upgrades:** **Green Thumb** (+1 Garden plot, 4 ranks) and **Steady Hands** (the Brewery's sweet spot and safe band 1 wider, 2 ranks).

## 1.74.0
- **Skills:** each class now has three abilities. You take one into each run, picked in the Camp's Skills archway; the new one replaces the class's own. Each costs 🔷1.
  - **Warrior:** War Cry · Crushing Blow (attack for 60% more and Fracture) · Shield Wall (Guard with no shield needed, plus Barrier of twice your Armor).
  - **Rogue:** Counter · Envenom (Poison, then attack) · Smoke Bomb (Evade the next 2 hits and Blind the foe).
  - **Mage:** Elemental Barrier · Frost Nova (Chill 3 and Stun) · Arcane Bolt (twice your Damage, straight through Armor).
  - **Cleric:** Penance · Smite (Burn 3, attack, heal a little) · Sanctuary (heal a quarter of your Max HP and gain a Ward).
- **Unlocking:** the second ability opens at Mastery 3, the third at Mastery 6.
- **Slower Mastery:**
  - It now comes from floors reached in the Crawl (a little each) and bosses beaten (two each). A full layer is worth about 6.
  - The levels need more than before: Mastery 3 is now 30, Mastery 6 is 165, and Mastery 10 is 680.

## 1.73.1
- **Fixed: tapping into the dark could walk you back to somewhere you'd already cleared,** like a chest's nook. A tap on unexplored darkness now only heads for the edge of what you've seen. A tap on a wall walks you to the floor beside it.

## 1.73.0
- **Camp:** on a phone, the stone frame round the page is gone. The left and right arrows are bare glowing chevrons on every screen.
- **Camp materials:** foes in the Crawl now and then leave a material of their kind: 🦴 Bone Dust (Undead), 🐾 Hide (Beasts), 🔩 Cogs (Constructs), 🔯 Cult Sigils (Cultists). Elites and Champions leave more.
- **Crown Shards** 👑 come from each layer's boss (more from deeper layers), along with a few of its family's material.
- Both go straight to the Camp the moment you find them, and you keep them even if you die.
- **The Hall is open.** Spend Crown Shards and materials on upgrades that last for every run:
  - **Deep Pockets** (+25 starting Gold, 4 ranks).
  - **Apothecary's Belt** (+1 starting Healing Potion, 2 ranks).
  - **Packmule's Straps** (+1 Backpack slot, 4 ranks).
  - **Hardy** (+4 starting Max HP, 5 ranks).
  - **Second Life** (once a run, when you'd die, get back up at half your Max HP; a boss must be faced again).

## 1.72.2
- **Camp:**
  - On a phone, the stone frame round the page is gone, so the archway gets the whole screen.
  - The left and right arrows are now bare glowing chevrons, with no box, on every screen.

## 1.72.1
- **The Camp as archways:** each Camp option is now a big stone archway that fills the screen, with its name on a wooden plaque at the top and its contents inside the dark of the arch.
  - Swipe left or right, or tap the glowing arrows at the sides, to move to the next archway. The dots below show where you are.
  - On larger screens the archway sits inside the gritty stone frame, with a flickering torch on either side.

## 1.72.0
- **The Camp:** pick your class and you go to the Camp, a gritty stone hub between runs.
  - A wooden sign hangs at the top.
  - The tabs are a row of stone archways (it scrolls sideways on a phone): Expedition, Quest Board, Hall, Skills, Garden, Brewery, Knowledge and the Abyss.
- **Expedition** shows what lies below and your Mastery, Ruin Gems and Heat, with a big **Descend** button.
- **The Crawl is the game now:** every Campaign run is a Crawl run. The old path-map Campaign is retired, and the Crawl switch is gone.
- **Quest Board:** take one of three contracts into the dungeon (they last a whole layer), or tear it up. It shows in the top right of the map while you work on it.
- **The Abyss** has moved from the title screen into the Camp, as its own tab: shards, plates, this week's twist, and the way in.
- **Coming soon:** the Hall, Skills, Garden, Brewery and Knowledge tabs say what they'll hold.
- When a run ends, **New run** takes you back to the Camp with the same hero.

## 1.71.6
- On a phone, the Merchant's "For sale" row now sits right under the sign, above the details.
- Urns give potions less often: a Mana Potion about 1 in 33, a Healing Potion about 1 in 100.

## 1.71.5
- **Urns and chests:**
  - They always stand against a wall, in a corner, or in a little room or nook, and never beside a hallway's mouth.
  - They're spread apart (no two side by side), and a little room never holds two chests.
- **Pillars:** about half of the roomier halls get a block of wall, one to three tiles long, in the middle. Nothing is ever cut off by it.
- **You start a Crawl with no Healing Potions.** The entrance Merchant sells one for your 20 Gold.

## 1.71.4
- **Chests in the Crawl give gear, not Gold.**
- **Urns:** fewer of them (one to three in the halls), and never close together.
- **One-tile nooks:** one or two per floor, off a hall or hallway, holding an urn or a chest. Now and then something stands in the doorway.
- **Tapping fixes:**
  - A tap made mid-step was measured from where you were about to land rather than where the screen showed you, so you could head off a tile wrong.
  - Tapping into the dark now heads for the nearest known spot that actually gets you closer, without a long detour, and prefers the edge of what you've seen.
- **Performance:**
  - The map's stone is drawn once and reused until you move or see more, so the flickering torches and the trapdoor's glow cost about a tenth of what they did.
  - Those animations pause while the game is in the background.

## 1.71.3
- The game speed button is gone from the Crawl's fight screen (combat speed is still in Options).

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
