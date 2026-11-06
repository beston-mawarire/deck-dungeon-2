// Drills: short challenge runs with one rule each, from the Camp's Drills room. Everyone plays them on the same
// terms (no Heat, no Tarot, no Hall upgrades, no Passive Tree), and they count only towards their own medals.
import type { OriginId } from "../engine/types";

export interface Drill { id: string; name: string; icon: string; text: string }
export const DRILLS: Drill[] = [
  { id: "bossrush", name: "Boss Rush", icon: "👑", text: "Only the five guardians, back to back. Each layer starts at its Merchant, and its trapdoor drops you straight onto the guardian. You level up as you go." },
  { id: "glass", name: "Glass Cannon", icon: "💥", text: "40% of your Max HP, but you deal 50% more damage." },
  { id: "bare", name: "Bare Hands", icon: "✊", text: "You start with nothing equipped (your fists hit for 4). Everything you wear, you find." },
  { id: "dry", name: "Dry Throat", icon: "🏜️", text: "No Healing Potions, anywhere. Campfires and healing gear are all you have." },
  { id: "gauntlet", name: "Elite Gauntlet", icon: "⚔️", text: "Every fight is an Elite, and every Elite drops gear, one rarity better." },
  { id: "pilgrim", name: "Cursed Pilgrim", icon: "🕯️", text: "You set out with 3 curses that can never be lifted. Each curse you carry makes Rare-or-better finds 10% likelier." },
  { id: "clock", name: "Against the Clock", icon: "⏳", text: `Each floor gives you ${80} steps. Every step left when you take the trapdoor is a Gold coin; every step past the limit costs 1 HP.` },
  { id: "silent", name: "Silent Hands", icon: "🤐", text: "No skill at all, even at level 5, and your Mana does nothing. Instead, every level gives 2 attribute points." },
  { id: "dark", name: "Lights Out", icon: "🌑", text: "You see only 1 tile around you, and there are no torches on the walls." },
  { id: "borrowed", name: "Borrowed Steel", icon: "🔁", text: "You play your class, but your kit and every weapon and off-hand you find belong to another class, chosen at random." }
];
export const DRILL_MAP = new Map(DRILLS.map(d => [d.id, d]));
/** How many layers a Drill runs (Boss Rush: all five guardians). */
export const DRILL_LAYERS = 3, BOSSRUSH_LAYERS = 5;
export const drillLayers = (id: string) => (id === "bossrush" ? BOSSRUSH_LAYERS : DRILL_LAYERS);
/** Against the Clock: steps a floor gives you. */
export const CLOCK_STEPS = 80;
/** Glass Cannon. */
export const GLASS_HP = 0.4, GLASS_DMG = 50;
/** Bare Hands: what your fists add to your Damage. */
export const FIST_DAMAGE = 3;
/** Cursed Pilgrim: curses to start with, and the loot each one adds. */
export const PILGRIM_CURSES = 3, PILGRIM_LOOT = 0.1;
/** Boss Rush: the level you're raised to at each layer (3 per layer). */
export const bossRushLevel = (L: number) => 3 * L;
/** How many Drills are open at first; each Drill cleared (by anyone) opens one more. */
export const DRILLS_OPEN = 3;
/** Crown Shards for a Drill's first clear. */
export const DRILL_CROWNS = 3;
export const drillsOpen = (cleared: Record<string, OriginId[]> | undefined) => Math.min(DRILLS.length, DRILLS_OPEN + Object.values(cleared ?? {}).filter(c => c.length).length);
/** A Drill's medal: bronze with one class, silver with two, gold with all four. */
export const drillMedal = (classes: number) => (classes >= 4 ? "🥇" : classes >= 2 ? "🥈" : classes >= 1 ? "🥉" : "");
