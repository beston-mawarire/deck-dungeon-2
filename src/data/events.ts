// Events: a room with a story and a choice. Each option returns the message to show.
// The run module supplies the helpers (`ctx`) so events stay pure content.
import type { GearItem, Rarity } from "../engine/types";

export interface EventCtx {
  rng: () => number;
  gold: () => number;
  addGold: (n: number) => void;
  hp: () => number;
  hurt: (n: number) => void;
  healPct: (pct: number) => void;
  addMaxHp: (n: number) => void;
  gainItem: (rarity: Rarity) => GearItem;
  gainRelic: () => string;
  loseRelic: () => string | null;
  relicCount: () => number;
  addCurse: () => string;
  clearCurses: () => number;
  addXp: (n: number) => void;
  addScrolls: (n: number) => void;
  addPotions: (n: number) => void;
  addScrap: (n: number) => void;
  addPity: (n: number) => void;
  upgradeWeapon: () => string | null;
  potions: () => number;
  floor: () => number;
  /** The Gold this event asks for at the current floor (its minGold, scaled like shop prices). */
  needGold: () => number;
  /** The Chained Dragon wakes: a fight starts when the choice resolves. */
  wakeDragon: (sleeping?: boolean) => void;
  /** The Blind Dragon's blessing: one random blessing for 5 fights. Returns its text. */
  dragonBlessing: () => string;
  /** The Angelic Statue: clears curses, and for 2 fights heals 2 at the start and blocks every negative status. */
  angelicBlessing: () => void;
  /** The Lucky Pot: the Four-Leaf Clover blessing for the next 4 chests. */
  cloverBlessing: () => void;
  maxHp: () => number;
  /** Raise a random equipped item by n levels. Returns its name, or null with nothing equipped. */
  upgradeRandom: (n: number) => string | null;
  /** A random Common relic. Returns its name. */
  gainCommonRelic: () => string;
  addCrimsonKey: () => void;
  /** The Crossroads: back to the first room of the previous floor. */
  seePast: () => void;
  /** The Crossroads: straight into a fight with DEATH. */
  seeFuture: () => void;
}

export interface EventOption {
  label: string;
  hint?: string;
  can?: (c: EventCtx) => boolean;
  run: (c: EventCtx) => string;
  /** The event stays open after this option (e.g. tribute again); what it finds is handed over when you leave. */
  repeat?: boolean;
}

export interface GameEvent {
  id: string;
  /** How often it turns up compared with a normal event (1). */
  weight?: number;
  /** Only from this floor down. */
  minFloor?: number;
  /** Only if you carry at least this much Gold (scaled up each floor, like shop prices). */
  minGold?: number;
  /** Unique encounters happen at most once per run. */
  unique?: boolean;
  /** Only turns up while you carry at least one curse. */
  needCurse?: boolean;
  title: string;
  icon: string;
  text: string;
  options: EventOption[];
}

const leave: EventOption = { label: "Walk away", run: () => "You leave it be." };

/** The Sanguine Altar: pay a share of your Max HP in blood. */
const blood = (pct: number) => (c: EventCtx) => Math.ceil(c.maxHp() * pct);
const bleedFor = (pct: number) => (c: EventCtx) => c.hp() > blood(pct)(c);
const sanguine = (pct: number, label: string, hint: string, run: (c: EventCtx) => string): EventOption => ({
  label: `${label} · ${Math.round(pct * 100)}% Max HP`, hint: hint || undefined, can: bleedFor(pct),
  run: c => { const n = blood(pct)(c); c.hurt(n); return `🩸 You bleed ${n} into the basin. ${run(c)}`; }
});

