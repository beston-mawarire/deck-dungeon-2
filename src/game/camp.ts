// The Camp's stores and the Hall: Crown Shards (from the bosses of each layer) and Camp materials (from the foes of
// each family), kept between runs, even when a run ends in death. The Hall spends them on lasting upgrades.
import type { Meta } from "./meta";
import type { Run } from "./run";
import { recompute } from "./hero";

export type Mat = "bone" | "hide" | "cog" | "sigil";
export const MATS: Record<Mat, { name: string; icon: string; family: string }> = {
  bone: { name: "Bone Dust", icon: "🦴", family: "Undead" },
  hide: { name: "Hide", icon: "🐾", family: "Beast" },
  cog: { name: "Cogs", icon: "🔩", family: "Construct" },
  sigil: { name: "Cult Sigils", icon: "🔯", family: "Cultist" }
};
export const matOfFamily = (family?: string): Mat | undefined => (Object.keys(MATS) as Mat[]).find(k => MATS[k].family === family);

export interface CampStore { crowns: number; mats: Partial<Record<Mat, number>>; hall: Record<string, number> }
export const campOf = (m: Meta): CampStore => (m.camp ??= { crowns: 0, mats: {}, hall: {} });

export interface HallUpgrade {
  id: string; name: string; icon: string; ranks: number;
  /** What each rank gives. */
  per: string;
  /** Cost of the next rank (1-based). */
  cost: (rank: number) => { crowns: number; mat: Mat; n: number };
}
export const HALL: HallUpgrade[] = [
  { id: "pockets", name: "Deep Pockets", icon: "👛", ranks: 4, per: "+25 starting Gold", cost: r => ({ crowns: [1, 1, 2, 2][r - 1], mat: "hide", n: 1 + r }) },
  { id: "belt", name: "Apothecary's Belt", icon: "🧪", ranks: 2, per: "+1 starting Healing Potion", cost: r => ({ crowns: [2, 3][r - 1], mat: "bone", n: 2 + 2 * r }) },
  { id: "straps", name: "Packmule's Straps", icon: "🎒", ranks: 4, per: "+1 Backpack slot", cost: r => ({ crowns: [1, 2, 2, 3][r - 1], mat: "cog", n: 1 + r }) },
  { id: "hardy", name: "Hardy", icon: "❤️", ranks: 5, per: "+4 starting Max HP", cost: r => ({ crowns: [1, 1, 2, 2, 3][r - 1], mat: "bone", n: 1 + r }) },
  { id: "second", name: "Second Life", icon: "💫", ranks: 1, per: "Once a run, when you would die, get back up at half your Max HP", cost: () => ({ crowns: 5, mat: "sigil", n: 6 }) }
];
export const hallRank = (m: Meta, id: string) => campOf(m).hall[id] ?? 0;

/** Buy the next rank of a Hall upgrade. Returns why not, or null. */
export function buyHall(m: Meta, id: string): string | null {
  const u = HALL.find(x => x.id === id);
  if (!u) return null;
  const c = campOf(m), r = hallRank(m, id);
  if (r >= u.ranks) return `${u.name} is complete.`;
  const cost = u.cost(r + 1);
  if (c.crowns < cost.crowns) return `You need ${cost.crowns} Crown Shard${cost.crowns === 1 ? "" : "s"}.`;
  if ((c.mats[cost.mat] ?? 0) < cost.n) return `You need ${cost.n} ${MATS[cost.mat].name}.`;
  c.crowns -= cost.crowns;
  c.mats[cost.mat] = (c.mats[cost.mat] ?? 0) - cost.n;
  c.hall[id] = r + 1;
  return null;
}

/** A Crawl run sets out with the Hall's upgrades. */
export function applyHall(m: Meta, run: Run) {
  const h = run.hero;
  h.f.gold += 25 * hallRank(m, "pockets");
  h.potions += hallRank(m, "belt");
  h.packBonus = hallRank(m, "straps") || undefined;
  const hp = 4 * hallRank(m, "hardy");
  if (hp) h.f.persist["hallHp"] = hp;
  if (hallRank(m, "second")) h.f.persist["secondLife"] = 1;
  recompute(h);
  h.f.hp = h.f.maxHp;
}

/** What a run has found for the Camp, banked the moment it's found (kept even if the run ends in death). */
export function bankCamp(m: Meta, run: Run): boolean {
  const l = run.campLoot;
  if (!l) return false;
  const b = (l.banked ??= { crowns: 0, mats: {} });
  const c = campOf(m);
  let changed = false;
  if (l.crowns > b.crowns) { c.crowns += l.crowns - b.crowns; b.crowns = l.crowns; changed = true; }
  for (const k of Object.keys(l.mats) as Mat[]) {
    const d = (l.mats[k] ?? 0) - (b.mats[k] ?? 0);
    if (d > 0) { c.mats[k] = (c.mats[k] ?? 0) + d; b.mats[k] = l.mats[k]; changed = true; }
  }
  return changed;
}
