// Fishing, in the style of Hades II: cast, watch the float twitch, wait for the deep tug, and catch it then.
// Most casts catch nothing. Some fish can be eaten in a run; the rare ones are prized at the Camp.

export interface Fish { id: string; name: string; icon: string; rarity: "common" | "uncommon" | "rare" | "legendary"; text: string; heal?: number; maxHp?: number; gold?: number }
export const FISH: Fish[] = [
  { id: "minnow", name: "Cave Minnow", icon: "🐟", rarity: "common", text: "Small and bony. Eat it: heal 4.", heal: 4 },
  { id: "eel", name: "Blind Eel", icon: "🐍", rarity: "common", text: "It has never seen light. Eat it: heal 6.", heal: 6 },
  { id: "carp", name: "Ember Carp", icon: "🐠", rarity: "uncommon", text: "Warm to the touch. Eat it: heal 8.", heal: 8 },
  { id: "frostfin", name: "Frostfin", icon: "🐡", rarity: "uncommon", text: "Cold as the deep water. Eat it: heal 5 and +2 Max HP for the run.", heal: 5, maxHp: 2 },
  { id: "ghostgill", name: "Ghostgill", icon: "👻", rarity: "rare", text: "You can see through it. Eat it: heal 12 and +3 Max HP for the run.", heal: 12, maxHp: 3 },
  { id: "angler", name: "Abyssal Angler", icon: "🦈", rarity: "rare", text: "A lantern on its brow, teeth like needles. Too foul to eat: a trophy." },
  { id: "koi", name: "Gilded Koi", icon: "✨", rarity: "legendary", text: "Scales of real gold. Worth a fortune, or a place on the wall.", gold: 60 }
];
export const fishById = (id: string) => FISH.find(f => f.id === id);

/** What a cast brings up: nothing (most of the time), a fish, or something that sank long ago. */
export type Catch = { kind: "none" } | { kind: "fish"; fish: Fish } | { kind: "junk"; name: string; icon: string; gold?: number; item?: boolean };
/** How a cast plays out on screen: twitches (don't strike!) before the real bite, or no bite at all. */
export interface CastPlan { twitches: number[]; bite: number | null; window: number }

/** Roll a cast: when the float twitches, when (and if) the real bite comes, and how long it holds. */
export function planCast(rng: () => number): CastPlan {
  const twitches: number[] = [];
  let t = 1200 + rng() * 1500;
  const n = Math.floor(rng() * 3);
  for (let k = 0; k < n; k++) { twitches.push(Math.round(t)); t += 700 + rng() * 1300; }
  // About half of all casts get no real bite.
  const bite = rng() < 0.5 ? null : Math.round(t + 400 + rng() * 1200);
  return { twitches, bite, window: 850 };
}

/** What's on the line once you strike at the bite (deeper water, finer fish). */
export function rollCatch(rng: () => number, deep = 1): Catch {
  const x = rng();
  if (x < 0.08) return rng() < 0.5 ? { kind: "junk", name: "Sunken Purse", icon: "👛", gold: 15 + Math.floor(rng() * 20) * deep } : { kind: "junk", name: "Rusted Lockbox", icon: "🧰", item: true };
  const w: [Fish["rarity"], number][] = [["common", 62], ["uncommon", 26 + 3 * deep], ["rare", 10 + 2 * deep], ["legendary", 2 + deep * 0.5]];
  let y = rng() * w.reduce((a, [, v]) => a + v, 0);
  let tier: Fish["rarity"] = "common";
  for (const [r, v] of w) { y -= v; if (y < 0) { tier = r; break; } }
  const pool = FISH.filter(f => f.rarity === tier);
  return { kind: "fish", fish: pool[Math.floor(rng() * pool.length)] };
}

/** Casts at one dungeon pond, and at the Camp's pool between runs. */
export const POND_CASTS = 3;
export const CAMP_CASTS = 3;
