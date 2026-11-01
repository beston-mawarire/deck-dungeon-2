// A single place where every item definition is registered, so the engine can look items up by id
// without the data files importing the engine in a cycle.
import type { Battle, Fighter, Fx, HookDef, Hooks } from "./types";

const ITEMS = new Map<string, HookDef>();

export function register(defs: HookDef[]) {
  for (const d of defs) {
    if (ITEMS.has(d.id)) throw new Error(`Duplicate item id: ${d.id}`);
    ITEMS.set(d.id, d);
  }
}

export const getItem = (id: string) => {
  const d = ITEMS.get(id);
  if (!d) throw new Error(`Unknown item: ${id}`);
  return d;
};

export const allItems = () => [...ITEMS.values()];

/** Run `fn` for every item the fighter holds that has hook `key`. */
export function eachHook<K extends keyof Hooks>(
  f: Fighter,
  key: K,
  fn: (hook: NonNullable<Hooks[K]>, stacks: number, def: HookDef) => void
) {
  for (const [id, stacks] of Object.entries(f.items)) {
    if (stacks <= 0) continue;
    const def = ITEMS.get(id);
    const h = def?.hooks[key];
    if (!def || !h) continue;
    fn(h as NonNullable<Hooks[K]>, stacks, def);
    // Hollow Vessel: the off-hand's effects happen twice (its stat hooks too).
    if (f.offEcho === id) fn(h as NonNullable<Hooks[K]>, stacks, def);
  }
}

export const stacksOf = (f: Fighter, id: string) => f.items[id] ?? 0;

export function log(b: Battle, msg: string) {
  b.log.push(msg);
}

/** Queue a visual effect for the UI (floating text, rolls, numbers). */
export function fx(b: Battle, e: Fx) {
  if (b.rollFrom && !e.fromRoll) e.fromRoll = b.rollFrom;
  b.fx.push(e);
}
