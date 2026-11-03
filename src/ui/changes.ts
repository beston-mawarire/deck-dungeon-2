// The "Changes" page: patch notes for players, newest first.
export interface PatchNote { title: string; version: string; date: string; intro: string; sections: { icon: string; title: string; items: [string, string][] }[]; outro: string }

export const PATCH_NOTES: PatchNote[] = [
  {
    title: "⚡ Turbo: a limited-time event", version: "1.62", date: "3 November 2026",
    intro: "For two weeks there's a second way to play. Pick the Turbo tab in the class menu.",
    sections: [
      { icon: "⚡", title: "Turbo", items: [
        ["15 floors, start to THE END", "six rooms a floor. The Campaign is the same five floors, then every floor goes deeper fast."],
        ["Everything sooner", "gear, foes and encounters that usually wait for later floors turn up from the start, and the deep stuff from floor 5."],
        ["Much richer loot", "Rares, Epics and Legendaries are far more common, and better still the deeper you go."],
        ["No Quick Battles", "every fight is yours to play."],
        ["Its own leaderboard", "and tell us what you think with a 👍 or 👎 at the end of a run."]] }
    ],
    outro: "Turbo ends on 17 November. Standard is right where you left it."
  },
  {
    title: "Mana and class abilities", version: "1.60", date: "3 November 2026",
    intro: "Class abilities now run on Mana, and each class has gear built around its ability.",
    sections: [
      { icon: "🔷", title: "Mana", items: [
        ["3 Mana a fight", "War Cry, Counter, Barrier and Penance each cost 1. You start every fight with full Mana, shown under your HP bar."],
        ["War Cry, again and again", "it's no longer once a fight. Each cry after the first gives half the Might."],
        ["Mana Potions", "now refill your Mana. You carry up to 2, and every shop stocks them (they cost more than Healing Potions)."]] },
      { icon: "⚔️", title: "Class gear", items: [
        ["80 new items", "for each class ability, 5 weapons, 5 off-hands, 5 armours and 5 trinkets, Uncommon to Epic, found only by that class."],
        ["New relics", "a War Cry that doesn't take your turn, pay-offs when a Counter, Barrier or Penance triggers, abilities that count as a Guard, more Max Mana, and room for more Mana Potions."]] }
    ],
    outro: "Spend it well."
  },
  {
    title: "The dungeon has changed", version: "1.58", date: "3 November 2026",
    intro: "The Great Reset cleared the board, and since then the dungeon has been growing fast. Here's what's new:",
    sections: [
      { icon: "🗺️", title: "Every run feels different", items: [
        ["13 floor themes", "the Smouldering Depths, the Icy Labyrinth, the Necropolis, the Blood Pits and more. Each one has its own look, monsters, Elites and boss."],
        ["Map shake-ups", "gauntlets of nothing but Elites and Champions, quiet stretches with no fights at all, and more events with their own paths on the map."]] },
      { icon: "👹", title: "New foes", items: [
        ["40+ new monsters and 13 new bosses.", ""],
        ["The Changeling Doppelgänger", "an exact copy of you, guarding a Legendary."],
        ["Rare weak spots", "some enemies are especially vulnerable to blunt weapons, blades, two-handers, spells or Bleed. Check their tags."]] },
      { icon: "🧭", title: "New ways to build", items: [
        ["Builds beyond elemental stacking", "Brawler, Butcher, Duelist, Stonebreaker, Briar, Mercenary, Executioner and Gambler."],
        ["New gear and powers", "100+ new items, dozens of new relics and talents, and 6 new Talisman sets."],
        ["New reactions", "Lacerate, Crushed, Hamstring and Bristle."],
        ["New weapons", "daggers, Heatforged gear for brave Heat runners, and stats-heavy Legendaries for builds that skip effects."]] },
      { icon: "🔥", title: "Heat and the Abyss", items: [
        ["Heat", "its own gear, achievements and leaderboard."],
        ["Ruin Gems", "permanent class power from Abyss Uber bosses."],
        ["The Abyss", "deeper, deadlier and richer than ever."]] },
      { icon: "🛡️", title: "Classes", items: [
        ["Stronger class skills", "War Cry, Penance and Counter all hit harder. Counter now strikes back with a Crit."],
        ["Mastery", "slower and more meaningful, shown as stars (then crowns) on new heraldic class crests."],
        ["Starting kits", "more variety for every class."]] },
      { icon: "🏰", title: "A real dungeon", items: [
        ["New look", "a torch-lit title hall, stone menus, and a dungeon around you as you play."],
        ["Clearer fights", "visible Guard and Counter stances, and Crimson foes that glow magenta."]] },
      { icon: "🐛", title: "Fixes", items: [
        ["No more slowdowns", "fixed the slowdown over long sessions."],
        ["Saves and menus", "cleaner saves and smoother menus, plus plenty of balance passes: richer Elite and Champion loot, rarer potions, and tougher bosses."]] }
    ],
    outro: "The dungeon is alive. See you in the depths. 🕯️"
  }
];
