// Seeded randomness (mulberry32), so a run can be replayed from its seed.
/** A seeded random function whose position can be saved: makeRng(rng.state()) carries on exactly where it left off. */
export type Rng = (() => number) & { state: () => number };

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (() => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rng;
  next.state = () => a;
  return next;
}

export const rollDie = (rng: () => number, sides = 6) => 1 + Math.floor(rng() * sides);

export function shuffle<T>(rng: () => number, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
