/** The Abyss's Omens: as you land on each of its floors, three are offered. Accept one (a boon and a bane, both for the
 *  rest of the run) or refuse them all. Accept four or more and the Abyss's Tarot offer grows to four cards. */
export interface OmenDef { id: string; icon: string; name: string; boon: string; bane: string }
export const OMENS: OmenDef[] = [
  { id: "gilded", icon: "🪙", name: "Gilded Dark", boon: "Rare-or-better finds 25% likelier", bane: "Every foe has 15% more HP" },
  { id: "redharvest", icon: "🩸", name: "Red Harvest", boon: "Heal to full now", bane: "Every foe hits 12% harder" },
  { id: "arcane", icon: "🔷", name: "Arcane Well", boon: "+1 Max Mana, and refill your Mana now", bane: "Elites have 25% more HP" },
  { id: "quarter", icon: "🧪", name: "Quartermaster", boon: "+2 Healing Potions now", bane: "Merchants charge 30% more" },
  { id: "ironwill", icon: "🛡️", name: "Iron Will", boon: "+3 Armor", bane: "All your healing −15%" },
  { id: "hunters", icon: "🏹", name: "Hunter's Moon", boon: "One more Champion on every floor, and every Champion drops gear", bane: "Champions hit 20% harder" },
  { id: "whetstone", icon: "🗡️", name: "Whetstone", boon: "+2 Damage", bane: "Every foe has +1 Armor" },
  { id: "sight", icon: "👁️", name: "Second Sight", boon: "Every floor is laid bare as you land", bane: "A floor's danger builds 50% faster" }
];
export const OMEN_MAP = new Map(OMENS.map(o => [o.id, o]));
/** Omens accepted for a bigger Tarot offer (four cards instead of three). */
export const OMENS_FOR_FOUR = 4;