export const EVENTS: GameEvent[] = [
  { id: "crossroads", unique: true, weight: 0.12, minFloor: 2, title: "The Crossroads", icon: "🌒", text: "", options: [] },
  { id: "sanguine_altar", weight: 0.8, title: "The Sanguine Altar", icon: "🩸",
    text: "A basin of black stone, stained to the rim. Carved hands reach up from its sides, palms open. It does not want gold.",
    options: [
      sanguine(0.1, "A trickle for Gold", "A good purse of Gold", c => { const g = 25 + 10 * c.floor(); c.addGold(g); return `Coins well up from the stain: +${g} Gold.`; }),
      sanguine(0.2, "Blood for blood", "Raise your Max HP", c => { const n = 8 + Math.floor(c.floor() / 2); c.addMaxHp(n); return `Your heart beats harder: +${n} Max HP.`; }),
      sanguine(0.3, "Temper your gear", "A random equipped item gains 4 levels", c => { const nm = c.upgradeRandom(4); return nm ? `${nm} drinks deep and grows stronger (+4 levels).` : "You carry nothing for it to temper. The altar keeps your blood anyway."; }),
      sanguine(0.4, "Wash away your curses", "Lifts every curse you carry", c => { const n = c.clearCurses(); return n ? `${n} curse${n === 1 ? "" : "s"} dissolve in the red.` : "You had no curses. The altar keeps your blood anyway."; }),
      sanguine(0.5, "Take on a random curse", "", c => `A whisper settles in your bones. You are cursed: ${c.addCurse()}.`),
      sanguine(0.6, "An offering for a relic", "A random Common relic", c => `Something small and warm rises from the basin: ${c.gainCommonRelic()}.`),
      sanguine(0.7, "Pray for a Crimson Key", "A slim chance. Most likely nothing at all", c => {
        if (c.rng() < 0.12) { c.addCrimsonKey(); return "The basin boils and spits out a key, red as a wound. 🗝️ A Crimson Key!"; }
        return "The basin drinks, and drinks, and gives nothing back.";
      }),
      sanguine(0.8, "A deep sacrifice", "A Rare item; a slim chance of Epic, slimmer of Legendary, slimmer still of Crimson", c => {
        const x = c.rng();
        const r = x < 0.01 ? "crimson" : x < 0.04 ? "legendary" : x < 0.14 ? "epic" : "rare";
        c.gainItem(r);
        return "The altar gives back something heavy.";
      }),
      sanguine(0.9, "Nearly everything", "An Epic item; a slim chance of Legendary, slimmer of Crimson", c => {
        const x = c.rng();
        const r = x < 0.03 ? "crimson" : x < 0.13 ? "legendary" : "epic";
        c.gainItem(r);
        return "You sway, grey and cold. The altar is pleased, and gives back something fine.";
      }),
      leave
    ] },
  { id: "cleansing_well", weight: 0.3, needCurse: true, title: "The Well of Cleansing", icon: "⛲",
    text: "A circle of white stone, and water so clear it seems to glow. Your curses grow heavy just looking at it, as if they know.",
    options: [
      { label: "Drink from the well", hint: "Lifts every curse you carry",
        run: c => { const n = c.clearCurses(); return `The water is cold enough to hurt. Something black and oily leaves you and sinks out of sight. ${n} curse${n === 1 ? "" : "s"} lifted.`; } },
      { label: "Walk away", run: () => "You leave the water undisturbed." }
    ] },
  { id: "holy_tribute", weight: 1, needCurse: true, title: "Holy Tribute", icon: "🕍",
    text: "A small chapel, half sunk into the rock. A hooded priest waits beside a collection plate. \"The light can lift what clings to you. The light also has upkeep.\"",
    options: [{ label: "Approach the priest", run: () => "" }] },
  { id: "lucky_pot", weight: 0.35, minFloor: 6, minGold: 100, title: "The Lucky Pot", icon: "🍀",
    text: "A battered iron pot sits in a shaft of light that has no business being down here. It hums. It smells faintly of clover.",
    options: [
      { label: "Throw all your Gold into the pot", hint: "Every coin you carry (the pot wants a minimum, more on deeper floors)", can: c => c.gold() >= c.needGold(),
        run: c => { const g = c.gold(); c.addGold(-g); c.cloverBlessing(); return `${g} Gold clatters into the pot and vanishes. A tiny green leaf drifts down into your palm. 🍀 Four-Leaf Clover: your next 4 chests are a little luckier (slightly better odds of Rare, Epic and Legendary).`; } },
      { label: "Leave", run: () => "You keep your coin. The humming stops." }
    ] },
  { id: "angelic_statue", weight: 1, minFloor: 2, title: "The Angelic Statue", icon: "👼",
    text: "A marble angel stands untouched by the dark, wings spread. Its outstretched hands are cupped, as if waiting for something precious.",
    options: [
      { label: "Offer half your HP", hint: "Lifts every curse; for your next 2 fights you heal 2 at the start and nothing negative can touch you",
        run: c => { c.hurt(Math.floor(c.hp() / 2)); c.angelicBlessing(); return "Warm light pours over you. Your curses fall away like ash, and wings of light fold around you. 👼 Angelic Blessing: for your next 2 fights, you heal 2 at the start and you're immune to every negative status."; } },
      { label: "Leave", run: () => "You bow your head and move on." }
    ] },
  { id: "chained_dragon", weight: 1, title: "A Chained Dragon", icon: "🐉",
    text: "You find a sleeping drake chained to the dungeon walls. It's guarding something.",
    options: [
      { label: "Try to steal what it's guarding", hint: "Quietly…",
        run: c => {
          const r = c.rng();
          if (r < 0.06) { c.wakeDragon(); return "A chain rattles. One great eye opens…"; }
          if (r < 0.18) { const g = 40 + 15 * c.floor(); c.addGold(g); return `You slip a heavy purse out from under its claw: ${g} Gold!`; }
          const g = 5 * c.floor(); c.addGold(g); return `You pocket a few loose coins (${g} Gold) and back away.`;
        } },
      { label: "Leave it be", run: () => "Some things are better left sleeping." }
    ] },
  { id: "alchemist", unique: true, weight: 0.8, title: "The Alchemist", icon: "⚗️",
    text: "A woman with stained gloves and a bandolier of glowing vials looks you up and down. \"Everything works on anything. Even the big ones. It isn't cheap.\"",
    options: [{ label: "See her wares", run: () => "" }] },
  { id: "blind_dragon", weight: 1, minFloor: 3, minGold: 100, title: "A Dragon's Blessing", icon: "🐲",
    text: "You find a blind, toothless dragon chained within a room. \"Hello… Is anyone there? Would you spare me some gold? I will grant you a blessing in return.\"",
    options: [
      { label: "Give it 70% of your Gold", hint: "A blessing for your next 5 fights", can: c => c.gold() >= c.needGold(),
        run: c => { c.addGold(-Math.ceil(c.gold() * 0.7)); return `The old dragon smiles. "Thank you, friend." ${c.dragonBlessing()} (for your next 5 fights).`; } },
      { label: "Leave", run: () => "\"…Hello?\" it calls after you." }
    ] },
  { id: "golden_altar", unique: true, title: "The Golden Altar", icon: "🏺", text: "A golden altar hums in the dark. Coins left on it vanish; now and then, something is left in return. Each tribute costs a fifth of your Gold. Pay as often as you like.",
    options: [
      { label: "Pay tribute (20% of your Gold)", hint: "Usually nothing. Sometimes something.", repeat: true, can: c => c.gold() > 0,
        run: c => {
          const cost = Math.max(1, Math.ceil(c.gold() * 0.2));
          c.addGold(-cost);
          const r = c.rng();
          if (r < 0.005) { c.gainItem("legendary"); return `You lay down ${cost} Gold. The altar blazes gold: a Legendary!`; }
          if (r < 0.02) { c.gainItem("epic"); return `You lay down ${cost} Gold. The altar glows violet: an Epic item!`; }
          if (r < 0.05) { c.gainItem("rare"); return `You lay down ${cost} Gold. The altar glows blue: a Rare item.`; }
          if (r < 0.13) { c.gainItem("uncommon"); return `You lay down ${cost} Gold. Something clinks onto the altar: an Uncommon item.`; }
          return `You lay down ${cost} Gold. It vanishes. Nothing happens.`;
        } },
      { label: "Leave the altar", run: () => "You step away from the altar." }
    ] },
  { id: "blacksmith", unique: true, title: "The Wandering Blacksmith", icon: "⚒️", text: "A blacksmith has set up a portable anvil in a side passage. \"Two jobs, free of charge. I like your face.\"",
    options: [{ label: "Visit the anvil", run: () => "" }] },
  { id: "dealer", title: "The Crossroads Dealer", icon: "🎩", text: "A smiling figure offers a trade: one of your relics for two of theirs, sight unseen.",
    options: [{ label: "Trade a random relic for two", can: c => c.relicCount() > 0, run: c => { const lost = c.loseRelic(); const a = c.gainRelic(); const b = c.gainRelic(); return `You gave up ${lost} and received ${a} and ${b}.`; } }, leave] },
  { id: "fountain", title: "Blood Fountain", icon: "⛲", text: "Red water bubbles from cracked stone. It whispers of treasure for those who bleed.",
    options: [
      { label: "Bleed into it (lose 8 HP)", hint: "A Rare item", can: c => c.hp() > 8, run: c => { c.hurt(8); const it = c.gainItem("rare"); return `The fountain gives up a treasure (${it.rarity}).`; } },
      { label: "Drink from it", hint: "Heals you a little, with a chance of a curse", run: c => { c.healPct(0.3); if (c.rng() < 0.4) return `Refreshing… and wrong. Cursed: ${c.addCurse()}.`; return "Refreshing. Nothing else happens."; } },
      leave] },
  { id: "dice", title: "The Gambling Den", icon: "🎲", text: "Bone dice clatter on a crate. \"Double or nothing, friend?\"",
    options: [{ label: "Bet 25 Gold", hint: "A chance to double your bet", can: c => c.gold() >= 25, run: c => { if (c.rng() < 0.5) { c.addGold(25); return "You win! +25 Gold."; } c.addGold(-25); return "You lose 25 Gold."; } }, leave] },
  { id: "smith", title: "The Wandering Smith", icon: "⚒️", text: "A dwarf with a portable anvil offers to sharpen your weapon.",
    options: [{ label: "Pay 30 Gold", hint: "+1 level to your weapon", can: c => c.gold() >= 30, run: c => { const err = c.upgradeWeapon(); if (err) return err; c.addGold(-30); return "Your weapon gleams. +1 level."; } }, leave] },
  { id: "fallen", title: "A Fallen Adventurer", icon: "⚰️", text: "A body slumped against the wall, their pack still full.",
    options: [
      { label: "Search the pack", hint: "An Uncommon item, with a chance of a curse", run: c => { c.gainItem("uncommon"); return c.rng() < 0.3 ? `You find gear… and a curse: ${c.addCurse()}.` : "You find gear they won't need anymore."; } },
      { label: "Bury them", hint: "+1 Potion, +5 Max HP", run: c => { c.addPotions(1); c.addMaxHp(5); return "You feel lighter. +1 Potion, +5 Max HP."; } }] },
  { id: "spring", title: "Sacred Spring", icon: "💧", text: "Clear water glows softly in a hidden grotto.",
    options: [{ label: "Bathe", hint: "Remove all curses", run: c => { const n = c.clearCurses(); return n ? `${n} curse${n > 1 ? "s" : ""} washed away.` : "You feel clean, though you weren't cursed."; } },
      { label: "Drink deeply", hint: "Heals a good share of your wounds", run: c => { c.healPct(0.5); return "You feel restored."; } }] },
  { id: "scribe", title: "The Blind Scribe", icon: "📜", text: "An old scribe sells scrolls by touch alone.",
    options: [{ label: "Buy a Scroll of Revelation (110 Gold)", can: c => c.gold() >= 110, run: c => { c.addGold(-110); c.addScrolls(1); return "You receive a Scroll of Revelation."; } }, leave] },
  { id: "idol", title: "The Cursed Idol", icon: "🗿", text: "A golden idol sits on a pedestal. Its eyes follow you.",
    options: [{ label: "Take it", hint: "An Epic item and a curse", run: c => { c.gainItem("epic"); return `It's yours. So is the curse: ${c.addCurse()}.`; } },
      { label: "Smash it", hint: "+12 Scrap", run: c => { c.addScrap(12); return "It shatters into useful pieces. +12 Scrap."; } }] },
  { id: "trainer", title: "The Old Duelist", icon: "🤺", text: "A scarred veteran offers a lesson, or a wager.",
    options: [{ label: "Take the lesson", hint: "+3 XP", run: c => { c.addXp(3); return "You learn a thing or two. +3 XP."; } },
      { label: "Spar for coin", hint: "Lose 6 HP, gain 30 Gold", can: c => c.hp() > 6, run: c => { c.hurt(6); c.addGold(30); return "Bruised but richer. +30 Gold."; } }] },
  { id: "cart", title: "The Wandering Merchant's Cart", icon: "🛒", text: "A cart piled with sealed crates. \"Mystery boxes! Every one a bargain!\"",
    options: [{ label: "Buy a mystery box (60 Gold)", hint: "A Rare item — maybe Epic", can: c => c.gold() >= 60, run: c => { c.addGold(-60); const it = c.gainItem(c.rng() < 0.15 ? "epic" : "rare"); return `Inside: ${it.rarity === "epic" ? "something special!" : "a solid find."}`; } }, leave] },
  { id: "twin_gods", title: "Shrine of the Twin Gods", icon: "⛩️", text: "Two statues, one carved in stone, one in gold. Each holds out an open hand.",
    options: [{ label: "Pray to the stone god", hint: "+6 Max HP", run: c => { c.addMaxHp(6); return "You feel sturdier. +6 Max HP."; } },
      { label: "Pray to the golden god", hint: "+45 Gold", run: c => { c.addGold(45); return "Coins spill from the statue's hand. +45 Gold."; } }] },
  { id: "pilgrim", title: "The Starving Pilgrim", icon: "🧎", text: "A thin pilgrim begs for coin to buy bread from the next merchant.",
    options: [{ label: "Give 20 Gold", hint: "Kindness, sometimes repaid", can: c => c.gold() >= 20, run: c => { c.addGold(-20); if (c.rng() < 0.5) return `\"Take this — it was my master's.\" You receive a relic: ${c.gainRelic()}.`; c.addXp(3); return "They bless you. You feel wiser. +3 XP."; } }, leave] },
  { id: "embers", title: "Altar of Embers", icon: "🕯️", text: "A brazier of white fire. A carved plaque reads: PAY IN FLESH.",
    options: [{ label: "Hold your hand in the flame (lose 12 HP)", hint: "An Epic item", can: c => c.hp() > 12, run: c => { c.hurt(12); c.gainItem("epic"); return "The fire takes its due and gives back something remarkable."; } }, leave] },
  { id: "card_sharp", title: "The Card Sharp", icon: "🃏", text: "A grinning rogue shuffles a deck. \"Your potion against my scrolls.\"",
    options: [{ label: "Wager a potion", hint: "A chance to win 2 Scrolls of Revelation", can: c => c.potions() > 0, run: c => { c.addPotions(-1); if (c.rng() < 0.35) { c.addScrolls(2); return "You win! Two Scrolls of Revelation."; } return "The house wins. Your potion is gone."; } }, leave] },
  { id: "armory", title: "The Forgotten Armory", icon: "🗄️", text: "Racks of dusty gear, most of it rusted through. Some of it isn't.",
    options: [{ label: "Search the racks", hint: "Two Uncommon items", run: c => { c.gainItem("uncommon"); c.gainItem("uncommon"); return "You pull two usable pieces from the dust."; } },
      { label: "Strip it for metal", hint: "+15 Scrap", run: c => { c.addScrap(15); return "+15 Scrap."; } }] },
  { id: "hermit", title: "The Hermit of the Deep", icon: "🧙", text: "An old man tends a mushroom garden by candlelight. He has been expecting you.",
    options: [{ label: "Ask for wisdom", hint: "+5 XP", run: c => { c.addXp(5); return "He speaks for an hour. Some of it sticks. +5 XP."; } },
      { label: "Ask for healing", hint: "Heals a fair share of your wounds", run: c => { c.healPct(0.4); return "Bitter tea, warm hands. You feel better."; } }] },
  { id: "cursed_chest", title: "The Chained Chest", icon: "⛓️", text: "A chest bound in black chains. Something inside is humming.",
    options: [{ label: "Break the chains", hint: "A Rare item, and a curse", run: c => { c.gainItem("rare"); return `The chains fall. So does a curse: ${c.addCurse()}.`; } }, leave] },
  // Unique encounters: once per run.
  { id: "dragon", unique: true, title: "A Sleeping Dragon", icon: "🐉", text: "A dragon sleeps on a mountain of gold, one eye not quite closed.",
    options: [{ label: "Steal from the hoard", hint: "A chance for a Legendary. Otherwise it wakes, and you'll have to face it", run: c => { if (c.rng() < 0.4) { c.gainItem("legendary"); return "You slip away with a Legendary!"; } c.wakeDragon(true); return "Gold shifts under your boot. The eye opens fully."; } },
      { label: "Take a single coin", hint: "+30 Gold, safely", run: c => { c.addGold(30); return "One coin… well, thirty. It doesn't stir."; } }] },
  { id: "mirror", unique: true, title: "The Mirror Pool", icon: "🪞", text: "Still black water shows you — but stronger, and smiling wrongly.",
    options: [{ label: "Reach for your reflection", hint: "An Epic item and +5 Max HP, but a curse", run: c => { c.gainItem("epic"); c.addMaxHp(5); return `Your reflection hands you something… and keeps something of yours: ${c.addCurse()}.`; } },
      { label: "Shatter the surface", hint: "Remove all curses", run: c => { const n = c.clearCurses(); return n ? `The curses break with the glass (${n}).` : "Glass and silence. Nothing else."; } }] },
  { id: "teller", title: "The Fortune Teller", icon: "🔮", text: "\"I see gold in your future… for a price.\"",
    options: [{ label: "Pay 20 Gold", hint: "Your next Resplendent chest is luckier", can: c => c.gold() >= 20, run: c => { c.addGold(-20); c.addPity(15); return "\"Your next great chest will smile on you.\""; } }, leave] }
];

