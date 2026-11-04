// The Crawl (prototype): each floor is a small fogged grid of rooms instead of a row of paths.
// You start at the entrance (bottom middle) and open rooms next to ones you've cleared; the boss waits at the top.
// This file holds the shape of the grid; run.ts fills it and walks it.

export const GRID_W = 5;
export const GRID_H = 5;
/** Rooms to clear before the boss's door opens. */
export const BOSS_KEY = 5;
/** Every few rooms cleared, the floor's foes grow a little stronger. */
export const DANGER_EVERY = 3;
/** Grid fights are one foe, but a harder one. */
export const GRID_HP = 1.2;
export const GRID_DMG = 1.1;
/** Per step of danger. */
export const DANGER_HP = 0.07;
export const DANGER_DMG = 0.05;
export const DANGER_WORDS = ["Quiet", "Stirring", "Restless", "Hunting", "Furious"];

export interface GridCell {
  /** A RoomType, or "entrance". */
  room: string;
  done?: boolean;
  /** A landmark (an altar, a shrine, an encounter): seen from anywhere on the floor. */
  mark?: boolean;
}

export interface Grid {
  floor: number;
  w: number;
  h: number;
  cells: GridCell[];
  /** The room you last entered. */
  at: number;
  /** Rooms cleared on this floor (the entrance and the boss don't count). */
  explored: number;
  /** The cell being entered right now (set until the room opens). */
  pending?: number;
  /** The cell picked on the map, waiting for "Enter". */
  sel?: number;
}

export const entranceIndex = (w = GRID_W, h = GRID_H) => (h - 1) * w + Math.floor(w / 2);
export const bossIndex = (w = GRID_W) => Math.floor(w / 2);

export function neighbours(g: { w: number; h: number }, i: number): number[] {
  const x = i % g.w, y = Math.floor(i / g.w);
  const out: number[] = [];
  if (y > 0) out.push(i - g.w);
  if (y < g.h - 1) out.push(i + g.w);
  if (x > 0) out.push(i - 1);
  if (x < g.w - 1) out.push(i + 1);
  return out;
}

/** A room you can see: next to one you've cleared (or cleared itself). The boss and the floor's landmarks are always in sight. */
export const isSeen = (g: Grid, i: number) => !!g.cells[i].done || !!g.cells[i].mark || i === bossIndex(g.w) || neighbours(g, i).some(n => g.cells[n].done);

/** A room you can walk into now: seen, not yet cleared. */
export const isOpen = (g: Grid, i: number) => !g.cells[i].done && neighbours(g, i).some(n => g.cells[n].done);

export const bossLocked = (g: Grid) => g.explored < BOSS_KEY;

export const dangerOf = (g: Grid) => Math.floor(g.explored / DANGER_EVERY);
export const dangerWord = (d: number) => DANGER_WORDS[Math.min(d, DANGER_WORDS.length - 1)];
