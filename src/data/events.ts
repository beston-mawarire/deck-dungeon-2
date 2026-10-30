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
}

export interface EventOption {
  label: string;
  hint?: string;
  can?: (c: EventCtx) => boolean;
  run: (c: EventCtx) => string;
}

export interface GameEvent {
  id: string;
  title: string;
  icon: string;
  text: string;
  options: EventOption[];
}

const leave: EventOption = { label: "Walk away", run: () => "You leave it be." };

export const EVENTS: GameEvent[] = [
  { id: "dealer", title: "The Crossroads Dealer", icon: "🎩", text: "A smiling figure offers a trade: one of your relics for two of theirs, sight unseen.",
    options: [{ label: "Trade a random relic for two", can: c => c.relicCount() > 0, run: c => { const lost = c.loseRelic(); const a = c.gainRelic(); const b = c.gainRelic(); return `You gave up ${lost} and received ${a} and ${b}.`; } }, leave] },
  { id: "fountain", title: "Blood Fountain", icon: "⛲", text: "Red water bubbles from cracked stone. It whispers of treasure for those who bleed.",
    options: [
      { label: "Bleed into it (lose 8 HP)", hint: "A Rare item", can: c => c.hp() > 8, run: c => { c.hurt(8); const it = c.gainItem("rare"); return `The fountain gives up a treasure (${it.rarity}).`; } },
      { label: "Drink from it", hint: "Heal 30%, but you may be cursed", run: c => { c.healPct(0.3); if (c.rng() < 0.4) return `Refreshing… and wrong. Cursed: ${c.addCurse()}.`; return "Refreshing. Nothing else happens."; } },
      leave] },
  { id: "dice", title: "The Gambling Den", icon: "🎲", text: "Bone dice clatter on a crate. \"Double or nothing, friend?\"",
    options: [{ label: "Bet 25 Gold", hint: "50%: win 50", can: c => c.gold() >= 25, run: c => { if (c.rng() < 0.5) { c.addGold(25); return "You win! +25 Gold."; } c.addGold(-25); return "You lose 25 Gold."; } }, leave] },
  { id: "smith", title: "The Wandering Smith", icon: "⚒️", text: "A dwarf with a portable anvil offers to sharpen your weapon.",
    options: [{ label: "Pay 30 Gold", hint: "+1 level to your weapon", can: c => c.gold() >= 30, run: c => { const err = c.upgradeWeapon(); if (err) return err; c.addGold(-30); return "Your weapon gleams. +1 level."; } }, leave] },
  { id: "fallen", title: "A Fallen Adventurer", icon: "⚰️", text: "A body slumped against the wall, their pack still full.",
    options: [
      { label: "Search the pack", hint: "An Uncommon item; 30% chance of a curse", run: c => { c.gainItem("uncommon"); return c.rng() < 0.3 ? `You find gear… and a curse: ${c.addCurse()}.` : "You find gear they won't need anymore."; } },
      { label: "Bury them", hint: "+1 Potion, +5 Max HP", run: c => { c.addPotions(1); c.addMaxHp(5); return "You feel lighter. +1 Potion, +5 Max HP."; } }] },
  { id: "spring", title: "Sacred Spring", icon: "💧", text: "Clear water glows softly in a hidden grotto.",
    options: [{ label: "Bathe", hint: "Remove all curses", run: c => { const n = c.clearCurses(); return n ? `${n} curse${n > 1 ? "s" : ""} washed away.` : "You feel clean, though you weren't cursed."; } },
      { label: "Drink deeply", hint: "Heal 50%", run: c => { c.healPct(0.5); return "You feel restored."; } }] },
  { id: "scribe", title: "The Blind Scribe", icon: "📜", text: "An old scribe sells scrolls by touch alone.",
    options: [{ label: "Buy a Scroll of Revelation (110 Gold)", can: c => c.gold() >= 110, run: c => { c.addGold(-110); c.addScrolls(1); return "You receive a Scroll of Revelation."; } }, leave] },
  { id: "idol", title: "The Cursed Idol", icon: "🗿", text: "A golden idol sits on a pedestal. Its eyes follow you.",
    options: [{ label: "Take it", hint: "An Epic item and a curse", run: c => { c.gainItem("epic"); return `It's yours. So is the curse: ${c.addCurse()}.`; } },
      { label: "Smash it", hint: "+12 Scrap", run: c => { c.addScrap(12); return "It shatters into useful pieces. +12 Scrap."; } }] },
  { id: "trainer", title: "The Old Duelist", icon: "🤺", text: "A scarred veteran offers a lesson, or a wager.",
    options: [{ label: "Take the lesson", hint: "+3 XP", run: c => { c.addXp(3); return "You learn a thing or two. +3 XP."; } },
      { label: "Spar for coin", hint: "Lose 6 HP, gain 30 Gold", can: c => c.hp() > 6, run: c => { c.hurt(6); c.addGold(30); return "Bruised but richer. +30 Gold."; } }] },
  { id: "teller", title: "The Fortune Teller", icon: "🔮", text: "\"I see gold in your future… for a price.\"",
    options: [{ label: "Pay 20 Gold", hint: "Your next Resplendent chest is luckier", can: c => c.gold() >= 20, run: c => { c.addGold(-20); c.addPity(15); return "\"Your next great chest will smile on you.\""; } }, leave] }
];