/** The Crossroads never looks the same twice: a shadowy figure offering the past or the future, in many disguises. */
export interface CrossroadsGuise { title: string; icon: string; text: string; room: string; past: string; future: string; leave: string }
export const CROSSROADS_GUISES: CrossroadsGuise[] = [
  { title: "The Crossroads", icon: "🌒", room: "Two tunnels, one figure.", text: "Where the tunnel splits, a shadowy figure waits with its hood up. \"Would you like to see the future? Or perhaps the past?\"", past: "See the past", future: "See the future", leave: "Walk on" },
  { title: "A Kind Stranger", icon: "🙂", room: "Someone friendly, for once.", text: "A smiling man in a grey coat offers to show you something wonderful. His eyes don't move when he blinks.", past: "Ask where you've been", future: "Ask where you're going", leave: "Politely decline" },
  { title: "Two Doors", icon: "🚪", room: "Doors, with no walls around them.", text: "Two doors stand alone in the rock. One is old and worn smooth by hands. The other has no dust on it at all.", past: "The worn door", future: "The clean door", leave: "Neither" },
  { title: "A Warm Light", icon: "✨", room: "Golden light, and a soft voice.", text: "Golden light spills from a side passage, and a soft voice offers you a gift: a memory, or a prophecy.", past: "A memory", future: "A prophecy", leave: "Turn from the light" },
  { title: "…", icon: "❔", room: "…", text: "… … …", past: "◀", future: "▶", leave: "✕" },
  { title: "The Hourglass", icon: "⏳", room: "Sand, falling upward.", text: "A cloaked figure turns an hourglass over, and over, and over. \"Back, or forward? The sand doesn't care which.\"", past: "Back", future: "Forward", leave: "Leave the sand alone" },
  { title: "A Lucky Shortcut", icon: "🍀", room: "A shortcut! Probably.", text: "A cheerful sign, freshly painted: SHORTCUTS! CHOOSE YOUR DESTINATION! Below it, in smaller letters, someone has scratched: don't.", past: "Somewhere familiar", future: "Somewhere new", leave: "Ignore the sign" },
  { title: "The Ferryman", icon: "🛶", room: "Black water, and a boat.", text: "A boatman waits on black water and holds out one bony hand. \"Upstream, or down? Both are paid for.\"", past: "Upstream", future: "Downstream", leave: "Stay on the shore" },
  { title: "A Fortune Teller's Tent", icon: "🔮", room: "Bright silks, deep underground.", text: "Bright silks hang over a crystal ball. Nobody sits behind it, but a voice from inside asks which way you'd like to look.", past: "Look behind you", future: "Look ahead", leave: "Back out of the tent" },
  { title: "Campfire", icon: "🔥", room: "Rest and heal.", text: "The fire is warm, but it burns without wood. Someone sits across it with their hood up, holding out two cups. \"Old wine, or new?\"", past: "The old wine", future: "The new wine", leave: "Sit somewhere else" },
  { title: "Merchant", icon: "🪙", room: "Buy gear, potions and scrolls.", text: "The stall is empty except for two maps, both of this dungeon. The merchant's smile is too wide. \"No charge. Pick one.\"", past: "The faded map", future: "The fresh map", leave: "Keep your own map" },
  { title: "Wooden Chest", icon: "📦", room: "One item, Common or Uncommon.", text: "The lid creaks open on its own. Inside, no loot: just a staircase going down, and another going up.", past: "Go up", future: "Go down", leave: "Close the lid" },
  { title: "A Lost Child", icon: "🧒", room: "Crying, somewhere close.", text: "A small child sits in the dark, sniffling. \"I want to go home,\" it says, in your own voice. \"Will you take me?\"", past: "Take it home", future: "Take it further in", leave: "Back away slowly" },
  { title: "The Mirror", icon: "🪞", room: "A mirror, perfectly clean.", text: "Your reflection is a few seconds late. Then it stops copying you altogether, points behind you, then ahead.", past: "Follow its first point", future: "Follow its second point", leave: "Look away" },
  { title: "The Well", icon: "🪣", room: "A well. Make a wish?", text: "Coins glint at the bottom of an old well. A voice echoes up from below: \"Wish to undo, or wish to be done?\"", past: "Wish to undo", future: "Wish to be done", leave: "Keep your coin" },
  { title: "A Sleeping Guard", icon: "💤", room: "Snoring. Loudly.", text: "A guard sleeps against a gate with two keys on his belt: one rusted, one gleaming. He hasn't breathed in a while.", past: "The rusted key", future: "The gleaming key", leave: "Let him sleep" },
  { title: "The Choir", icon: "🎶", room: "Singing, far below.", text: "A choir sings somewhere you can't see. The song is about you. It knows the verses you've lived and the ones you haven't.", past: "Sing the old verse", future: "Sing the next verse", leave: "Cover your ears" },
  { title: "Bounty Board", icon: "📋", room: "Notices nailed to a post. Work for hire.", text: "Every notice on the post has your face on it. Some are yellowed with age; some are still wet with ink.", past: "Tear down an old one", future: "Tear down a new one", leave: "Leave them be" },
  { title: "The Gambler", icon: "🎲", room: "A friendly game of dice.", text: "A grinning gambler rolls two dice with no pips. \"Heads you go back, tails you go on. Odd game, isn't it?\"", past: "Call heads", future: "Call tails", leave: "Don't play" }
];

export function crossroadsEvent(g: CrossroadsGuise): GameEvent {
  return {
    id: "crossroads", title: g.title, icon: g.icon, text: g.text,
    options: [
      { label: g.past, run: c => { c.seePast(); return "The world folds like paper. When it opens again, it's somewhere you've already been."; } },
      { label: g.future, run: c => { c.seeFuture(); return "Everything goes cold. Something tall turns to look at you."; } },
      { label: g.leave, run: () => "When you look back, there's nobody there." }
    ]
  };
}
