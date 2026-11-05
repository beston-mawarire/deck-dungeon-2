// Deck Dungeon 2 — the playable game.
import { justReset } from "./reset"; // first: the Great Reset wipes old saves before anything loads them
import { BONUSES, CRIMSON, CURSES, KEEPSAKES, TRAITS, EPIC_POWERS, FUSION_RELICS, GEAR_BASES, LEGENDARIES, RELICS, TALENTS, loadLibrary } from "../data";
import { FUSION_RECIPES } from "../data/fusions";
/** Relics that fuse with a different relic (labelled; trinket recipes never are). */
const FUSABLE_RELICS = new Set(FUSION_RECIPES.flatMap(r => [r.a, r.b]));
import { ORIGINS } from "../data/origins";
import { ambushPending, ambushStrike, armorOf, armorReduction, beginRound, tollOf, enemyPhase, endRound, heroPhase, isUnholy, type Action, wieldsHoly, streakOf, hasStreak, BLESSINGS, isSkill, MANA_COST } from "../engine/combat";
import { eachHook, getItem } from "../engine/registry";
import { REACTIONS, STATUS_INFO, THRESHOLDS } from "../engine/statuses";
import type { Battle, Fighter, Fx, GearItem, OriginId, StatusId } from "../engine/types";
import { NEGATIVE_STATUSES, rarityLabel } from "../engine/types";
import {
  packSize, scrapValue, baseOf, effectiveBase, EQUIP_SLOTS, type EquipSlot, openSlots, canGuard, equipItem, fillText, type Hero, itemLines, itemName,
  keepsOffHand, findItem, recompute, type Sigil, SIGIL_BAG_SIZE, SIGIL_FLOORS, sigilSlots, reveal, salvage, salvageNote, materials, slotsFor, unequip, upgradeCost, xpToLevel
} from "../game/hero";
import { LEGENDARY_LORE } from "../data/lore";
import { SIGIL_SETS } from "../data/talisman";
import { GEN_MODULE_MAP, modValue } from "../game/gen";
import { CLASS_SKILLS, ABYSS_MODS, ACHIEVEMENTS, applyKit, currentAbyssMod, HEAT_LEVELS, HEAT_MAX, HEAT_RENOWN, heatOf, KIT_RARE_LEVEL, KIT_COMMON_LEVEL, KIT_SLOTS, KIT_UNCOMMON_LEVEL, kitOptions, type KitSlot, masteryLevel, MASTERY_MAX, MASTERY_XP } from "../game/progress";
import { ABYSS_SHARD_COST, addGem, classOpen, CLASS_UNLOCK, GEM_BONUS, removeGem, abyssUnlocked, applyPlate, bankRuin, HISTORY_SIZE, lockedIds, loadMeta, type Meta, recordRun, saveMeta, spendShard, UNLOCK_TIERS } from "../game/meta";
import {
  advance, themeOf, availableFusions, buy, chooseEvent, chooseRoom, chooseTalent, skipTalent, claimResplendent, confirmRisk, continueEndless, drinkPotion,
  eventOptionAvailable, finishLoot, FLOORS, forgeReroll, forgeUpgrade, fuse, type Mode, newRun, pickResplendent, rerollShop, rest,
  sellItem, sellPrice, THROW_CAP, CRAWL_POTION_HEAL, fishCast, eatFish, sellFish, availableActions, drinkMana, takeKeepsake, forgeCombine, forgeOffer, forgeTransmute, offeringOdds, offeringValue, shopRerollCost, MAX_SHOP_REROLLS, TRANSMUTE_COST,
  ROOM_INFO, ABYSS_ROOM_INFO, AUTO_BATTLE_FLOOR, chooseRelic, goldMult, sigilName, wearSigil, removeSigil, scrapSigil, dailyFor, newDailyRun, utcDay, ABYSS_FLOORS, depth, type Run, floorName, scrapFound, settleCombat, shopMult, STEPS_PER_FLOOR, takeItem, WALL_FLOOR, DEATH_FLOOR, END_FLOOR,
  startCrawl, ordinal, type RoomType, type ShopEntry, TREASURE_DEPTH,
  abandonRun, smithUpgrade, runSummary, trackGold, trackMarks, autoBattle, canAutoBattle, jewelCost, jewelPlace, jewelClear, jewelFuse, jewelCheck, jewelMode, JEWEL_TRIES, type JewelSlot, TONICS, buyTonic, useTonic, tributeCost, payTribute, restPct, takeBounty, unifyHeart, bountyDone,
} from "../game/run";
import { fortunePips } from "../game/loot";
import { LAYER_FLOORS } from "../game/grid";
import { isThrow, MANA_MAX, THROW_INFO, THROWS, type Throw } from "../engine/combat";
import { branchSpent, isTreeSigil, MASTERY_FAMILIES, nodeBlock, nodeName, nodeRanks, nodeText, NUMERAL, passiveTree, resetTree, spendNode, TIER_WIDTH, tierOpen, TOTEMS, totemById, TREE_LAYERS, treeNode as treeNodeOf, treeOf, treeOpen, WM_MAX, WM_PERK, wmLevel, wmNext } from "../game/longroad";
import { familyOpenCount } from "../game/loot";
import { ATTR_INFO, ATTR_MAX, ATTR_PER_LEVEL, ATTRS, attrPower, type Attr, BASE_ATTR } from "../data/attributes";
import { crawlKeys, mountCrawl, stopWalk, walkToThing } from "./crawl";
import { mountCampMap, resetCampWalk } from "./campmap";
import { CAMP_CASTS, type CastPlan, FISH, fishById, planCast, rollCatch } from "../game/fishing";
import { ELITE_ONLY, MONSTERS } from "../data/monsters";
import { CLASS_SPRITE, foeSprite, hasSprite, spriteHtml, spriteSize, THING_SPRITE } from "./sprites";
import { gearAttr, spendAttr, treeAttr, PLATE_BONUS, plateMult, potionCap, potionsPerFight, manaPotionCap, newHero, heroTags } from "../game/hero";
import { bountyProgress, bountyText, makeOffers, rewardText, type Bounty } from "../game/bounty";
import { makeRng } from "../engine/rng";
import { INSIGHTS, learn, applyHall, bankCamp, bottle, BREW_HERBS, brewBand, buyHall, campOf, gardenPlots, HALL, hallRank, harvest, MATS, PLANTS, sow, startBrew, stir, type Brew, type Mat, type Plant } from "../game/camp";
import { pingSession } from "./leaderboard";
import { classify, FAMILY_NAME } from "../game/families";
import { applyRework, canAfford, canEmpowerTarget, costText, empower, empowerBlock, extract, extractBlock, MAX_REFINE, refine, refineBlock, refineCost, rework, reworkBlock, reworkCost, SCROLL_SLOTS, scrapScroll, scrollName, scrollScrapValue } from "../game/masterwork";
import { applySave, watchBackup, backupCode, backupVault, setPlayerTitle, SUB_BOARDS, type Board, type Scope, type KillerRow, fetchBoard, fetchKillers, fetchVault, flushQueue, leaderboardOn, playerName, reportFloor, type Row, setPlayerName, startSession, submitRun, useBackupCode, vaultDirty } from "./leaderboard";
import { CROSSROADS_GUISES } from "../data/events";
import { clearSave, loadRun, saveRun, savedSummary } from "../game/save";
import { applyUpdate, updateReady, watchForUpdates } from "./update";
import { PATCH_NOTES } from "./changes";
import { warmClips, holdMusic, isMusicOff, isMuted, musicBlocked, toggleMusic, musicVolume, onMusicBlockChange, playMusic, setMusicVolume, sfx, toggleMute, type Track } from "./sound";

loadLibrary();

const app = document.getElementById("app")!;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
/** Combat speed (Options): 1 = normal, 0.5 = fast, 0.2 = very fast. */
/** Shown on the title screens. */
const VERSION = `v${__APP_VERSION__} · build ${__APP_BUILD__}`;
/** Quick Battle can be switched off in Options (then only the plain Fight remains). */
let quickOn = (() => { try { return localStorage.getItem("dd2-quick") !== "0"; } catch { return true; } })();
let speed = (() => { try { return Number(localStorage.getItem("dd2-speed") ?? "1") || 1; } catch { return 1; } })();
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms * speed));

let meta: Meta = loadMeta();
let run: Run | null = null;
let view: "splash" | "title" | "codex" | "changes" = "splash";
/** Where the Changes page goes back to. */
let changesFrom: "splash" | "title" = "splash";
/** The Options panel is open (from the splash screen). */
let optionsOpen = false;
/** Reset progress needs a second tap to confirm. */
let resetArmed = false;
let mode: Mode = "campaign";
let bagOpen = false;
/** The Crawl's potion drawer (bottom left). */
let potDrawer = false;
/** The class the player tapped on the title screen (the popup before a run starts). */
let pendingOrigin: OriginId | null = null;
/** The title screen's tabs: the Campaign, or an Abyss run. */
let menuTab: "campaign" | "abyss" = "campaign";

/** Adding a Vanadium Plate is for good: the first tap arms it, the second applies it. */
let plateArmed = false;
let restoreOpen = false;
let infoOpen = false;
let historyOpen = false;
let achOpen = false;
let challengesOpen = false;
let achTab: "todo" | "earned" = "todo";
/** Starting the Daily Dungeon over a saved run takes a second tap. */
let dailyArmed = false;
let restoreMsg = "";
const vaultOf = (m: Meta) => ({ shards: m.ruinShards ?? 0, plates: m.plates ?? 0, classPlates: m.classPlates ?? {} });
/** Which mode's story popup is open on the title screen. */
let storyOpen: Mode | null = null;
/** The How to play guide is open. */
let helpOpen = false;
/** Leaderboards: the board on show, what came back, and how this run placed. */
let lbOpen = false;
let lbBoard: Board = "floor";
let lbScope: Scope = "campaign";
let lbOrigin = "";
let lbKillers: KillerRow[] | null = null;
let lbRows: Row[] | null = null;
let lbMe: { rank: number; value: number } | null = null;
let lbError = "";
let lbResult: { ranks?: Partial<Record<Board, number>>; verified?: boolean } | null | "sending" = null;
let lbNaming = false;
/** The in-run menu (main menu / end run). */
let menuOpen = false;
/** The current-bounty popup. */
let bountyOpen = false;
/** Which Inventory tab is open. */
type BagTab = "gear" | "stats" | "relics" | "talents" | "extras" | "attrs";
let bagTab: BagTab = "gear";
let talentSub: "talents" | "curses" = "talents";
let spoilsSub: "relics" | "artefacts" = "relics";
let gearSub: "equipped" | "backpack" | "sigils" | "scrolls" = "equipped";
/** The Masterwork screen: its tab, the scroll picked to Empower with, and the scroll lines kept. */
let mwTab: "rework" | "extract" | "empower" | "refine" | "transmute" = "rework";
let mwScroll: number | null = null;
let mwKeep = new Set<string>();
let statsSub: "attributes" | "statuses" = "attributes";
/** Selling worn gear, and bulk selling, take a second tap. */
let sellArmed: number | null = null;
let bulkSellArmed: "common" | "uncommon" | null = null;
function bulkSellRow(r: Run) {
  const h = r.hero;
  const c = bulkScrapList(h, "common"), u = bulkScrapList(h, "uncommon");
  if (!c.length && !u.length) return "";
  const total = (l: GearItem[]) => l.reduce((a, it) => a + Math.round(sellPrice(it, h) * goldMult(r)), 0);
  const btn = (k: "common" | "uncommon", l: GearItem[], label: string) => l.length ? `<button class="small ${bulkSellArmed === k ? "danger" : ""}" data-bulksell="${k}">${bulkSellArmed === k ? `Tap again: sell ${l.length} for ${total(l)} 🪙` : label}</button>` : "";
  return `<div class="row bulk-row">${btn("common", c, `🪙 Sell all Commons (${c.length})`)}${u.length > c.length ? btn("uncommon", u, `🪙 Commons + Uncommons (${u.length})`) : ""}</div>`;
}
/** Bulk scrap takes a second tap: which rarity is armed. */
let bulkArmed: "common" | "uncommon" | null = null;
/** Items in the bag a bulk scrap would take: up to that rarity, never hidden Legendaries. */
const bulkScrapList = (h: Hero, upTo: "common" | "uncommon") => h.backpack.filter(i => i.rarity === "common" || (upTo === "uncommon" && i.rarity === "uncommon"));
function bulkScrapRow(h: Hero) {
  // The Crawl: things are scrapped only at a Forge.
  if (run?.gridMode && run.scene.t !== "forge") return "";
  const c = bulkScrapList(h, "common").length, u = bulkScrapList(h, "uncommon").length;
  if (!c && !u) return "";
  const btn = (k: "common" | "uncommon", n: number, label: string) => n ? `<button class="small ${bulkArmed === k ? "danger" : ""}" data-bulkscrap="${k}">${bulkArmed === k ? `Tap again: scrap ${n}` : label}</button>` : "";
  return `<div class="row bulk-row">${btn("common", c, `🗑️ Scrap all Commons (${c})`)}${u > c ? btn("uncommon", u, `🗑️ Commons + Uncommons (${u})`) : ""}</div>`;
}
/** Forge: waiting for the player to confirm destroying gear they're wearing. */
let forgeAsk: { kind: "scrap"; uid: number } | { kind: "offer" } | null = null;
/** Shown when the device loses its connection. */
let offlineOpen = false;
let endArmed = false;
/** The talent scene whose "You have levelled up!" popup has been seen. */
let ackedTalentScene: unknown = null;
let note = "";
let noteBad = false;
let recorded: ReturnType<typeof recordRun> | null = null;
/** Renown already banked this run (a campaign win that continues into Endless). */
let banked = 0;

// Combat presentation state
let busy = false;
const dispHp: Record<"player" | "enemy", number | null> = { player: null, enemy: null };
/** The Crawl's fight shows one die in the middle: the last roll, whoever made it (two when the same side rolls twice running, like an off-hand). */
type ShownDie = { who: "player" | "enemy"; d: { face: number; name: string; kind: string; rolling?: boolean; tint?: string }; batch: number };
let shownDice: ShownDie[] = [];
let fxBatch = 0;
const lastRoll: Record<"player" | "enemy", { face: number; name: string; kind: string; rolling?: boolean; tint?: string } | null> = { player: null, enemy: null };

/** Die colours for the status (or reaction) a roll caused. */
const DIE_TINT: Record<string, string> = {
  bleed: "#c8323a", burn: "#ff7a2f", poison: "#74c447", chill: "#9ad8ff", shock: "#ffe34d", weak: "#a596b8", exposed: "#ff9fb4",
  blind: "#4b4658", stun: "#f2cf5b", doom: "#6a2fa0", regen: "#7ee08a", barrier: "#6fb6ff", might: "#e5533d", haste: "#8ff0dc",
  focus: "#c9a0ff", evade: "#c4e6ff", spikes: "#a7a9ad", ward: "#dbe6ff", static: "#b49cff", soaked: "#3f7fd8", charged: "#fff07a",
  kindled: "#ff9a3c", grounded: "#b08850", smoulder: "#d4622a", fracture: "#cdbb9f", stagger: "#d6a25e", broken: "#8a6f5c",
  dazzled: "#fff6a8", reinforced: "#b6bfcf", blessed: "#fff0b0", consecrated: "#ffe48a", smoulder_soul: "#ff6a3a",
  "rx:combustion": "#ff5a1f", "rx:steam": "#d9e4ea", "rx:shatter": "#bfe9ff", "rx:rupture": "#e0284a", "rx:sepsis": "#7d9a2a",
  "rx:overload": "#ffb627", "rx:despair": "#4a2470", "rx:bastion": "#5fd0c0", "rx:frenzy": "#ff4f7a", "rx:clarity": "#d9c2ff",
  "rx:conduction": "#9f86ff", "rx:electrocute": "#58b8ff", "rx:freeze": "#7fc8ff", "rx:thunderstrike": "#ffd23f"
};
/** Light or dark number on a tinted die. */
function dieInk(hex: string): string {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, bl = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * bl > 140 ? "#1b1620" : "#fff6ea";
}
let currentBattle: Battle | null = null;

const say = (msg: string | null, bad = true) => {
  note = msg ?? "";
  noteBad = bad;
};
/** The Abyss tab's explainer (shown the first time you open the tab, and from its "How it works" button). */
let abyssIntroOpen = false;
const abyssIntro = () => storyBeat({ icon: "🕳️", title: "The Abyss", text: "A run of its own, far deadlier than the dungeon above, and where your permanent power comes from.", list: [
  `🔓 Opens once any of your heroes beats the dungeon's last layer. Each run costs ${ABYSS_SHARD_COST} Ruin Shard${ABYSS_SHARD_COST === 1 ? "" : "s"}.`,
  "☠️ Ten depths. Every fight is a rank tougher, each depth ends with an Uber boss, and your Armor wears down as you go.",
  "💰 The richest loot in the game, best from Champions, bosses and Uber bosses.",
  "🪨 Ruin Shards (the entry fee) drop from every guardian from the last layer on.",
  "⬛ Vanadium Plates sometimes drop from the same guardians. Give them to a class for good: they make it stronger in the Abyss, far more so from the third plate on.",
  "💎 Ruin Gems drop from Uber bosses. Put them on any class for more Max HP, Damage and Armor in the dungeon and the Abyss, and move them whenever you like.",
  "🌕 A new twist every week, and a leaderboard for the deepest runs."
] }, "data-closeabyssintro");

/** The Great Reset just wiped this device: explain it once, on the splash screen. */
let resetPopup = justReset;

// ---------- Small pieces ----------

/** Reactions that leave a lasting effect on whoever has them (stored as fight flags). */
const LASTING = ["rupture", "sepsis", "despair", "bastion", "frenzy", "clarity", "shatter", "thunderstrike", "crushed", "hamstring", "bristle"] as const;
const reactionInfo = (id: string) => REACTIONS.find(r => r.id === id)!;
const activeReactions = (f: Fighter) => LASTING.filter(id => (f.flags[id] ?? 0) > 0);

const statusChips = (f: Fighter) =>
  (Object.entries(f.statuses) as [StatusId, number][])
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `<span class="chip" title="${esc(STATUS_INFO[s].text)}">${STATUS_INFO[s].icon} ${STATUS_INFO[s].name} ${s === "consecrated" && n >= 99 ? "∞" : n}</span>`)
    .join("") +
  activeReactions(f).map(id => { const r = reactionInfo(id); return `<span class="chip rx" title="${esc(r.text)}">✴️ ${r.name}</span>`; }).join("") +
  (f.flags["smiteReady"] && wieldsHoly(f) ? `<span class="chip rx holy" title="Your Ward stopped an enemy status: your next Holy hit Smites for 20% of the enemy's Max HP">⚡ Smite ready</span>` : "");

/** Which of the hero's sources mention a status by name (gear, bonuses, relics, talents, origin, curses). */
function statusSources(h: Hero, status: StatusId): string[] {
  const word = new RegExp(`\\b${STATUS_INFO[status].name}\\b`, "i");
  const out: string[] = [];
  for (const id of Object.keys(h.f.items)) {
    let d;
    try { d = getItem(id); } catch { continue; }
    const text = `${d.text} ${(d as { legendary?: { reveal: string } }).legendary?.reveal ?? ""}`;
    if (word.test(text)) out.push(d.name);
  }
  // Spell faces on weapons: go by the weapon's tags (a Burn-tagged staff has fire spells, and so on).
  const TAG_OF: Partial<Record<StatusId, string>> = { burn: "Burn", poison: "Poison", bleed: "Bleed", chill: "Frost", shock: "Storm", static: "Storm" };
  for (const it of [h.equip.main, h.equip.off]) {
    if (!it) continue;
    const eb = effectiveBase(it);
    if (TAG_OF[status] && eb.faces?.some(f => f.run) && (eb.tags as string[]).includes(TAG_OF[status]!)) out.push(eb.name);
  }
  return [...new Set(out)];
}

/** The bag's Statuses & reactions panel: what's active now, what's happened this run, and what your build can set off. */
function reactionsPanel(r: Run) {
  const h = r.hero;
  const b = r.scene.t === "combat" ? r.scene.battle : null;
  const describe = (f: Fighter, who: string) => {
    const st = (Object.entries(f.statuses) as [StatusId, number][]).filter(([, n]) => n > 0);
    const rx = activeReactions(f);
    if (!st.length && !rx.length) return `<p class="sub">${who}: nothing active.</p>`;
    return `<p><b>${who}</b></p>${rx.map(id => { const x = reactionInfo(id); return `<p class="rxline">✴️ <b>${x.name}</b> — ${esc(x.text)} <span class="sub">(from ${STATUS_INFO[x.a].name} + ${STATUS_INFO[x.b].name} together)</span></p>`; }).join("")}
      ${st.map(([s, n]) => `<p>${STATUS_INFO[s].icon} <b>${STATUS_INFO[s].name}</b> ${n} — ${esc(STATUS_INFO[s].text)}</p>`).join("")}`;
  };
  const counts = (side: "you" | "foe") => REACTIONS.map(x => [x, h.f.persist[`rx:${side}:${x.id}`] ?? 0] as const).filter(([, n]) => n > 0);
  const smites = h.f.persist["rx:foe:smite"] ?? 0;
  const onFoe = [...counts("foe"), ...(smites ? [[{ name: "Smite" }, smites] as const] : [])];
  const onYou = counts("you");
  const history = onFoe.length || onYou.length
    ? `${onFoe.length ? `<p>On enemies: ${onFoe.map(([x, n]) => `<span class="chip">${x.name} ×${n}</span>`).join(" ")}</p>` : ""}${onYou.length ? `<p>On you: ${onYou.map(([x, n]) => `<span class="chip">${x.name} ×${n}</span>`).join(" ")}</p>` : ""}`
    : `<p class="sub">No reactions yet this run.</p>`;
  const guide = REACTIONS.map(x => {
    const a = statusSources(h, x.a as StatusId);
    const c = statusSources(h, x.b as StatusId);
    const yours = a.length > 0 && c.length > 0;
    const src = (s: StatusId, list: string[]) => `${STATUS_INFO[s].icon} ${STATUS_INFO[s].name}${list.length ? ` <span class="sub">(${list.map(esc).join(", ")})</span>` : ""}`;
    return `<div class="rxguide ${yours ? "yours" : ""}"><b>${x.name}</b>${yours ? ` <span class="chip rx">your build can set this off</span>` : ""}<br>
      ${src(x.a as StatusId, a)} + ${src(x.b as StatusId, c)}<br><span class="sub">${esc(x.text)}</span></div>`;
  }).join("");
  const wardSrc = statusSources(h, "ward");
  const holy = wieldsHoly(h.f);
  const smiteRow = `<div class="rxguide ${holy && wardSrc.length ? "yours" : ""}"><b>Smite</b>${holy && wardSrc.length ? ` <span class="chip rx">your build can set this off</span>` : ""}<br>
    ✨ Ward ${wardSrc.length ? `<span class="sub">(${wardSrc.map(esc).join(", ")})</span>` : ""} blocks an enemy's status + a ✝️ Holy weapon ${holy ? "" : `<span class="sub">(you have none)</span>`}<br>
    <span class="sub">Your next Holy hit deals 20% of the enemy's Max HP on top, once per fight.</span></div>`;
  return `<div class="panel">
      ${b ? `${describe(b.player, "On you")}${describe(b.enemy, `On ${b.enemy.name}`)}` : `<p class="sub">Statuses and reactions only last for a fight. Open this mid-fight to see what's active.</p>`}
      <p style="margin-top:10px"><b>This run</b></p>${history}
    </div>
    <details><summary>Reaction guide — two statuses on the same fighter react</summary><p class="sub">The names in brackets are things you own that mention that status.</p>${smiteRow}${guide}
      <p style="margin-top:8px"><b>Bursts</b> — pile one status high enough and it goes off on its own:</p>${THRESHOLDS.map(t => `<div class="rxguide"><b>${t.icon} ${t.name}</b><br><span class="sub">${esc(t.text)}</span></div>`).join("")}</details>
    <details><summary>All statuses</summary>${(Object.keys(STATUS_INFO) as StatusId[]).map(s => `<p>${STATUS_INFO[s].icon} <b>${STATUS_INFO[s].name}</b> — ${esc(STATUS_INFO[s].text)}</p>`).join("")}</details>`;
}

/** "Replaces X: Damage 4 → 6" for a found item against what's equipped in its slot. */
/** What your hero would look like wearing this item in a slot (a throwaway copy: nothing real changes). */
function simulateEquip(h: Hero, it: GearItem, slot: EquipSlot): Fighter {
  const f = { ...h.f, persist: { ...h.f.persist }, flags: {}, statuses: {}, items: { ...h.f.items } };
  const c: Hero = { ...h, equip: { ...h.equip, [slot]: it }, backpack: h.backpack.filter(x => x.uid !== it.uid), f };
  recompute(c);
  return c.f;
}

/** ▲/▼ for the stats that would change if you equipped this, against what you're wearing. */
const COMPARE_STATS: [string, (f: Fighter) => number, string][] = [
  ["Damage", f => f.damage + (f.offDamage ?? 0), ""],
  ["Armor", f => f.armor, ""],
  ["Max HP", f => f.maxHp, ""],
  ["Crit", f => f.critChance ?? 0, "%"],
  ["Dodge", f => f.dodge ?? 0, "%"],
  ["Bash", f => f.bash ?? 0, "%"],
  ["Spell Amp", f => f.spellAmp ?? 0, "%"]
];
function compareHtml(h: Hero, it: GearItem, forceSlot?: EquipSlot, full = false): string {
  if (findItem(h, it.uid)?.where && findItem(h, it.uid)!.where !== "backpack") return "";
  const slots = forceSlot ? [forceSlot] : slotsFor(it, h);
  if (!slots.length) return "";
  const now = h.f;
  const deltas = (f: Fighter) => COMPARE_STATS.map(([label, get, unit]) => ({ label, unit, d: Math.round(get(f) - get(now)), base: Math.max(1, Math.abs(get(now))) }));
  // Try every slot it fits; an empty slot wins, otherwise the one that helps most.
  const options = slots.map(s => { const f = simulateEquip(h, it, s); return { s, f, ds: deltas(f) }; });
  const empty = options.find(o => !h.equip[o.s]);
  const best = empty ?? options.reduce((a, b) => (b.ds.reduce((x, d) => x + d.d / d.base, 0) > a.ds.reduce((x, d) => x + d.d / d.base, 0) ? b : a));
  const cur = h.equip[best.s];
  // Stats: ▲ for every one that improves, ▼ for every one that drops.
  const stats = best.ds.filter(d => d.d !== 0).map(d => `<span class="cmp ${d.d > 0 ? "up" : "down"}">${d.d > 0 ? "▲" : "▼"} ${Math.abs(d.d)}${d.unit} ${d.label}</span>`);
  const a = effectiveBase(it);
  if (a.twoHanded && h.equip.off && !keepsOffHand(h) && best.s === "main") stats.push(`<span class="cmp down cmp-note">Two-handed: your off-hand goes to your backpack</span>`);
  // Effects: + for each one you'd gain (or that gets stronger), − for each you'd lose (or that gets weaker).
  const effectLine = (id: string, n: number) => { const d = getItem(id); return fillText(d.text, n); };
  const showable = (id: string) => {
    const d = getItem(id);
    const keys = Object.keys(d.hooks ?? {});
    if (!keys.length || (keys.length === 1 && keys[0] === "stats")) return false;
    return true;
  };
  const effects: string[] = [];
  const after = best.f.items, before = now.items;
  for (const id of new Set([...Object.keys(after), ...Object.keys(before)])) {
    const x = after[id] ?? 0, y = before[id] ?? 0;
    if (x === y || !showable(id)) continue;
    if (x > 0 && y <= 0) effects.push(`<li class="up">+ ${esc(effectLine(id, x))}</li>`);
    else if (x <= 0 && y > 0) effects.push(`<li class="down">− ${esc(effectLine(id, y))}</li>`);
    else effects.push(`<li class="${x > y ? "up" : "down"}">${x > y ? "+" : "−"} ${esc(effectLine(id, x))} <span class="sub">(was ${esc(effectLine(id, y))})</span></li>`);
  }
  effects.sort((p, q) => (p.startsWith('<li class="up"') ? 0 : 1) - (q.startsWith('<li class="up"') ? 0 : 1));
  const slotLabel = SLOT_LABEL[best.s];
  const head = cur ? `vs <b>${esc(itemName(cur))}</b> <span class="sub">(${esc(slotLabel)})</span>` : `Fills your empty <b>${esc(slotLabel)}</b>`;
  const MAX = full ? 99 : 6;
  return `<div class="compare">${head}<div class="cmp-row">${stats.length ? stats.join("") : `<span class="cmp same">＝ Same stats</span>`}</div>
    ${effects.length ? `<ul class="cmp-fx">${effects.slice(0, MAX).join("")}${effects.length > MAX ? `<li class="sub">…and ${effects.length - MAX} more</li>` : ""}</ul>` : ""}</div>`;
}

/** Rarity as shown on a card (generated Crimson items are Crimson-veined). */
const itemRarity = (it: GearItem) => (it.gen && it.rarity === "crimson" ? "Crimson-veined" : rarityLabel(it.rarity));

function itemCard(it: GearItem, buttons = "", compare: boolean | { hero: Hero; slot: EquipSlot } = false, equippedAs = "") {
  const b = baseOf(it.base);
  const hidden = b.legendary && !it.revealed;
  const grade = it.gen ? Math.max(0, ...it.gen.mods.map(m => m[2])) : 0;
  return `<div class="item r-${it.rarity} ${it.refine ? "refined" : ""} ${hidden ? "unrevealed" : ""} ${equippedAs ? "is-equipped" : ""} ${it.gen?.broken ? "overcharged" : ""} ${grade ? `grade-${grade}` : ""} ${it.gen && it.rarity === "crimson" ? "veined" : ""}">
    ${equippedAs ? `<div class="eqbadge">⚔️ Equipped · ${esc(equippedAs)}</div>` : ""}
    <div class="meta">${itemRarity(it)}${it.gen ? ` · <span class="gen-tag" title="Made by chance: a generated item">⚒ forged by chance</span>` : ""} · ${b.slot === "main" ? "weapon" : b.slot === "off" ? "off-hand" : b.slot} · level ${it.level}</div>
    <div class="nm">${esc(itemName(it))}</div>
    <ul>${itemLines(it).map(l => `<li${l.startsWith("🔒 Requires level") ? ` class="req-line"` : ""}>${esc(l)}</li>`).join("")}</ul>
    ${it.infused ? (() => { const t = baseOf(it.infused!); return `<div class="infused">💠 Infused: <b>${esc(t.name)}</b> — ${esc(t.legendary?.reveal ?? t.text)}</div>`; })() : ""}
    ${(it.upgrades ?? 0) > 0 ? `<div class="sub upgraded-note">⬆️ Upgraded ${it.upgrades}×</div>` : ""}
    ${it.refine || it.bound ? `<div class="sub mw-note">${[it.refine ? `Refined ${"•".repeat(it.refine)}` : "", it.bound ? "🔒 Bound" : ""].filter(Boolean).join(" · ")}</div>` : ""}
    ${it.reworkLine ? `<div class="sub mw-note">⚒️ Reworked ${it.reworks ?? 0}× · only its marked line can be reworked</div>` : ""}
    ${typeof compare === "object" ? compareHtml(compare.hero, it, compare.slot) : compare && run ? compareHtml(run.hero, it) : ""}
    ${buttons ? `<div class="row">${buttons}</div>` : ""}
  </div>`;
}

const nextMilestone = (f: number) => (f < WALL_FLOOR ? ` · a Horror at ${WALL_FLOOR}` : f < DEATH_FLOOR ? ` · DEATH at ${DEATH_FLOOR}` : f < END_FLOOR ? ` · the End at ${END_FLOOR}` : "");
const runChips = (r: Run) => `${heatOf(r) ? ` <span class="heat-chip" title="Heat ${heatOf(r)}">🔥${heatOf(r)}</span>` : ""}${r.mode === "abyss" && r.abyssMod ? (() => { const m = ABYSS_MODS.find(x => x.id === r.abyssMod); return m ? ` <span class="heat-chip" title="${esc(`${m.name}: ${m.text}`)}">${m.icon}</span>` : ""; })() : ""}${r.daily ? ` <span class="heat-chip" title="Daily Dungeon">📅</span>` : ""}`;
const themeChip = (r: Run) => { const th = themeOf(r); return th ? `<span class="theme-chip" title="${esc(`${th.name}: ${th.hint}`)}">${th.icon} ${esc(th.name.replace(/^The /, ""))}</span>` : ""; };
const floorLabel = (r: Run) => themeChip(r) + runChips(r) + (r.mode === "abyss" ? `Depth <b>${Math.min(r.floor, ABYSS_FLOORS)}</b>/${ABYSS_FLOORS}` : r.mode === "endless" ? `Floor <b>${r.floor}</b>${nextMilestone(r.floor)}` : `Floor <b>${Math.min(r.floor, FLOORS)}</b>/${FLOORS}`);

/** The current bounty's tracker button (📋 progress/target). */
function bountyBtn(r: Run) {
  const q = r.bounty;
  if (!q) return "";
  const n = Math.min(q.target, bountyProgress(r.hero, q));
  return `<button class="small bounty-btn ${n >= q.target ? "done" : ""}" data-bounty title="Your bounty: ${esc(bountyText(q, r.hero.origin))}">📋 ${n}/${q.target}</button>`;
}

function hud(r: Run) {
  const h = r.hero;
  const f = h.f;
  const need = xpToLevel(h.level);
  // In a fight the HUD shrinks to one line: your HP lives in your panel at the bottom.
  if (r.scene.t === "combat") {
    const drunk = f.flags["potionsDrunk"] ?? 0;
    const canDrink = h.potions > 0 && drunk < potionsPerFight(h) && f.hp > 0 && f.hp < f.maxHp && !busy && !(r.scene.t === "combat" && r.scene.battle.over);
    return `<div class="hud compact"><div class="row"><b>${esc(ORIGINS[h.origin].name)}</b><span class="stat">${floorLabel(r)}</span><span class="grow"></span>
      <span class="stat">🪙 <b>${f.gold}</b></span></div>
      <div class="row hud-split"><span class="hud-play"><button class="small potion-btn" data-potion ${canDrink ? "" : "disabled"} title="Drink a potion (${potionsPerFight(h) - drunk} more this fight)">🧪 ${h.potions}</button>${h.manaPotions ? `<button class="small" data-mana ${(f.mana ?? 0) >= (f.maxMana ?? 0) || busy ? "disabled" : ""} title="Mana Potion: refill your mana (${h.manaPotions}/${manaPotionCap(h)} carried)">🔷 ${h.manaPotions}</button>` : ""}${bountyBtn(r)}<button class="small bag-btn" data-bag title="Inventory">🎒</button></span><span class="hud-sys"><button class="small" data-mute>${isMuted() ? "🔇" : "🔊"}</button><button class="small" data-menu title="Menu" ${busy ? "disabled" : ""}>☰</button></span></div></div>`;
  }
  return `<div class="hud">
    <div class="row"><b>${esc(ORIGINS[h.origin].name)}</b><span class="stat">Lv ${h.level}</span><span class="grow"></span><span class="stat">${floorLabel(r)}</span></div>
    <div class="bar"><i style="width:${Math.max(0, (f.hp / f.maxHp) * 100)}%"></i></div>
    <div class="row stat"><span><b>${Math.max(0, f.hp)}</b>/${f.maxHp} HP</span><span>⚔️ <b>${f.damage}</b>${f.offDamage !== undefined ? ` + ${f.offDamage}` : ""}</span><span>🛡️ <b>${f.armor}</b></span>
      <span>🪙 <b>${f.gold}</b></span><span>⚙️ <b>${h.scrap}</b></span>${h.azure ? `<span title="Azure dust: from scrapping Rares">💠 <b>${h.azure}</b></span>` : ""}${h.orilium ? `<span title="Orilium: from scrapping Epics">🔶 <b>${h.orilium}</b></span>` : ""}<span title="Healing Potions carried / how many you can carry">🧪 <b>${h.potions}</b>/${potionCap(h)}</span><span>📜 <b>${h.scrolls}</b></span>${h.manaPotions ? `<span>🔷 <b>${h.manaPotions}</b></span>` : ""}${h.starmetal ? `<span>✴️ <b>${h.starmetal}</b></span>` : ""}${h.crimsonKeys ? `<span class="crimson-ink">🗝️ <b>${h.crimsonKeys}</b></span>` : ""}</div>
    <div class="bar xp"><i style="width:${(h.xp / need) * 100}%"></i></div>
    ${r.gridMode && r.grid ? `<div class="steps">${Array.from({ length: LAYER_FLOORS }, (_, i) => `<i class="${i < r.grid!.depth - 1 || r.step >= STEPS_PER_FLOOR ? "done" : ""}"></i>`).join("")}</div>` : `<div class="steps">${Array.from({ length: STEPS_PER_FLOOR + 1 }, (_, i) => `<i class="${i < r.step || (r.step === STEPS_PER_FLOOR && i < STEPS_PER_FLOOR) ? "done" : ""}"></i>`).join("")}</div>`}
    <div class="row hud-actions" style="margin-top:6px"><button class="small bag-btn" data-bag>${newTabs(r).size ? `<b class="newdot" title="Something new in your Inventory"></b>` : ""}🎒 <span class="lbl">Inventory</span></button>${bountyBtn(r)}${h.potions && f.hp > 0 && f.hp < f.maxHp && !busy && r.scene.t !== "over" ? `<button class="small potion-btn" data-potion>🧪 <span class="lbl">Potion </span>(+12)</button>` : ""}<span class="grow"></span><button class="small" data-help title="How to play">❓</button><button class="small" data-mute>${isMuted() ? "🔇" : "🔊"}</button><button class="small" data-menu title="Menu">☰ <span class="lbl">Menu</span></button></div>
    <div class="hud-floor">${floorHeader(r)}</div>
  </div>`;
}

// ---------- Title, Codex ----------

/** A saved run still in progress (not one sitting on its results screen). */
const liveSave = () => { const sv = savedSummary(); return !!sv && !sv.over; };

function titleScreen() {
  const sv = savedSummary();
  const cont = sv?.over ? `<button class="primary continue" data-continue>▶ ${sv.over.won ? "🏆 " : ""}Back to your ${esc(ORIGINS[sv.origin as OriginId]?.name ?? sv.origin)} run's results · ${sv.mode === "abyss" ? `Abyss depth ${sv.floor}` : `floor ${sv.floor}`}</button>`
    : sv ? `<button class="primary continue" data-continue>▶ Continue your ${esc(ORIGINS[sv.origin as OriginId]?.name ?? sv.origin)} run · ${sv.mode === "abyss" ? `Abyss depth ${sv.floor}` : `${sv.mode === "endless" ? "Endless " : ""}floor ${sv.floor}`} · level ${sv.level}</button>` : "";
  // (The Abyss lives in the Camp now.)
  menuTab = "campaign";
  const tabs = "";
  const originCards = (abyss: boolean) => `<div class="origin-grid">${(Object.keys(ORIGINS) as OriginId[]).map(o => {
    const og = ORIGINS[o];
    const pl = meta.classPlates?.[o] ?? 0;
    const lv = masteryLevel(meta.mastery?.[o] ?? 0);
    // Each class is a heraldic crest: its colours on a shield, its emblem in the middle, its name on a ribbon.
    return `<button class="crest crest-${o} ${abyss ? "abyss-card" : ""}" data-origin="${o}" aria-label="${esc(og.name)}">
      <span class="crest-stars" title="Class Mastery ${lv} of ${MASTERY_MAX}">${lv > 6 ? `<span class="crowns">${"👑".repeat(lv - 6)}</span>` : lv >= 2 ? "★".repeat(lv) : ""}</span>
      <span class="crest-shield"><span class="crest-field"></span><span class="crest-emblem">${ORIGIN_ICON[o]}</span></span>
      <span class="crest-ribbon"><b>${og.name}</b></span>
      <span class="crest-blurb">${esc(og.blurb)}</span>
      ${abyss ? `<span class="plate-line">⬛ ${pl} plate${pl === 1 ? "" : "s"}</span>` : ""}
    </button>`;
  }).join("")}</div>`;
  const dailyOpenToday = meta.daily?.day !== utcDay();
  const infoRow = `<div class="menu-btns three info-row"><button class="info-btn" data-info>ℹ️ Info</button><button class="ch-btn" data-challenges>${dailyOpenToday ? `<b class="newdot" title="Today's Daily Dungeon is waiting"></b>` : ""}⚔️ Challenges</button><button class="lb-btn" data-lb>🏆 Leaderboards</button></div>`;
  const head = `<div class="row"><button class="small" data-home aria-label="Back to title">←</button><h1 class="grow">Deck Dungeon <span>2</span></h1><button class="small" data-mute>${isMuted() ? "🔇" : "🔊"}</button></div>`;
  if ((menuTab as string) === "abyss") {
    const shards = meta.ruinShards ?? 0;
    const body = !abyssUnlocked(meta)
      ? `<div class="panel abyss-locked"><p class="big">🔒 The Abyss is sealed.</p><p>Beat the dungeon's last layer, with any hero, to find the way down.</p><button class="dg-stone small" data-abyssintro>❔ How it works</button></div>`
      : `<div class="campaign-hero abyss-hero">
          <div class="ch-text"><b>🕳️ The Abyss</b><span>Ten depths, every foe a rank tougher, and an Uber boss at the bottom of each. The richest loot comes from the deadliest. Each run costs ${ABYSS_SHARD_COST} Ruin Shards.</span></div>
          <div class="hero-btns"><button class="dg-stone small" data-abyssintro>❔ How it works</button><button class="story-btn small" data-story="abyss">📖 Story</button></div>
        </div>
        <div class="abyss-stock">
          <div class="stile extra-tile shard-tile"><span>🪨</span><span><b>${shards}</b> Ruin Shard${shards === 1 ? "" : "s"}<span class="sub">From every guardian from the last layer on.</span></span></div>
          <div class="stile extra-tile plate-tile"><span>⬛</span><span><b>${meta.plates ?? 0}</b> Vanadium Plate${(meta.plates ?? 0) === 1 ? "" : "s"} to give<span class="sub">Rare drops from the same bosses.</span></span></div>
          <div class="stile extra-tile gem-tile" style="grid-column: 1 / -1"><span>💎</span><span><b>${(meta.ruinGems ?? 0) + Object.values(meta.classGems ?? {}).reduce((a: number, n) => a + (n ?? 0), 0)}</b> Ruin Gem${((meta.ruinGems ?? 0) + Object.values(meta.classGems ?? {}).reduce((a: number, n) => a + (n ?? 0), 0)) === 1 ? "" : "s"} · ${meta.ruinGems ?? 0} free<span class="sub">Every Uber boss drops one. +10% base stats on any class, in every mode; open a class to move them.</span></span></div>
          <div class="stile extra-tile" style="grid-column: 1 / -1"><span>🏅</span><span>Deepest: <b>${meta.abyssBest ? `depth ${meta.abyssBest}/10` : "not yet"}</b><span class="sub">${meta.abyssRuns ?? 0} Abyss run${(meta.abyssRuns ?? 0) === 1 ? "" : "s"}</span></span></div>
        </div>
        ${(() => { const w = currentAbyssMod(); return `<div class="panel abyss-week"><b>${w.icon} This week: ${esc(w.name)}</b><br><span class="sub">${esc(w.text)}. Changes every Monday.</span></div>`; })()}
        ${shards >= ABYSS_SHARD_COST ? "" : `<div class="panel abyss-warn">You need ${ABYSS_SHARD_COST} Ruin Shard${ABYSS_SHARD_COST === 1 ? "" : "s"} to enter (you have ${shards}). Every guardian from the last layer on drops one.</div>`}
        <h2 class="bright">Choose a hero</h2>
        <p class="sub">Vanadium Plates make a hero stronger in the Abyss only. Once given, a plate stays with that hero for good.</p>
        ${originCards(true)}
        ${backupPanel()}`;
    return `${head}${tabs}${infoRow}${cont}${body}<p class="version">${VERSION}</p>`;
  }
  void head;
  return tavernScreen(infoRow, cont);
  return `${head}${tabs}${infoRow}
  ${cont}
  <div class="campaign-hero">
    <div class="ch-text"><b>🏰 The Campaign</b><span>${FLOORS} floors, ${FLOORS} bosses. The Hollow King waits at the bottom — and beyond him, deeper still.</span></div>
    <button class="story-btn small" data-story="campaign">📖 Story</button>
  </div>
  <h2 class="bright">Choose an origin</h2>
  <p class="sub">You are what you wear and what you find. Your weapon is your die; gear, relics and talents bend it.</p>
  ${originCards(false)}
  <p class="version">${VERSION}</p>`;
}

/** The Tavern: where your heroes sit after you press Play. Pick one at its table, then walk out to the Camp.
 *  Locked heroes sit in the shadows, with how to bring them in. */
function tavernScreen(infoRow: string, cont: string) {
  const seat = (o: OriginId) => {
    const og = ORIGINS[o];
    const open = classOpen(meta, o);
    const lv = masteryLevel(meta.mastery?.[o] ?? 0);
    const won = meta.layersBeaten?.[o] ?? 0;
    const sk = CLASS_SPRITE[o];
    const fig = sk && hasSprite(sk) ? spriteHtml(sk, 6, "tav-spr") : `<span class="tav-emoji">${ORIGIN_ICON[o]}</span>`;
    return `<button class="tav-seat ${open ? "" : "locked"}" ${open ? `data-origin="${o}"` : "disabled"} aria-label="${esc(og.name)}">
      <span class="tav-fig">${fig}</span>${open ? "" : `<span class="tav-lock">🔒</span>`}
      <span class="tav-table"></span>
      <b class="tav-name">${open ? esc(og.name) : "???"}</b>
      <span class="tav-sub">${open ? `${lv >= 2 ? `${"★".repeat(Math.min(lv, 6))} · ` : ""}${won ? `${won} layer${won === 1 ? "" : "s"} beaten` : esc(og.blurb)}` : esc(CLASS_UNLOCK[o]?.text ?? "")}</span>
    </button>`;
  };
  const order: OriginId[] = ["warrior", "mage", "cleric", "rogue"];
  return `<div class="tavern">
    <div class="tav-top"><button class="small" data-home aria-label="Back to title">←</button><span class="grow"></span><button class="small" data-mute>${isMuted() ? "🔇" : "🔊"}</button></div>
    <div class="mer-sign tav-sign"><i class="chain l"></i><i class="chain r"></i><div class="plank">The Tavern</div></div>
    ${infoRow}${cont}
    <div class="tav-room">
      <div class="tav-bar"><span class="tav-keep">${hasSprite("dwarf_m") ? spriteHtml("dwarf_m", 4) : "🍺"}</span><span class="tav-bottles">🍾 🍷 🍺</span></div>
      <p class="tav-say">“Pull up a chair. Who's going down tonight?”</p>
      <div class="tav-seats">${order.map(seat).join("")}</div>
    </div>
    <p class="version">${VERSION}</p>
  </div>`;
}

function heatPanel() {
  if (!meta.wins) return `<div class="panel heat-panel locked"><b>🔥 Heat</b> <span class="sub">— beat the dungeon's last layer once to unlock harder runs for more Renown.</span></div>`;
  const h = meta.heat ?? 0;
  return `<div class="panel heat-panel">
    <div class="row"><b class="grow">🔥 Heat ${h ? h : "off"}</b><span class="sub">${h ? `+${Math.round(HEAT_RENOWN * h * 100)}% Renown · better loot` : "Harder runs, more Renown, better loot"}</span></div>
    <div class="heat-btns">${Array.from({ length: HEAT_MAX + 1 }, (_, i) => `<button class="small ${h === i ? "primary" : ""}" data-heat="${i}">${i === 0 ? "Off" : `🔥${i}`}</button>`).join("")}</div>
    ${h ? `<ul class="heat-list">${HEAT_LEVELS.filter(l => l.level <= h).map(l => `<li><b>${esc(l.name)}:</b> ${esc(l.text)}</li>`).join("")}</ul>` : ""}
    <p class="sub">🔥 <b>Heatforged gear</b> only drops at Heat 1 or more${h >= 5 ? "" : h >= 3 ? ". Its finest pieces need Heat 5" : ". Stronger pieces need Heat 3 and 5"}.</p>
  </div>`;
}


/** Challenges: the Daily Dungeon, your Nemesis, Heat and this week's Abyss twist. */
function challengesPopup() {
  const today = utcDay();
  const d = dailyFor(today);
  const dailyDone = meta.daily?.day === today ? meta.daily : undefined;
  const w = currentAbyssMod();
  return `<div class="overlay popup-wrap"><div class="popup ch-pop">
    <button class="small closex closebtn" data-closechallenges aria-label="Close">✕</button>
    <h1 class="center bigname">⚔️ Challenges</h1>
  <div class="mini-rows">
    <div class="mini-row daily-row"><span class="mr-ic">📅</span><span class="grow"><b>Daily Dungeon</b><span class="sub">${dailyDone ? `${dailyDone.done ? `Done today: floor ${dailyDone.floor}${dailyDone.won ? " · won" : ""}` : "Today's attempt has begun"}` : `Everyone's run today, as the ${ORIGIN_ICON[d.origin]} ${ORIGINS[d.origin].name}. One try.`}</span></span>
      ${dailyDone ? `<span class="sub mr-side">${(() => { const ms = Date.parse(`${today}T00:00:00Z`) + 864e5 - Date.now(); return `${Math.floor(ms / 3600e3)}h ${Math.floor((ms % 3600e3) / 60e3)}m`; })()}</span>` : `<button class="small primary daily-go" data-daily>${dailyArmed ? "Replace save?" : "Play"}</button>`}</div>
    ${meta.nemesis ? `<div class="mini-row nemesis-row"><span class="mr-ic">😈</span><span class="grow"><b>Your Nemesis: ${esc(meta.nemesis.name)}</b><span class="sub">${meta.nemesis.level > 1 ? `Beaten you ${meta.nemesis.level}×. ` : ""}Waits in your next Campaign run. Bounty on its head.</span></span></div>` : ""}
    <div class="mini-row heat-row"><span class="mr-ic">🔥</span><span class="grow"><b>Heat ${meta.wins ? (meta.heat ? meta.heat : "off") : "locked"}</b><span class="sub">${meta.wins ? "Set it when you pick your class." : "Win the Campaign once to unlock harder, richer runs."}</span></span></div>
  </div>
    ${abyssUnlocked(meta) ? `<div class="mini-row week-row"><span class="mr-ic">${w.icon}</span><span class="grow"><b>Abyss this week: ${esc(w.name)}</b><span class="sub">${esc(w.text)}.</span></span></div>`
      : `<div class="mini-row week-row locked"><span class="mr-ic">🔒</span><span class="grow"><b>Abyss weekly twist</b><span class="sub">Locked: beat the dungeon's last layer to open the Abyss.</span></span></div>`}
  </div></div>`;
}

/** Info: Renown and unlocks, the Codex and How to play. */
function infoPopup() {
  const locked = lockedIds(meta);
  const next = UNLOCK_TIERS.find(t => meta.renown < t.at);
  return `<div class="overlay popup-wrap"><div class="popup info-pop">
    <button class="small closex closebtn" data-closeinfo aria-label="Close">✕</button>
    <h1 class="center bigname">ℹ️ Info</h1>
    <div class="panel"><div class="row"><span>🏅 Renown <b>${meta.renown}</b></span><span class="sub">${meta.runs} runs · ${meta.wins} wins · best floor ${meta.bestFloor}</span></div>
      ${next ? `<p class="sub">Next unlock at ${next.at} Renown: <b>${esc(next.name)}</b> (${locked.size} items still locked)</p>` : `<p class="sub">Everything is unlocked.</p>`}</div>
    <div class="menu-btns two" style="margin-top:12px"><button data-codex>📖 Codex</button><button data-help>❓ How to play</button></div>
    <div class="menu-btns one" style="margin-top:10px"><button data-changes>📰 Changes</button></div>
    <div class="menu-btns two" style="margin-top:10px"><button data-history>📜 Run history${meta.history?.length ? ` (${meta.history.length})` : ""}</button><button data-achievements>🏆 Achievements (${meta.achievements?.length ?? 0}/${ACHIEVEMENTS.length})</button></div>
  </div></div>`;
}

/** Achievements: what you've earned, what's left, and the title you show on the leaderboards. */
function achievementsPopup() {
  const got = new Set(meta.achievements ?? []);
  let lastGroup: string | undefined = "";
  const rows = ACHIEVEMENTS.filter(a => (achTab === "earned") === got.has(a.id)).sort((x, y) => (x.group ? 1 : 0) - (y.group ? 1 : 0)).map(a => `${a.group !== lastGroup ? `<h3 class="ach-group">${esc((lastGroup = a.group) ?? "Feats")}</h3>` : ""}<div class="ach ${got.has(a.id) ? "got" : ""}">
    <div class="row"><b class="grow">${got.has(a.id) ? "🏆" : "🔒"} ${esc(a.name)}</b><span class="sub">+${a.renown} Renown</span></div>
    <p class="sub">${esc(a.text)}</p>
    ${a.title ? `<div class="row">${got.has(a.id) ? `<button class="small ${meta.title === a.title ? "primary" : ""}" data-title="${esc(a.title)}">${meta.title === a.title ? "✓ " : ""}Title: “${esc(a.title)}”</button>` : `<span class="sub">Title: “${esc(a.title)}”</span>`}</div>` : ""}
  </div>`).join("");
  return `<div class="overlay"><div class="inner ach-pop">
    <div class="row"><h1 class="grow">🏆 Achievements</h1><button class="closebtn" data-closeach>✕ Close</button></div>
    <p class="sub">${got.size}/${ACHIEVEMENTS.length} earned. ${meta.title ? `Your title on the leaderboards: <b>“${esc(meta.title)}”</b> <button class="small" data-title="">Remove</button>` : "Pick a title you've earned to show next to your name on the leaderboards."}</p>
    <div class="row subtabs"><button class="small ${achTab === "todo" ? "primary" : ""}" data-achtab="todo">🔒 To earn (${ACHIEVEMENTS.length - got.size})</button><button class="small ${achTab === "earned" ? "primary" : ""}" data-achtab="earned">🏆 Earned (${got.size})</button></div>
    ${rows || `<p class="sub center">${achTab === "earned" ? "Nothing yet. Every run is a chance." : "You've earned them all!"}</p>`}
  </div></div>`;
}

/** The last few finished runs: who, how far, what killed them, and what they wore. */
function historyPopup() {
  const list = meta.history ?? [];
  const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };
  const where = (e: NonNullable<Meta["history"]>[number]) => e.mode === "abyss" ? `Abyss depth ${Math.min(e.floor, ABYSS_FLOORS)}` : `Floor ${e.floor}`;
  const body = list.length ? list.map(e => `<div class="hist ${e.won ? "won" : "lost"} ${e.mode === "abyss" ? "abyss" : ""}">
      <div class="row"><b class="grow">${ORIGIN_ICON[e.origin as OriginId] ?? ""} ${esc(ORIGINS[e.origin as OriginId]?.name ?? e.origin)} · ${where(e)}</b><span class="sub">${ago(e.at)}</span></div>
      <div class="hist-tags">${e.daily ? `<span class="chip">📅 Daily ${esc(e.daily)}</span>` : ""}${e.mode === "abyss" ? `<span class="chip">🕳️ Abyss${e.plates ? ` · ⬛${e.plates}` : ""}</span>` : ""}${e.mode === "endless" ? `<span class="chip">Deeper Still</span>` : ""}
        <span class="chip">Lv ${e.level}</span><span class="chip">${e.kills} kills</span><span class="chip">${e.bosses} bosses</span></div>
      <p class="hist-end">${e.won ? "🏆 Won" : e.abandoned ? "🏳️ Gave up" : `☠️ ${e.killer ? `Killed by <b>${esc(e.killer)}</b>` : "Fell"}`}</p>
      <div class="hist-build">${e.build.map(b => `<span class="hb r-${b.rarity}"><span class="nm">${esc(b.name)}</span> <span class="sub">lv ${b.level}</span></span>`).join("")}</div>
    </div>`).join("") : `<p class="sub center">No finished runs yet. Your last ${HISTORY_SIZE} will show up here.</p>`;
  return `<div class="overlay"><div class="inner history-pop">
    <div class="row"><h1 class="grow">📜 Run history</h1><button class="closebtn" data-closehistory>✕ Close</button></div>
    ${body}
  </div></div>`;
}

/** All progress is backed up to the server; the backup code restores it on another device. */
function backupPanel() {
  if (!leaderboardOn()) return "";
  return `<div class="panel backup-panel"><p><b>🔐 Backup</b> <span class="sub">All your progress is backed up online: Renown, mastery, achievements, Shards, Plates, settings and the run you're on. Keep this code to restore it on another device or after clearing your browser:</span></p>
    <p class="backup-code">${esc(backupCode())}</p>
    ${restoreOpen ? `<div class="row"><input id="restore-code" class="grow" placeholder="Paste a backup code" maxlength="24" autocomplete="off"><button class="small primary" data-restore>Restore</button><button class="small" data-restoreclose>Cancel</button></div>
      <p class="sub">Restoring replaces all of this device's progress (and leaderboard identity) with the code's.</p>` : `<button class="small" data-restoreopen>Restore from a code</button>`}
    ${restoreMsg ? `<p class="sub">${esc(restoreMsg)}</p>` : ""}</div>`;
}

function codexScreen() {
  const found = new Set(meta.found);
  const locked = lockedIds(meta);
  const section = (title: string, defs: { id: string; name: string; text: string }[]) => {
    const n = defs.filter(d => found.has(d.id)).length;
    return `<h2>${title} · ${n}/${defs.length}</h2><div class="panel">${defs.map(d => found.has(d.id)
      ? `<p><b>${esc(d.name)}</b> — ${esc(fillText(d.text, 1))}</p>`
      : `<p class="sub">${locked.has(d.id) ? "🔒" : "???"}</p>`).join("")}</div>`;
  };
  return `<div class="row"><h1 class="grow">📖 Codex</h1><button data-back>Back</button></div>
    <p class="sub">Everything you've found across runs. Renown unlocks more of the dungeon:</p>
    <div class="panel">${UNLOCK_TIERS.map(t => `<p>${meta.renown >= t.at ? "✅" : "🔒"} <b>${esc(t.name)}</b> — ${t.at} Renown</p>`).join("")}</div>
    ${section("Weapons & gear", GEAR_BASES)}
    ${section("Legendaries", LEGENDARIES.map(l => ({ id: l.id, name: l.name, text: l.legendary!.reveal })))}
    ${section("Crimson", CRIMSON)}
    ${section("Keepsakes", KEEPSAKES)}
    ${section("Epic powers", EPIC_POWERS)}
    ${section("Bonuses", BONUSES)}
    ${section("Relics", RELICS)}
    ${section("Fusions", FUSION_RELICS.map(f => ({ ...f, text: `${f.text}. Recipe: ${FUSION_RECIPES.filter(r => r.out === f.id).map(r => `${getItem(r.a).name} + ${getItem(r.b).name}`).join("")}` })))}
    ${section("Talents", TALENTS)}
    ${section("Curses", CURSES)}`;
}

// ---------- Scenes ----------

/** Map rooms that can be auto-fought (if the fight inside turns out to be one you can't lose). */
const AUTO_ROOMS: string[] = ["fight", "elite", "champion"];

/** The floor's name and Fortune: the last row of the top bar. */
function floorHeader(r: Run) {
  const pips = fortunePips(depth(r));
  const abyss = r.mode === "abyss";
  return `<div class="floorname ${abyss ? "abyss-name" : ""}">${abyss ? `🕳️ The Abyss · Depth ${r.floor}` : `Floor ${r.floor} · ${(() => { const th = themeOf(r); return th ? `${th.icon} ${esc(th.name)}` : esc(floorName(r.floor)); })()}`}</div><div class="fortune" title="The deeper you delve, the better the odds of Rare, Epic and Legendary finds."><b>Fortune</b><span class="stars">${"✦".repeat(pips)}<span class="dim">${"✦".repeat(Math.max(0, 5 - pips))}</span></span><span class="hint">Deeper = better loot</span></div>`;
}
/** What a room shows on the map: its icon, name and line. */
function roomInfo(r: Run, c: RoomType) {
  const g = c === "crossroads" ? CROSSROADS_GUISES[r.crossroadsGuise ?? 0] : null;
  const info = g ? { icon: g.icon, name: g.title, text: g.room } : c === "nemesis" && r.nemesis ? { ...ROOM_INFO.nemesis, text: `${r.nemesis.name}. It killed you last time, and it remembers. A bounty for its head.` } : (r.mode === "abyss" && ABYSS_ROOM_INFO[c]) || ROOM_INFO[c];
  return c === "boss" && r.floor >= FLOORS && r.mode !== "abyss" ? { ...info, icon: "💀" } : info;
}
const roomClass = (c: string) => (c.startsWith("crimson") || c === "sanctum" ? "crimson-room" : c === "goblin" ? "goblin-room" : c === "bounty" ? "bounty-room" : c === "nemesis" ? "nemesis-room" : "");
const bossTitle = (r: Run) => (r.mode === "abyss" ? "The Uber boss awaits" : r.floor === WALL_FLOOR ? "The Horror" : r.floor === DEATH_FLOOR ? "DEATH" : r.floor === END_FLOOR ? "The End" : "The boss awaits");

function mapScene(r: Run) {
  if (r.gridMode && r.grid) return "";
  return `
  <h2>${r.step >= STEPS_PER_FLOOR ? bossTitle(r) : "Choose your path"}</h2>
  <div class="cards">${r.choices.map(c => `${AUTO_ROOMS.includes(c) && r.floor >= AUTO_BATTLE_FLOOR && quickOn ? `<div class="room-wrap">` : ""}<button class="room ${roomClass(c)}" data-room="${c}">${(() => { const info = roomInfo(r, c);
    return `<span class="ic">${info.icon}</span><b>${esc(info.name)}</b><span class="sub">${esc(info.text)}</span>`; })()}</button>${AUTO_ROOMS.includes(c) && r.floor >= AUTO_BATTLE_FLOOR && quickOn ? `<div class="room-acts"><button class="fight-room" data-room="${c}" title="Go in and fight it yourself"><span class="ic">⚔️</span>Fight</button><button class="auto-room" data-autoroom="${c}" title="Go in and let the fight play itself out — only if it's one you can't lose"><span class="ic">⚡</span>Quick<br> Battle</button></div></div>` : ""}`).join("")}</div>`;
}

/** The HP, mana and XP bars, boxed (top left on the map; between the potions and the bag in a fight). */
function czBars(r: Run) {
  const h = r.hero, f = h.f;
  const inFight = r.scene.t === "combat";
  const hp = inFight ? dispHp.player ?? f.hp : f.hp;
  const maxMana = f.maxMana || MANA_MAX;
  const mana = inFight ? f.mana ?? 0 : maxMana;
  const need = xpToLevel(h.level);
  return `<div class="cz-bars">
    <div class="cz-bar hp"><i style="width:${Math.max(0, Math.min(100, (hp / f.maxHp) * 100))}%"></i><span>${Math.max(0, hp)} / ${f.maxHp}</span></div>
    <div class="cz-bar mana"><i style="width:${(mana / maxMana) * 100}%"></i><span>${mana}</span></div>
    <div class="cz-bar xp"><i style="width:${(h.xp / need) * 100}%"></i><span>Lv ${h.level}</span></div>
  </div>`;
}

/** The potion button and its drawer (tap to slide your potions out; tap one to drink it). */
function potionCircle(r: Run) {
  const h = r.hero, f = h.f;
  const inFight = r.scene.t === "combat" && !r.scene.battle.over;
  const drunk = f.flags["potionsDrunk"] ?? 0;
  const canHeal = h.potions > 0 && f.hp > 0 && f.hp < f.maxHp && !busy && (!inFight || drunk < potionsPerFight(h));
  const tonics = Object.entries(h.tonics ?? {});
  const fightOnly = (what: string) => `data-potnote="${esc(what)} only work in a fight."`;
  return `<button class="cz-circle" data-potdrawer aria-label="Potions">🧪${h.potions ? `<b class="cz-count">${h.potions}</b>` : ""}</button>
    <div class="cz-drawer ${potDrawer ? "open" : ""}">
      <button class="cz-pot" data-potion ${canHeal ? "" : "disabled"} title="Healing Potion">🧪<b>${h.potions}</b></button>
      ${h.manaPotions ? `<button class="cz-pot ${inFight ? "" : "off"}" ${inFight ? `data-mana ${(f.mana ?? 0) >= (f.maxMana ?? 0) || busy ? "disabled" : ""}` : fightOnly("Mana Potions")} title="Mana Potion">🔷<b>${h.manaPotions}</b></button>` : ""}
      ${tonics.map(([id, n]) => `<button class="cz-pot ${inFight ? "" : "off"}" ${inFight ? `data-tonic="${id}" ${busy ? "disabled" : ""}` : fightOnly("Tonics")} title="${esc(TONICS[id].name)}: ${esc(TONICS[id].text)}">${TONICS[id].icon}<b>${n}</b></button>`).join("")}
    </div>`;
}
const bagCircle = (r: Run) => `<button class="cz-circle big" data-bag aria-label="Inventory">${newTabs(r).size ? `<b class="newdot"></b>` : ""}🎒</button>`;

/** A foe's picture in a fight: by what it is, then by its family. */
function foeIcon(f: Fighter): string {
  const n = f.name.toLowerCase();
  const by: [RegExp, string][] = [[/dragon|wyrm|drake/, "🐉"], [/rat\b|rats|vermin/, "🐀"], [/spider|arachn/, "🕷️"], [/bat\b|bats/, "🦇"], [/wolf|hound|jackal/, "🐺"], [/bear/, "🐻"], [/snake|serpent|viper|naga/, "🐍"],
    [/slime|ooze|jelly/, "🟢"], [/ghost|wraith|spectre|specter|phantom|shade/, "👻"], [/zombie|ghoul|corpse/, "🧟"], [/skeleton|bone|lich/, "💀"], [/golem|statue|gargoyle/, "🗿"],
    [/goblin/, "👺"], [/mimic/, "📦"], [/thief|rogue|bandit/, "🦹"], [/vampire|blood/, "🧛"], [/mushroom|fung|spore/, "🍄"], [/crab|crustacean/, "🦀"], [/boar|pig/, "🐗"], [/scorpion/, "🦂"], [/worm|grub/, "🪱"], [/eye\b|beholder/, "👁️"], [/fire|flame|ember/, "🔥"], [/ice|frost/, "❄️"]];
  for (const [re, ic] of by) if (re.test(n)) return ic;
  if (f.name === "DEATH") return "💀";
  if (f.doppel && run) return ORIGIN_ICON[run.hero.origin];
  const fam: Record<string, string> = { Beast: "🐾", Undead: "💀", Cultist: "🧙", Construct: "🤖" };
  return (f.family && fam[f.family]) || (f.boss ? "👹" : "👾");
}

/** The die in the middle of a Crawl fight: the last roll (yours or the foe's), or two when one side rolled twice running. */
function cbDice(foe: string) {
  if (!shownDice.length) return `<div class="diebox"><div class="who">&nbsp;</div><div class="die empty">·</div><div class="facename">&nbsp;</div></div>`;
  return shownDice.map(({ who, d }) => `<div class="diebox"><div class="who">${who === "player" ? "You" : esc(foe)}</div><div class="die ${who} ${d.kind} ${d.rolling ? "rolling" : ""} ${d.tint ? "tinted" : ""}"${d.tint ? ` style="background:${d.tint};color:${dieInk(d.tint)};--tint:${d.tint}"` : ""}>${d.face}</div><div class="facename">${d.rolling ? "&nbsp;" : esc(d.name)}</div></div>`).join("");
}

/** A Pokémon-style HP bar: green, then yellow below half, red below a fifth. */
const cbHp = (hp: number, max: number) => { const p = Math.max(0, Math.min(1, hp / max)); return `<div class="cb-hp ${p <= 0.2 ? "low" : p <= 0.5 ? "mid" : ""}"><em>HP</em><span><i style="width:${p * 100}%"></i></span></div>`; };

/** The fight's backdrop: a dungeon corridor in perspective (back wall, side walls, a flagstone floor running away), torchlit. */
const CORRIDOR = `<svg class="cb-scene" viewBox="0 0 400 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="400" height="300" fill="#0c0805"/><polygon points="0,0 400,0 280,48 120,48" fill="#0f0a06"/><polygon points="0,0 120,48 120,150 0,300" fill="#24180f"/><polygon points="400,0 280,48 280,150 400,300" fill="#1f150d"/><line x1="0" y1="33.3" x2="120" y2="59.3" stroke="#120b06" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="400" y1="33.3" x2="280" y2="59.3" stroke="#110a05" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="0" y1="66.7" x2="120" y2="70.7" stroke="#120b06" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="400" y1="66.7" x2="280" y2="70.7" stroke="#110a05" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="0" y1="100.0" x2="120" y2="82.0" stroke="#120b06" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="400" y1="100.0" x2="280" y2="82.0" stroke="#110a05" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="0" y1="133.3" x2="120" y2="93.3" stroke="#120b06" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="400" y1="133.3" x2="280" y2="93.3" stroke="#110a05" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="0" y1="166.7" x2="120" y2="104.7" stroke="#120b06" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="400" y1="166.7" x2="280" y2="104.7" stroke="#110a05" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="0" y1="200.0" x2="120" y2="116.0" stroke="#120b06" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="400" y1="200.0" x2="280" y2="116.0" stroke="#110a05" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="0" y1="233.3" x2="120" y2="127.3" stroke="#120b06" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="400" y1="233.3" x2="280" y2="127.3" stroke="#110a05" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="0" y1="266.7" x2="120" y2="138.7" stroke="#120b06" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="400" y1="266.7" x2="280" y2="138.7" stroke="#110a05" stroke-width="1.6" vector-effect="non-scaling-stroke"/><rect x="120" y="48" width="160" height="102" fill="#2c1f14"/><line x1="120" y1="48.0" x2="280" y2="48.0" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="133.0" y1="48.0" x2="133.0" y2="62.6" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="159.0" y1="48.0" x2="159.0" y2="62.6" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="185.0" y1="48.0" x2="185.0" y2="62.6" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="211.0" y1="48.0" x2="211.0" y2="62.6" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="237.0" y1="48.0" x2="237.0" y2="62.6" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="263.0" y1="48.0" x2="263.0" y2="62.6" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="120" y1="62.6" x2="280" y2="62.6" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="146.0" y1="62.6" x2="146.0" y2="77.1" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="172.0" y1="62.6" x2="172.0" y2="77.1" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="198.0" y1="62.6" x2="198.0" y2="77.1" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="224.0" y1="62.6" x2="224.0" y2="77.1" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="250.0" y1="62.6" x2="250.0" y2="77.1" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="276.0" y1="62.6" x2="276.0" y2="77.1" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="120" y1="77.1" x2="280" y2="77.1" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="133.0" y1="77.1" x2="133.0" y2="91.7" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="159.0" y1="77.1" x2="159.0" y2="91.7" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="185.0" y1="77.1" x2="185.0" y2="91.7" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="211.0" y1="77.1" x2="211.0" y2="91.7" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="237.0" y1="77.1" x2="237.0" y2="91.7" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="263.0" y1="77.1" x2="263.0" y2="91.7" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="120" y1="91.7" x2="280" y2="91.7" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="146.0" y1="91.7" x2="146.0" y2="106.3" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="172.0" y1="91.7" x2="172.0" y2="106.3" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="198.0" y1="91.7" x2="198.0" y2="106.3" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="224.0" y1="91.7" x2="224.0" y2="106.3" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="250.0" y1="91.7" x2="250.0" y2="106.3" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="276.0" y1="91.7" x2="276.0" y2="106.3" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="120" y1="106.3" x2="280" y2="106.3" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="133.0" y1="106.3" x2="133.0" y2="120.9" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="159.0" y1="106.3" x2="159.0" y2="120.9" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="185.0" y1="106.3" x2="185.0" y2="120.9" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="211.0" y1="106.3" x2="211.0" y2="120.9" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="237.0" y1="106.3" x2="237.0" y2="120.9" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="263.0" y1="106.3" x2="263.0" y2="120.9" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="120" y1="120.9" x2="280" y2="120.9" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="146.0" y1="120.9" x2="146.0" y2="135.4" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="172.0" y1="120.9" x2="172.0" y2="135.4" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="198.0" y1="120.9" x2="198.0" y2="135.4" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="224.0" y1="120.9" x2="224.0" y2="135.4" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="250.0" y1="120.9" x2="250.0" y2="135.4" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="276.0" y1="120.9" x2="276.0" y2="135.4" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="120" y1="135.4" x2="280" y2="135.4" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="133.0" y1="135.4" x2="133.0" y2="150.0" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="159.0" y1="135.4" x2="159.0" y2="150.0" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="185.0" y1="135.4" x2="185.0" y2="150.0" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="211.0" y1="135.4" x2="211.0" y2="150.0" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="237.0" y1="135.4" x2="237.0" y2="150.0" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="263.0" y1="135.4" x2="263.0" y2="150.0" stroke="#140c06" stroke-width="1.4" vector-effect="non-scaling-stroke"/><path d="M180,150 L180,112 Q200,96 220,112 L220,150 Z" fill="#000"/><polygon points="0,300 120,150 280,150 400,300" fill="#3b2a1a"/><line x1="-400" y1="300" x2="50.0" y2="150" stroke="#1d130b" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="-320" y1="300" x2="70.0" y2="150" stroke="#1d130b" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="-240" y1="300" x2="90.0" y2="150" stroke="#1d130b" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="-160" y1="300" x2="110.0" y2="150" stroke="#1d130b" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="-80" y1="300" x2="130.0" y2="150" stroke="#1d130b" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="0" y1="300" x2="150.0" y2="150" stroke="#1d130b" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="80" y1="300" x2="170.0" y2="150" stroke="#1d130b" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="160" y1="300" x2="190.0" y2="150" stroke="#1d130b" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="240" y1="300" x2="210.0" y2="150" stroke="#1d130b" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="320" y1="300" x2="230.0" y2="150" stroke="#1d130b" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="400" y1="300" x2="250.0" y2="150" stroke="#1d130b" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="480" y1="300" x2="270.0" y2="150" stroke="#1d130b" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="560" y1="300" x2="290.0" y2="150" stroke="#1d130b" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="640" y1="300" x2="310.0" y2="150" stroke="#1d130b" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="720" y1="300" x2="330.0" y2="150" stroke="#1d130b" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="800" y1="300" x2="350.0" y2="150" stroke="#1d130b" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="0" y1="153.6" x2="400" y2="153.6" stroke="#1d130b" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="0" y1="162.4" x2="400" y2="162.4" stroke="#1d130b" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="0" y1="175.7" x2="400" y2="175.7" stroke="#1d130b" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="0" y1="193.1" x2="400" y2="193.1" stroke="#1d130b" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="0" y1="214.4" x2="400" y2="214.4" stroke="#1d130b" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="0" y1="239.4" x2="400" y2="239.4" stroke="#1d130b" stroke-width="1.4" vector-effect="non-scaling-stroke"/><line x1="0" y1="268.0" x2="400" y2="268.0" stroke="#1d130b" stroke-width="1.4" vector-effect="non-scaling-stroke"/><defs><radialGradient id="cgl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff9a3a" stop-opacity=".30"/><stop offset="1" stop-color="#ff9a3a" stop-opacity="0"/></radialGradient><radialGradient id="cvg" cx="50%" cy="55%" r="75%"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient><linearGradient id="cfl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".5" stop-color="#000" stop-opacity="0"/></linearGradient></defs><rect x="0" y="150" width="400" height="150" fill="url(#cfl)"/><ellipse cx="60" cy="95" rx="95" ry="90" fill="url(#cgl)"/><ellipse cx="340" cy="95" rx="95" ry="90" fill="url(#cgl)"/><rect width="400" height="300" fill="url(#cvg)"/></svg>`;
const TORCHES = `<div class="cb-torch l"><i class="glow"></i><i class="flame"></i><i class="flame f2"></i><i class="sconce"></i></div><div class="cb-torch r"><i class="glow"></i><i class="flame"></i><i class="flame f2"></i><i class="sconce"></i></div>`;

/** The Crawl's fight: a framed, Pokémon-style screen. Foe top right with its box to the left; you bottom left with yours to the right; your moves below. */
function crawlCombat(r: Run, msg: string[], bad: boolean) {
  if (r.scene.t !== "combat") return "";
  const b = r.scene.battle, e = b.enemy, p = b.player;
  const ehp = dispHp.enemy ?? e.hp, php = dispHp.player ?? p.hp;
  const intent = e.moves?.length ? e.moves[e.intent ?? 0] : null;
  const rnd = currentBattle?.round ?? -1;
  const stance = p.flags["guarding"] ? "guard" : p.flags["counter"] === rnd && rnd >= 0 ? "counter" : "";
  const rank = e.crimson ? "Crimson" : e.boss ? "Boss" : e.champion ? "Champion" : e.elite ? "Elite" : "";
  const acts = availableActions(r);
  const traits = guardChips(e, "enemy") + foeTraits(e) + statusChips(e);
  return `<div class="cb-screen"><div class="cb-inner">
    <div class="cb-stage">${CORRIDOR}${TORCHES}
    <div class="cb-row cb-foe-row">
      <div class="cb-box foe ${e.crimson ? "crimson" : ""}" id="cbx-enemy">
        <div class="cb-name"><b>${esc(e.name)}</b>${rank ? `<span class="cb-rank">${rank}</span>` : ""}</div>
        ${e.title ? `<div class="cb-title">${esc(e.title)}</div>` : ""}
        ${cbHp(ehp, e.maxHp)}
        <div class="cb-nums">${big(Math.max(0, ehp))} / ${big(e.maxHp)} · Power ${e.items["m_death"] ? "☠️" : big(e.damage)} · Armor ${armorOf(e)}</div>
        <div class="cb-chips">${traits}</div>
      </div>
      <div class="cb-sprite foe" id="fp-enemy">${(() => { const k = foeSprite(e.name, e.family, !!e.boss); return k && hasSprite(k) ? spriteHtml(k, e.boss || e.champion ? 5 : 4, "foe-spr") : `<span>${foeIcon(e)}</span>`; })()}</div>
    </div>
    ${intent ? `<div class="cb-intent">Next: ${intent.icon} <b>${esc(intent.name)}</b> — ${esc(intent.text)}</div>` : ""}
    <div class="cb-dice">${cbDice(e.name)}</div>
    <div class="cb-row cb-hero-row">
      <div class="cb-sprite hero ${stance ? `stance-${stance}` : ""}" id="fp-player">${hasSprite(CLASS_SPRITE[r.hero.origin] ?? "") ? spriteHtml(CLASS_SPRITE[r.hero.origin], 5, "hero-spr") : `<span>${ORIGIN_ICON[r.hero.origin]}</span>`}</div>
      <div class="cb-box hero" id="cbx-player">
        <div class="cb-name"><b>${esc(ORIGINS[r.hero.origin].name)}</b><span class="cb-rank">Lv ${r.hero.level}</span></div>
        ${cbHp(php, p.maxHp)}
        <div class="cb-mp"><em>MP</em><span>${Array.from({ length: p.maxMana || MANA_MAX }, (_, i) => `<i class="${i < (p.mana ?? 0) ? "full" : ""}"></i>`).join("")}</span></div>
        <div class="cb-nums">${Math.max(0, php)} / ${p.maxHp} · Damage ${p.damage}${p.offDamage !== undefined ? ` + ${p.offDamage}` : ""} · Armor ${armorOf(p)}</div>
        ${stance === "guard" ? `<div class="cb-stance">🛡️ Guarding</div>` : stance === "counter" ? `<div class="cb-stance">🌀 Countering</div>` : ""}
        <div class="cb-chips">${guardChips(p, "player")}${statusChips(p)}</div>
      </div>
    </div>
    </div>
    ${(p.statuses.stun ?? 0) > 0 ? `<div class="toast err">💫 You're Stunned: your next turn will be skipped.</div>` : ""}
    ${msg.map((m, i) => `<div class="toast ${i === msg.length - 1 && bad ? "err" : ""}">${esc(m)}</div>`).join("")}
    ${acts.some(isThrow) ? `<div class="cb-throws">${acts.filter(isThrow).map(a => `<button class="cb-throw" data-act="${a}" ${busy ? "disabled" : ""} title="${esc(ACTION_INFO[a].tip)}"><span>${THROW_INFO[a].icon}</span><b>${THROW_INFO[a].short}</b><i>×${p.persist[THROW_INFO[a].key] ?? 0}</i></button>`).join("")}</div>` : ""}
    <div class="cb-moves ${busy ? "busy" : ""}">
      ${acts.filter(a => !isThrow(a)).map(a => `<button class="cb-move ${a === "attack" ? "attack" : a === "flee" ? "flee" : a === "guard" ? "guard" : "skill"}" data-act="${a}" ${busy || (isSkill(a) && (p.mana ?? 0) < MANA_COST) ? "disabled" : ""} title="${esc(ACTION_INFO[a].tip)}">${ACTION_INFO[a].label(p)}${isSkill(a) ? ` <span class="mana-cost">🔷${MANA_COST}</span>` : ""}</button>`).join("")}
    </div>
    <div class="cb-bottom"><div class="cb-pots">${potionCircle(r)}</div><div class="cb-mid"><button class="cb-menubtn" data-menu ${busy ? "disabled" : ""} aria-label="Menu">☰</button></div>${bagCircle(r)}</div>
    <details class="cb-log"><summary>Battle log</summary><div class="log">${b.log.slice().reverse().map(l => `<div class="${l.startsWith("—") ? "round" : ""}">${esc(l)}</div>`).join("")}</div></details>
  </div></div>`;
}

/** The Crawl's Merchant: a hanging sign, the full details of whatever you tap on the left, the stock and your gear as rows of names. */
let merPick: { k: "stock"; i: number } | { k: "own"; uid: number } | null = null;
let merInv: "equipped" | "backpack" = "equipped";
let merSeen: unknown = null;
const RARITY_INK: Record<string, string> = { common: "#c9c2b4", uncommon: "#6fd08c", rare: "#6cb4ff", epic: "#c890ff", legendary: "#ffa24a", crimson: "#ff5468", epic_crimson: "#ff5468", legendary_crimson: "#ff5468" };
function stockLabel(r: Run, e: ShopEntry): { name: string; icon: string; text: string; ink: string } {
  if (e.kind === "item" && e.item) return { name: itemName(e.item), icon: "", text: "", ink: RARITY_INK[e.item.rarity] ?? "#e9d6b0" };
  if (e.kind === "potion") return { name: "Healing Potion", icon: "🧪", text: `Heals ${r.gridMode ? CRAWL_POTION_HEAL : 12} HP. Drink it from your potion drawer, in a fight or out of one.`, ink: "#f08a7a" };
  if (e.kind === "mana") return { name: "Mana Potion", icon: "🔷", text: `Drink it in a fight to refill your mana. You can carry ${manaPotionCap(r.hero)}.`, ink: "#7ab8ff" };
  if (e.kind === "scroll") return { name: "Scroll of Revelation", icon: "📜", text: "Reveals a Legendary's hidden power.", ink: "#f0d28a" };
  if (e.kind === "throw" && e.throw) { const t = THROW_INFO[e.throw]; return { name: t.name, icon: t.icon, text: `${t.text}. Use it in a fight; you can carry ${THROW_CAP}.`, ink: "#f0b070" }; }
  const rel = e.relic ? getItem(e.relic) : null;
  return { name: rel?.name ?? "Relic", icon: "💎", text: rel?.text ?? "", ink: "#f0d28a" };
}
function merchantScreen(r: Run, msg: string[], bad: boolean) {
  if (r.scene.t !== "shop") return "";
  const sc = r.scene, h = r.hero;
  if (merSeen !== sc) { merSeen = sc; merPick = null; merInv = "equipped"; sellArmed = null; }
  const own = merInv === "equipped" ? EQUIP_SLOTS.map(k => h.equip[k]).filter((x): x is GearItem => !!x) : h.backpack;
  const detail = (() => {
    if (merPick?.k === "stock") {
      const e = sc.stock[merPick.i];
      if (!e) return "";
      const full = e.kind === "potion" && !e.sold && h.potions >= potionCap(h);
      const btn = `<button class="primary mer-act" data-buy="${merPick.i}" ${e.sold || full || h.f.gold < e.price ? "disabled" : ""}>${e.sold ? "Sold" : full ? "Your potion belt is full" : `Buy · ${e.price} 🪙`}</button>`;
      if (e.kind === "item" && e.item) return itemCard(e.item, btn + (e.sold ? "" : compareBtns(e.item)), !e.sold);
      const l = stockLabel(r, e);
      return `<div class="mer-thing"><div class="mer-big">${l.icon}</div><b style="color:${l.ink}">${esc(l.name)}</b><p>${esc(l.text)}</p>${btn}</div>`;
    }
    if (merPick?.k === "own") {
      const it = findItem(h, merPick.uid)?.item;
      if (!it) return "";
      const worn = !!equippedSlot(r, it);
      const btn = `<button class="mer-act ${worn && sellArmed === it.uid ? "danger" : "primary"}" data-sell="${it.uid}" ${sc.soldItem ? "disabled" : ""}>${sc.soldItem ? "One sale per visit" : worn && sellArmed === it.uid ? "Sell what you're wearing?" : `Sell · ${Math.round(sellPrice(it, h) * goldMult(r))} 🪙`}</button>`;
      return itemCard(it, btn, false, equippedSlot(r, it));
    }
    return `<div class="mer-empty"><span>⚖️</span><p>Tap something for sale, or something of yours, to look at it here.</p><p class="sub">The Merchant buys one thing a visit, for 40% of its price.</p></div>`;
  })();
  const chip = (attrs: string, name: string, ink: string, sub: string, on: boolean, dim = false) => `<button class="mer-chip ${on ? "on" : ""} ${dim ? "dim" : ""}" ${attrs}><b style="color:${ink}">${esc(name)}</b>${sub ? `<span>${sub}</span>` : ""}</button>`;
  const stock = sc.stock.map((e, i) => { const l = stockLabel(r, e); return chip(`data-mpick="s:${i}"`, `${l.icon ? `${l.icon} ` : ""}${l.name}`, l.ink, e.sold ? "Sold" : `${e.price} 🪙`, merPick?.k === "stock" && merPick.i === i, e.sold); }).join("");
  const reroll = r.shopRerolls >= MAX_SHOP_REROLLS ? "" : `<button class="mer-chip reroll" data-reroll ${h.f.gold < shopRerollCost(r) ? "disabled" : ""}><b>↻ New stock</b><span>${shopRerollCost(r)} 🪙</span></button>`;
  const mine = own.length ? own.map(it => chip(`data-mpick="o:${it.uid}"`, itemName(it), RARITY_INK[it.rarity] ?? "#e9d6b0", equippedSlot(r, it), merPick?.k === "own" && merPick.uid === it.uid)).join("") : `<span class="mer-none">Nothing here.</span>`;
  return `<div class="cb-screen mer-screen"><div class="mer-inner">
    <div class="mer-sign" aria-label="Merchant"><i class="chain l"></i><i class="chain r"></i><div class="plank">Merchant</div></div>
    <div class="mer-gold">🪙 <b>${h.f.gold}</b></div>
    ${msg.length ? `<div class="mer-toasts">${msg.map((m, i) => `<div class="toast ${i === msg.length - 1 && bad ? "err" : ""}">${esc(m)}</div>`).join("")}</div>` : ""}
    <div class="mer-main">
      <div class="mer-panel mer-detail">${detail}</div>
      <div class="mer-panel mer-stock"><div class="mer-label">For sale</div><div class="mer-list">${stock}${reroll}</div></div>
    </div>
    <div class="mer-panel mer-inv">
      <div class="mer-tabs"><button class="${merInv === "equipped" ? "on" : ""}" data-minv="equipped">🛡️ Equipped</button><button class="${merInv === "backpack" ? "on" : ""}" data-minv="backpack">🎒 Backpack ${h.backpack.length}/${packSize(h)}</button></div>
      <div class="mer-list">${mine}</div>
    </div>
    <button class="mer-leave" data-leave>Leave</button>
  </div></div>`;
}

/** The Camp's tabs, as stone archways in a row (it scrolls sideways on a phone). */
const CAMP_TABS: { id: CampTab; icon: string; name: string }[] = [
  { id: "expedition", icon: "🗺️", name: "Enter Dungeon" }, { id: "quests", icon: "📋", name: "Quest Board" }, { id: "hall", icon: "🏛️", name: "Hall" },
  { id: "skills", icon: "✨", name: "Skills" }, { id: "garden", icon: "🌱", name: "Garden" }, { id: "brewery", icon: "⚗️", name: "Brewery" },
  { id: "knowledge", icon: "📚", name: "Knowledge" }, { id: "tree", icon: "🌳", name: "Passive Tree" }, { id: "weapons", icon: "⚔️", name: "Weapon Mastery" },
  { id: "pond", icon: "🎣", name: "Still Pool" }, { id: "trophies", icon: "🏆", name: "Trophy Room" }, { id: "bestiary", icon: "📖", name: "Bestiary" },
  { id: "abyss", icon: "🕳️", name: "The Abyss" }
];

/** One Camp option's content (it sits inside that option's archway). */
function campBody(o: OriginId, tab: CampTab): string {
  const og = ORIGINS[o];
  if (tab === "expedition") {
    return `<p>The dungeon waits. Each layer is a Dungeon Entrance, five floors to explore and a sixth where its guardian waits, with a treasure room beyond. Find the trapdoor on every floor: there's no climbing back up.</p>
      <p class="sub">You go in with ${og.hp} HP, your class's kit, 20 Gold and nothing to drink.</p>
      ${campQuest !== null && campOffers?.[campQuest] ? `<p class="camp-quest-note">📋 Contract: ${esc(bountyText(campOffers[campQuest], o))}</p>` : `<p class="sub">No contract taken. The Quest Board has work, if you want it.</p>`}
      ${liveSave() ? `<p class="sub warn">Setting out replaces your saved run.</p>` : ""}
      ${(() => {
        const held = TOTEMS.filter(t => (meta.totems?.[t.id] ?? 0) > 0);
        if (!held.length) return "";
        return `<div class="totem-row"><p class="sub">Set a totem at the door (it's used up as you go in):</p><div class="mer-list">${held.map(t => `<button class="mer-chip ${meta.totemSet === t.id ? "on" : ""}" data-totem="${t.id}" title="${esc(t.text)}"><b>${t.icon} ${esc(t.name)}</b><span>×${meta.totems![t.id]} · ${esc(t.text)}</span></button>`).join("")}</div></div>`;
      })()}
      <button class="primary camp-go" data-descend>⬇️ Descend</button>
      ${masteryPanel(o)}${gemPanel(o)}${heatPanel()}`;
  }
  if (tab === "quests") {
    if (!campOffers) { const h = newHero(o); campOffers = makeOffers(h, makeRng(Date.now() & 0x7fffffff), 1, heroTags(h)); }
    const offers = campOffers;
    return `<p>Notices nailed to a post. Take one contract into the dungeon; finish it there for its reward.</p>
      <div class="camp-quests">${offers.map((q, i) => `<button class="camp-quest ${campQuest === i ? "on" : ""}" data-cquest="${i}"><b>${esc(bountyText(q, o))}</b><span>Within ${q.roomsLeft * CAMP_QUEST_ROOMS} encounters · ${esc(rewardText(q.reward))}</span>${campQuest === i ? `<em>✔ Taken</em>` : ""}</button>`).join("")}</div>
      ${campQuest !== null ? `<button class="small camp-drop" data-cquest="-1">Tear up the contract</button>` : ""}`;
  }
  if (tab === "abyss") {
    const shards = meta.ruinShards ?? 0;
    if (!abyssUnlocked(meta)) return `<p>The way down is sealed. Beat the dungeon's last layer, with any hero, to find it.</p>`;
    return `<p>Ten depths, every foe a rank tougher, and an Uber boss at the bottom of each. Each run costs ${ABYSS_SHARD_COST} Ruin Shard${ABYSS_SHARD_COST === 1 ? "" : "s"}: every guardian from the last layer on leaves one.</p>
      <p class="sub">🪨 ${shards} Ruin Shard${shards === 1 ? "" : "s"} · ⬛ ${meta.classPlates?.[o] ?? 0} plate${(meta.classPlates?.[o] ?? 0) === 1 ? "" : "s"} on the ${og.name} · ${meta.plates ?? 0} to give</p>
      ${(() => { const w = currentAbyssMod(); return `<p class="sub">${w.icon} This week: <b>${esc(w.name)}</b>. ${esc(w.text)}.</p>`; })()}
      ${meta.plates ? `<button class="small camp-drop ${plateArmed ? "danger" : ""}" data-addplate="${o}">${plateArmed ? `Give it to the ${og.name} for good?` : "＋ Give a Vanadium Plate"}</button>` : ""}
      <button class="primary camp-go" data-campabyss ${shards >= ABYSS_SHARD_COST ? "" : "disabled"}>🕳️ Enter the Abyss · 🪨 ${ABYSS_SHARD_COST}</button>`;
  }
  if (tab === "skills") {
    const lv = masteryLevel(meta.mastery?.[o] ?? 0);
    const pick = meta.skillPick?.[o] ?? CLASS_SKILLS[o][0].id;
    const xp = meta.mastery?.[o] ?? 0;
    const next = MASTERY_XP[Math.min(MASTERY_MAX, lv + 1)];
    return `<p>The ${og.name}'s abilities. You take one into each run: pick it here. New ones open as your ${og.name} Mastery grows, and Mastery comes slowly, from deep runs and fallen bosses.</p>
      <p class="sub">⭐ Mastery ${lv}${lv < MASTERY_MAX ? ` · ${xp}/${next} to the next` : " · mastered"}</p>
      <div class="hall-list">${CLASS_SKILLS[o].map(k => {
        const open = lv >= k.level, on = pick === k.id;
        return `<div class="hall-up skill ${on ? "done" : ""} ${open ? "" : "locked"}"><span class="hu-ic">${open ? k.icon : "🔒"}</span><span class="hu-txt"><b>${esc(k.name)}</b><span>${esc(k.text)}. Costs 🔷1.</span></span>
          ${on ? `<span class="hu-done">✔ Taking it</span>` : open ? `<button class="hu-buy" data-skillpick="${k.id}">Take this</button>` : `<span class="hu-lock">Mastery ${k.level}</span>`}</div>`;
      }).join("")}</div>`;
  }
  if (tab === "garden") {
    const c = campOf(meta), plots = gardenPlots(meta);
    const seeds = (Object.keys(PLANTS) as Plant[]).map(k => `<button class="garden-seed ${sowing === k ? "on" : ""}" data-sow="${k}" ${(c.seeds?.[k] ?? 0) ? "" : "disabled"}>${PLANTS[k].seedIcon} <b>${c.seeds?.[k] ?? 0}</b> ${esc(PLANTS[k].seed)}<span>${PLANTS[k].runs} run${PLANTS[k].runs === 1 ? "" : "s"} to grow</span></button>`).join("");
    return `<p>Champions sometimes carry seeds. Sow them here: they grow while you're down in the dungeon, a run or two, and give two or three herbs for the Brewery.</p>
      <div class="garden-seeds">${seeds}</div>
      ${sowing ? `<p class="sub center">Now tap an empty plot to sow your ${esc(PLANTS[sowing].seed)}.</p>` : ""}
      <div class="garden-plots">${plots.map((p, i) => !p
        ? `<button class="plot empty ${sowing ? "ready" : ""}" data-plot="${i}"><span class="soil"></span><b>${sowing ? "Sow here" : "Empty"}</b></button>`
        : `<button class="plot ${p.left ? "growing" : "grown"}" data-plot="${i}"><span class="soil"><span class="sprout">${p.left ? "🌱" : PLANTS[p.plant].icon}</span></span><b>${esc(PLANTS[p.plant].name)}</b><span>${p.left ? `${p.left} more run${p.left === 1 ? "" : "s"}` : "Ready: tap to harvest"}</span></button>`).join("")}</div>
      <p class="sub">🌿 ${c.herbs?.heartleaf ?? 0} Heartleaf · 🪻 ${c.herbs?.moonbell ?? 0} Moonbell in store. More plots from the Hall's Green Thumb.</p>`;
  }
  if (tab === "brewery") {
    const c = campOf(meta), band = brewBand(meta);
    const waiting = c.brews && (c.brews.heal || c.brews.mana || c.brews.vile) ? `<p class="camp-quest-note">Bottled and waiting for your next run: ${c.brews.heal ? `🧪 ${c.brews.heal}` : ""} ${c.brews.mana ? `🔷 ${c.brews.mana}` : ""} ${c.brews.vile ? `🍄 ${c.brews.vile} Blightcap Brew${c.brews.vile > 1 ? "s" : ""} (to throw)` : ""}</p>` : "";
    if (!brew || brew.done) {
      const last = brew?.done === "spoiled" ? `<p class="brew-out bad">💥 Too hot! The brew boils over and spoils.</p>` : brew?.done === "bottled" ? `<p class="brew-out ${brew.made ? "" : "bad"}">${brew.made === 2 ? "✨ The sweet spot! Two potions." : brew.made ? "🧪 A good brew: one potion." : "🥶 Too cold: the herbs never took. Nothing to bottle."}</p>` : "";
      return `<p>Two herbs make a brew. Each stir heats the pot by a die. Bottle it between <b>${band.low}</b> and <b>${band.high}</b> for a potion, at <b>${band.sweetLo}${band.sweetHi > band.sweetLo ? `–${band.sweetHi}` : ""}</b> for two. Go past ${band.high} and it spoils.</p>
        ${last}${waiting}
        <div class="brew-pick">${(Object.keys(PLANTS) as Plant[]).map(k => `<button class="hu-buy" data-brew="${k}" ${(c.herbs?.[k] ?? 0) >= BREW_HERBS ? "" : "disabled"}>${PLANTS[k].icon} Brew ${PLANTS[k].brew === "heal" ? "Healing" : PLANTS[k].brew === "mana" ? "Mana" : "Blightcap"} · ${BREW_HERBS} ${esc(PLANTS[k].name)} (${c.herbs?.[k] ?? 0})</button>`).join("")}</div>
        <p class="sub">Brewed potions come with you on your next run.</p>`;
    }
    const pct = Math.min(100, (brew.heat / (band.high + 4)) * 100);
    return `<p>The ${esc(PLANTS[brew.plant].name)} brew is on the fire. Bottle between <b>${band.low}</b> and <b>${band.high}</b>; <b>${band.sweetLo}${band.sweetHi > band.sweetLo ? `–${band.sweetHi}` : ""}</b> is the sweet spot.</p>
      <div class="brew-pot"><div class="brew-gauge"><i class="band" style="left:${(band.low / (band.high + 4)) * 100}%;width:${((band.high - band.low + 1) / (band.high + 4)) * 100}%"></i><i class="sweet" style="left:${(band.sweetLo / (band.high + 4)) * 100}%;width:${((band.sweetHi - band.sweetLo + 1) / (band.high + 4)) * 100}%"></i><i class="heat" style="width:${pct}%"></i></div>
        <div class="brew-heat">🔥 <b>${brew.heat}</b></div>
        <div class="brew-rolls">${brew.rolls.map(r => `<span class="die-mini">${r}</span>`).join("")}</div></div>
      <div class="brew-acts"><button class="hu-buy" data-stir>🥄 Stir</button><button class="hu-buy" data-bottle>🍶 Bottle it</button></div>`;
  }
  if (tab === "tree") return "";
  if (tab === "pond") return fishingPanel("camp");
  if (tab === "bestiary") {
    const seen = meta.bestiary ?? {};
    const foes = [...MONSTERS.map(m => ({ name: m.name, family: m.family, traits: m.traits })), ...ELITE_ONLY.map(m => ({ name: m.name, family: m.family, traits: m.traits }))];
    const bosses = Object.entries(seen).filter(([, e]) => e.boss).map(([name, e]) => ({ name, family: e.family ?? "", traits: [] as string[] }));
    const card = (f: { name: string; family: string; traits: string[] }) => {
      const e = seen[f.name];
      const sk = foeSprite(f.name, f.family, !!e?.boss);
      if (!e || e.kills < BESTIARY_KILLS) return `<div class="beast unknown"><span class="beast-fig">${sk && hasSprite(sk) ? spriteHtml(sk, 3, "beast-spr") : "❔"}</span><b>${e ? esc(f.name) : "???"}</b><span class="sub">${e ? `Beaten ${e.kills}/${BESTIARY_KILLS}: its record opens at ${BESTIARY_KILLS}.` : "Not yet beaten."}</span></div>`;
      const tr = f.traits.map(id => { try { return getItem(id).name; } catch { return ""; } }).filter(Boolean).join(", ");
      return `<div class="beast"><span class="beast-fig">${sk && hasSprite(sk) ? spriteHtml(sk, 3, "beast-spr") : "👾"}</span><b>${esc(f.name)}</b><span class="sub">${esc(f.family)}${e.boss ? " · Boss" : ""}</span>
        <span class="beast-stats">Beaten ${e.kills}× · up to ${big(e.hp)} HP · Power ${big(e.power)}</span>${tr ? `<span class="beast-tr">${esc(tr)}</span>` : ""}</div>`;
    };
    const n = foes.filter(f => (seen[f.name]?.kills ?? 0) >= BESTIARY_KILLS).length;
    return `<p>Beat a kind of foe ${BESTIARY_KILLS} times and its record opens here: what it was like at its toughest. ${n} of ${foes.length} kinds so far.</p>
      <div class="beasts">${foes.map(card).join("")}${bosses.map(card).join("")}</div>`;
  }
  if (tab === "trophies") {
    const seen = meta.bestiary ?? {};
    const TIERS: [number, string, string][] = [[50, "🥇", "gold"], [25, "🥈", "silver"], [10, "🥉", "bronze"]];
    const won = Object.entries(seen).map(([name, e]) => {
      if (e.boss) return { name, icon: "🏆", tier: "boss", note: `Beaten ${e.kills}×`, sk: foeSprite(name, e.family, true) };
      const t = TIERS.find(([k]) => e.kills >= k);
      return t ? { name, icon: t[1], tier: t[2], note: `${e.kills} beaten`, sk: foeSprite(name, e.family) } : null;
    }).filter((x): x is NonNullable<typeof x> => !!x);
    return `<p>Beat a kind of foe 10 times and its trophy goes on the wall: bronze at 10, silver at 25, gold at 50. Every guardian you bring down gets one of its own.</p>
      ${won.length ? `<div class="trophies">${won.map(w => `<div class="trophy ${w.tier}"><span class="tr-plaque">${w.sk && hasSprite(w.sk) ? spriteHtml(w.sk, 3, "beast-spr") : w.icon}</span><b>${w.icon} ${esc(w.name)}</b><span class="sub">${esc(w.note)}</span></div>`).join("")}</div>` : `<div class="panel"><p class="sub">The walls are bare. Beat a kind of foe 10 times, or a layer's guardian, to hang your first trophy.</p></div>`}
      <h3 class="tr-head">🐟 The Tank</h3>
      <div class="trophies fish-tank">${FISH.map(f => { const n = meta.fish?.[f.id] ?? 0; return n ? `<div class="trophy fish ${f.rarity}"><span class="tr-plaque">${f.icon}</span><b>${esc(f.name)}</b><span class="sub">${n} caught</span></div>` : `<div class="trophy fish unknown"><span class="tr-plaque">❔</span><b>???</b><span class="sub">Not caught yet</span></div>`; }).join("")}</div>`;
  }
  if (tab === "weapons") {
    return `<p>Every weapon family learns from the fights you win with it, whoever holds it. The more you master a family, the more of its weapons turn up in your loot: a few at first, all of them at mastery ${WM_MAX}.</p>
      <div class="hall-list">${MASTERY_FAMILIES.map(fam => {
        const xp = meta.weaponXp?.[fam] ?? 0, lv = wmLevel(xp), next = wmNext(lv), prev = lv ? wmNext(lv - 1) : 0;
        const pct = lv >= WM_MAX ? 100 : Math.round(((xp - prev) / Math.max(1, next - prev)) * 100);
        const c = familyOpenCount(fam, lv), c2 = familyOpenCount(fam, lv + 1);
        return `<div class="hall-up ${lv >= WM_MAX ? "done" : ""}"><span class="hu-ic">${lv}</span><span class="hu-txt"><b>${esc(WM_PERK[fam].name)}</b><span>${c.open} of ${c.total} weapons in your loot${lv < WM_MAX && c2.open > c.open ? ` · next level: ${c2.open}` : ""}</span><span class="wm-bar"><i style="width:${pct}%"></i></span></span></div>`;
      }).join("")}</div>`;
  }
  if (tab === "knowledge") {
    const c = campOf(meta);
    return `<p>Scrolls of Knowledge carried up from below are studied here. Every boss's hoard holds one; Champions sometimes do too. What you learn stays with every hero, for good.</p>
      <div class="hall-store"><span>📜 <b>${c.scrolls ?? 0}</b> Scroll${(c.scrolls ?? 0) === 1 ? "" : "s"} of Knowledge</span></div>
      <div class="hall-list">${INSIGHTS.map(k => {
        const known = !!c.insights?.[k.id];
        return `<div class="hall-up ${known ? "done" : ""}"><span class="hu-ic">${k.icon}</span><span class="hu-txt"><b>${esc(k.name)}</b><span>${esc(k.text)}</span></span>
          ${known ? `<span class="hu-done">✔ Learned</span>` : `<button class="hu-buy" data-learn="${k.id}" ${(c.scrolls ?? 0) >= k.cost ? "" : "disabled"}>📜 ${k.cost}</button>`}</div>`;
      }).join("")}</div>`;
  }
  if (tab === "hall") {
    const c = campOf(meta);
    const store = `<div class="hall-store"><span>👑 <b>${c.crowns}</b> Crown Shard${c.crowns === 1 ? "" : "s"}</span>${(Object.keys(MATS) as Mat[]).map(k => `<span title="${esc(MATS[k].name)}, from ${MATS[k].family} foes">${MATS[k].icon} <b>${c.mats[k] ?? 0}</b> ${esc(MATS[k].name)}</span>`).join("")}</div>`;
    return `<p>Crown Shards come from the guardians at the bottom of each layer; materials from the foes you beat, by their kind. Both come home with you, even if you fall. Spend them here on upgrades that last.</p>
      ${store}
      <div class="hall-list">${HALL.map(u => {
        const rk = hallRank(meta, u.id), done = rk >= u.ranks, cost = done ? null : u.cost(rk + 1);
        const can = !!cost && c.crowns >= cost.crowns && (c.mats[cost.mat] ?? 0) >= cost.n;
        return `<div class="hall-up ${done ? "done" : ""}"><span class="hu-ic">${u.icon}</span><span class="hu-txt"><b>${esc(u.name)}</b><span>${esc(u.per)}${u.ranks > 1 ? " (per rank)" : ""}</span>
          <span class="hu-pips">${Array.from({ length: u.ranks }, (_, i) => `<i class="${i < rk ? "on" : ""}"></i>`).join("")}</span></span>
          ${done ? `<span class="hu-done">✔ Done</span>` : `<button class="hu-buy" data-hallbuy="${u.id}" ${can ? "" : "disabled"}>👑 ${cost!.crowns} · ${MATS[cost!.mat].icon} ${cost!.n}</button>`}</div>`;
      }).join("")}</div>`;
  }
  return "";
}

/** The Camp: where you get ready between runs. Each option is an archway that fills the screen; slide (or tap the glowing arrows) to the next. */
/** The Camp spot open right now (its page over the map), if any. */
let campRoom: CampTab | null = null;
/** Two letters for a tree node's orb. */
const initials = (name: string) => name.replace(/[^A-Za-z ]/g, "").split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0].toUpperCase()).join("") || name.slice(0, 2).toUpperCase();
/** The node open in its popup (the Passive Tree). */
let treeNode: string | null = null;
function treeNodePopup(o: OriginId) {
  const key = treeNode!;
  const n = treeNodeOf(key)!;
  const d = getItem(n.talent), t = treeOf(meta, o), taken = !!t.spent[key];
  const b = passiveTree().find(br => br.id === n.branch)!;
  const why = nodeBlock(meta, o, key);
  const sig = isTreeSigil(n.talent), ranks = sig ? 1 : nodeRanks(d), nm = nodeName(n, d);
  const attr = n.tier === 0 ? (n.talent.slice(3) as Attr) : null;
  const body = attr
    ? `<p><b>+1 ${esc(ATTR_INFO[attr].name)}</b> on every run with this class, on top of the points you spend as you level.</p><p class="sub">Each point of ${esc(ATTR_INFO[attr].name)}: ${shownLines(ATTR_INFO[attr].lines(1)).map(esc).join(", ")}.</p>`
    : `<p>${esc(nodeText(d, n.level))}</p>${sig ? `<p class="sub">Once a Talisman sigil; now it's yours for good.</p>` : ""}${ranks > 1 ? `<p class="sub">${n.level < ranks ? `Its next rank waits deeper in the tree.` : "Its strongest rank."}${n.level > 1 ? ` Needs ${esc(d.name)} ${NUMERAL[n.level - 1]}.` : ""}</p>` : ""}`;
  return `<div class="tree-pop-wrap"><div class="tree-pop">
    <button class="tp-x" data-closenode aria-label="Close">✕</button>
    <div class="tp-orb ${taken ? "has" : ""}">${attr ? ATTR_INFO[attr].icon : esc(initials(nm))}${ranks > 1 ? `<i>${NUMERAL[n.level]}</i>` : ""}</div>
    <h2>${attr ? `+1 ${esc(d.name)}` : esc(nm)}${ranks > 1 ? ` ${NUMERAL[n.level]}` : ""}</h2>
    <p class="tp-where">${b.icon} ${esc(b.name)} · row ${n.tier + 1}${taken ? " · taken" : ""}</p>
    <div class="tp-body">${body}</div>
    ${why && !taken ? `<p class="tp-why">${esc(why)}</p>` : ""}
    <div class="tp-btns">${taken ? "" : `<button class="tp-btn gold" data-node="${key}" ${why ? "disabled" : ""}>＋ Add a point${treeOpen(meta, o) ? ` (${t.points} left)` : ""}</button>`}<button class="tp-btn" data-closenode>Close</button></div>
  </div></div>`;
}

// ---------- Fishing (a dungeon pool, or the Camp's) ----------
let fishLine: { plan: CastPlan; t0: number; timers: number[]; inRun: boolean } | null = null;
let fishNote = "";
/** A fish just landed in a run, waiting for "eat it" or "keep it". */
let fishCaught: string | null = null;
const fishCastsLeft = () => (run && run.scene.t === "fishing" ? run.scene.casts : meta.fishCasts ?? CAMP_CASTS);
function fishingPanel(where: "run" | "camp") {
  const left = fishCastsLeft();
  const f = fishCaught ? fishById(fishCaught) : undefined;
  const btns = f && where === "run"
    ? `${f.heal ? `<button class="plank-btn" data-fisheat="${f.id}">🍖 Eat it (heal ${f.heal}${f.maxHp ? `, +${f.maxHp} Max HP` : ""})</button>` : ""}${f.gold ? `<button class="plank-btn" data-fishsell="${f.id}">🪙 Sell it (${f.gold} Gold)</button>` : ""}<button class="plank-btn" data-fishkeep>🎒 Keep it for the Camp</button>`
    : fishLine ? `<button class="plank-btn fish-strike" data-fishstrike>🎣 Catch!</button>`
    : left > 0 ? `<button class="plank-btn" data-fishcast>🎣 Cast the line (${left} left)</button>`
    : `<p class="sub center">The water's gone still. Nothing more will bite here${where === "camp" ? " until your next run" : ""}.</p>`;
  return `<div class="fish-panel">
    <p class="sub center">${where === "run" ? "Cast, watch the float, and strike only on the deep tug. Most casts bring up nothing." : "Fish the Camp's pool between runs. Strike only on the deep tug."}</p>
    <div class="fish-water"><i class="fish-ripple r1"></i><i class="fish-ripple r2"></i><div class="bobber ${fishLine ? "out" : ""}" id="bobber"><i></i></div>${f ? `<div class="fish-landed">${f.icon}</div>` : ""}</div>
    ${fishNote ? `<p class="fish-note">${esc(fishNote)}</p>` : ""}
    ${f ? `<p class="sub center">${esc(f.text)}</p>` : ""}
    <div class="fish-btns">${btns}</div>
  </div>`;
}
function fishStart() {
  if (fishLine || fishCastsLeft() <= 0) return;
  fishCaught = null; fishNote = "The float settles on the black water…";
  const plan = planCast(Math.random);
  const t0 = performance.now(), timers: number[] = [];
  fishLine = { plan, t0, timers, inRun: !!run && run.scene.t === "fishing" };
  const bob = (cls: string, ms: number) => { const el = document.getElementById("bobber"); if (!el) return; el.classList.add(cls); window.setTimeout(() => el.classList.remove(cls), ms); };
  for (const t of plan.twitches) timers.push(window.setTimeout(() => { bob("twitch", 320); sfx("click"); }, t));
  if (plan.bite !== null) {
    timers.push(window.setTimeout(() => { bob("bite", plan.window); sfx("status"); }, plan.bite));
    timers.push(window.setTimeout(() => fishResolve(false, "It took the bait and got away."), plan.bite + plan.window + 40));
  } else timers.push(window.setTimeout(() => fishResolve(false, "Nothing's biting. You reel in an empty hook."), (plan.twitches.at(-1) ?? 1500) + 2600));
  render();
}
function fishStrike() {
  if (!fishLine) return;
  const { plan, t0 } = fishLine;
  const at = performance.now() - t0;
  const ok = plan.bite !== null && at >= plan.bite && at <= plan.bite + plan.window;
  fishResolve(ok, ok ? "" : "Too soon: you pull the hook clean out of the water.");
}
function fishResolve(ok: boolean, miss: string) {
  if (!fishLine) return;
  for (const t of fishLine.timers) clearTimeout(t);
  const inRun = fishLine.inRun;
  fishLine = null;
  // Walked off mid-cast: the line just comes in.
  if (inRun !== (!!run && run.scene.t === "fishing")) return;
  if (inRun && run) {
    const res = fishCast(run, ok);
    fishNote = ok ? res.text : miss;
    if (res.fish && (res.fish.heal || res.fish.gold)) fishCaught = res.fish.id;
  } else {
    // The Camp's pool: catches go straight to your collection.
    meta.fishCasts = Math.max(0, (meta.fishCasts ?? CAMP_CASTS) - 1);
    if (!ok) fishNote = miss;
    else {
      const c = rollCatch(Math.random);
      if (c.kind === "none") fishNote = "Something took the bait and spat it out. Nothing on the hook.";
      else if (c.kind === "fish") { (meta.fish ??= {})[c.fish.id] = (meta.fish[c.fish.id] ?? 0) + 1; fishNote = `${c.fish.icon} You land a ${c.fish.name}! It goes in the Trophy Room's tank.`; }
      else if (c.kind === "junk" && c.gold) { campOf(meta).crowns += 1; fishNote = `${c.icon} ${c.name}, with an old 👑 Crown Shard inside.`; }
      else { const mats = Object.keys(MATS) as Mat[]; const k = mats[Math.floor(Math.random() * mats.length)]; campOf(meta).mats[k] = (campOf(meta).mats[k] ?? 0) + 2; fishNote = `🧰 A rusted lockbox: +2 ${MATS[k].icon} ${MATS[k].name}.`; }
    }
    saveMeta(meta);
  }
  if (ok) sfx("chest"); else sfx("miss");
  render();
}

/** Enter Dungeon: a dungeon archway, pitch black inside, with what you need to set out in its mouth. */
let expPop: "heat" | "totem" | null = null;
function expeditionScreen(o: OriginId) {
  void o;
  const tot = meta.totemSet ? totemById(meta.totemSet) : undefined;
  const heat = meta.heat ?? 0;
  const pop = expPop === "heat" ? `<div class="overlay popup-wrap exp-pop"><div class="popup"><button class="small closex closebtn" data-exppop="" aria-label="Close">✕</button><h2 class="center">🔥 Heat</h2>${heatPanel()}<div class="row plank-row" style="justify-content:center"><button class="plank-btn" data-exppop="">Done</button></div></div></div>`
    : expPop === "totem" ? `<div class="overlay popup-wrap exp-pop"><div class="popup"><button class="small closex closebtn" data-exppop="" aria-label="Close">✕</button><h2 class="center">🗿 Totems</h2>
      ${(() => { const held = TOTEMS.filter(t => (meta.totems?.[t.id] ?? 0) > 0); return held.length
        ? `<p class="sub center">Set one at the door: it leans the loot its way, and it's used up as you go in.</p><div class="mer-list totem-list">${held.map(t => `<button class="mer-chip ${meta.totemSet === t.id ? "on" : ""}" data-totem="${t.id}"><b>${t.icon} ${esc(t.name)}</b><span>×${meta.totems![t.id]} · ${esc(t.text)}</span></button>`).join("")}</div>`
        : `<p class="sub center">You hold no totems yet. From the third layer down, a guardian sometimes leaves one.</p>`; })()}
      <div class="row plank-row" style="justify-content:center"><button class="plank-btn" data-exppop="">Done</button></div></div></div>` : "";
  return `<div class="cb-screen exp-screen"><div class="exp-inner">
    <div class="mer-sign"><i class="chain l"></i><i class="chain r"></i><div class="plank">Enter Dungeon</div></div>
    <div class="exp-gate">
      <div class="cb-torch l"><i class="glow"></i><i class="flame"></i><i class="flame f2"></i><i class="sconce"></i></div>
      <div class="cb-torch r"><i class="glow"></i><i class="flame"></i><i class="flame f2"></i><i class="sconce"></i></div>
      <div class="exp-arch"><div class="exp-dark">
        <div class="exp-btns">
          <button class="plank-btn exp-go" data-descend>⬇️ Descend</button>
          <button class="plank-btn" data-exppop="heat">🔥 Heat${heat ? ` · ${heat}` : ""}</button>
          <button class="plank-btn" data-exppop="totem">🗿 Totem${tot ? ` · ${tot.icon}` : ""}</button>
        </div>
      </div></div>
    </div>
    <button class="mer-leave plank-btn" data-closeroom>Back to the Camp</button>
  </div></div>${pop}`;
}

/** The Passive Tree's room: the whole tree under a night sky, scrolling both ways. Branches side by side; each row
 *  opens as you spend in its branch; a node's next rank hangs below it, linked. */
const TREE_COL = 84, TREE_ROW = 104, TREE_GAP = 64, TREE_HEAD = 74, TREE_PAD = 40;
function treeScreen(o: OriginId) {
  const open = treeOpen(meta, o), t = treeOf(meta, o);
  const branches = passiveTree();
  const bw = TIER_WIDTH * TREE_COL;
  const W = TREE_PAD * 2 + branches.length * bw + (branches.length - 1) * TREE_GAP;
  const H = TREE_PAD + TREE_HEAD + Math.max(...branches.map(b => b.tiers)) * TREE_ROW + TREE_PAD;
  const pos = (bi: number, tier: number, col: number) => ({ x: TREE_PAD + bi * (bw + TREE_GAP) + col * TREE_COL + TREE_COL / 2, y: TREE_PAD + TREE_HEAD + tier * TREE_ROW + 34 });
  const lines: string[] = [], nodes: string[] = [], heads: string[] = [];
  branches.forEach((b, bi) => {
    const x0 = TREE_PAD + bi * (bw + TREE_GAP);
    heads.push(`<div class="ts-head" style="left:${x0}px;top:${TREE_PAD}px;width:${bw}px">${b.icon} <b>${esc(b.name)}</b><span>${branchSpent(t, b)} spent</span></div>`);
    const at = new Map(b.nodes.map(n => [n.key, n]));
    for (const n of b.nodes) {
      const p = pos(bi, n.tier, n.col);
      // A chain link to the node's lower rank; otherwise a faint thread up to the row above.
      const up = n.prereq ? at.get(n.prereq) : b.nodes.find(m => m.tier === n.tier - 1 && m.col === n.col);
      if (up) { const q = pos(bi, up.tier, up.col); lines.push(`<line x1="${q.x}" y1="${q.y}" x2="${p.x}" y2="${p.y}" class="${n.prereq ? "rank" : "thread"} ${t.spent[n.key] && t.spent[up.key] ? "lit" : ""}"/>`); }
      const d = getItem(n.talent), taken = !!t.spent[n.key], nm = nodeName(n, d), sig = isTreeSigil(n.talent);
      const can = open && !nodeBlock(meta, o, n.key);
      const shut = !open || !tierOpen(t, b, n.tier);
      nodes.push(`<button class="tnode ${taken ? "has full" : ""} ${can ? "can" : ""} ${shut ? "shut" : ""}" style="left:${p.x - TREE_COL / 2}px;top:${p.y - 30}px;width:${TREE_COL}px" data-nodeinfo="${n.key}" aria-label="${esc(nm)}"><span class="tn-orb ${n.tier === 0 ? "attr" : sig ? "sigil" : ""}">${n.tier === 0 ? ATTR_INFO[n.talent.slice(3) as Attr].icon : esc(initials(nm))}${!sig && nodeRanks(d) > 1 ? `<i class="tn-num">${NUMERAL[n.level]}</i>` : ""}</span><span class="tn-name">${n.tier === 0 ? `+1 ${esc(nm)}` : esc(nm)}</span></button>`);
    }
  });
  const won = meta.layersBeaten?.[o] ?? 0;
  return `<div class="tree-screen">
    <div class="ts-bar"><b>🌳 The Passive Tree</b><span class="ts-pts">${open ? `<b>${t.points}</b> point${t.points === 1 ? "" : "s"} to spend · 1 for every layer beaten` : `🔒 Opens once the ${esc(ORIGINS[o].name)} has beaten layer ${TREE_LAYERS} (best so far: ${won})`}</span>
      ${open && Object.keys(t.spent).length ? `<button class="plank-btn small" data-treereset>Take every point back</button>` : ""}<button class="plank-btn small" data-closeroom>Back to the Camp</button></div>
    <div class="ts-scroll"><div class="ts-sky" style="width:${W}px;height:${H}px">
      <svg class="ts-links" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${lines.join("")}</svg>
      ${heads.join("")}${nodes.join("")}
    </div></div>
  </div>`;
}

/** Kills of one kind of foe before its Bestiary record opens. */
const BESTIARY_KILLS = 10;
function campScreen(o: OriginId) {

  // The Camp is a place you walk: tap a spot to walk to it and open it. (campTab remembers the last spot opened.)
  void campTab;
  const room = campRoom ? CAMP_TABS.find(t => t.id === campRoom) : undefined;
  return `<div class="cb-screen camp-screen camp-walk"><div class="camp-inner">
    <div class="camp-top"><button class="camp-back" data-campback aria-label="Back">←</button>
      <div class="mer-sign camp-sign"><i class="chain l"></i><i class="chain r"></i><div class="plank">The Camp</div></div>
      <span class="camp-top-pad"></span></div>
    ${note && !room ? `<div class="toast ${noteBad ? "err" : ""}">${esc(note)}</div>` : ""}
    <div class="camp-map"><canvas id="campcv"></canvas></div>
  </div></div>
  ${room?.id === "tree" ? treeScreen(o) : room?.id === "expedition" ? expeditionScreen(o) : room ? `<div class="cb-screen grit-screen camp-room"><div class="mer-inner grit-inner"><div class="mer-sign"><i class="chain l"></i><i class="chain r"></i><div class="plank">${esc(room.name)}</div></div>
    ${note ? `<div class="toast ${noteBad ? "err" : ""}">${esc(note)}</div>` : ""}
    <div class="grit-body camp-room-body">${campBody(o, room.id)}</div>
    <button class="mer-leave plank-btn" data-closeroom>Back to the Camp</button></div></div>` : ""}`;
}

/** Camp contracts run over a whole layer, so they get longer than a board found below. */
const CAMP_QUEST_ROOMS = 3;

/** What the action button on a picked thing says. */
function crawlAct(room: string, r?: Run) {
  if (room === "trapdoor") return "🕳️ Descend";
  if (room === "locked") return (r?.hero.f.persist["skelKeys"] ?? 0) > 0 ? "🗝️ Unlock" : "🔒 Try the door";
  if (room === "crack") return "🧱 Push on it";
  if (room === "oath") return "🩸 Approach the stone";
  if (room === "event") return "🚪 Enter the strange room?";
  if (room === "secret") return "Open chest";
  if (["wooden", "iron", "crimson_vault", "bosschest"].includes(room)) return "Open chest";
  if (AUTO_ROOMS.includes(room) || ["vault", "unique", "goblin", "nemesis", "doppelganger", "crimson_elite"].includes(room)) return "⚔️ Fight";
  return "✋ Interact";
}
const TRAPDOOR_INFO = { icon: "🕳️", name: "Trapdoor", text: "A way down to the next floor. Once you drop, there's no climbing back up." };
const URN_INFO = { icon: "🏺", name: "Urn", text: "An old clay urn. Smash it: there might be a coin or two inside." };
const HOARD_INFO = { icon: "🧰", name: "The boss's hoard", text: "Everything the guardian of this layer was keeping. Open it before you go down." };
const LOCKED_INFO = { icon: "🔒", name: "Locked Door", text: "Iron-bound and locked fast. Something is kept behind it. A Skeleton Key would open it." };
const CRACK_INFO = { icon: "🧱", name: "Cracked Wall", text: "This stretch of wall is cracked, and a draught whistles through. It might give." };
const thingInfo = (r: Run, room: string) => (room === "trapdoor" ? TRAPDOOR_INFO : room === "urn" ? URN_INFO : room === "bosschest" ? HOARD_INFO : room === "locked" ? LOCKED_INFO : room === "crack" ? CRACK_INFO : roomInfo(r, room as RoomType));

/** The Crawl: the floor fills the screen (drawn by crawl.ts); the HUD sits over it in the corners. */
function crawlScreen(r: Run, msg: string[], bad: boolean) {
  const m = r.grid!;
  const h = r.hero;
  const layer = r.mode === "abyss" ? `The Abyss · Depth ${r.floor}` : `${ordinal(r.floor)} Layer`;
  const sel = m.sel !== undefined && !m.things[m.sel]?.done ? m.sel : undefined;
  const pick = (() => {
    if (sel === undefined) return "";
    const room = m.things[sel].room;
    const info = thingInfo(r, room);
    const th = m.things[sel];
    const sk = th.foe ? foeSprite(th.foe, undefined, false) : THING_SPRITE[room];
    const ic = sk && hasSprite(sk) ? spriteHtml(sk, (spriteSize(sk)?.h ?? 16) > 24 ? 2 : 3, "pick-spr") : th.room === "rest" ? "🔥" : info.icon;
    return `<div class="cz cz-pick ${roomClass(room)}"><button class="cz-x" data-gunsel aria-label="Close">✕</button><div class="cz-pick-head"><span class="ic">${ic}</span><span><b>${esc(info.name)}</b><span class="sub">${esc(info.text)}</span></span></div>
      <button class="primary cz-act" data-gwalk="${sel}">${crawlAct(room, r)}</button></div>`;
  })();
  const q = r.bounty;
  const quests = q ? `<button class="cz-quest ${bountyProgress(h, q) >= q.target ? "done" : ""}" data-bounty>📋 <span>${esc(bountyText(q, h.origin))}</span> <b>${Math.min(q.target, bountyProgress(h, q))}/${q.target}</b></button>` : "";
  return `<div class="crawl-screen">
    <canvas id="crawl"></canvas>
    <div class="crawl-vignette"></div>
    <div class="cz cz-tl">${czBars(r)}</div>
    <div class="cz cz-tr">
      <canvas id="minimap" class="cz-mini" aria-label="Map of what you've explored"></canvas>
      <div class="cz-layer">${layer}</div>
      <div class="cz-floor">${m.depth === 0 ? "Dungeon Entrance" : m.depth === TREASURE_DEPTH ? "The Hoard" : `Floor ${m.depth}`}</div>
      ${quests}
    </div>
    ${msg.length ? `<div class="cz cz-toasts">${msg.map((x, i) => `<div class="toast ${i === msg.length - 1 && bad ? "err" : ""}">${esc(x)}</div>`).join("")}</div>` : ""}
    ${pick}
    <div class="cz cz-bl">${potionCircle(r)}</div>
    <div class="cz cz-bc"><button class="cz-menu" data-menu aria-label="Menu">☰</button></div>
    <div class="cz cz-br">${bagCircle(r)}</div>
  </div>`;
}

function dieBox(who: "player" | "enemy", label: string) {
  const d = lastRoll[who];
  if (!d) return `<div class="diebox"><div class="who">${label}</div><div class="die ${who} empty">·</div><div class="facename">&nbsp;</div></div>`;
  return `<div class="diebox"><div class="who">${label}</div><div class="die ${who} ${d.kind} ${d.rolling ? "rolling" : ""} ${d.tint ? "tinted" : ""}"${d.tint ? ` style="background:${d.tint};color:${dieInk(d.tint)};--tint:${d.tint}"` : ""}>${d.face}</div><div class="facename">${d.rolling ? "&nbsp;" : esc(d.name)}</div></div>`;
}

/** Guard warnings on foes, and the hero's hit streak. */
function guardChips(f: Fighter, who: "player" | "enemy") {
  if (who === "player") {
    const n = streakOf(f);
    const bk = f.persist["blessKind"] ?? 0;
    const bless = bk && (f.persist["blessFights"] ?? 0) > 0 ? `<span class="chip blessing" title="${esc(BLESSINGS[bk])}">🐲 ${esc(BLESSINGS[bk])} · ${f.persist["blessFights"]} fight${f.persist["blessFights"] === 1 ? "" : "s"}</span>` : "";
    const angel = (f.persist["angelFights"] ?? 0) > 0 ? `<span class="chip angel" title="Immune to negative statuses; heal 2 at the start of each fight">👼 Angelic Blessing · ${f.persist["angelFights"]} fight${f.persist["angelFights"] === 1 ? "" : "s"}</span>` : "";
    return angel + bless + (n >= 2 && hasStreak(f) ? `<span class="chip streak" title="Hits in a row this run. A Miss, Graze, or an attack that's evaded, dodged or fully blocked resets it">🔗 Streak ${n}</span>` : "");
  }
  if (f.flags["guarding"]) return `<span class="chip guardchip" title="Armor doubled this round. Crits, spells and statuses still get through">🧱 Guarding</span>`;
  if (f.flags["guardNext"]) return `<span class="chip guardchip" title="Next round its Armor doubles. Crits, spells and statuses still get through">🧱 Guards next round</span>`;
  return "";
}

/** Short numbers for the deep floors: 15926037312 → 15.9B. */
const big = (n: number) => (n < 1e5 ? String(n) : n < 1e6 ? `${(n / 1e3).toFixed(0)}K` : n < 1e9 ? `${(n / 1e6).toFixed(1)}M` : n < 1e12 ? `${(n / 1e9).toFixed(1)}B` : `${(n / 1e12).toFixed(1)}T`);

/** A foe's trait chips (Unholy, tolls, escapes, its items). */
function foeTraits(f: Fighter) {
  return `${isUnholy(f) ? `<span class="chip holy" title="Holy weapons deal +15% to it">☠️ Unholy</span>` : ""}${currentBattle && tollOf(f, currentBattle.player) > 0 ? `<span class="chip toll" title="Attacking, Guarding, drinking a potion or using your class action each cost this much HP">⛓️ Each action costs ${tollOf(f, currentBattle.player)} HP</span>` : ""}${f.items["m_goblin"] ? `<span class="chip thief" title="Kill it before it escapes: everything it carries is yours">💨 Escapes after round 3 (${Math.max(0, 3 - (currentBattle?.round ?? 0))} left)</span>` : ""}${f.items["m_thief"] ? `<span class="chip thief" title="Kill it before it escapes: it takes 30% of your Gold, or drops 60% on top if you win">💰 Escapes after round 5 (${Math.max(0, 5 - (currentBattle?.round ?? 0))} left)</span>` : ""}${f.family === "Construct" ? `<span class="chip storm" title="Lightning hits it twice as hard: Shock doubles damage, Static and electric reactions deal double, Storm weapons +30%">⚡ Conductive</span>` : ""}${f.doppel ? `<span class="chip" title="Your HP, stats, statuses, gear, passives, talents and relics, as they were when you walked in">🎭 A perfect copy of you</span>${f.items["m_ambush"] ? `<span class="chip" title="Strikes first">Ambush</span>` : ""}` : Object.keys(f.items).map(id => getItem(id)).map(d => `<span class="chip" title="${esc(d.text)}">${esc(d.name)}</span>`).join("")}`;
}

function fighterPanel(f: Fighter, who: "player" | "enemy") {
  const hp = dispHp[who] ?? f.hp;
  const intent = who === "enemy" && f.moves?.length ? f.moves[f.intent ?? 0] : null;
  const traits = who === "enemy" ? foeTraits(f) : "";
  // Your stance this round: Guarding or Countering shows on your panel.
  const rnd = currentBattle?.round ?? -1;
  const stance = who === "player" ? (f.flags["guarding"] ? "guard" : f.flags["counter"] === rnd && rnd >= 0 ? "counter" : "") : "";
  const stanceTag = stance === "guard" ? `<div class="stance-tag guard">🛡️ Guarding · Armor ${armorOf(f)}</div>` : stance === "counter" ? `<div class="stance-tag counter">🌀 Countering · dodge it and you strike back with a Crit</div>` : "";
  return `<div class="panel fighter ${f.crimson ? "crimson-foe" : ""} ${stance ? `stance-${stance}` : ""}" id="fp-${who}">${stanceTag}
    <div class="row"><b>${esc(f.name)}</b>${f.title ? `<span class="sub">${esc(f.title)}</span>` : ""}<span class="grow"></span><span class="sub">${who === "enemy" ? `${f.family ?? ""}${f.crimson ? " · Crimson" : ""}${f.boss ? " · Boss" : f.champion ? " · Champion" : f.elite ? " · Elite" : ""}` : ""}</span></div>
    <div class="bar ${who === "enemy" ? "enemy" : ""}"><i style="width:${Math.min(100, Math.max(0, (hp / f.maxHp) * 100))}%"></i></div>
    <div class="sub">${big(Math.max(0, hp))}/${big(f.maxHp)} HP · ${who === "enemy" ? `Power ${f.items["m_death"] ? "☠️ most of your Max HP" : big(f.damage)}` : `Damage ${f.damage}${f.offDamage !== undefined ? ` + ${f.offDamage}` : ""}`} · Armor ${armorOf(f)}</div>
    ${who === "player" && f.maxMana ? `<div class="mana-row" title="Mana: your class ability costs 1. It refills at the start of every fight (Mana Potions refill it too).">${Array.from({ length: f.maxMana }, (_, i) => `<i class="${i < (f.mana ?? 0) ? "full" : ""}"></i>`).join("")}</div><div class="mana-label">Mana</div>` : ""}
    <div class="chips">${guardChips(f, who)}${traits}${statusChips(f)}</div>
    ${intent ? `<div class="intent">Next: ${intent.icon} <b>${esc(intent.name)}</b> — ${esc(intent.text)}</div>` : ""}
  </div>`;
}

function combatScene(r: Run) {
  if (r.scene.t !== "combat") return "";
  const b = r.scene.battle;
  const e = b.enemy;
  return `<div class="combat">
    <div class="c-enemy">${fighterPanel(e, "enemy")}</div>
    <div class="c-dice dice-row">${dieBox("player", "You")}${dieBox("enemy", "Enemy")}</div>
    <div class="c-player">${fighterPanel(b.player, "player")}
    ${(b.player.statuses.stun ?? 0) > 0 ? `<div class="toast err">💫 You're Stunned: your next turn will be skipped.</div>` : ""}</div>
    <div class="c-actions"><div class="row actions ${busy ? "busy" : ""}">
      ${availableActions(r).map(a => `<button class="${a === "attack" ? "primary" : a === "flee" ? "" : a === "guard" ? "" : "classact"}" data-act="${a}" ${busy || (isSkill(a) && (b.player.mana ?? 0) < MANA_COST) ? "disabled" : ""} title="${esc(ACTION_INFO[a].tip)}">${ACTION_INFO[a].label(b.player)}${isSkill(a) ? ` <span class="mana-cost">🔷${MANA_COST}</span>` : ""}</button>`).join("")}
    </div>
    ${!busy && quickOn && canAutoBattle(r) ? `<div class="row auto-row"><button class="auto-btn" data-auto title="This foe can't win against plain attacks. Skip to the end.">⚡ Quick Battle</button><span class="sub">You've got this one: attack until it falls.</span></div>` : ""}
    ${Object.keys(r.hero.tonics ?? {}).length ? `<div class="row tonics">${Object.entries(r.hero.tonics!).map(([id, n]) => `<button class="small tonic" data-tonic="${id}" ${busy ? "disabled" : ""} title="${esc(TONICS[id].text)}">${TONICS[id].icon} ${esc(TONICS[id].name)}${n > 1 ? ` ×${n}` : ""}</button>`).join("")}</div><p class="center sub" style="margin:2px 0">Tonics don't use your turn.</p>` : ""}
    <div class="row speed-row"><button class="small speed-btn" data-speedcycle title="Combat speed (also in Options)">⏩ ${speed >= 1 ? "Normal" : speed >= 0.5 ? "Fast" : "Very fast"}</button></div>
    <p class="center sub diefaces">Your die: ${b.player.faces.map((f, i) => `${i + 1} ${f.name ?? f.kind}`).join(" · ")}</p></div>
    </div>
    <details><summary>Battle log</summary><div class="log">${b.log.slice().reverse().map(l => `<div class="${l.startsWith("—") ? "round" : ""}">${esc(l)}</div>`).join("")}</div></details>`;
}

/** Pick-one scenes (boss rewards, Iron chests with the Skeleton Key): every button is a choice that ends the pick. */
/** Weapons that fit either hand get a button per hand. */
const handSlots = (it: GearItem): EquipSlot[] | null => { const sl = run ? slotsFor(it, run.hero) : []; return sl.includes("main") && sl.includes("off") ? ["main", "off"] : null; };
const HAND_LABEL: Partial<Record<EquipSlot, string>> = { main: "main hand", off: "off-hand" };
/** Compare buttons, only for slots that hold something (an empty slot has nothing to compare against). */
const compareBtns = (it: GearItem): string => {
  if (!run) return "";
  const h = run.hero, hands = handSlots(it);
  if (hands) return hands.filter(sl => h.equip[sl]).map(sl => `<button class="small take-cmp" data-compare="${it.uid}" data-slot="${sl}">⚖️ Compare ${HAND_LABEL[sl]}</button>`).join("");
  const slots = slotsFor(it, h);
  // Trinkets: one button per trinket slot that holds something.
  if (slots[0]?.startsWith("trinket")) return slots.filter(sl => h.equip[sl]).map(sl => `<button class="small take-cmp" data-compare="${it.uid}" data-slot="${sl}">⚖️ Compare ${SLOT_LABEL[sl].replace(" ★", "").toLowerCase()}</button>`).join("");
  return slots.length && slots.every(sl => h.equip[sl]) ? `<button class="small take-cmp" data-compare="${it.uid}">⚖️ Compare equipped</button>` : "";
};
const lootBtns = (it: GearItem, pick: boolean) => {
  const hands = handSlots(it);
  // Not strong enough yet: the equip buttons are greyed out, and a plain note says why.
  const gated = !!run && !!it.reqLevel && run.hero.level < it.reqLevel;
  const dis = gated ? " disabled" : "";
  // Trinkets: a button for each trinket slot (empty ones say so).
  const tslots = run ? slotsFor(it, run.hero).filter(sl => sl.startsWith("trinket")) : [];
  const equip = hands
    ? hands.map(sl => `<button class="small take-equip" data-take="${it.uid}" data-how="equip" data-slot="${sl}"${dis}>✔ Equip ${HAND_LABEL[sl]}</button>`).join("")
    : tslots.length > 1
      ? tslots.map(sl => `<button class="small take-equip" data-take="${it.uid}" data-how="equip" data-slot="${sl}"${dis}>✔ Equip ${SLOT_LABEL[sl].replace(" ★", "")}${run!.hero.equip[sl] ? "" : " (empty)"}</button>`).join("")
      : `<button class="small take-equip" data-take="${it.uid}" data-how="equip"${dis}>✔ Equip</button>`;
  return `${equip}${compareBtns(it)}<button class="small take-pack" data-take="${it.uid}" data-how="pack">Add to backpack</button>${run?.gridMode ? `<button class="small take-scrap" data-scrapfound="${it.uid}">Leave it</button>` : `<button class="small take-scrap" data-scrapfound="${it.uid}">Scrap${pick ? ` (+${run ? scrapValue(run.hero, it) : 0} ⚙️)` : ""}</button>`}`;
};
const pickButtons = (it: GearItem) => lootBtns(it, true);
const takeButtons = (it: GearItem) => lootBtns(it, false);

/** Sigils found: a slim glowing strip with the reward's own name, not a popup. */
const sigilFound = (names?: string[]) => (names ?? []).map(n => `<div class="sigil-found"><b>🔮 Sigil found</b><span class="sf-name">${esc(n)}</span><span class="sf-where">In Inventory › Gear › Sigils</span></div>`).join("");

/** A chest popup's heading: the chest itself (from the tileset, open) above its name in a frame. */
const CHEST_TITLE: [RegExp, string][] = [[/^Wooden Chest/, "chest_iron_open"], [/^Iron Chest/, "chest_wood_open"], [/^Secret Chest/, "chest_arcane_open"], [/hoard/i, "chest_crimson_open"], [/^Guarded Vault|Resplendent/, "chest_gold_open"]];
function chestHead(title: string): string | null {
  const hit = CHEST_TITLE.find(([re]) => re.test(title));
  if (!hit || !hasSprite(hit[1])) return null;
  return `<div class="chest-head">${spriteHtml(hit[1], 5, "chest-spr")}<h2 class="chest-name">${esc(title.replace(/\s*—\s*choose one$/i, ""))}</h2></div>`;
}

function lootScene(r: Run) {
  if (r.scene.t !== "loot") return "";
  const s = r.scene;
  const extras = [s.gold ? `🪙 ${Math.round(s.gold * goldMult(r))} Gold` : "", s.potions ? `🧪 Potion` : "", s.scrolls ? `📜 ${s.scrolls > 1 ? `${s.scrolls} Scrolls` : "Scroll"} of Revelation (yours)` : "", s.relic ? `💎 New relic: ${getItem(s.relic).name} — ${getItem(s.relic).text}` : ""].filter(Boolean);
  // After a won fight, the rewards sit in a framed Victory panel.
  const victory = !r.gridMode && (s.title === "Victory" || s.title.startsWith("You caught") || s.title === "The Mimic's hoard");
  const key = sigilFound(s.sigils) + (s.crimsonKey ? `<div class="key-found">🗝️ CRIMSON KEY FOUND<span>A Crimson Vault will now be offered on your path.</span></div>` : "")
    + (s.crucible ? `<div class="key-found crucible-found">⚗️ TRANSMUTER'S CRUCIBLE<span>An artefact. At any Forge, it turns a Common item into a Legendary, for Starmetal.</span></div>` : "")
    + (s.dragonHeart ? `<div class="key-found heart-found">🫀 ${s.dragonHeart > 1 ? `DRAGON HEART · LEVEL ${s.dragonHeart}` : "DRAGON HEART"}<span>${s.dragonHeart > 1 ? "Another dragon's heart feeds yours. It beats stronger." : "Still warm. Still beating. It's yours now."}</span></div>` : "");
  const body = `${key}${extras.length ? `<div class="panel">${extras.map(x => `<p>${esc(x)}</p>`).join("")}</div>` : ""}
    <div class="cards" style="margin-top:10px">${s.items.map(it => itemCard(it, takeButtons(it), true)).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="${s.items.length ? "take-pack take-none" : "primary"}" data-finish>${s.items.length ? "🚫 Take nothing" : "Continue"}${s.then === "resplendent" ? " → open the Resplendent chest" : ""}</button></div>`;
  return victory ? `<div class="victory"><div class="victory-title">${esc(s.title === "Victory" ? "VICTORY" : s.title.toUpperCase())}</div>${body}</div>` : `${(r.gridMode && chestHead(s.title)) || `<h2>${esc(s.title)}</h2>`}${body}`;
}

function pickScene(r: Run) {
  if (r.scene.t !== "pick") return "";
  const s = r.scene;
  const ks = s.keepsake ? getItem(s.keepsake) : null;
  const m = /^(.*?)(!?)\s*(?:—\s*)?choose one$/i.exec(s.title);
  const title = `<h2 class="pick-title"><span>${esc(m ? m[1] + m[2] : s.title)}</span>${m ? "<b>Choose one reward</b>" : ""}</h2>`;
  return `${(r.gridMode && chestHead(s.title)) || title}${sigilFound(s.sigils)}
    ${ks ? `<div class="item keepsake"><div class="meta">Keepsake · one at a time${r.hero.keepsake ? ` · replaces ${esc(getItem(r.hero.keepsake).name)}` : ""}</div><div class="nm">🕯️ ${esc(ks.name)}</div><p>${esc(ks.text)}.</p><div class="row"><button class="small primary" data-keepsake>Take the Keepsake</button></div><p class="sub">Free: it doesn't count as your pick.</p></div>` : ""}
    ${s.items.length > 1 ? `<div class="toast pick-note">Pick <b>one</b>. Equipping, bagging or scrapping an item is your choice — the others are lost.</div>` : ""}
    <div class="cards">${s.items.map(it => itemCard(it, s.items.length > 1 ? pickButtons(it) : takeButtons(it), true)).join("")}</div>
    ${s.passed?.length ? `<h2 class="lost-out">Lost out on</h2><div class="cards">${s.passed.map(it => itemCard(it)).join("")}</div>` : ""}
    <div class="row" style="margin-top:12px"><button class="take-pack take-none" data-finish>🚫 Take nothing</button></div>`;
}

function resplendentScene(r: Run) {
  if (r.scene.t !== "resplendent") return "";
  const s = r.scene;
  const monocle = Object.values(r.hero.equip).some(i => i?.base === "t_monocle");
  const cards = s.cards.map((c, i) => {
    if (s.picked === i) {
      return `<div class="flip"><div class="front">${c.kind === "scroll" ? `<div class="item r-legendary"><div class="nm">📜 Scroll of Revelation</div><p>Reveals one Legendary.</p></div>` : itemCard(c.item)}</div></div>`;
    }
    const tint = monocle && c.kind === "item" ? `tint-${c.item.rarity}` : "";
    const can = s.picked === null || s.glove;
    return `<div class="flip" ${can ? `data-card="${i}"` : ""}><div class="face back ${tint}">✦</div></div>`;
  }).join("");
  return `<div class="overlay"><div class="inner">
    <h1 class="center">Resplendent Chest</h1>
    <p class="center sub">${s.picked === null ? "Choose one card. The others will be lost." : s.glove ? "Gambler's Glove: give this up and pick another face-down card, or claim it." : "Claim your find."}</p>
    <div class="flipcards">${cards}</div>
    ${s.picked !== null ? `<div class="row" style="justify-content:center"><button class="primary" data-claim>Claim</button></div>` : ""}
  </div></div>`;
}

function talentScene(r: Run) {
  if (r.scene.t !== "talent") return "";
  return `<h2>Choose a talent</h2><div class="cards">${r.scene.options.map(id => {
    const t = getItem(id);
    const rank = (r.hero.talents[id] ?? 0) + 1;
    return `<button class="room talent" data-talent="${id}"><b>${esc(t.name)} ${"I".repeat(rank)}</b><span class="tdesc">${t.tags.join(" · ")}${t.rarity === "rare" ? " · Rare" : ""}</span><p class="teffect">${esc(t.text)}</p></button>`;
  }).join("")}</div><div class="row center"><button class="small" data-skiptalent>Take no talent</button></div>`;
}

let shopTab: "buy" | "sell" = "buy";
let shopSide: "equipped" | "backpack" = "equipped";
let shopSeen: unknown = null;
function shopScene(r: Run) {
  if (r.scene.t !== "shop") return "";
  // A new Merchant visit always opens on Buy.
  if (shopSeen !== r.scene) { shopSeen = r.scene; shopTab = "buy"; shopSide = "equipped"; }
  const h = r.hero;
  const tabs = `<div class="shop-tabs"><button class="shop-tab ${shopTab === "buy" ? "active" : ""}" data-shoptab="buy">🛒 Buy</button><button class="shop-tab ${shopTab === "sell" ? "active" : ""}" data-shoptab="sell">🪙 Sell</button></div>`;
  let body: string;
  if (shopTab === "buy") {
    body = `<div class="cards">${r.scene.stock.map((e, i) => {
    const full = e.kind === "potion" && !e.sold && h.potions >= potionCap(h);
    const btn = `<button class="small primary" data-buy="${i}" ${e.sold || full ? "disabled" : ""}>${e.sold ? "Sold" : full ? "Your potion belt is full" : `Buy · ${e.price} 🪙`}</button>`;
    if (e.kind === "item" && e.item) {
      const it = e.item;
      const cmp = e.sold ? "" : compareBtns(it);
      return itemCard(it, btn + cmp, !e.sold);
    }
    const label = e.kind === "potion" ? "🧪 Healing Potion — heal 12" : e.kind === "mana" ? `🔷 Mana Potion — drink in a fight to refill your mana (carry ${manaPotionCap(r.hero)})` : e.kind === "scroll" ? "📜 Scroll of Revelation — reveals a Legendary" : e.relic ? `💎 ${getItem(e.relic).name} — ${getItem(e.relic).text}` : "";
    return `<div class="item"><div class="nm">${esc(label)}</div><div class="row" style="margin-top:8px">${btn}</div></div>`;
  }).join("")}</div>
  <p class="shop-text">Bought gear goes to your backpack; equip it from 🎒.</p>
  <div class="row" style="margin-top:8px">${r.shopRerolls >= MAX_SHOP_REROLLS ? `<button disabled>No rerolls left</button>` : `<button data-reroll>Reroll stock · ${shopRerollCost(r)} 🪙 (${MAX_SHOP_REROLLS - r.shopRerolls} left)</button>`}</div>`;
  } else {
    const eq = EQUIP_SLOTS.map(k => h.equip[k]).filter((x): x is GearItem => !!x);
    const items = shopSide === "equipped" ? eq : h.backpack;
    const card = (it: GearItem) => { const worn = !!equippedSlot(r, it); return itemCard(it, `<button class="small ${worn && sellArmed === it.uid ? "danger" : ""}" data-sell="${it.uid}">${worn && sellArmed === it.uid ? "Sell what you're wearing?" : `Sell · ${Math.round(sellPrice(it, h) * goldMult(r))} 🪙`}</button>`, false, equippedSlot(r, it)); };
    body = `<p class="shop-text">The Merchant buys anything, for 40% of its price.${r.scene.soldItem ? ` Last sold: <b>${esc(r.scene.soldItem)}</b>.` : ""}</p>
    <div class="forge-sides">
      <button class="forge-side ${shopSide === "equipped" ? "active" : ""}" data-shopside="equipped">🛡️ Equipped</button>
      <button class="forge-side ${shopSide === "backpack" ? "active" : ""}" data-shopside="backpack">🎒 Backpack ${h.backpack.length}/${packSize(h)}</button></div>
    <div class="forge-side-body">${shopSide === "backpack" ? bulkSellRow(r) : ""}${items.length ? `<div class="cards">${items.map(card).join("")}</div>` : `<p class="shop-text">Nothing here.</p>`}</div>`;
  }
  return `<h2 class="shop-title">Merchant</h2>${tabs}<div class="shop-body">${body}</div>
  <div class="row" style="margin-top:12px"><button class="primary" data-leave>Leave</button></div>`;
}

const SLOT_LABEL: Record<EquipSlot, string> = { main: "Main hand", off: "Off-hand", armour: "Armour", trinket1: "Trinket 1", trinket2: "Trinket 2", trinket3: "Trinket 3 ★" };
/** "Main hand" etc. if the item is equipped, "" if it's in the bag. */
function equippedSlot(r: Run, it: GearItem): string {
  const s = EQUIP_SLOTS.find(k => r.hero.equip[k]?.uid === it.uid);
  return s ? SLOT_LABEL[s] : "";
}

/** Equipped items and backpack items in two bordered, labelled groups. */
function gearGroups(r: Run, card: (it: GearItem) => string, filter: (it: GearItem) => boolean = () => true): string {
  const eq = EQUIP_SLOTS.map(s => r.hero.equip[s]).filter((x): x is GearItem => !!x && filter(x));
  const bp = r.hero.backpack.filter(filter);
  const grp = (cls: string, label: string, items: GearItem[]) =>
    `<div class="gear-group ${cls}"><div class="group-label">${label}</div>${items.length ? `<div class="cards">${items.map(card).join("")}</div>` : `<p class="sub">Nothing here.</p>`}</div>`;
  return grp("equipped-group", "🛡️ Equipped", eq) + grp("backpack-group", `🎒 Backpack ${r.hero.backpack.length}/${packSize(r.hero)}`, bp);
}

function allGear(r: Run): GearItem[] {
  return [...EQUIP_SLOTS.map(s => r.hero.equip[s]).filter((x): x is GearItem => !!x), ...r.hero.backpack];
}

let forgeTab: "upgrade" | "scrap" | "offer" | "combine" | "transmute" | "reveal" = "upgrade";
/** The Forge's Reveal bench: the hidden Legendary placed in its slot. */
let revealSel: number | null = null;
const offerSel = new Set<number>();
/** Forge: which half of your gear is shown, and the two items picked to Combine. */
let forgeSide: "equipped" | "backpack" = "equipped";
let combineSel: number[] = [];

/** Odds in words (no numbers shown to players). p is a 0–100 share of non-failing outcomes. */
const oddsWord = (p: number) => p >= 50 ? "likely" : p >= 25 ? "possible" : p >= 8 ? "unlikely" : "a slim chance";
function forgeScene(r: Run, altar = false) {
  const h = r.hero;
  const fusions = availableFusions(r);
  // An Offering Altar shows only its offering; the Forge upgrades, scraps and reveals.
  if (altar) forgeTab = "offer";
  else if (forgeTab === "offer" || forgeTab === "transmute") forgeTab = "upgrade";
  const tabs = [["upgrade", "⚒️ Upgrade"], ["scrap", "⚙️ Scrap"], ...(r.gridMode ? [["reveal", "📜 Reveal"]] : [])];
  const eq = EQUIP_SLOTS.map(s => h.equip[s]).filter((x): x is GearItem => !!x);
  const exists = (u: number) => !!findItem(h, u);
  for (const u of [...offerSel]) if (!exists(u)) offerSel.delete(u);
  combineSel = combineSel.filter(exists);
  // Equipped / Backpack sub-tabs. Picks (Offering, Combine) carry across both, so a worn item can go with one from the bag.
  const sides = (filter: (it: GearItem) => boolean, card: (it: GearItem) => string, picked: (it: GearItem) => boolean = () => false, empty = "Nothing here.") => {
    const lists = { equipped: eq.filter(filter), backpack: h.backpack.filter(filter) };
    const n = (k: "equipped" | "backpack") => { const c = lists[k].filter(picked).length; return c ? ` <i class="side-n" title="${c} picked">✓${c}</i>` : ""; };
    const items = lists[forgeSide];
    return `<div class="forge-sides">
        <button class="forge-side ${forgeSide === "equipped" ? "active" : ""}" data-forgeside="equipped">🛡️ Equipped${n("equipped")}</button>
        <button class="forge-side ${forgeSide === "backpack" ? "active" : ""}" data-forgeside="backpack">🎒 Backpack ${h.backpack.length}/${packSize(h)}${n("backpack")}</button></div>
      <div class="forge-side-body">${items.length ? `<div class="cards">${items.map(card).join("")}</div>` : `<p class="sub">${empty}</p>`}</div>`;
  };
  const slotOf = (it: GearItem) => equippedSlot(r, it);
  let body = "";
  if (forgeTab === "reveal") {
    const hidden = [...eq, ...h.backpack].filter(it => baseOf(it.base).legendary && !it.revealed);
    const sel = hidden.find(it => it.uid === revealSel);
    body = `<p class="sub">A Legendary keeps its true power hidden until it's revealed. Put it on the bench beside a Scroll of Revelation, and reveal it.</p>
      <div class="reveal-bench"><div class="rb-slot ${sel ? "full" : ""}">${sel ? `<b class="nm-${sel.rarity}">${esc(itemName(sel))}</b>` : `<span>Legendary</span>`}</div><span class="rb-plus">+</span><div class="rb-slot ${h.scrolls ? "full" : ""}">${h.scrolls ? `<b>📜 Scroll of Revelation</b><span>${h.scrolls} carried</span>` : `<span>Scroll</span>`}</div></div>
      <button class="primary camp-go" data-revealgo ${sel && h.scrolls ? "" : "disabled"}>✨ Reveal</button>
      <div class="mer-list">${hidden.length ? hidden.map(it => `<button class="mer-chip ${revealSel === it.uid ? "on" : ""}" data-revealpick="${it.uid}"><b style="color:${RARITY_INK[it.rarity]}">${esc(itemName(it))}</b><span>${equippedSlot(r, it) || "Backpack"}</span></button>`).join("") : `<span class="mer-none">No hidden Legendaries.</span>`}</div>`;
  } else if (forgeTab === "upgrade") {
    body = `<p class="sub">Upgrading raises an item's level (more damage, stronger lines).</p>
    ${sides(() => true, it => itemCard(it, `<button class="small primary" data-up="${it.uid}">Upgrade · ${upgradeCost(it, r.hero)} ⚙️</button>`, false, slotOf(it)))}`;
  } else if (forgeTab === "scrap") {
    const star: Partial<Record<string, number>> = { legendary: 2, crimson: 4, epic_crimson: 10, legendary_crimson: 25 };
    body = `<p class="sub">Break down items for Scrap. Rarer and higher-level items give more, and the rarest also give Starmetal.</p>
      ${forgeSide === "backpack" ? bulkScrapRow(h) : ""}${sides(() => true, it => itemCard(it, `<button class="small danger" data-forgescrap="${it.uid}">Scrap · +${scrapValue(h, it)} ⚙️${star[it.rarity] ? ` +${star[it.rarity]} ✴️` : ""}</button>`, false, slotOf(it)))}`;
  } else if (forgeTab === "offer") {
    const chosen = allGear(r).filter(i => offerSel.has(i.uid));
    const odds = offeringOdds(offeringValue(chosen));
    if (r.scene.t === "offering" && r.scene.used) return `<p class="sub center">The altar has taken its offering. The candles around it gutter out.</p><div class="row" style="margin-top:12px;justify-content:center"><button class="primary" data-leave>Leave</button></div>`;
    body = `<p class="sub">Lay two or more items on the altar for one new item. Pick from your equipped gear, your bag, or both. More items and rarer items mean better odds — but sometimes the altar takes everything and gives nothing. It takes one offering only.</p>
      <div class="panel forge-pick">${chosen.length ? `<div>Offering: ${chosen.map(i => `<b>${esc(itemName(i))}</b>`).join(", ")}</div>` : `<div class="sub">Nothing picked yet.</div>`}
        ${chosen.length >= 2 ? `<div style="margin-top:6px">What the Forge might give: ${(["common", "uncommon", "rare", "epic", "legendary"] as const).filter(x => odds[x]).map(x => `<span class="chip odds-${x}">${x[0].toUpperCase() + x.slice(1)} · ${oddsWord(odds[x] ?? 0)}</span>`).join(" ")}</div>` : ""}
        <div class="row" style="margin-top:8px"><button class="primary" data-offer ${chosen.length >= 2 ? "" : "disabled"}>Sacrifice ${chosen.length} item${chosen.length === 1 ? "" : "s"}</button></div></div>
      ${sides(() => true, it => itemCard(it, `<button class="small ${offerSel.has(it.uid) ? "primary" : ""}" data-offersel="${it.uid}">${offerSel.has(it.uid) ? "✓ Offered" : "Offer"}</button>`, false, slotOf(it)), it => offerSel.has(it.uid))}`;
  } else if (forgeTab === "combine") {
    const all = allGear(r);
    const can = (i: GearItem) => i.rarity !== "legendary" && i.rarity !== "crimson" && !baseOf(i.base).noJewel && !i.infused;
    const hasTwin = (i: GearItem) => can(i) && all.some(o => o.uid !== i.uid && o.base === i.base && can(o));
    const picked = combineSel.map(u => findItem(h, u)!.item);
    const first = picked[0];
    const fits = (i: GearItem) => combineSel.includes(i.uid) || (!first || (combineSel.length < 2 && i.base === first.base));
    body = `<p class="sub">Combine two of the same item into one: a level higher, the best bonuses of both, and a chance to rise a rarity (up to Epic). The pair can come from your equipped gear, your bag, or one of each.</p>
      <div class="panel forge-pick">${picked.length ? `<div>Combining: ${picked.map(i => `<b>${esc(itemName(i))}</b>`).join(" + ")}${picked.length === 1 ? ` <span class="sub">— pick its twin</span>` : ""}</div>` : `<div class="sub">Pick an item, then its twin.</div>`}
        <div class="row" style="margin-top:8px"><button class="primary" ${picked.length === 2 ? `data-combine="${picked[0].uid},${picked[1].uid}"` : "disabled"}>Combine</button></div></div>
      ${all.some(hasTwin) ? sides(hasTwin, it => itemCard(it, `<button class="small ${combineSel.includes(it.uid) ? "primary" : ""}" data-combinesel="${it.uid}" ${fits(it) ? "" : "disabled"}>${combineSel.includes(it.uid) ? "✓ Picked" : "Pick"}</button>`, false, slotOf(it)), it => combineSel.includes(it.uid), "No items here have a twin.") : `<p class="sub">You don't have two of the same item.</p>`}`;
  } else if (!h.crucible) {
    body = `<div class="panel locked-tool"><p><b>🔒 You're missing an artefact.</b></p>
      <p class="sub">${r.gridMode ? "Transmuting is something you have to learn first: the Camp's Knowledge Table can teach it." : "Transmuting needs the Transmuter's Crucible. It's said to lie with the Campaign's fifth boss."}</p></div>`;
  } else {
    body = `<p class="sub">The Transmuter's Crucible turns a Common item into a Legendary of the same kind for ${TRANSMUTE_COST} ✴️ Starmetal (you have ${h.starmetal}). It arrives unrevealed.</p>
      ${sides(i => i.rarity === "common", it => itemCard(it, `<button class="small primary" data-transmute="${it.uid}" ${h.starmetal >= TRANSMUTE_COST ? "" : "disabled"}>Transmute · ${TRANSMUTE_COST} ✴️</button>`, false, slotOf(it)), () => false, "No Common items here.")}`;
  }
  if (altar) return `<h2>Offering Altar</h2><div class="forge-body bm-page">${body}</div>
  <div class="row" style="margin-top:12px"><button class="primary" data-leave>Leave</button></div>`;
  return `<h2>Forge</h2><p class="sub">⚙️ ${h.scrap} Scrap${h.starmetal ? ` · ✴️ ${h.starmetal} Starmetal` : ""}</p>
  ${fusions.length ? `<p class="sub fusable-hint">🔗 Two of your relics could be fused. The Forge can't do it — look for a Jeweller.</p>` : ""}
  <div class="bm-tabs">${tabs.map(([k, l]) => `<button class="${forgeTab === k ? "on" : ""}" data-forgetab="${k}">${l}</button>`).join("")}</div>
  <div class="forge-body bm-page">${body}</div>
  <div class="row" style="margin-top:12px"><button class="primary" data-leave>Leave</button></div>`;
}

/** One affix line as text. */
const lineText = (id: string, n: number) => { try { return fillText(getItem(id).text, n); } catch { return id; } };
/** Scrolls of Power: in the Inventory (scrap them) or at a Masterwork (pick one, strike lines out, empower). */
function scrollsHtml(h: Hero, atMasterwork: boolean) {
  const list = h.powerScrolls ?? [];
  if (!list.length) return `<p class="sub">No Scrolls of Power. Extract an item's lines into one at a Masterwork.</p>`;
  return `<p class="sub">${list.length}/${SCROLL_SLOTS} scrolls. ${atMasterwork ? "Pick one, untick any lines you don't want, then choose a Common item of the same family." : "Use them at a Masterwork, on a Common item of the same family."}</p>
  ${list.map(s => {
    const picked = atMasterwork && mwScroll === s.uid;
    const v = scrollScrapValue(s);
    return `<div class="scroll-card r-${s.rarity} ${picked ? "picked" : ""}"><div class="nm">${esc(scrollName(s))}</div>
      <div class="sub">${esc(rarityLabel(s.rarity))} lines · ${Object.keys(s.lines).length} line${Object.keys(s.lines).length === 1 ? "" : "s"}</div>
      ${Object.entries(s.lines).map(([id, n]) => picked ? `<label><input type="checkbox" data-mwline="${id}" ${mwKeep.has(id) ? "checked" : ""}> – ${esc(lineText(id, n))}</label>` : `<div>– ${esc(lineText(id, n))}</div>`).join("")}
      <div class="row">${atMasterwork ? `<button class="small ${picked ? "primary" : ""}" data-mwscroll="${s.uid}">${picked ? "✓ Picked" : "Pick"}</button>` : ""}<button class="small danger" data-scrapscroll="${s.uid}">Scrap · +${costText(v)}</button></div></div>`;
  }).join("")}`;
}

function masterworkScene(r: Run) {
  if (r.scene.t !== "masterwork") return "";
  const h = r.hero;
  const sc = r.scene;
  const mats = `⚙️ ${h.scrap} · 💠 ${h.azure ?? 0} · 🔶 ${h.orilium ?? 0} · ✴️ ${h.starmetal} · 🪙 ${h.f.gold}`;
  const head = `<h2>⚒️ Masterwork</h2><p class="sub">${mats}</p>`;
  // A Rework's two options, waiting for a pick.
  if (sc.pending) {
    const f = findItem(h, sc.pending.uid);
    const oldV = f?.item.bonuses[sc.pending.line] ?? 1;
    return `${head}<div class="panel"><p><b>Rework:</b> ${esc(f ? itemName(f.item) : "")}</p>
      <p class="sub">The line now: – ${esc(lineText(sc.pending.line, oldV))}</p>
      ${sc.pending.options.map((o, i) => { const [id, n] = Object.entries(o)[0]; return `<div class="row"><span class="grow">– ${esc(lineText(id, n))}</span><button class="small primary" data-mwpick="${i}">Take this</button></div>`; }).join("")}
      <div class="row" style="margin-top:8px"><button class="small" data-mwkeep>Keep the old line</button></div></div>`;
  }
  const tabs = ([["rework", "⚒️ Rework"], ["extract", "📜 Extract"], ["empower", "✨ Empower"], ["refine", "💎 Refine"], ["transmute", "⚗️ Transmute"]] as const)
    .map(([k, l]) => `<button class="${mwTab === k ? "on" : ""}" data-mwtab="${k}">${l}</button>`).join("");
  const eq = EQUIP_SLOTS.map(s => h.equip[s]).filter((x): x is GearItem => !!x);
  const all = [...eq, ...h.backpack];
  const slotOf = (it: GearItem) => equippedSlot(r, it);
  const list = (items: GearItem[], buttons: (it: GearItem) => string, empty: string) =>
    items.length ? `<div class="cards">${items.map(it => itemCard(it, buttons(it), false, slotOf(it))).join("")}</div>` : `<p class="sub">${empty}</p>`;
  let body = "";
  if (mwTab === "rework") {
    body = `<p class="sub">Reroll one line into one of two new options (or keep it). Once you rework a line, it's the only line on that item that can ever be reworked, and each rework costs more.</p>
      ${list(all.filter(it => Object.keys(it.bonuses).length && reworkCost(it)), it => Object.keys(it.bonuses).map(id => { const why = reworkBlock(it, id); const c = reworkCost(it)!; const short = canAfford(h, c);
        return `<button class="small ${why || short ? "" : "primary"}" data-mwrework="${it.uid}|${id}" ${why || short ? `disabled title="${esc(why ?? short ?? "")}"` : ""}>⚒️ ${esc(lineText(id, it.bonuses[id]).slice(0, 34))}${lineText(id, it.bonuses[id]).length > 34 ? "…" : ""} · ${costText(c)}</button>`; }).join(""), "No items with lines to rework.")}`;
  } else if (mwTab === "extract") {
    body = `<p class="sub">Lift every line off an item into a Scroll of Power. The item becomes a plain Common. Legendaries and Empowered items can't be extracted.</p>
      ${list(all.filter(it => Object.keys(it.bonuses).length), it => { const why = extractBlock(h, it); return `<button class="small ${why ? "" : "primary"}" data-mwextract="${it.uid}" ${why ? `disabled title="${esc(why)}"` : ""}>📜 Extract</button>`; }, "No items with lines to extract.")}`;
  } else if (mwTab === "empower") {
    const s = (h.powerScrolls ?? []).find(x => x.uid === mwScroll);
    body = `<p class="sub">Put a scroll's lines onto a Common item of the same family. A plain Common holds 1 line; each Refine dot adds one. Empowered items are bound: they can never be extracted.</p>
      ${scrollsHtml(h, true)}
      ${s ? `<h3>Onto which ${esc(FAMILY_NAME[s.family])} item?</h3>${list(all.filter(it => canEmpowerTarget(it) && baseOf(it.base).kind === s.kind && classify(baseOf(it.base)).family === s.family), it => { const why = empowerBlock(it, s, [...mwKeep]); return `<button class="small ${why ? "" : "primary"}" data-mwempower="${it.uid}" ${why ? `disabled title="${esc(why)}"` : ""}>✨ Empower</button>${why ? `<span class="sub"> ${esc(why)}</span>` : ""}`; }, `You have no Common ${FAMILY_NAME[s.family]} items.`)}` : ""}`;
  } else if (mwTab === "transmute") {
    body = `<p class="sub">Turn a Common item into a Legendary of the same kind for ${TRANSMUTE_COST} ✴️ Starmetal (you have ${h.starmetal}). It arrives unrevealed.</p>
      ${list(all.filter(i => i.rarity === "common"), it => `<button class="small primary" data-transmute="${it.uid}" ${h.starmetal >= TRANSMUTE_COST ? "" : "disabled"}>Transmute · ${TRANSMUTE_COST} ✴️</button>`, "You have no Common items.")}`;
  } else {
    body = `<p class="sub">Refine a Common so it can hold more lines: 2 at •, 3 at ••, 4 at •••. Legendaries can't be refined.</p>
      ${list(all.filter(canEmpowerTarget), it => { const done = (it.refine ?? 0) >= MAX_REFINE; const c = refineCost(it, shopMult(r)); const why = done ? "Fully refined." : refineBlock(h, it, shopMult(r));
        return `<button class="small ${why ? "" : "primary"}" data-mwrefine="${it.uid}" ${why ? `disabled title="${esc(why)}"` : ""}>${done ? "Fully refined" : `💎 Refine to ${"•".repeat((it.refine ?? 0) + 1)} · ${costText(c)}`}</button>`; }, "You have no Common items.")}`;
  }
  return `${head}<div class="mw-tabs bm-tabs">${tabs}</div><div class="forge-body bm-page">${body}</div>
  <div class="row" style="margin-top:12px"><button class="primary" data-leave>Leave</button></div>`;
}

/** A little stage for the Crawl's big moments: torchlit wall, a strip of dungeon floor, and whoever's on it. */
function endStage(kind: string, actors: string) {
  const torch = (side: string) => `<div class="cb-torch ${side}"><i class="glow"></i><i class="flame"></i><i class="flame f2"></i><i class="sconce"></i></div>`;
  const floor = Array.from({ length: 20 }, (_, k) => spriteHtml(`floor_${(k * 5) % 8 + 1}`, 3, "es-tile")).join("");
  return `<div class="end-stage ${kind}">${torch("l")}${torch("r")}<div class="es-wall"></div><div class="es-floor">${floor}</div><div class="es-actors">${actors}</div></div>`;
}
const sprOr = (k: string | null | undefined, scale: number, cls: string, fallback: string) => (k && hasSprite(k) ? spriteHtml(k, scale, cls) : `<span class="${cls} es-emoji">${fallback}</span>`);
/** The run's numbers, as stone tiles. */
function endStats(r: Run) {
  const x = runSummary(r);
  const where = r.mode === "abyss" ? `Depth <b>${x.floor}</b>` : `Layer <b>${r.floor}</b>${r.grid ? ` · Floor <b>${r.grid.depth}</b>` : ""}`;
  return `<div class="end-stats"><span>🕳️ ${where}</span><span>⭐ Level <b>${r.hero.level}</b></span><span>⚔️ Kills <b>${r.stats.kills}</b></span><span>💀 Elites <b>${x.elites}</b></span><span>👹 Champions <b>${x.champions}</b></span><span>💥 Biggest hit <b>${fmtN(x.bestHit)}</b></span><span>⚔️ Damage <b>${fmtN(x.damage)}</b></span><span>🪙 Gold <b>${fmtN(x.gold)}</b></span></div>`;
}

/** The Crawl: a layer's guardian lies dead, and the stairs down glow. */
function crawlCleared(r: Run) {
  if (r.scene.t !== "cleared") return "";
  const s = r.scene, next = s.floor + 1;
  const th = themeOf(r, next);
  const boss = sprOr(foeSprite(s.boss, undefined, true), 3, "es-dead big", "💀");
  return `${endStage("cleared", `<div class="es-boss">${boss}${spriteHtml("skull", 3, "es-skull")}${spriteHtml("coin", 3, "es-coin c1")}${spriteHtml("coin", 3, "es-coin c2")}</div><div class="es-stairs">${spriteHtml("floor_stairs", 4, "")}</div>`)}
    <h2 class="end-title">${esc(s.boss)} has fallen</h2>
    <p class="end-line">${r.mode === "abyss" ? `Depth ${s.floor} of the Abyss is cleared.` : `The ${ordinal(s.floor)} Layer is cleared.`}</p>
    <p class="end-line sub">${r.hero.f.hp}/${r.hero.f.maxHp} HP · level ${r.hero.level} · ${r.stats.kills} kills</p>
    <p class="end-line">Below lies <b class="cl-next">${r.mode === "abyss" ? `Depth ${next} of the Abyss` : `the ${ordinal(next)} Layer${th ? `: ${th.icon} ${esc(th.name)}` : ""}`}</b>.</p>
    <div class="end-btns"><button class="plank-btn" data-descend>Go down</button><button class="plank-btn" data-bag>🎒 Check your inventory first</button></div>`;
}

/** The Crawl's end: fallen (with whoever did it standing over you), or the last guardian beaten. */
function crawlOver(r: Run) {
  if (r.scene.t !== "over") return "";
  const h = r.hero, won = r.scene.won, k = r.killer;
  const hero = sprOr(CLASS_SPRITE[h.origin], 4, won ? "es-hero" : "es-dead hero", ORIGIN_ICON[h.origin]);
  const killer = !won && k && !r.abandoned ? sprOr(foeSprite(k.name, k.family, k.rank === "boss"), k.rank === "boss" ? 4 : 4, "es-foe", "👹") : "";
  const stage = won
    ? endStage("won", `<div class="es-boss">${spriteHtml("chest_gold_open", 4, "es-chest")}${hero}${spriteHtml("coin", 3, "es-coin c1")}${spriteHtml("coin", 3, "es-coin c2")}${spriteHtml("coin", 3, "es-coin c3")}</div>`)
    : endStage("fallen", `<div class="es-boss">${hero}${spriteHtml("skull", 3, "es-skull")}</div>${killer ? `<div class="es-killer">${killer}</div>` : ""}`);
  const title = r.finale ? "Nothing remains. You won everything." : won && r.mode === "abyss" ? "You reached the bottom of the Abyss!" : won ? "The last guardian falls. You win!" : r.abandoned ? "You gave up the run." : "You have fallen.";
  const gear = EQUIP_SLOTS.map(sl => h.equip[sl]).filter((x): x is GearItem => !!x);
  return `${stage}
    <h2 class="end-title ${won ? "won" : "lost"}">${title}</h2>
    ${!won && k && !r.abandoned ? `<p class="end-line">Slain by <b class="cl-boss">${esc(k.name)}</b>${k.title ? ` <span class="sub">${esc(k.title)}</span>` : ""}, with ${big(k.hp)}/${big(k.maxHp)} HP left.</p>` : ""}
    ${endStats(r)}
    ${recorded?.achievements.length ? `<div class="end-box">${recorded.achievements.map(id => { const a = ACHIEVEMENTS.find(x => x.id === id)!; return `<p>🏆 <b>${esc(a.name)}</b>: ${esc(a.text)} <span class="sub">(+${a.renown} Renown${a.title ? ` · title “${esc(a.title)}”` : ""})</span></p>`; }).join("")}</div>` : ""}
    ${recorded ? `<p class="end-line">🏅 +${recorded.earned} Renown (total ${meta.renown})${recorded.unlocked.length ? ` · Unlocked: <b>${recorded.unlocked.map(esc).join(", ")}</b>` : ""}</p>` : ""}
    ${r.ruin?.shards || r.ruin?.plates ? `<p class="end-line">Kept for good: ${r.ruin.shards ? `🪨 ${r.ruin.shards} Ruin Shard${r.ruin.shards === 1 ? "" : "s"}` : ""}${r.ruin.shards && r.ruin.plates ? " · " : ""}${r.ruin.plates ? `⬛ ${r.ruin.plates} Vanadium Plate${r.ruin.plates === 1 ? "" : "s"}` : ""}</p>` : ""}
    ${(() => { const lb = runStatsPanel(r).replace(/<div class="lb-stats">[\s\S]*?<\/div>/, "").trim(); return lb ? `<div class="end-box lb-box">${lb}</div>` : ""; })()}
    <p class="end-sub">What you carried at the end</p>
    <div class="end-gear">${gear.map(it => `<span class="eg-chip" style="--ink:${RARITY_INK[it.rarity] ?? "#e9d6b0"}"><b>${esc(itemName(it))}</b><i>${esc(it.rarity)} · ${esc(equippedSlot(r, it))}</i></span>`).join("")}</div>
    <div class="end-btns">${won && !r.finale && r.mode !== "abyss" ? `<button class="plank-btn" data-endless>🌀 Delve deeper</button>` : ""}<button class="plank-btn" data-newrun>Back to the Camp</button></div>`;
}

function clearedScene(r: Run) {
  if (r.gridMode) return crawlCleared(r);
  if (r.scene.t !== "cleared") return "";
  const s = r.scene;
  const shown = s.floor;
  const next = shown + 1;
  const nextReal = next;
  return `<div class="victory cleared">
    <div class="victory-title">${r.mode === "abyss" ? `DEPTH ${s.floor} CLEARED` : `FLOOR ${shown} CLEARED`}</div>
    <p class="center cl-big"><b class="cl-boss">${esc(s.boss)}</b> has fallen.</p>
    <p class="center sub cl-stats">${r.stats.kills} kills · level ${r.hero.level} · ${r.hero.f.hp}/${r.hero.f.maxHp} HP</p>
    <p class="center cl-big" style="margin-top:10px">Below lies <b class="cl-next">${r.mode === "abyss" ? `Depth ${next} of the Abyss` : `Floor ${next} — ${(() => { const th = themeOf(r, nextReal); return th ? `${th.icon} ${esc(th.name)}` : esc(floorName(nextReal)); })()}`}</b>.</p>
    <div class="row" style="justify-content:center;margin-top:14px"><button class="big dg-gold" data-descend>Descend to ${r.mode === "abyss" ? "depth" : "floor"} ${next} ↓</button></div>
    <p class="center cl-check" style="margin-top:8px">Check your inventory 🎒 before you go</p>
  </div>`;
}

function restScene(r: Run) {
  if (r.scene.t !== "rest") return "";
  return `<h2>Campfire</h2>${r.scene.done ? `<p>You rest a while.</p>` : `<div class="row"><button class="primary" data-rest="heal">Rest: heal ${Math.round(restPct(r.hero) * (heatOf(r) >= 3 ? 0.5 : 1) * 100)}% of Max HP</button></div>`}
  <div class="row" style="margin-top:12px"><button data-leave>Move on</button></div>`;
}

function eventScene(r: Run) {
  if (r.scene.t !== "event") return "";
  const s = r.scene;
  return `<h2>${s.ev.icon} ${esc(s.ev.title)}</h2><div class="panel"><p>${esc(s.ev.text)}</p>${s.found.length ? `<p class="sub">Waiting for you when you leave: <b>${s.found.length}</b> item${s.found.length > 1 ? "s" : ""}.</p>` : ""}</div>
    ${!s.result && s.note ? `<div class="toast">${esc(s.note)}</div>` : ""}
    ${s.result ? `<div class="toast">${esc(s.result)}</div><div class="row"><button class="primary" data-leave>Continue</button></div>`
      : `<div class="cards" style="margin-top:10px">${s.ev.options.map((o, i) => `<button class="room" data-event="${i}" ${eventOptionAvailable(r, i) ? "" : "disabled"}><b>${esc(o.label)}</b>${o.hint ? `<span class="sub">${esc(o.hint)}</span>` : ""}</button>`).join("")}</div>`}`;
}

function alchemistScene(r: Run) {
  if (r.scene.t !== "alchemist") return "";
  const s = r.scene;
  return `<h2>⚗️ The Alchemist</h2><div class="forge-body room-body"><div class="panel"><p>"Everything works on anything. Even the big ones. It isn't cheap."</p><p class="sub">Tonics are used in a fight, from the buttons under your actions. Using one doesn't take your turn. You have 🪙 <b>${r.hero.f.gold}</b>.</p></div>
    <div class="cards">${s.stock.map((e, i) => `<div class="item r-epic"><div class="nm">${TONICS[e.id].icon} ${esc(TONICS[e.id].name)}</div><p>${esc(TONICS[e.id].text)}.</p>
      <button class="small ${e.sold ? "" : "primary"}" data-tonicbuy="${i}" ${e.sold || r.hero.f.gold < e.price ? "disabled" : ""}>${e.sold ? "Sold" : `Buy · ${e.price} 🪙`}</button></div>`).join("")}</div></div>
    <div class="row" style="margin-top:12px"><button class="primary leave-wide" data-leave>🚪 Leave the Alchemist</button></div>`;
}

function jewelSlotHtml(r: Run, side: "left" | "right", slot?: JewelSlot, label = "Empty") {
  if (!slot) return `<div class="jslot empty"><span class="jslot-ic">${side === "left" ? "◐" : "◑"}</span><span class="sub">${label}</span></div>`;
  let name = "", rar = "common", icon = "💎";
  if (slot.kind === "relic") { const d = getItem(slot.id); name = d.name; rar = d.rarity ?? "common"; }
  else { const it = r.hero.backpack.find(i => i.uid === slot.uid) ?? Object.values(r.hero.equip).find(i => i?.uid === slot.uid); if (it) { name = itemName(it); rar = it.rarity; icon = "💍"; } }
  return `<button class="jslot r-${rar}" data-jclear="${side}" title="Take it off the bench"><span class="jslot-ic">${icon}</span><b class="nm">${esc(name)}</b><span class="sub">tap to remove</span></button>`;
}

function jewellerScene(r: Run) {
  if (r.scene.t !== "jeweller") return "";
  const s = r.scene;
  const h = r.hero;
  const cost = jewelCost(r);
  const left = JEWEL_TRIES - s.tries;
  const problem = s.left && s.right ? jewelCheck(r) : null;
  const can = left > 0 && !!s.left && !!s.right && problem === null;
  const onBench = (x: JewelSlot) => [s.left, s.right].some(y => y && y.kind === x.kind && (x.kind === "relic" ? (y as { id: string }).id === x.id : (y as { uid: number }).uid === x.uid));
  const gear = [...EQUIP_SLOTS.map(sl => h.equip[sl]).filter((x): x is GearItem => !!x), ...h.backpack];
  const trinkets = gear.filter(it => baseOf(it.base).slot === "trinket");
  const infusable = gear.filter(it => ["weapon", "off", "armour"].includes(baseOf(it.base).kind));
  const pick = (it: GearItem) => { const x: JewelSlot = { kind: "item", uid: it.uid }; return `<button class="jpick r-${it.rarity}" data-jpick="item:${it.uid}" ${onBench(x) ? "disabled" : ""}><b class="nm">${esc(itemName(it))}</b><span class="sub">${rarityLabel(it.rarity)}${equippedSlot(r, it) ? " · worn" : ""}${it.upgrades ? " · upgraded" : ""}${it.infused ? " · infused" : ""}</span></button>`; };
  const relics = Object.entries(h.relics);
  const costTxt = cost ? `${cost.gold} 🪙${cost.scrap ? ` + ${cost.scrap} ⚙️` : ""}${cost.starmetal ? ` + ${cost.starmetal} ✴️` : ""}` : "";
  const tabs = ""; // (Infusing retired with the loot rework: Extract and Empower at the Masterwork took its place.)
  const intro = s.mode === "fuse"
    ? `<p>"Put two things on my bench. Some of them belong together. Most of them don't. Either way, I get paid."</p>
       <p class="sub">Two relics, or two Rare-or-better trinkets that haven't been upgraded. Relics cost Gold and Scrap; trinkets also cost ✴️ Starmetal, more for higher rarities. A fusion that doesn't take still costs the fee.</p>`
    : `<p>"Give me a trinket and something to wear. I'll put the one inside the other. The trinket won't survive it."</p>
       <p class="sub">A weapon, off-hand or armour on the left, a trinket of the <b>same rarity</b> on the right (Rare or better, neither upgraded). The trinket's effects and bonuses move into the gear, and the trinket is gone. Costs Gold and ✴️ Starmetal, more for higher rarities.</p>`;
  return `<h2>💍 The Jeweller</h2>${tabs}<div class="forge-body room-body"><div class="panel">${intro}
    <p class="sub">Tries left this visit: <b>${left}</b>/${JEWEL_TRIES} · You have 🪙 ${h.f.gold} · ⚙️ ${h.scrap} · ✴️ ${h.starmetal}</p></div>
    <div class="jbench">${jewelSlotHtml(r, "left", s.left, s.mode === "infuse" ? "Gear" : "Empty")}<div class="jplus">${s.mode === "infuse" ? "⇐" : "＋"}</div>${jewelSlotHtml(r, "right", s.right, s.mode === "infuse" ? "Trinket" : "Empty")}</div>
    ${problem ? `<p class="center jwarn">${esc(problem)}</p>` : ""}
    <div class="row" style="justify-content:center"><button class="primary jfuse" data-jfuse ${can ? "" : "disabled"}>${left <= 0 ? "No tries left" : s.mode === "fuse" ? `💎 Combine${cost ? ` · ${costTxt}` : ""}` : `💠 Infuse${cost ? ` · ${costTxt}` : ""}`}</button></div>
    ${s.mode === "infuse" ? `<h3 class="jhead">Weapons, off-hands and armour</h3><div class="jpicks">${infusable.map(pick).join("") || `<p class="sub">Nothing to infuse.</p>`}</div>` : ""}
    <h3 class="jhead">Your trinkets</h3>
    <div class="jpicks">${trinkets.map(pick).join("") || `<p class="sub">No trinkets.</p>`}</div>
    ${s.mode === "fuse" ? `<h3 class="jhead">Your relics</h3>
    <div class="jpicks">${relics.length ? relics.map(([id, n]) => { const d = getItem(id); const x: JewelSlot = { kind: "relic", id }; return `<button class="jpick r-${d.rarity ?? "common"}" data-jpick="relic:${id}" ${onBench(x) ? "disabled" : ""}><b class="nm">${esc(d.name)}${n > 1 ? ` ×${n}` : ""}</b><span class="sub">Relic${FUSABLE_RELICS.has(id) ? ` · <span class="fusable-tag">🔗 Fusable</span>` : ""}</span></button>`; }).join("") : `<p class="sub">No relics.</p>`}</div>` : ""}</div>
    <div class="row" style="margin-top:14px"><button class="primary leave-wide" data-leave>🚪 Leave the Jeweller</button></div>`;
}

function sanctumScene(r: Run) {
  if (r.scene.t !== "sanctum") return "";
  const heart = r.hero.dragonHeart;
  const done = r.scene.done || heart?.unified;
  return `<h2>🐲 The Dragon Sanctum</h2><div class="panel crimson-foe"><p>${done
    ? "The heart sinks into your chest and does not stop. Your blood runs hot. Everything you are is more."
    : "Bones the size of bridges ring a pool of embers. Your Dragon Heart pounds against your ribs, as if it knows the way home."}</p>
    ${done ? `<p class="crimson-ink"><b>Unified.</b> Every one of your stats is 50% stronger, for the rest of the run.</p>` : `<p class="sub">Unify with the heart: every one of your stats becomes 50% stronger, for the rest of the run.</p>`}</div>
    <div class="row" style="margin-top:12px">${done ? `<button class="primary" data-leave>Leave the Sanctum</button>` : `<button class="crimson-btn" data-unify>🫀 Unify with the Dragon Heart</button><button data-leave>Not yet</button>`}</div>`;
}

function bountyCard(r: Run, q: { kind: string; target: number; status?: string; reward: Parameters<typeof rewardText>[0]; roomsLeft: number }, btn: string) {
  return `<div class="item bounty-card"><div class="meta">Contract · ${q.roomsLeft} ${r.gridMode ? "encounters" : "rooms"}</div><div class="nm">📋 ${esc(bountyText(q as Parameters<typeof bountyText>[0], r.hero.origin))}</div><p>Reward: <b>${esc(rewardText(q.reward))}</b></p>${btn}</div>`;
}

function bountyScene(r: Run) {
  if (r.scene.t !== "bounty") return "";
  const cur = r.bounty;
  return `<h2>📋 The Bounty Board</h2><div class="panel"><p>Notices nailed one over another, most of them stained. Pick one. Finish it within ${r.scene.offers[0]?.roomsLeft ?? 14} ${r.gridMode ? "encounters (anything you walk into counts)" : "rooms"} and the reward is yours.</p>
    ${cur ? `<p class="sub">You already hold a contract (${esc(bountyText(cur, r.hero.origin))} · ${bountyProgress(r.hero, cur)}/${cur.target}). Taking a new one tears up the old.</p>` : ""}</div>
    <div class="cards">${r.scene.offers.map((q, i) => bountyCard(r, q, `<button class="small primary" data-takebounty="${i}">Take this contract</button>`)).join("")}</div>
    <div class="row" style="margin-top:12px"><button data-leave>Leave the board</button></div>`;
}

function forgeAskPopup(r: Run) {
  const a = forgeAsk!;
  const uids = a.kind === "scrap" ? [a.uid] : [...offerSel];
  const wornItems = uids.map(u => findItem(r.hero, u)).filter(f => f && f.where !== "backpack").map(f => f!.item);
  const verb = a.kind === "scrap" ? "Scrap" : "Sacrifice";
  return `<div class="overlay popup-wrap"><div class="popup ask-pop">
    <div class="beat-icon">⚠️</div><h2 class="bright">${a.kind === "scrap" ? "Scrap gear you're wearing?" : "Offer gear you're wearing?"}</h2>
    <p>You're wearing ${wornItems.map(i => `<b>${esc(itemName(i))}</b>`).join(", ")}. ${a.kind === "scrap" ? "It will be broken down for good." : "It goes into the Forge with the rest, and may come back as nothing."}</p>
    <div class="row" style="justify-content:center;margin-top:12px"><button class="danger" data-askyes>${verb}</button><button data-askno>Keep it</button></div>
  </div></div>`;
}

function bountyPopup(r: Run) {
  const q = r.bounty;
  if (!q) return "";
  const n = Math.min(q.target, bountyProgress(r.hero, q));
  return `<div class="overlay popup-wrap"><div class="popup bounty-pop">
    <div class="beat-icon">📋</div><h2 class="bright">Your bounty</h2>
    <p class="big">${esc(bountyText(q, r.hero.origin))}</p>
    <div class="bar bounty-bar"><i style="width:${(n / q.target) * 100}%"></i></div>
    <p><b>${n}/${q.target}</b> done · <b>${q.roomsLeft}</b> ${r.gridMode ? "encounter" : "room"}${q.roomsLeft === 1 ? "" : "s"} left</p>
    <p>Reward: <b>${esc(rewardText(q.reward))}</b></p>
    ${bountyDone(r) ? `<p class="crimson-ink">Done! You'll be paid ${r.gridMode ? "after your next encounter" : "when you're back on the path"}.</p>` : ""}
    <div class="row" style="justify-content:center"><button class="closebtn" data-closebounty>✕ Close</button></div></div></div>`;
}

function tributeScene(r: Run) {
  if (r.scene.t !== "tribute") return "";
  const h = r.hero;
  const cost = tributeCost(r);
  const ids = Object.keys(h.curses);
  return `<h2>🕍 Holy Tribute</h2><div class="panel"><p>"${r.scene.paid ? "Another? The light grows dearer with each burden." : "One burden at a time, child. The light is patient. The plate is not."}"</p>
    <p class="sub">Lift one curse at a time. Each one costs more than the last. You have 🪙 <b>${h.f.gold}</b>.</p></div>
    ${ids.length ? `<div class="cards">${ids.map(id => { const d = getItem(id); const n = h.curses[id]; return `<div class="item curse-card"><div class="nm">🕯️ ${esc(d.name)}${n > 1 ? ` ×${n}` : ""}</div><p>${esc(d.text)}.</p>
      <button class="small primary" data-tribute="${id}" ${h.f.gold < cost ? "disabled" : ""}>Lift it · ${cost} 🪙</button></div>`; }).join("")}</div>`
      : `<p>The priest smiles. "You walk clean. Go with the light."</p>`}
    <div class="row" style="margin-top:12px"><button class="${ids.length ? "" : "primary"}" data-leave>Leave</button></div>`;
}

function smithScene(r: Run) {
  if (r.scene.t !== "smith") return "";
  const s = r.scene;
  return `<h2>⚒️ The Wandering Blacksmith</h2><div class="panel"><p>"Two jobs, free of charge. Pick your pieces."</p><p class="sub"><b>${s.uses}</b> free upgrade${s.uses === 1 ? "" : "s"} left. Each one raises an item's level by 1, like the Forge.</p></div>
    ${s.uses > 0 ? `${gearGroups(r, it => itemCard(it, `<button class="small primary" data-smith="${it.uid}">Upgrade free · to level ${it.level + 1}</button>`, false, equippedSlot(r, it)))}` : ""}
    <div class="row" style="margin-top:12px"><button class="${s.uses ? "" : "primary"}" data-leave>${s.uses ? "Leave the rest" : "Thank him and move on"}</button></div>`;
}

function confirmScene(r: Run) {
  if (r.scene.t !== "confirm") return "";
  const info = ROOM_INFO[r.scene.room];
  if (r.scene.room === "crimson_vault") {
    return `<h2>${info.icon} ${info.name}</h2><div class="panel crimson-foe"><p>${esc(info.text)}</p><p class="sub">Crimson bosses are far harder than a floor boss. Win and you choose between a Crimson item and two boss finds. Lose and <b>your run is over</b>. You have ${r.hero.crimsonKeys} key${r.hero.crimsonKeys === 1 ? "" : "s"}.</p></div>
    <div class="row" style="margin-top:12px"><button class="primary crimson-btn" data-risk="yes">Turn the key</button><button data-risk="no">Not yet</button></div>`;
  }
  const head = r.gridMode && r.scene.room === "vault" ? chestHead(info.name) : null;
  return `${head ?? `<h2>${info.icon} ${info.name}</h2>`}<div class="panel"><p>${esc(info.text)}</p><p class="sub">A Resplendent chest holds three face-down cards. Pick one; the rest are lost. Any of them could be Legendary.</p></div>
  <div class="row" style="margin-top:12px"><button class="primary" data-risk="yes">Accept the risk</button><button data-risk="no">Walk away</button></div>`;
}

function killerPanel(r: Run) {
  const k = r.killer!;
  const pct = k.maxHp ? Math.min(100, Math.max(0, (k.hp / k.maxHp) * 100)) : 0;
  return `<div class="panel fighter killer ${k.crimson ? "crimson-foe" : ""}">
    <div class="sub killer-tag">☠️ Slain by</div>
    <div class="row"><b>${esc(k.name)}</b>${k.title ? `<span class="sub">${esc(k.title)}</span>` : ""}<span class="grow"></span><span class="sub">${esc([k.family, k.crimson ? "Crimson" : "", k.rank].filter(Boolean).join(" · "))}</span></div>
    <div class="bar enemy"><i style="width:${pct}%"></i></div>
    <div class="sub">${big(k.hp)}/${big(k.maxHp)} HP left · ${k.name === "DEATH" ? "Power ☠️" : `Power ${big(k.damage)}`} · Armor ${k.armor}</div>
    <div class="chips">${k.traits.map(t => `<span class="chip">${esc(t)}</span>`).join("")}${k.statuses.map(([s, n]) => STATUS_INFO[s as StatusId] ? `<span class="chip">${STATUS_INFO[s as StatusId].icon} ${STATUS_INFO[s as StatusId].name} ${n}</span>` : "").join("")}</div>
  </div>`;
}

/** Send a finished run to the leaderboards (once), then show where it placed. */
function sendRun(r: Run) {
  if (!leaderboardOn() || r.submitted) return;
  lbResult = "sending";
  // (The answer can arrive after you've already left this run: then it must not save the old run back over the cleared one.)
  void submitRun(r, VERSION).then(res => { if (run !== r) return; lbResult = res; if (res) { r.lbDone = true; if (r.scene.t === "over") saveRun(r, banked); } render(); });
}

const fmtN = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${(n / 1e3).toFixed(1)}k` : String(n));

/** The run's leaderboard numbers, and the name / submit box. */
function runStatsPanel(r: Run) {
  const x = runSummary(r);
  const tiles = `<div class="lb-stats">
    <span>🕳️ Floor <b>${x.floor}</b></span><span>💀 Elites <b>${x.elites}</b></span><span>👹 Champions <b>${x.champions}</b></span>
    <span>⚔️ Damage <b>${fmtN(x.damage)}</b></span><span>💥 Biggest hit <b>${fmtN(x.bestHit)}</b></span><span>🪙 Gold earned <b>${fmtN(x.gold)}</b></span></div>`;
  if (!leaderboardOn()) return tiles;
  const name = playerName();
  let box: string;
  if (!name || lbNaming) {
    box = `<div class="lb-name"><p><b>🏆 Put this run on the leaderboards</b></p>
      <div class="row"><input id="lb-name" maxlength="16" placeholder="Your name" value="${esc(name)}" autocomplete="nickname"><button class="primary small" data-lbsubmit>${r.submitted ? "Save name" : "Submit"}</button></div>
      <p class="sub">Up to 16 letters. It's remembered: your next runs go up by themselves.</p></div>`;
  } else if (lbResult === "sending") box = `<p class="lb-placed">🏆 Sending to the leaderboards…</p>`;
  else if (lbResult && lbResult.verified === false) box = `<p class="lb-placed">🏆 This run couldn't be verified, so it isn't on the leaderboards. ${r.sid ? "The server couldn't confirm how it went (for example, floors cleared faster than it allows)." : "It began without a connection to the leaderboard server (offline, or before verification was added)."}</p>`;
  else if (lbResult && lbResult.ranks) {
    const rk = lbResult.ranks;
    const named = [...SUB_BOARDS.campaign, { id: "abyss" as Board, label: "Abyss", icon: "🕳️", unit: "" }, { id: "daily" as Board, label: "Daily", icon: "📅", unit: "" }];
    const best = named.filter(b => (rk[b.id] ?? 99) <= 10).map(b => `${b.icon} #${rk[b.id]} ${b.label}`);
    box = `<p class="lb-placed">🏆 On the leaderboards as <b>${esc(name)}</b>${best.length ? ` · ${best.join(" · ")}` : ` · #${rk.floor} deepest`}</p>
      <div class="row"><button class="small" data-lb>See the leaderboards</button><button class="small" data-lbrename>Change name</button></div>`;
  } else if (r.submitted) box = `<p class="lb-placed">🏆 Couldn't reach the leaderboards. This run will be sent when you're back online.</p>`;
  else box = `<div class="row"><button class="small primary" data-lbsend>🏆 Submit as ${esc(name)}</button><button class="small" data-lbrename>Change name</button></div>`;
  return tiles + box;
}

function leaderboardPopup() {
  const ORIGIN_IC: Record<string, string> = { warrior: "🛡️", rogue: "🗡️", mage: "🔮", cleric: "✨" };
  const main = ([["campaign", "🏰 Dungeon"], ["daily", "📅 Daily"], ["abyss", "🕳️ Abyss"], ["heat", "🔥 Heat"], ["bounty", "🎯 Bounty"]] as [Scope, string][])
    .map(([k, l]) => `<button class="lb-main ${lbScope === k ? "active" : ""}" data-lbscope="${k}">${l}</button>`).join("");
  const subs = lbScope === "bounty" ? [] : SUB_BOARDS[lbScope];
  const unit = subs.find(b => b.id === lbBoard);
  const subTabs = subs.map(b => `<button class="small ${lbBoard === b.id ? "primary" : ""}" data-lbboard="${b.id}">${b.icon} ${b.label}</button>`).join("");
  const classTabs = [["", "All"], ...Object.entries(ORIGINS).map(([id, o]) => [id, `${ORIGIN_IC[id] ?? ""} ${o.name}`])]
    .map(([id, l]) => `<button class="small lb-class ${lbOrigin === id ? "active" : ""}" data-lborigin="${id}">${l}</button>`).join("");
  let body: string;
  if (!leaderboardOn()) body = `<p class="sub center">The leaderboards are being set up. Check back soon!</p>`;
  else if (lbError) body = `<p class="sub center">${esc(lbError)}</p>`;
  else if (lbScope === "bounty") {
    body = !lbKillers ? `<p class="sub center">Loading…</p>`
      : !lbKillers.length ? `<p class="sub center">Nothing has claimed a hero yet. Give it time.</p>`
      : `<ol class="lb-list">${lbKillers.map(k => `<li class="${k.rank <= 3 ? `top${k.rank}` : ""}"><span class="lb-rank">${k.rank <= 3 ? ["🥇", "🥈", "🥉"][k.rank - 1] : `#${k.rank}`}</span><span class="lb-nm">☠️ ${esc(k.name)} <span class="lb-title">${k.players} player${k.players === 1 ? "" : "s"}</span></span><b class="lb-val">${fmtN(k.kills)}</b></li>`).join("")}</ol>`;
  } else if (!lbRows) body = `<p class="sub center">Loading…</p>`;
  else if (!lbRows.length) body = `<p class="sub center">${lbScope === "daily" && lbBoard !== "alltime" ? "Nobody has played today's Daily Dungeon yet. Be the first!" : "Nobody's on this board yet. Be the first!"}</p>`;
  else body = `<ol class="lb-list">${lbRows.map(row => `<li class="${row.you ? "you" : ""} ${row.rank <= 3 ? `top${row.rank}` : ""}"><span class="lb-rank">${row.rank <= 3 ? ["🥇", "🥈", "🥉"][row.rank - 1] : `#${row.rank}`}</span><span class="lb-nm">${ORIGIN_IC[row.origin] ?? ""} ${esc(row.name)}${row.title ? ` <span class="lb-title">“${esc(row.title)}”</span>` : ""}${row.you ? " <i>(you)</i>" : ""}${row.plates ? ` <span class="lb-plates" title="Vanadium Plates">⬛${row.plates}</span>` : ""}${row.day ? ` <span class="lb-title">📅 ${esc(row.day)}</span>` : ""}${row.heat ? ` <span class="lb-plates" title="Heat">🔥${row.heat}</span>` : ""}</span><b class="lb-val">${fmtN(row.value)}</b></li>`).join("")}</ol>
    ${lbMe ? `<p class="lb-me">You: #${lbMe.rank} · ${fmtN(lbMe.value)}</p>` : ""}`;
  const note = lbScope === "bounty" ? "The foes that have ended the most runs, and how many players they've claimed."
    : lbScope === "daily" && lbBoard !== "alltime" ? `Each player's best run in today's Daily Dungeon · ${esc(unit?.unit ?? "")}. Resets at midnight UTC; the best stay on All time.`
    : `Each player's best run · ${esc(unit?.unit ?? "")}`;
  return `<div class="overlay dg-overlay"><div class="inner lb-pop">
    <div class="dg-head"><h1 class="grow">Leaderboards</h1><button class="plank-btn small" data-lbclose>Close</button></div>
    <div class="lb-mains">${main}</div>
    ${lbScope === "bounty" ? "" : `${subs.length > 1 ? `<div class="row lb-tabs">${subTabs}</div>` : ""}<div class="row lb-classes">${classTabs}</div>`}
    <p class="sub lb-note">${note}</p>
    ${body}
  </div></div>`;
}

function loadBoard(board: Board) {
  lbBoard = board; lbRows = null; lbMe = null; lbError = "";
  if (!leaderboardOn()) return;
  if (lbScope === "bounty") {
    lbKillers = null;
    fetchKillers().then(rows => { if (lbScope === "bounty") lbKillers = rows; render(); })
      .catch(() => { lbError = navigator.onLine ? "Couldn't load the Bounty board. Try again in a moment." : "You're offline. The leaderboards need a connection."; render(); });
    return;
  }
  const scope = lbScope, origin = lbOrigin;
  fetchBoard(scope, board, origin).then(d => { if (lbBoard === board && lbScope === scope && lbOrigin === origin) { lbRows = d.rows; lbMe = d.me; } render(); })
    .catch(() => { lbError = navigator.onLine ? "Couldn't load the leaderboard. Try again in a moment." : "You're offline. The leaderboards need a connection."; render(); });
}

function overScene(r: Run) {
  if (r.scene.t !== "over") return "";
  if (r.gridMode) return crawlOver(r);
  const h = r.hero;
  const won = r.scene.won;
  const abyss = r.mode === "abyss";
  return `<div class="banner ${won ? "won" : "lost"}">${r.finale ? "Nothing remains. You won everything." : won && abyss ? "You reached the bottom of the Abyss!" : won ? "The Hollow King falls. You win!" : r.abandoned ? "You gave up the run." : "You have fallen."}</div>
  ${!won && r.killer && !r.abandoned ? killerPanel(r) : ""}
  <div class="panel"><p>${abyss ? `Abyss · Depth ${Math.min(r.floor, ABYSS_FLOORS)}/${ABYSS_FLOORS}${r.hero.plates ? ` · ⬛ ${r.hero.plates} plates` : ""}` : `${r.daily ? `📅 Daily ${r.daily} · ` : ""}${r.mode === "endless" ? "Endless · " : ""}Floor ${r.floor}`} · Level ${h.level} · ${r.stats.kills} kills · ${r.stats.bosses} bosses</p>
  ${recorded?.achievements.length ? `<div class="ach-earned">${recorded.achievements.map(id => { const a = ACHIEVEMENTS.find(x => x.id === id)!; return `<p>🏆 <b>${esc(a.name)}</b> — ${esc(a.text)} <span class="sub">(+${a.renown} Renown${a.title ? ` · title “${esc(a.title)}”` : ""})</span></p>`; }).join("")}</div>` : ""}
  ${recorded?.mastery?.gained ? `<p class="mastery-line">${ORIGIN_ICON[recorded.mastery.origin as OriginId]} ${esc(ORIGINS[recorded.mastery.origin as OriginId].name)} Mastery +${recorded.mastery.gained}${recorded.mastery.levelUp ? ` · <b>level ${recorded.mastery.level}!</b>${recorded.mastery.level === KIT_COMMON_LEVEL ? " Starting kit choices unlocked." : recorded.mastery.level === KIT_UNCOMMON_LEVEL ? " Uncommon kit choices unlocked." : ""}` : ""}</p>` : ""}
  ${recorded ? `<p>🏅 +${recorded.earned} Renown (total ${meta.renown})${recorded.unlocked.length ? ` · Unlocked: <b>${recorded.unlocked.map(esc).join(", ")}</b>` : ""}</p>` : ""}
  ${runStatsPanel(r)}
  <p class="sub">Final build:</p><div class="cards">${EQUIP_SLOTS.map(s => h.equip[s]).filter((x): x is GearItem => !!x).map(it => itemCard(it)).join("")}</div></div>
  <div class="row end-actions" style="margin-top:12px">${r.ruin?.shards || r.ruin?.plates ? `<p class="ruin-line">Kept for good: ${r.ruin.shards ? `🪨 ${r.ruin.shards} Ruin Shard${r.ruin.shards === 1 ? "" : "s"}` : ""}${r.ruin.shards && r.ruin.plates ? " · " : ""}${r.ruin.plates ? `⬛ ${r.ruin.plates} Vanadium Plate${r.ruin.plates === 1 ? "" : "s"}` : ""}</p>` : ""}
  ${won && !r.finale && !abyss ? `<button class="delve-btn" data-endless><span class="dv-ic">🌀</span><span class="dv-txt"><b>Delve deeper</b><span>The dungeon goes on. Better loot below.</span></span><span class="dv-arrow">›</span></button>` : ""}<button class="${won ? "" : "primary"}" data-newrun>New run</button></div>`;
}

/** What's in each Inventory tab, in short: when it changes, the tab gets a "new" dot until you open it. */
function tabSigs(r: Run): Record<BagTab, string> {
  const h = r.hero;
  const p = h.f.persist;
  const ks = (o: Record<string, number> | undefined) => Object.entries(o ?? {}).filter(([, n]) => n > 0).map(([k, n]) => `${k}${n}`).sort().join(",");
  return {
    gear: `${h.backpack.map(i => i.uid).sort((a, b) => a - b).join(",")}|${(h.sigilBag ?? []).map(x => x.uid).join(",")}`,
    stats: "",
    attrs: String(h.attrPoints ?? 0),
    relics: `${ks(h.relics)}|${h.crucible ? 1 : 0}`,
    talents: `${ks(h.talents)}|${ks(h.curses)}`,
    extras: [h.keepsake ?? "", h.dragonHeart?.level ?? 0, (p["angelFights"] ?? 0) > 0, (p["blessFights"] ?? 0) > 0, (p["cloverChests"] ?? 0) > 0, ks(h.tonics)].join("|")
  };
}
/** Tabs with something new since you last looked. */
function newTabs(r: Run): Set<BagTab> {
  const sig = tabSigs(r);
  if (!r.seenTabs) r.seenTabs = { ...sig };
  return new Set((Object.keys(sig) as BagTab[]).filter(k => r.seenTabs![k] !== undefined && r.seenTabs![k] !== sig[k] && !(bagOpen && bagTab === k)));
}

/** The Talisman: worn sigils (and locked slots), set progress, and the sigil bag. */
function talismanHtml(r: Run, inCombat: boolean) {
  const h = r.hero;
  const slots = sigilSlots(h);
  const worn = h.sigils ?? [];
  const bag = h.sigilBag ?? [];
  const sigText = (sg: Sigil) => {
    const gm = GEN_MODULE_MAP.get(sg.id);
    return gm ? fillText(gm.text, modValue(gm, sg.tier ?? 2, 0, sg.level)) : fillText(getItem(sg.id).text, sg.level);
  };
  const setOf = (sg: Sigil) => SIGIL_SETS.find(x => x.pieces.includes(sg.id));
  const card = (sg: Sigil, btns: string) => { const set = setOf(sg); return `<div class="sigil ${set ? "set" : ""}"><div class="row"><b class="grow">🔮 ${esc(sigilName(sg))}</b>${set ? `<span class="sub">${set.icon} ${esc(set.name)}</span>` : ""}</div><p class="sub">${esc(sigText(sg))} · found on floor ${sg.level}</p>${inCombat ? "" : `<div class="row">${btns}</div>`}</div>`; };
  const wornIds = new Set(worn.map(x => x.id));
  const owned = new Set([...worn, ...bag].map(x => x.id));
  const sets = SIGIL_SETS.filter(set => set.pieces.some(p => owned.has(p))).map(set => {
    const n = set.pieces.filter(p => wornIds.has(p)).length;
    return `<div class="sigil-set"><div class="row"><b class="grow">${set.icon} ${esc(set.name)}</b><span class="sub">${n}/${set.pieces.length} worn · ${set.pieces.filter(p => owned.has(p)).length} found</span></div>
      ${set.bonuses.map(([need, id]) => `<p class="${n >= need ? "set-on" : "sub"}">(${need}) ${esc(getItem(id).text)}</p>`).join("")}</div>`;
  }).join("");
  const locked = SIGIL_FLOORS.filter(f => (h.f.persist["floor"] ?? 1) < f);
  return `<p class="sub">Sigils sit outside your gear. Wear different pieces of the same set to unlock its bonuses.</p>
    <h3 class="jhead">Worn · ${worn.length}/${slots}</h3>
    ${worn.map(sg => card(sg, `<button class="small" data-sigoff="${sg.uid}">Take off</button>`)).join("")}
    ${Array.from({ length: Math.max(0, slots - worn.length) }, () => `<div class="sigil empty-slot"><span class="sub">Empty slot</span></div>`).join("")}
    ${locked.map(f => `<div class="sigil locked"><span class="sub">🔒 Opens on floor ${f}</span></div>`).join("")}
    ${sets ? `<h3 class="jhead">Sets</h3>${sets}` : ""}
    <h3 class="jhead">Sigil bag · ${bag.length}/${SIGIL_BAG_SIZE}</h3>
    ${bag.length ? bag.map(sg => card(sg, `<button class="small primary" data-sigon="${sg.uid}">Wear</button><button class="small take-scrap" data-sigscrap="${sg.uid}">Scrap</button>`)).join("") : `<p class="sub">No sigils yet. Elites, Champions, bosses and chests sometimes carry them.</p>`}`;
}

function bag(r: Run, bodyOnly = false) {
  const h = r.hero;
  const inCombat = r.scene.t === "combat";
  const slotName: Record<EquipSlot, string> = { main: "Main hand", off: "Off-hand", armour: "Armour", trinket1: "Trinket 1", trinket2: "Trinket 2", trinket3: "Trinket 3 ★" };
  const equipped = openSlots(h).map(s => {
    const it = h.equip[s];
    return `<div><div class="slot-label">${slotName[s]}</div>${it ? itemCard(it, inCombat ? "" : `<button class="small" data-unequip="${s}">Unequip</button>${revealBtn(r, it)}`) : `<div class="item"><span class="sub">Empty</span></div>`}</div>`;
  }).join("");
  const pack = h.backpack.map(it => itemCard(it, inCombat ? "" : `${slotsFor(it, h).map(s => `<button class="small primary" data-equip="${it.uid}" data-slot="${s}">Equip${slotsFor(it, h).length > 1 ? ` (${slotName[s].toLowerCase()})` : ""}</button>`).join("")}${r.gridMode ? "" : `<button class="small take-scrap" data-salvage="${it.uid}">Scrap</button>`}${revealBtn(r, it)}`, !inCombat)).join("");
  const fusable = (id: string) => (FUSABLE_RELICS.has(id) ? ` <span class="fusable-tag">🔗 Fusable</span>` : "");
  const list = (o: Record<string, number>, cls = "") => Object.entries(o).map(([id, n]) => { const d = getItem(id); return `<p class="${cls}"><b class="nm">${esc(d.name)}</b>${n > 1 ? ` ×${n}` : ""}${cls === "relic-line" ? fusable(id) : ""} — <span class="desc">${esc(fillText(d.text, n))}</span></p>`; }).join("") || `<p class="sub">None yet.</p>`;
  const passive = getItem(ORIGINS[h.origin].passive);
  const f = h.f;
  const crits = f.faces.filter(x => x.kind === "crit").length;
  const misses = f.faces.filter(x => x.kind === "miss").length;
  // Derived stats, so you can see what your build adds up to.
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const sides = f.faces.length;
  const hitFaces = f.faces.filter(x => x.kind === "hit").length;
  const critChance = crits / sides + (hitFaces / sides) * ((f.critChance ?? 0) / 100);
  const missChance = (misses + f.faces.filter(x => x.kind === "graze").length * 0.5) / sides;
  const guardArmor = f.armor * ((f.items["r_fortress_heart"] ?? 0) > 0 ? 3 : 2);
  let healMul = 1;
  eachHook(f, "healMult", (fn, n) => (healMul *= fn(n)));
  let rxMul = 1;
  eachHook(f, "reactionMult", (fn, n) => (rxMul *= fn({} as never, f, n)));
  const staticCapNow = (f.items["t_boundless_static"] ?? 0) > 0 ? "∞" : (f.items["l_storm_rod"] ?? 0) > 0 || (f.items["lr_stormheart"] ?? 0) > 0 ? "20" : "10";
  const tile = (icon: string, label: string, value: string, tip = "") => `<div class="stile" title="${esc(tip)}"><span class="si">${icon}</span><span class="sl">${label}</span><b>${value}</b></div>`;
  const stats = `<div class="panel">
      <div class="row stat"><span>❤️ <b>${Math.max(0, f.hp)}</b>/${f.maxHp}</span><span>Lv <b>${h.level}</b> (${h.xp}/${xpToLevel(h.level)} XP)</span>
        <span>🪙 ${f.gold}</span><span>⚙️ ${h.scrap}</span>${h.azure ? `<span>💠 ${h.azure}</span>` : ""}${h.orilium ? `<span>🔶 ${h.orilium}</span>` : ""}<span>✴️ ${h.starmetal}</span><span>📜 ${h.scrolls}</span><span>🧪 ${h.potions}</span>${h.manaPotions ? `<span>🔷 ${h.manaPotions}</span>` : ""}</div>
      <div class="stiles">
        ${tile("⚔️", "Damage", `${f.damage}${f.offDamage !== undefined ? ` + ${f.offDamage}` : ""}`, "Main die damage (+ off-hand die)")}
        ${f.critDmg ? tile("💥", "Crit damage", `+${f.critDmg}%`, "Your Crits deal this much more") : ""}
        ${tile("🎯", "Crit chance", pct(critChance), `${crits} of ${sides} faces crit${f.critChance ? `, plus ${f.critChance}% Crit chance on Hits` : ""} (double damage, ignores Armor)`)}
        ${tile("🌫️", "Miss chance", pct(missChance), "Miss faces count fully, Grazes as half")}
        ${tile("🛡️", "Armor", `${f.armor}`, "Armor stops a percentage of each hit")}
        ${tile("🧱", "Damage stopped", `${pct(armorReduction(f.armor, false))}${canGuard(h) ? ` · ${pct(armorReduction(guardArmor, true))} guarding` : ""}`, canGuard(h) ? "How much of a hit your Armor stops, and while Guarding" : "How much of a hit your Armor stops (you need a shield to Guard)")}
        ${tile("💨", "Dodge", `${f.dodge ?? 0}%`, "Chance to dodge a hit entirely (max 60%)")}
        ${tile("💥", "Bash", `${f.bash ?? 0}%`, "Chance your weapon Bashes: Stun and +50% (max 30%)")}
        ${tile("🔮", "Spell Amp", `+${f.spellAmp ?? 0}%`, "Extra damage on spell faces")}
        ${f.dotAmp ? tile("🧪", "Status damage", `+${f.dotAmp}%`, "Burn, Bleed, Poison and Static on the enemy hurt more") : ""}
        ${tile("💚", "Healing", `${healMul >= 1 ? "+" : ""}${Math.round((healMul - 1) * 100)}%`, "Bonus to all healing you receive")}
        ${tile("✴️", "Reactions", `${rxMul >= 1 ? "+" : ""}${Math.round((rxMul - 1) * 100)}%`, "Bonus to reaction damage")}
        ${tile("🔋", "Static cap", staticCapNow, "Most Static you can stack on an enemy")}
      </div>
      <p class="sub" style="margin:6px 0 0">🎲 d${sides}: ${f.faces.map((x, i) => `${i + 1} ${x.name ?? x.kind}`).join(" · ")}</p></div>`;
  // Every slot you're using holds a Legendary (or Crimson): the whole bag glows.
  const slotsOpen = openSlots(h);
  const worn = slotsOpen.map(s => h.equip[s]);
  const twoHander = h.equip.main && effectiveBase(h.equip.main).twoHanded && !keepsOffHand(h);
  const needed = worn.filter((it, i) => !(slotsOpen[i] === "off" && twoHander && !it));
  const legendSet = needed.every(it => it && (it.rarity === "legendary" || it.rarity === "crimson"));
  const keepsakeHtml = h.keepsake ? `<div class="item keepsake"><div class="meta">Keepsake</div><div class="nm">🕯️ ${esc(getItem(h.keepsake).name)}</div><p>${esc(getItem(h.keepsake).text)}.</p></div>`
    : `<div class="item keepsake empty-slot"><div class="meta">Keepsake</div><div class="nm">🕯️ Empty</div><p class="sub">Something rare could rest here. Bosses deep below sometimes leave one behind…</p></div>`;
  const angel = h.f.persist["angelFights"] ?? 0, dragon = h.f.persist["blessFights"] ?? 0, clover = h.f.persist["cloverChests"] ?? 0;
  const blessCount = (angel > 0 ? 1 : 0) + (dragon > 0 ? 1 : 0) + (clover > 0 ? 1 : 0);
  const heart = h.dragonHeart;
  const heartHtml = heart ? `<div class="item dragon-heart"><div class="meta">Crimson · level ${heart.level}</div><div class="nm">🫀 Dragon Heart</div><p>${heart.unified
      ? "Unified. It beats in your chest now: every one of your stats is 50% stronger."
      : "Torn from a slain dragon, still beating. Somewhere in the dark, a Dragon Sanctum could bind it to you."}</p></div>`
    : `<div class="item dragon-heart empty-slot"><div class="meta">Dragon Heart</div><div class="nm">🫀 Empty</div><p>A place for a dragon's heart. Few who go looking for one come back.</p></div>`;
  // Three Artefact slots. Only the first (the Transmuter's Crucible) exists so far; the other two are still a mystery.
  const artTile = (filled: boolean, icon: string, name: string, text: string, tip: string) =>
    `<div class="art-tile ${filled ? "filled" : "empty-slot"}" title="${esc(tip)}"><div class="art-ic">${icon}</div><div class="nm">${name}</div><p>${text}</p></div>`;
  const artefactsHtml = `<div class="art-group"><div class="art-grid">${
    h.crucible
      ? artTile(true, "⚗️", "Transmuter's Crucible", "At a Forge: Common → Legendary", `Once the key to transmuting. Now any Masterwork can turn a Common item into a Legendary of the same kind for ${TRANSMUTE_COST} Starmetal.`)
      : artTile(false, "⚗️", "Empty", "Learn it at the Camp…", "The Knowledge Table can teach you the Crucible's secret. With it, a Forge can do something remarkable…")
  }${artTile(false, "❔", "Empty", "Unknown", "Something old and strange belongs here.")}${artTile(false, "❔", "Empty", "Unknown", "Something old and strange belongs here.")}</div>
    <div class="stile extra-tile star-tile" style="margin-top:10px"><span>✴️</span><span><b>${h.starmetal}</b> Starmetal<span class="sub">${h.crucible ? "Feeds the Crucible at the Forge. Jewellers want it too." : "A rare metal from the finest gear. Scrap Legendaries and Crimson gear for it."}</span></span></div></div>`;
  const extras = `${keepsakeHtml}${heartHtml}
    <div class="bag-extras">
      <div class="stile extra-tile key-tile"><span>🗝️</span><span><b>${h.crimsonKeys}</b> Crimson Key${h.crimsonKeys === 1 ? "" : "s"}<span class="sub">${h.crimsonKeys ? "A Crimson Vault will be on your path." : "Dropped by Crimson Elites, deep below."}</span></span></div>
      <div class="stile extra-tile scroll-tile"><span>📜</span><span><b>${h.scrolls}</b> Scroll${h.scrolls === 1 ? "" : "s"} of Revelation<span class="sub">${h.scrolls ? "Use one on a hidden Legendary in the Gear tab." : "Reveals a hidden Legendary's true power."}</span></span></div>
      ${Object.keys(h.tonics ?? {}).length ? `<div class="stile extra-tile" style="grid-column: 1 / -1"><span>⚗️</span><span><b>Tonics</b><span class="sub">${Object.entries(h.tonics!).map(([id, n]) => `${TONICS[id].icon} ${esc(TONICS[id].name)}${n > 1 ? ` ×${n}` : ""}`).join(", ")}</span></span></div>` : ""}
    </div>
    <h2>Blessings</h2>
    <div class="bag-extras">
      ${angel > 0 ? `<div class="stile extra-tile angel-tile"><span>👼</span><span><b>Angelic Blessing</b><span class="sub">Immune to negative statuses; heal 2 at the start of each fight · ${angel} fight${angel === 1 ? "" : "s"} left</span></span></div>` : ""}
      ${clover > 0 ? `<div class="stile extra-tile clover-tile"><span>🍀</span><span><b>Four-Leaf Clover</b><span class="sub">Slightly better odds of Rare, Epic and Legendary from chests · ${clover} chest${clover === 1 ? "" : "s"} left</span></span></div>` : ""}
      ${dragon > 0 ? `<div class="stile extra-tile bless-tile"><span>🐲</span><span><b>Dragon's Blessing</b><span class="sub">${esc(BLESSINGS[h.f.persist["blessKind"] ?? 0])} · ${dragon} fight${dragon === 1 ? "" : "s"} left</span></span></div>` : ""}
      ${blessCount === 0 ? `<div class="stile extra-tile empty-slot" style="grid-column: 1 / -1"><span>✨</span><span><b>None</b><span class="sub">Shrines and strange creatures in the dark sometimes grant blessings…</span></span></div>` : ""}
    </div>`;
  const nRelics = Object.keys(h.relics).length;
  const nCurses = Object.values(h.curses).reduce((a, n) => a + n, 0);
  const nTalents = Object.keys(h.talents).length;
  const tabs: [BagTab, string, string][] = [
    ["gear", "⚔️ Gear", `${h.backpack.length ? `<i>${h.backpack.length}</i>` : ""}`],
    ["stats", "📊 Stats", ""],
    ["relics", "💎 Spoils", `${nRelics + (h.crucible ? 1 : 0) ? `<i>${nRelics + (h.crucible ? 1 : 0)}</i>` : ""}`],
    ["talents", "🧿 Aspects", `${nTalents + nCurses ? `<i>${nTalents + nCurses}</i>` : ""}`],
    ["extras", "✨ Extras", `${blessCount + h.scrolls + h.crimsonKeys ? `<i>${blessCount + h.scrolls + h.crimsonKeys}</i>` : ""}`]
  ];
  const fresh = newTabs(r);
  r.seenTabs![bagTab] = tabSigs(r)[bagTab];
  const body =
    bagTab === "gear" ? `${inCombat ? `<p class="sub">You can look, but you can't change gear mid-fight.</p>` : ""}<div class="row subtabs">
        <button class="small ${gearSub === "equipped" ? "primary" : ""}" data-gearsub="equipped">🛡️ Equipped</button>
        <button class="small ${gearSub === "backpack" ? "primary" : ""}" data-gearsub="backpack">🎒 Backpack ${h.backpack.length}/${packSize(h)}</button>
        <button class="small ${gearSub === "sigils" ? "primary" : ""}" data-gearsub="sigils">🔮 Sigils${(h.sigils?.length ?? 0) + (h.sigilBag?.length ?? 0) ? ` (${(h.sigils?.length ?? 0) + (h.sigilBag?.length ?? 0)})` : ""}</button>
        <button class="small ${gearSub === "scrolls" ? "primary" : ""}" data-gearsub="scrolls">📜 Scrolls${h.powerScrolls?.length ? ` (${h.powerScrolls.length}/${SCROLL_SLOTS})` : ""}</button></div>
      ${gearSub === "equipped" ? `<div class="gear-group equipped-group solo"><div class="cards">${equipped}</div></div>`
        : gearSub === "sigils" ? talismanHtml(r, inCombat)
        : gearSub === "scrolls" ? scrollsHtml(h, false)
        : `${inCombat ? "" : bulkScrapRow(h)}<div class="gear-group backpack-group solo"><div class="cards">${pack || `<p class="sub">Empty.</p>`}</div></div>`}`
    : bagTab === "stats" ? `<div class="row subtabs">
        <button class="small ${statsSub === "attributes" ? "primary" : ""}" data-statssub="attributes">📊 Attributes</button>
        <button class="small ${statsSub === "statuses" ? "primary" : ""}" data-statssub="statuses">✴️ Statuses & reactions</button></div>
      ${statsSub === "attributes" ? `${stats}<p><b>${esc(passive.name)}</b> (origin) — ${esc(passive.text)}.</p>` : reactionsPanel(r) || `<p class="sub">No reactions yet this run.</p>`}`
    : bagTab === "relics" ? `<div class="row subtabs">
        <button class="small ${spoilsSub === "relics" ? "primary" : ""}" data-spoilsub="relics">💎 Relics${nRelics ? ` (${nRelics})` : ""}</button>
        <button class="small ${spoilsSub === "artefacts" ? "primary" : ""}" data-spoilsub="artefacts">⚗️ Artefacts${h.crucible ? " (1)" : ""}</button></div>
      ${spoilsSub === "relics" ? (nRelics ? list(h.relics, "relic-line") : `<p class="sub">No relics yet.</p>`) : artefactsHtml}`
    : bagTab === "talents" ? `<div class="row subtabs">
        <button class="small ${talentSub === "talents" ? "primary" : ""}" data-talentsub="talents">🌟 Talents${nTalents ? ` (${nTalents})` : ""}</button>
        <button class="small curse-subtab ${talentSub === "curses" ? "primary" : ""}" data-talentsub="curses">🕯️ Curses${nCurses ? ` (${nCurses})` : ""}</button></div>
      ${talentSub === "talents" ? list(h.talents, "talent-line")
        : `${nCurses ? list(h.curses, "curse-line") : `<p class="sub">You carry no curses. Shrines, cursing foes and dark magic can lay them on you, and only something holy can lift them.</p>`}`}`
    : extras;
  if (bodyOnly) return body;
  return `<div class="overlay bag-overlay ${legendSet ? "legend-set" : ""}"><div class="inner">
    ${legendSet ? `<div class="legend-banner">★ Every piece you wear is a Legend ★</div>` : ""}
    <div class="row"><h1 class="grow">Inventory <span class="bag-class">· ${ORIGIN_ICON[h.origin]} ${esc(ORIGINS[h.origin].name)} · Lv ${h.level}</span></h1><button class="closebtn" data-closebag>✕ Close</button></div>
    <div class="bag-tabs" role="tablist">${tabs.map(([id, label, badge]) => `<button class="bag-tab ${bagTab === id ? "active" : ""}" data-bagtab="${id}" role="tab" aria-selected="${bagTab === id}"><span class="bt-ic">${label.split(" ")[0]}${badge}${fresh.has(id) ? `<b class="newdot" title="Something new"></b>` : ""}</span><span class="bt-lb">${label.split(" ").slice(1).join(" ")}</span></button>`).join("")}</div>
    <div class="bag-body">${body}</div>
    <p class="version">${VERSION}</p>
  </div></div>`;
}

/** The Crawl's inventory: a full page in the dungeon's colours. Stats along the top; your hero in the middle, your equipped
 *  gear (names only) to the left, the tapped item's full details to the right; your backpack below. */
let invPick: { k: "eq"; slot: EquipSlot } | { k: "bp"; uid: number } | null = null;
const SLOT_SHORT: Record<EquipSlot, string> = { main: "Main hand", off: "Off-hand", armour: "Armour", trinket1: "Trinket", trinket2: "Trinket", trinket3: "Trinket ★" };
function crawlBag(r: Run) {
  const h = r.hero, f = h.f;
  const inCombat = r.scene.t === "combat";
  const legendSet = false;
  void legendSet;
  const curses = Object.entries(h.curses).map(([id, n]) => `<span class="inv-curse" title="${esc(getItem(id).text)}">🕯️ ${esc(getItem(id).name)}${n > 1 ? ` ×${n}` : ""}</span>`).join("");
  const top = `<div class="inv-top">
      <div class="inv-stats"><span>❤️ <b>${Math.max(0, f.hp)}</b>/${f.maxHp}</span><span>⚔️ <b>${f.damage}</b>${f.offDamage !== undefined ? `+${f.offDamage}` : ""}</span><span>🛡️ <b>${armorOf(f)}</b></span><span>💨 <b>${Math.round(f.dodge ?? 0)}%</b></span><span>🎯 <b>${Math.round(f.critChance ?? 0)}%</b></span><span>Lv <b>${h.level}</b></span></div>
      <div class="inv-stats"><span>🪙 <b>${f.gold}</b></span><span>🧪 <b>${h.potions}</b></span>${h.manaPotions ? `<span>🔷 <b>${h.manaPotions}</b></span>` : ""}</div>
      ${curses ? `<div class="inv-curses">${curses}</div>` : ""}
    </div>`;
  const pts = h.attrPoints ?? 0;
  const tabs: [BagTab, string][] = [["gear", "⚔️ Gear"], ["attrs", "📈 Attributes"], ["relics", "💎 Spoils"], ["extras", "✨ Extras"]];
  if (bagTab === "stats" || bagTab === "talents") bagTab = "gear";
  let body = "";
  if (bagTab === "gear") {
    const picked = invPick?.k === "eq" ? h.equip[invPick.slot] : invPick?.k === "bp" ? h.backpack.find(i => i.uid === (invPick as { uid: number }).uid) : undefined;
    const slots = openSlots(h).map(sl => { const it = h.equip[sl]; const on = invPick?.k === "eq" && invPick.slot === sl;
      return `<button class="inv-slot ${it ? `r-${it.rarity}` : "empty"} ${on ? "on" : ""}" data-invpick="eq:${sl}"><span>${SLOT_SHORT[sl]}</span><b>${it ? esc(itemName(it)) : "Empty"}</b></button>`; }).join("");
    const detail = !picked ? `<div class="inv-empty"><span>🔍</span><p>Tap an item to see it here.</p></div>`
      : invPick?.k === "eq" ? itemCard(picked, inCombat ? "" : `<button class="small" data-unequip="${(invPick as { slot: EquipSlot }).slot}">Take it off</button>${revealBtn(r, picked)}`)
      : itemCard(picked, inCombat ? "" : `${slotsFor(picked, h).map(sl => `<button class="small primary" data-equip="${picked.uid}" data-slot="${sl}" ${picked.reqLevel && h.level < picked.reqLevel ? "disabled" : ""}>Equip${slotsFor(picked, h).length > 1 ? ` (${SLOT_SHORT[sl].toLowerCase()})` : ""}</button>`).join("")}${revealBtn(r, picked)}`, !inCombat);
    // Materials and scrolls sit in the backpack too (they take no slot).
    const mats = [[h.scrap, "⚙️ Scrap"], [h.azure ?? 0, "💠 Azure"], [h.orilium ?? 0, "🔶 Orilium"], [h.starmetal, "✴️ Starmetal"], [h.scrolls, "📜 Scroll of Revelation"], [h.f.persist["skelKeys"] ?? 0, "🗝️ Skeleton Key"], ...THROWS.map(t => [h.f.persist[THROW_INFO[t].key] ?? 0, `${THROW_INFO[t].icon} ${THROW_INFO[t].name}`])].filter(([n]) => (n as number) > 0)
      .map(([n, l]) => `<span class="mer-chip mat"><b>${l}</b><span>×${n}</span></span>`).join("");
    const pack = mats + h.backpack.map(it => `<button class="mer-chip ${invPick?.k === "bp" && invPick.uid === it.uid ? "on" : ""}" data-invpick="bp:${it.uid}"><b style="color:${RARITY_INK[it.rarity] ?? "#e9d6b0"}">${esc(itemName(it))}</b><span>${esc(itemRarity(it))}${it.reqLevel && h.level < it.reqLevel ? ` · 🔒 Lv ${it.reqLevel}` : ""}</span></button>`).join("");
    const hk = CLASS_SPRITE[h.origin];
    body = `${inCombat ? `<p class="sub center">You can look, but you can't change gear mid-fight.</p>` : ""}
      <div class="inv-main">
        <div class="inv-slots">${slots}</div>
        <div class="inv-hero">${hk && hasSprite(hk) ? spriteHtml(hk, 6) : `<span class="inv-emoji">${ORIGIN_ICON[h.origin]}</span>`}<b>${esc(ORIGINS[h.origin].name)}</b></div>
        <div class="inv-detail">${detail}</div>
      </div>
      <div class="mer-panel inv-pack"><div class="mer-label">Backpack ${h.backpack.length}/${packSize(h)}</div><div class="mer-list">${pack || `<span class="mer-none">Empty.</span>`}</div></div>`;
  } else if (bagTab === "attrs") {
    const baseA = BASE_ATTR[h.origin as keyof typeof BASE_ATTR];
    const rows = ATTRS.map(a => {
      const info = ATTR_INFO[a], spent = h.attrs?.[a] ?? 0, tree = treeAttr(h, a), gear = gearAttr(h, a), n = spent + tree + gear, isFav = baseA === a;
      // (The class attribute's base Damage shows in your ⚔️ Damage; crit damage and staff damage stay unlisted.)
      const now = shownLines(info.lines(attrPower(n)));
      const next = shownLines(info.lines(attrPower(n + 1)));
      const lines = now.map((l, i) => `<li class="${l !== next[i] ? "grows" : ""}"><span>${esc(l)}</span>${l !== next[i] && pts ? `<i>→ ${esc(/[+−-]?\d+%?/.exec(next[i])?.[0] ?? next[i])}</i>` : ""}</li>`).join("");
      return `<div class="attr-row ${n ? "has" : ""}">
        <div class="attr-head"><span class="attr-ic">${info.icon}</span><b>${info.name}</b>${isFav ? `<span class="attr-fav" title="Your class's base attribute: every point also adds +1 to your ⚔️ Damage">★ ${esc(ORIGINS[h.origin].name)}</span>` : ""}<span class="grow"></span><span class="attr-n">${n}${gear ? `<em title="From your gear">+${gear} 🛡️</em>` : ""}${tree ? `<em title="From the passive tree">+${tree} 🌳</em>` : ""}</span>
          <button class="attr-plus" data-attr="${a}" ${pts && spent < ATTR_MAX && !inCombat ? "" : "disabled"} aria-label="Put a point into ${info.name}">+</button></div>
        <p class="attr-blurb">${esc(info.blurb)}</p><ul class="attr-lines">${lines}</ul></div>`;
    }).join("");
    body = `<div class="attr-top">${pts ? `<b>${pts}</b> point${pts === 1 ? "" : "s"} to spend` : `No points to spend. Each level-up gives ${ATTR_PER_LEVEL}.`}</div><div class="attr-list">${rows}</div>`;
  } else body = `<div class="inv-other">${bag(r, true)}</div>`;
  return `<div class="cb-screen inv-screen"><div class="mer-inner inv-inner">
    ${top}
    <div class="inv-body">${body}</div>
    <div class="mer-tabs inv-tabs">${tabs.map(([id, label]) => `<button class="${bagTab === id ? "on" : ""}" data-bagtab="${id}"><i>${label.split(" ")[0]}${id === "attrs" && pts ? `<b class="tab-badge">${pts}</b>` : ""}</i><span>${id === "attrs" ? `<span class="lb-long">Attributes</span><span class="lb-short">Attr</span>` : label.split(" ").slice(1).join(" ")}</span></button>`).join("")}</div>
  </div></div>`;
}

/** Wide screens: your equipped gear, always in view on the left. */
/** Attribute lines shown in the game (crit damage and staff damage work, unlisted). */
const shownLines = (l: string[]) => l.filter(x => !/^(Crits deal|Staves and wands)/.test(x));

function sideEquip(r: Run) {
  const h = r.hero;
  const slotName: Record<EquipSlot, string> = { main: "Main hand", off: "Off-hand", armour: "Armour", trinket1: "Trinket 1", trinket2: "Trinket 2", trinket3: "Trinket 3 ★" };
  const rows = openSlots(h).map(s => {
    const it = h.equip[s];
    if (!it) return `<div class="se-item empty"><div class="se-slot">${slotName[s]}</div><span class="sub">Empty</span></div>`;
    const lines = itemLines(it).filter(l => !l.startsWith("Faces:") && !l.startsWith("✝️") && !l.startsWith("✨ Purify")).slice(0, 3);
    return `<div class="se-item r-${it.rarity}"><div class="se-slot">${slotName[s]} · ${itemRarity(it)} · lv ${it.level}</div><div class="nm">${esc(itemName(it))}</div>
      ${lines.map(l => `<div class="se-line">${esc(l)}</div>`).join("")}</div>`;
  }).join("");
  const relics = Object.entries(h.relics).map(([id, n]) => `<span class="chip" title="${esc(fillText(getItem(id).text, n))}">${esc(getItem(id).name)}${n > 1 ? ` ×${n}` : ""}</span>`).join("");
  return `<aside class="side-equip"><h2>Equipped</h2>${rows}${relics ? `<h2>Relics</h2><div class="chips">${relics}</div>` : ""}</aside>`;
}

function revealBtn(r: Run, it: GearItem) {
  // The Crawl: Legendaries are revealed at a Forge.
  if (r.gridMode) return "";
  const b = baseOf(it.base);
  if (!b.legendary || it.revealed) return "";
  return `<button class="small primary" data-reveal="${it.uid}" ${r.hero.scrolls ? "" : "disabled"}>📜 Reveal</button>`;
}

// ---------- Popups: class choice, level up ----------

const ORIGIN_ICON: Record<OriginId, string> = { warrior: "🛡️", rogue: "🗡️", mage: "🔮", cleric: "✨" };
const ORIGIN_PITCH: Record<OriginId, string> = {
  warrior: "The Warrior wins by standing firm. Guarding is your craft, with a shield or even a two-handed weapon, and every Guard makes you hit harder; let loose a War Cry for a swell of Might. Your base attribute is Strength: every point raises your Max HP, your Bash and your base Damage. You find swords, axes, maces, hammers, polearms and shields, and the shields can carry Shield Wall.",
  rogue: "The Rogue wins by never being where the blow lands. Two blades, two dice and the first strike, and Counter: brace, dodge the next attack and strike back with a hit that can't miss. Your base attribute is Agility: every point raises your Dodge, your Crit chance, your crit damage and your base Damage. You find daggers, short blades, bows and throwing weapons, and the daggers can carry Envenom.",
  mage: "The Mage wins by stacking statuses until they explode. Every face can be a spell; Burn, Chill, Static and more combine into reactions and bursts. With an elemental off-hand, raise an Elemental Barrier that throws your element back at attackers. Your base attribute is Intellect: every point raises your status and reaction damage, your staves' and wands' hits and your base Damage. You find staves, wands, focuses and ritual daggers. Fragile early, devastating later.",
  cleric: "The Cleric wins by outlasting. Ward and Holy weapons that Smite the wicked, and Penance: kneel, take what they give you, and return it in one blow. Your base attribute is Faith: every point means reactions and statuses hurt you less, curse-lifting altars come sooner, and your base Damage rises. You find maces, hammers, shields and holy focuses."
};

const STORIES: Record<Mode, { icon: string; title: string; text: string }> = {
  campaign: { icon: "🏰", title: "Campaign", text: "Deep within a dungeon, a gate to the netherworld has been opened. Dark beasts and unspeakable horrors pour out from it. Your king has called upon you as the mightiest in the kingdom to venture into the dungeon and close the gate." },
  endless: { icon: "♾️", title: "Endless", text: "At the forsaken dungeon depths, a rift between worlds has been torn open. The fate of the lands has been sealed. You venture deep into the dungeon to take as many creatures of the dark with you before you are defeated." },
  abyss: { icon: "🕳️", title: "The Abyss", text: "Below the deepest floor, past where the Horror slept, the dungeon keeps going. The old maps call it the Abyss: a wound in the world where the netherworld's champions gather their spoils. Those who come back bring a shard of ruin with them, and those shards can open the way down again. Down there, nothing is ordinary. What looks like a beast is an elite killer; what looks like a guardian is a lord. And every one of them hoards treasure that the surface has never seen. Ten depths. Few see the bottom. Fewer return with the plates of dark metal that make the next descent survivable." }
};

function helpPopup() {
  // Each section is its own card: an icon, a heading, and one point per line.
  const SECTIONS: Record<string, [string, string]> = {
    "The goal": ["🎯", "gold"], "Getting about": ["👣", "green"], "Your weapon is your die": ["🎲", "blue"], "In a fight": ["⚔️", "red"],
    "Levels and attributes": ["📈", "orange"], "Statuses and reactions": ["✴️", "purple"], "Loot": ["💎", "green"], "The Camp": ["🔥", "gold"], "Tips": ["💡", "orange"]
  };
  const anchor = (t: string) => `help-${t.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  const sec = (t: string, items: string[]) => {
    const [icon, tone] = SECTIONS[t] ?? ["•", "gold"];
    return `<section class="help-card tone-${tone}" id="${anchor(t)}"><h3><span class="hc-ic">${icon}</span>${t}</h3>${items.map(i => `<p class="hc-pt">${i}</p>`).join("")}</section>`;
  };
  const toc = Object.entries(SECTIONS).map(([t, [icon, tone]]) => `<a class="help-chip tone-${tone}" href="#${anchor(t)}">${icon} ${t}</a>`).join("")
    + `<a class="help-chip tone-grey" href="#help-reference">📖 Reference</a>`;
  return `<div class="overlay dg-overlay"><div class="inner help">
    <div class="dg-head"><h1 class="grow">How to play</h1><button class="plank-btn small" data-closehelp>Close</button></div>
    <nav class="help-toc">${toc}</nav>
    ${sec("The goal", [
      "Choose a hero at the Tavern, then head to the <b>Camp</b> and <b>Enter Dungeon</b>. The dungeon goes down in <b>5 layers</b> of 6 floors each. At the bottom of every layer waits its guardian: beat the fifth to win.",
      "After winning you can <b>Delve deeper</b> for harder foes and better loot. Your run saves as you go."])}
    ${sec("Getting about", [
      "Tap a tile to walk there. Walk into something to deal with it: chests, doors, pools, people, foes.",
      "Each floor has <b>stairs down</b>, glowing in the dark. Once you go down there's no climbing back up, so look around first. Locked doors need a 🗝️ Skeleton Key; some walls give when you push on them."])}
    ${sec("Your weapon is your die", [
      "Every weapon has its own die. Each face is a <b>Miss</b>, <b>Graze</b> (half damage), <b>Hit</b> or <b>Crit</b> (double damage, ignores Armor), and some faces cast spells or add effects.",
      "An off-hand weapon gives you a <b>second die</b>. Daggers, throwing knives, kunai and shuriken are built for it; ordinary weapons are clumsy there."])}
    ${sec("In a fight", [
      "<b>Attack</b>: roll and strike. <b>Guard</b> (needs a shield): your Armor counts double this round.",
      "Your class's moves cost 🔷 Mana; you start every fight with it full. Gear can add abilities of its own.",
      "🧪 Potions heal. 💣 Throwables (bombs, firepots, nets, smoke…) are used from the row under your moves, up to three of each.",
      "You can <b>flee</b> most fights, but the foe gets a free swing as you go. Not from Elites or guardians, unless you've got smoke to hide in.",
      "Guardians show their next move. Plan around it."])}
    ${sec("Levels and attributes", [
      "Every level gives <b>2 attribute points</b> to spend in your inventory, and heals you a little. Six attributes: Strength, Agility, Intellect, Faith, Vitality and Fortune. Each shows what its next point gives before you spend it.",
      "Your class's own attribute (★) also raises your base Damage with every point."])}
    ${sec("Statuses and reactions", [
      "Burn, Poison, Bleed, Chill, Shock, Static and more pile up on foes (and on you). Two statuses on the same fighter can <b>react</b>: Burn and Poison make Combustion, Static and Shock set off all the Static at once.",
      "Pile up enough Chill, Bleed or Poison and it <b>bursts</b>. Open 🎒 mid-fight to see what's active."])}
    ${sec("Loot", [
      "Rarities: Common, <span style='color:var(--uncommon)'>Uncommon</span>, <span style='color:var(--rare)'>Rare</span>, <span style='color:var(--epic)'>Epic</span>, <span style='color:var(--legendary)'>Legendary</span> and <span style='color:var(--crimson)'>Crimson</span>. Some gear needs a level before you can wear it. Some arrives hidden: a 📜 Scroll of Revelation shows what it does.",
      "Wooden, iron and vault chests, urns, the Merchant, the Forge and stranger places along the way all give gear. What turns up leans toward your class."])}
    ${sec("The Camp", [
      "Between runs, the Camp keeps what you bring home: the Hall's upgrades, the Garden and the Brewery, Scrolls of Knowledge, the Bestiary and the Trophy Room, the Still Pool, and Weapon Mastery.",
      "Once a hero has beaten all five layers, their <b>Passive Tree</b> opens: one point for every layer beaten after that."])}
    ${sec("Tips", [
      "Your class is a starting point: you are what you wear. Build around what you find.",
      "Elites and Champions hit hard but drop great gear. Watch for <b>⛓️ Toll</b> foes: every action you take costs HP.",
      "Read a foe's chips (Unholy, Conductive, Thief…): they tell you what works."])}
    ${helpGlossary()}
    <button class="continue" data-closehelp>Got it</button>
    <p class="version">${VERSION}</p>
  </div></div>`;
}

/** The full reference, built from the game's own data so it always matches what's in the game. */
function helpGlossary() {
  const neg = (Object.keys(STATUS_INFO) as StatusId[]).filter(x => (NEGATIVE_STATUSES as readonly string[]).includes(x));
  const pos = (Object.keys(STATUS_INFO) as StatusId[]).filter(x => !(NEGATIVE_STATUSES as readonly string[]).includes(x));
  const row = (icon: string, name: string, text: string) => `<div class="gl"><span class="gi">${icon}</span><span class="gt"><b>${esc(name)}</b><span>${esc(text)}</span></span></div>`;
  const group = (title: string, body: string, open = false) => `<details class="gloss" ${open ? "open" : ""}><summary>${title}</summary>${body}</details>`;
  const enemyTraits = TRAITS.filter(t => !t.id.startsWith("m_") || ["m_toll", "m_thief", "m_lifedrink", "m_forge", "m_crackle"].includes(t.id));
  return `<h2 class="help-ref-title" id="help-reference">📖 Reference</h2><p class="sub">Tap a heading to open it.</p>
  ${group("😖 Negative statuses (debuffs)", neg.map(x => row(STATUS_INFO[x].icon, STATUS_INFO[x].name, STATUS_INFO[x].text)).join(""))}
  ${group("💪 Positive statuses (buffs)", pos.map(x => row(STATUS_INFO[x].icon, STATUS_INFO[x].name, STATUS_INFO[x].text)).join(""))}
  ${group("✴️ Reactions — two statuses on the same fighter", REACTIONS.map(x => row(`${STATUS_INFO[x.a].icon}+${STATUS_INFO[x.b].icon}`, x.name, x.text)).join("") +
    row("💥", "Overpower", "Hit a Weak enemy while you have Might: +2 damage per Might, and it shakes off 1 Weak") +
    row("✝️", "Smite", "When your Ward blocks a status an enemy tried to put on you, your next hit with a Holy weapon also deals 20% of its Max HP (once per fight)"))}
  ${group("💥 Bursts — pile one status high enough", THRESHOLDS.map(t => row(t.icon, t.name, t.text)).join(""))}
  ${group("📊 Your stats", [
    row("⚔️", "Damage", "Added to every hit, then multiplied by the face: Graze ×½, Hit ×1, Crit ×2"),
    row("🛡️", "Armor", "Stops part of each hit: 3 Armor stops 21%, 10 stops 45%, 20 stops 60%, 30 stops 68%, 60 stops 77%. No cap, but each extra point counts for a little less. Crits and spells ignore it"),
    row("🧱", "Guard", "Needs a shield (Warriors can also Guard with a two-hander). Doubles your Armor this round"),
    row("💨", "Dodge", "A % chance to avoid a hit entirely (max 60%). Not the same as Evade: Dodge bonuses and Evade bonuses don't trigger each other"),
    row("💥", "Crit damage", "A % boost to the damage of your Crits (on top of the usual double)"),
    row("🎯", "Crit chance", "A % chance that a Hit becomes a Crit (max 50%), on top of your die's Crit faces"),
    row("💥", "Bash", "A % chance (from your weapon and rare relics only, max 30%) to Stun and deal +50%"),
    row("🧪", "Status damage", "Burn, Bleed, Poison and Static on the enemy deal this much more each time they tick. Mostly on robes for status builds"),
    row("🔮", "Spell Amp", "Spell faces (from wands, staffs and other magic weapons) deal this much more"),
    row("❤️", "Max HP", "Each level-up adds +3. Winning a fight heals 15%; beating a boss heals 30%"),
    row("🔋", "Static cap", "The most Static you can stack on an enemy (10, or more with certain items)")
  ].join(""))}
  ${group("🗡️ Weapons and gear", [
    row("🎲", "Faces", "Miss (nothing), Graze (half, and no passive or relic bonus damage), Hit, Crit (double, ignores Armor). Named faces add effects — spells, Bleed, Stun and so on"),
    row("✋", "Off-hand", "A weapon in your off-hand rolls a second die. Daggers, throwing knives, kunai, shuriken and wands are built for it; ordinary weapons deal only 60% there"),
    row("🙌", "Two-handed", "Takes both hands (unless you have Titan's Grip or the War Harness)"),
    row("💣", "Grenades", "Off-hand only. No damage — they apply a status, and are thrown on round 1 and every 3rd round after"),
    row("✝️", "Holy", "Holy weapons deal +15% to Undead, vampires, Crimson foes and anything that curses or Dooms, and can Smite"),
    row("✨", "Purify", "A face that strips every negative status off the enemy and deals 2× your Damage for each one (ignores Armor)"),
    row("🔨", "Heavy weapons", "Rare two-handed swords and axes. Every hit builds Stagger on the enemy (2 on a Crit). At 3 (Elites 4, bosses 5) it's Staggered: it loses its next action and your next hit deals double. Then it can't build again for 2 rounds"),
    row("🔥", "Sacrifice", "Holy Sacrifice weapons burn your current HP on each roll (a 1 burns 10%, a 6 burns 60%) and add it to the hit. Until your next roll, that same % of every hit you take heals you. Pair it with healing boosts"),
    row("🔨", "War hammers", "Heavy two-handed hammers (Rare and up): they build Stagger, always come with a Bash chance, and feed you Might"),
    row("🍀", "Four-Leaf Clover", "From the Lucky Pot, for all the Gold you carry: your next 4 chests have slightly better odds of Rare, Epic and Legendary"),
    row("👼", "Angelic Blessing", "From the Angelic Statue, for half your HP: lifts all curses, and for your next 2 fights you heal 2 at the start and no negative status can touch you"),
    row("🐲", "Dragon's Blessing", "From a blind old dragon, for 70% of your Gold: one blessing for your next 5 fights (more damage to, or less damage from, Elites, Champions or bosses)"),
    row("😤", "Reckless", "Some gear makes you deal more damage but also take more from every hit. It stacks, for better and worse"),
    row("⛓️", "Roll cap", "Some heavy gear stops your die rolling above 4 or 5; the Manacles do the same to the enemy's die"),
    row("🔗", "Hit streak", "Only counts while you have a streak relic, talent or trinket. Every Hit or Crit that gets through adds 1, and it carries across fights. A Miss, Graze, or an attack that's evaded, dodged or fully blocked resets it. Some relics, talents and trinkets grow with it"),
    row("🧱", "Guarding foes", "Some enemies and bosses raise their guard: Armor doubled plus a bit more for that round (you'll see it coming). Crits, spells and statuses ignore Armor, so they still get through"),
    row("🔮", "Elemental Barrier", "Mage off-hands with an element let the Mage raise a barrier: roll 5–6 to block (attackers get 4 stacks of the element), 3–4 to halve (2 stacks), 1–2 blocks nothing but still gives 2 stacks"),
    row("🕯️", "Keepsake", "One at a time, from bosses after floor 5. Each grants a powerful passive"),
    row("📜", "Legendaries", "Arrive hidden. Use a Scroll of Revelation to reveal them; until then they act like a plain item"),
    row("🩸", "Crimson", "Above Legendary. Only from Crimson bosses in Endless (Crimson Vaults need a Crimson Key from Crimson Elites)")
  ].join(""))}
  ${group("👹 Enemy traits", [
    row("🎯", "Weaknesses", "A rare few foes have a weak spot: blunt weapons, bladed weapons, two-handers, spells, Bleed, or Fracture and Spikes hit them much harder. Check its tags"),
    row("☠️", "Unholy", "Undead, vampires, Crimson foes and anything that curses or Dooms: Holy weapons deal +15% to them"),
    row("⚡", "Conductive", "Constructs (golems, sentries): Shock, Static and electric reactions hit them twice as hard"),
    ...enemyTraits.map(t => row("•", t.name, t.text))
  ].join(""))}
  ${group("🧭 The dungeon", [
    row("✦", "Fortune", "Every floor deeper slightly improves your odds of Rare, Epic and Legendary finds"),
    row("💀", "Elites & Champions", "Tougher fights with random traits, and better loot"),
    row("✴️", "A Strange Presence", "A named, unique foe — once per run — that always drops an Epic or better"),
    row("💰", "Thieves", "Kill them within 5 rounds or they escape with 30% of your Gold; kill them and you get 60% on top"),
    row("🕯️", "Curses", "Lasting penalties from shrines, idols and cursing foes. Only something holy can lift them"),
    row("🔨", "Forge", "Upgrade gear with Scrap, break it down, and reveal Legendaries"),
    row("⚒️", "Masterwork", "From floor 2. Rework one line of an item; Extract an item's lines into a Scroll of Power (the item turns Common); Empower a Common of the same family with a scroll; Refine a Common so it holds more lines (up to 4). Materials: Scrap, 💠 Azure dust (scrap Rares), 🔶 Orilium (scrap Epics) and ✴️ Starmetal"),
    row("🩸", "Sanguine Altar", "Pay a share of your Max HP for Gold, Max HP, upgrades, gear or a fresh start from curses; the bigger the price, the better the gift"),
    row("⛲", "Cleansing", "Only while you carry a curse: the Well of Cleansing or a Holy Tribute, a way to lift your curses for a price"),
    row("🪙", "Merchant", "Buy gear, potions and scrolls, and sell as much as you like (40% of its price)"),
    row("💍", "Jeweller", "Takes turns with the Forge; two tries per visit. Fuse: two relics (marked 🔗), or two Rare-or-better trinkets (yours to discover; costs Starmetal). A fusion that doesn't take still costs the fee. Upgraded items can't be fused"),
    row("⚒", "Forged by chance", "Half of all gear is made fresh: a material (Iron, Frost-forged, Dragonscale…), a form, and effects. Rarer items get more effects, and some carry a drawback (⛓️). ✦ Greater, ✦✦ Grand and ✦✦✦ Mythic rolls are much stronger, and ⚡ Overcharged items are rare, wild and very strong"),
    row("🔮", "Talisman", "Sigils sit beside your gear (Gear → Sigils). Wear pieces of the same set for 2-, 3- and 4-piece bonuses. 2 slots to start, more on floors 3, 6, 10 and 15"),
    row("🧪", "Healing Potions", "Heal 12. You start with 3 potion slots: carry up to 3, and drink up to 3 in one fight. Potion gear and relics add slots (more at higher rarity)")
  ].join(""))}
  ${group("📈 Between runs", [
    row("⭐", "Class Mastery", `Each class grows with play (layers reached and guardians beaten). Each level takes longer than the last. At mastery ${KIT_COMMON_LEVEL} you can swap its starting weapon, off-hand and armour for a short list of Commons picked for that class; at ${KIT_UNCOMMON_LEVEL}, Uncommons too; at ${KIT_RARE_LEVEL}, Rares`),
    row("🏆", "Achievements", "Each one pays Renown once, and many give a title to show beside your name on the leaderboards (Info → Achievements)"),
    row("🔥", "Heat", "After your first win: optional extra difficulty (set it at the Camp's Enter Dungeon). Five levels that stack, each giving more Renown and slightly better loot"),
    row("📅", "Daily Dungeon", "The same dungeon and class for everyone each day; one attempt, with its own leaderboard"),
    row("😈", "Nemesis", "Whatever kills your run waits in the next one, stronger each time it wins. Beat it for a bounty"),
    row("🌕", "Abyss weekly twist", "Each week the Abyss changes: some twists help, some hurt")
  ].join(""))}
  ${group("🕳️ The Abyss", [
    row("🔓", "Opening it", `Beat the dungeon's last layer with any hero. Then each Abyss run costs ${ABYSS_SHARD_COST} Ruin Shard${ABYSS_SHARD_COST === 1 ? "" : "s"}`),
    row("🪨", "Ruin Shards", "Every guardian from the last layer on drops one"),
    row("⬛", "Vanadium Plates", "Those same bosses sometimes drop one. Give it to a class (for good): in the Abyss only, that class gets more Max HP, Armor and Damage for every plate"),
    row("☠️", "Ten depths", "Every plain fight is a rank tougher: monsters are Elites, Elites are Champions, Champions are bosses, and each depth ends with an Uber boss. Each depth is far deadlier than the last"),
    row("💰", "The loot", "Much richer than the dungeon above, and richest from Champions, bosses and Uber bosses. Playing safe won't find the gear you need")
  ].join(""))}`;
}

/** The Changes page: the latest patches, newest first. */
function changesScreen() {
  const notes = PATCH_NOTES.map((n, i) => `<article class="patch ${i === 0 ? "latest" : ""}">
      <header class="patch-head"><div class="patch-kicker">${i === 0 ? "🔥 Latest patch 🔥" : `Patch ${esc(n.version)}`}</div><h2 class="patch-title">⚔️ ${esc(n.title)}</h2><div class="sub">Version ${esc(n.version)} · ${esc(n.date)}</div><p class="patch-intro">${esc(n.intro)}</p></header>
      <div class="patch-grid">${n.sections.map(sec => `<section class="patch-sec"><h3>${sec.icon} ${esc(sec.title)}</h3><ul>${sec.items.map(([b, t]) => `<li><b>${esc(b)}</b>${t ? `: ${esc(t)}` : ""}</li>`).join("")}</ul></section>`).join("")}</div>
      <p class="patch-outro">${esc(n.outro)}</p>
    </article>`).join("");
  return `<div class="changes-page"><div class="row opt-head"><button class="small dg-stone" data-changesback>← Back</button><h1 class="grow dg-carved">📰 Changes</h1></div>${notes}</div>`;
}

function splashScreen() {
  const sv = savedSummary();
  return `<div class="splash dungeon">
    <div class="dg-arch" aria-hidden="true"></div>
    <div class="dg-torch left" aria-hidden="true"><b></b><i></i></div><div class="dg-torch right" aria-hidden="true"><b></b><i></i></div>
    <div class="dg-embers" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<span style="left:${(i * 37) % 100}%;animation-delay:${(i * 0.73) % 6}s;animation-duration:${6 + (i % 5)}s"></span>`).join("")}</div>
    <div class="splash-dice">🎲</div>
    <div class="splash-head"><h1 class="splash-title">DECK DUNGEON <span>2</span></h1></div>
    <p class="splash-tag">Venture into the depths of darkness. Slay the horrors within.</p>
    <div class="splash-buttons">
      ${musicBlocked() ? `<button class="small music-hint" data-startmusic>🎵 Tap for music</button>` : ""}
      <button class="primary big" data-play>${sv ? "▶ Play (continue available)" : "▶ Play"}</button>
      <button class="big" data-help>❓ How to play</button>
      <button class="big lb-btn" data-lb>🏆 Leaderboards</button>
      <button class="big" data-changes>📰 Changes</button>
      <button class="big" data-options>⚙️ Options</button>
    </div>
    <p class="sub splash-foot dg-plaque">🏅 ${meta.renown} Renown · ${meta.runs} runs · ${meta.wins} wins</p>
    <p class="version">${VERSION}</p>
  </div>`;
}

function musicSliders(only?: Track, toggle = true) {
  const sl = (k: Track, label: string) => `<label class="music-row"><span>${label}</span><input type="range" min="0" max="100" step="5" value="${Math.round(musicVolume(k) * 100)}" data-music="${k}"><b data-musicval="${k}">${Math.round(musicVolume(k) * 100)}%</b></label>`;
  return `<div class="music-sliders">${toggle ? `<div class="row"><button class="small ${isMusicOff() ? "" : "primary"}" data-togglemusic>${isMusicOff() ? "🎵 Music off" : "🎵 Music on"}</button></div>` : ""}${!only || only === "title" ? sl("title", "🎵 Menu music") : ""}${!only || only === "game" ? sl("game", "🎵 Gameplay music") : ""}</div>`;
}

/** Side-by-side comparison: the find against what's in that slot now, every stat before and after, and every effect gained or lost. */
let compareOpen: { uid: number; slot?: EquipSlot } | null = null;
function findForCompare(r: Run, uid: number): { it: GearItem; takeable: boolean } | null {
  const s = r.scene;
  if (s.t === "loot" || s.t === "pick") { const it = s.items.find(i => i.uid === uid); if (it) return { it, takeable: true }; }
  if (s.t === "shop") { const e = s.stock.find(x => x.item?.uid === uid); if (e?.item) return { it: e.item, takeable: false }; }
  return null;
}
function comparePopup(r: Run): string {
  if (!compareOpen) return "";
  const found = findForCompare(r, compareOpen.uid);
  if (!found) return "";
  const h = r.hero, it = found.it;
  const slots = slotsFor(it, h);
  // No slot asked for: the one the inline comparison picks (an empty one, else the best fit).
  const slot = compareOpen.slot ?? slots.find(x => !h.equip[x]) ?? slots[0];
  if (!slot) return "";
  const cur = h.equip[slot];
  const after = simulateEquip(h, it, slot);
  const rows = COMPARE_STATS.map(([label, get, unit]) => {
    const a = Math.round(get(h.f)), b = Math.round(get(after)), d = b - a;
    if (a === 0 && b === 0) return "";
    return `<tr class="${d > 0 ? "up" : d < 0 ? "down" : ""}"><td>${label}</td><td>${a}${unit}</td><td>→</td><td><b>${b}${unit}</b></td><td>${d ? `${d > 0 ? "▲" : "▼"} ${Math.abs(d)}${unit}` : "＝"}</td></tr>`;
  }).join("");
  const label = SLOT_LABEL[slot];
  return `<div class="overlay popup-wrap"><div class="popup compare-pop">
    <button class="small closex closebtn" data-compareclose aria-label="Close">✕</button>
    <h1 class="center bigname">⚖️ Compare · ${esc(label)}</h1>
    <div class="cmp-cols">
      <div class="cmp-new"><div class="cmp-tag new">New find</div>${itemCard(it)}</div>
      <div><div class="cmp-tag">${cur ? `Equipped · ${esc(label)}` : esc(label)}</div>${cur ? itemCard(cur) : `<div class="item empty-slot"><div class="nm">Empty</div><p class="sub">Nothing in your ${esc(label.toLowerCase())} yet.</p></div>`}</div>
    </div>
    <h2>Your stats</h2>
    <table class="cmp-table"><tr><th></th><th>Now</th><th></th><th>New item</th><th></th></tr>${rows}</table>
    <h2>What changes</h2>
    ${compareHtml(h, it, slot, true) || `<p class="sub">Nothing changes.</p>`}
    <div class="row cmp-actions">${found.takeable ? `<button class="take-equip" data-take="${it.uid}" data-how="equip" data-slot="${slot}">✔ Equip ${esc(label.toLowerCase())}</button><button class="take-scrap" data-scrapfound="${it.uid}">Scrap (+${scrapValue(h, it)} ⚙️)</button>` : ""}<button data-compareclose>Close</button></div>
  </div></div>`;
}

/** Options as a page of its own (from the title screen). */
function optionsPage() {
  return optionsPopup()
    .replace('<div class="overlay popup-wrap"><div class="popup options-pop">', '<div class="options-page"><div class="row opt-head"><button class="small dg-stone" data-closeoptions>← Back</button><h1 class="grow dg-carved">⚙️ Options</h1></div><div class="options-pop as-page">')
    .replace('<button class="small closex closebtn" data-closeoptions aria-label="Close">✕</button>', '')
    .replace('<h1 class="center bigname">⚙️ Options</h1>', '');
}
function optionsPopup() {
  const sp = (v: number, label: string) => `<button class="small ${speed === v ? "primary" : ""}" data-speed="${v}">${label}</button>`;
  // One setting per line: what it is on the left, its control on the right.
  const opt = (label: string, help: string, control: string) => `<div class="opt-line"><div class="opt-txt"><b>${label}</b>${help ? `<span class="sub">${help}</span>` : ""}</div><div class="opt-ctl">${control}</div></div>`;
  const sec = (icon: string, title: string, body: string, cls = "") => `<section class="opt-sec ${cls}"><h3>${icon} ${title}</h3>${body}</section>`;
  return `<div class="overlay popup-wrap"><div class="popup options-pop">
    <button class="small closex closebtn" data-closeoptions aria-label="Close">✕</button>
    <h1 class="center bigname">⚙️ Options</h1>
    ${sec("🔊", "Sound", `
      ${opt("Sound effects", "", `<button class="small ${isMuted() ? "" : "primary"}" data-mute>${isMuted() ? "🔇 Off" : "🔊 On"}</button>`)}
      ${musicSliders(undefined, false)}`)}
    ${sec("⚔️", "Gameplay", `
      ${opt("Quick Battle", "Fights you can't lose can play themselves out, from the map or mid-fight.", `<div class="seg"><button class="small ${quickOn ? "primary" : ""}" data-quick="1">On</button><button class="small ${quickOn ? "" : "primary"}" data-quick="0">Off</button></div>`)}
      ${opt("Combat speed", "How fast dice roll and blows land.", `<div class="seg">${sp(1, "Normal")}${sp(0.5, "Fast")}${sp(0.2, "Very fast")}</div>`)}`)}
    ${sec("💾", "Progress & backup", `
      <p class="sub">Renown, unlocks, the Codex and any saved run are kept in this browser${leaderboardOn() ? ", with a copy online" : ""}.</p>
      ${backupPanel()}`)}
    ${sec("⚠️", "Danger zone", opt("Reset all progress", "Erases everything on this device. This can't be undone.", `<button class="small ${resetArmed ? "danger" : ""}" data-reset>${resetArmed ? "Tap again to erase" : "Reset"}</button>`), "danger-sec")}
    <div class="row" style="justify-content:center;margin-top:14px"><button class="primary" data-closeoptions>Done</button></div>
  </div></div>`;
}

function storyPopup(m: Mode) {
  const st = STORIES[m];
  return `<div class="overlay popup-wrap"><div class="popup story-pop">
    <button class="small closex closebtn" data-closestory aria-label="Close">✕</button>
    <div class="center bigicon">${st.icon}</div>
    <h1 class="center bigname">${st.title}</h1>
    <p class="story-text">${esc(st.text)}</p>
    <div class="row" style="justify-content:center;margin-top:12px"><button class="closebtn" data-closestory>✕ Close</button></div>
  </div></div>`;
}

let winSeen = false;
/** A story moment: a centered popup with an icon, a title and a little text. */
function offlinePopup() {
  return `<div class="overlay popup-wrap"><div class="popup offline-pop">
    <div class="center bigicon">📡</div>
    <h1 class="center bigname">You're offline</h1>
    <p class="center">No worries: the game runs on your device, so you can keep playing.</p>
    <ul class="beat-list">
      <li>💾 Your run still saves on this device at every path choice.</li>
      <li>🎵 Music that hasn't loaded yet may stay quiet until you're back online.</li>
      <li>✨ New updates will wait until you reconnect.</li>
    </ul>
    <div class="row" style="justify-content:center;margin-top:12px"><button class="primary" data-closeoffline>Keep playing</button></div>
  </div></div>`;
}

function runMenu(r: Run) {
  const atMap = r.scene.t === "map";
  const over = r.scene.t === "over";
  const b = (cls: string) => (r.gridMode ? "plank-btn" : `big ${cls}`);
  return `<div class="overlay popup-wrap"><div class="popup dg-popup ${r.gridMode ? "run-menu" : ""}">
    <h2 class="dg-carved">${r.gridMode ? "Menu" : "☰ Menu"}</h2>
    <div class="col" style="gap:8px;display:flex;flex-direction:column">
      <button class="${b("dg-gold")}" data-closemenu>▶ Resume</button>
      <button class="${b("dg-stone")}" data-mainmenu>🏠 Main menu</button>
      ${musicSliders("game", false)}
      <p class="sub center">${over ? "This run is over." : r.gridMode ? "Your run saves as you go; pick it up with Continue." : atMap ? "Your run is saved here; pick it up with Continue." : "Your run is saved at the last path choice; Continue picks it up from there."}</p>
      ${over ? "" : `<button class="${b("dg-stone")} ${endArmed ? "danger" : ""}" data-endrun>${endArmed ? "Tap again to end this run" : "🏳️ End run"}</button>
      <p class="sub center">Ending the run counts as a death: you keep the Renown you've earned, but the run is gone.</p>`}
    </div></div></div>`;
}

function storyBeat(p: { icon: string; title: string; text: string; list?: string[] }, close = "data-closepopup") {
  return `<div class="overlay popup-wrap"><div class="popup story-pop beat">
    <div class="center bigicon">${p.icon}</div>
    <h1 class="center bigname">${esc(p.title)}</h1>
    <p class="story-text">${esc(p.text)}</p>
    ${p.list ? `<ul class="beat-list">${p.list.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    <button class="continue" ${close}>Continue</button>
  </div></div>`;
}

/** Class Mastery for an origin: level, progress, and the starting-kit choices it has opened. */
function masteryPanel(o: OriginId) {
  const xp = meta.mastery?.[o] ?? 0;
  const lv = masteryLevel(xp);
  const next = lv < MASTERY_MAX ? MASTERY_XP[lv + 1] : 0;
  const prev = MASTERY_XP[lv];
  const pct = lv >= MASTERY_MAX ? 100 : Math.round(((xp - prev) / (next - prev)) * 100);
  const og = ORIGINS[o];
  const kit = meta.kits?.[o] ?? {};
  const slotName: Record<KitSlot, string> = { main: "Weapon", off: "Off-hand", armour: "Armour" };
  const sel = (slot: KitSlot, i: number) => {
    const id = kit[slot] ?? og.kit[i];
    return `<div class="kit-row"><span>${slotName[slot]}</span><b class="grow">${esc(baseOf(id).name)}</b><button class="small" data-kitpick="${slot}">Change</button></div>`;
  };
  const chosen = KIT_SLOTS.map(sl => kit[sl]).filter(Boolean).map(id => baseOf(id!));
  return `<div class="panel mastery-panel">
    <div class="row"><b class="grow">⭐ Mastery ${lv}${lv >= MASTERY_MAX ? " (max)" : ""}</b><span class="sub">${lv >= MASTERY_MAX ? `${xp} XP` : `${xp}/${next} XP`}</span></div>
    <div class="bar mastery-bar"><i style="width:${pct}%"></i></div>
    <p class="sub">Earned by playing the ${og.name}: floors explored and guardians beaten.</p>
    ${lv >= KIT_COMMON_LEVEL ? `<p class="kit-head"><b>Starting kit</b> <span class="sub">${lv >= KIT_UNCOMMON_LEVEL ? "Commons and Uncommons" : `Commons (Uncommons at mastery ${KIT_UNCOMMON_LEVEL})`}</span></p>
      ${KIT_SLOTS.map(sel).join("")}
      ${chosen.length ? `<div class="kit-notes">${chosen.map(b => `<p class="sub"><b>${esc(b.name)}:</b> ${esc(b.text)}</p>`).join("")}</div>` : ""}`
      : `<p class="sub">Reach mastery ${KIT_COMMON_LEVEL} to choose your starting kit.</p>`}
  </div>`;
}

/** Starting-kit picker: every option for one slot as a card with its comparison, side-scrolling on phones, a grid on big screens. */
let kitPick: KitSlot | null = null;
/** The Camp: the hero you've brought there, the tab open, and the contract taken at its Quest Board. */
let camp: OriginId | null = null;
type CampTab = "expedition" | "quests" | "hall" | "skills" | "garden" | "brewery" | "knowledge" | "tree" | "weapons" | "abyss" | "trophies" | "bestiary" | "pond";
let campTab: CampTab = "expedition";
let campOffers: Bounty[] | null = null;
let campQuest: number | null = null;
/** The Garden's seed being sown (pick a plot), and the Brewery's pot on the fire. */
let sowing: Plant | null = null;
let brew: Brew | null = null;
const KIT_INDEX: Record<KitSlot, number> = { main: 0, off: 1, armour: 2 };
function kitPopup(o: OriginId, slot: KitSlot) {
  const lv = masteryLevel(meta.mastery?.[o] ?? 0);
  const og = ORIGINS[o];
  const own = og.kit[KIT_INDEX[slot]];
  const current = meta.kits?.[o]?.[slot] ?? own;
  const ids = [own, ...kitOptions(slot, lv, lockedIds(meta), o).map(x => x.id)].filter((id, i, all) => all.indexOf(id) === i && id !== current);
  const slotName: Record<KitSlot, string> = { main: "Weapon", off: "Off-hand", armour: "Armour" };
  const mk = (id: string, n: number): GearItem => ({ uid: 910000 + n, base: id, rarity: baseOf(id).onlyRarity ?? "common", level: 1, bonuses: {}, revealed: true });
  const nowCard = itemCard(mk(current, 0));
  // One block per option: the option on top, what's in your kit now underneath, then Equip.
  const cards = ids.map((id, n) => `<div class="kit-card">
      <div class="cmp-new"><div class="cmp-tag new">${id === own ? "Your class's own" : "Option"}</div>${itemCard(mk(id, n + 1))}</div>
      <div><div class="cmp-tag">In your kit · ${slotName[slot]}</div>${nowCard}</div>
      <button class="take-equip kit-equip" data-kitset="${slot}|${id === own ? "" : id}">✔ Equip</button>
    </div>`).join("");
  return `<div class="overlay kit-overlay"><div class="kit-pop">
    <div class="row"><h1 class="grow">🎒 ${esc(og.name)} · ${slotName[slot]}</h1><button class="closebtn" data-kitclose>✕ Close</button></div>
    <p class="sub">Pick what you start with: each option sits above what's in your kit now.<span class="kit-swipe"> Swipe for all ${ids.length} ›</span></p>
    <div class="kit-strip">${cards}</div>
  </div></div>`;
}

/** Ruin Gems on this run's class: +10% base stats each (Campaign and Abyss; the Daily stays a level field). */
function withGems(r: Run) {
  r.hero.gems = meta.classGems?.[r.hero.origin] ?? 0;
  recompute(r.hero); r.hero.f.hp = r.hero.f.maxHp;
}
/** The Ruin Gems panel in a class popup: what's on this class, and moving gems on or off. */
function gemPanel(o: OriginId) {
  const on = meta.classGems?.[o] ?? 0, free = meta.ruinGems ?? 0;
  const total = free + Object.values(meta.classGems ?? {}).reduce((a: number, n) => a + (n ?? 0), 0);
  if (!total) return "";
  return `<div class="panel gem-panel"><p class="big">💎 <b>${on}</b> Ruin Gem${on === 1 ? "" : "s"} on the ${ORIGINS[o].name}</p>
    <p class="sub">${on ? `+${Math.round(GEM_BONUS * on * 100)}% Max HP, Damage and Armor in the dungeon and the Abyss (not the Daily).` : "None yet."} Each gem adds ${Math.round(GEM_BONUS * 100)}%. Gems move freely between classes.</p>
    <div class="row">${free ? `<button class="small primary" data-addgem="${o}">＋ Add a gem (${free} free)</button>` : ""}${on ? `<button class="small" data-removegem="${o}">− Take one back</button>` : ""}</div></div>`;
}

function originPopup(o: OriginId) {
  const og = ORIGINS[o];
  const p = getItem(og.passive);
  if (menuTab === "abyss") {
    const pl = meta.classPlates?.[o] ?? 0;
    const free = meta.plates ?? 0;
    const shards = meta.ruinShards ?? 0;
    return `<div class="overlay popup-wrap"><div class="popup abyss-pop">
    <button class="small closex closebtn" data-closeorigin aria-label="Close">✕</button>
    <h1 class="center bigname">${og.name}</h1>
    <div class="center bigicon">${ORIGIN_ICON[o]}</div>
    <p class="center">Into the Abyss as the ${og.name}.</p>
    ${masteryPanel(o)}
    ${gemPanel(o)}
    <div class="panel plate-panel"><p class="big">⬛ <b>${pl}</b> Vanadium Plate${pl === 1 ? "" : "s"} on the ${og.name}</p>
      <p class="sub">${pl ? `+${Math.round((plateMult(pl) - 1) * 100)}% Max HP, Armor and Damage in the Abyss.` : "No plates yet."} The first two plates add ${Math.round(PLATE_BONUS * 100)}% each; from the 3rd on, each adds 30%.</p>
      ${free ? `<button class="small ${plateArmed ? "danger" : ""}" data-addplate="${o}">${plateArmed ? `Give it to the ${og.name} for good?` : `＋ Give a plate (${free} to give)`}</button>` : `<p class="sub">No plates to give. Guardians from the last layer on sometimes drop one.</p>`}</div>
    ${liveSave() ? `<p class="sub warn">Starting a new run replaces your saved run.</p>` : ""}
    <div class="row" style="justify-content:center;margin-top:12px"><button class="primary abyss-go" data-startabyss ${shards >= ABYSS_SHARD_COST ? "" : "disabled"}>🕳️ Enter the Abyss · 🪨 ${ABYSS_SHARD_COST}</button><button data-closeorigin>Back</button></div>
    ${shards >= ABYSS_SHARD_COST ? `<p class="sub center">You have ${shards} Ruin Shard${shards === 1 ? "" : "s"}.</p>` : `<p class="sub center warn">You need ${ABYSS_SHARD_COST} Ruin Shards (you have ${shards}).</p>`}
  </div></div>`;
  }
  return `<div class="overlay popup-wrap"><div class="popup">
    <button class="small closex closebtn" data-closeorigin aria-label="Close">✕</button>
    <h1 class="center bigname">${og.name}</h1>
    <div class="center bigicon">${ORIGIN_ICON[o]}</div>
    <p>${esc(ORIGIN_PITCH[o])}</p>
    <p class="sub"><b>${esc(p.name)}:</b> ${esc(p.text)}.</p>
    <p class="sub">Starts with ${og.hp} HP · ${og.kit.map(k => esc(baseOf(k).name)).join(", ")}</p>
    ${(() => { const ba = BASE_ATTR[o as keyof typeof BASE_ATTR]; if (!ba) return ""; const ai = ATTR_INFO[ba]; return `<div class="class-attr"><span class="ca-ic">${ai.icon}</span><div><b>Base attribute: ${esc(ai.name)}</b><p>Every point you put into ${esc(ai.name)} also adds +1 to your ⚔️ Damage, on top of what it usually gives: ${shownLines(ai.lines(1)).map(esc).join(", ")}.</p></div></div>`; })()}
    ${masteryPanel(o)}
    ${gemPanel(o)}
    ${liveSave() ? `<p class="sub warn">Starting a new run replaces your saved run.</p>` : ""}
    <div class="row plank-row" style="justify-content:center;margin-top:12px"><button class="plank-btn" data-tocamp>🏕️ To the Camp</button><button class="plank-btn" data-closeorigin>Back</button></div>
  </div></div>`;
}

/** "New relic!" popup: a relic is easy to miss in a line of text, so each one gets its own moment. */
/** Two relics on offer: take one. */
function relicChoicePopup(r: Run) {
  const card = (id: string) => {
    const it = getItem(id);
    const rar = it.rarity ?? "common";
    const have = r.hero.relics[id] ?? 0;
    return `<button class="relic-choice r-${rar}" data-relicpick="${id}">
      <span class="relic-kicker" style="text-transform:capitalize">${esc(rar)} relic</span>
      <b class="nm">${esc(it.name)}</b>
      <span>${esc(fillText(it.text, have + 1))}</span>
      ${have ? `<span class="sub">You have it: this makes it ×${have + 1}, stronger.</span>` : ""}
      ${FUSABLE_RELICS.has(id) ? `<span class="fusable-tag">🔗 Fusable</span>` : ""}
    </button>`;
  };
  return `<div class="overlay popup-wrap"><div class="popup relic-pop">
    <div class="center relic-gem">💎</div>
    <div class="center relic-kicker">CHOOSE A RELIC</div>
    <p class="center sub">Two relics glint in the remains. You can only carry one away.</p>
    <div class="relic-choices">${r.relicChoice!.map(card).join("")}</div>
  </div></div>`;
}

/** The first time you ever hold a revealed Legendary: a line of its lore. */
function nextLore(r: Run): GearItem | undefined {
  const seen = meta.loreSeen ?? [];
  return [...EQUIP_SLOTS.map(s => r.hero.equip[s]), ...r.hero.backpack].find((it): it is GearItem => !!it && it.revealed && !!LEGENDARY_LORE[it.base] && !seen.includes(it.base));
}
function lorePopup(it: GearItem) {
  return `<div class="overlay popup-wrap"><div class="popup lore-pop r-legendary">
    <div class="center relic-gem">📜</div>
    <div class="center relic-kicker">A LEGEND, FOUND</div>
    <h1 class="center bigname nm">${esc(baseOf(it.base).name)}</h1>
    <p class="center lore-text">${esc(LEGENDARY_LORE[it.base])}</p>
    <p class="center sub">The first time you've held one.</p>
    <div class="row" style="justify-content:center;margin-top:12px"><button class="primary" data-loreok="${it.base}">Continue</button></div>
  </div></div>`;
}

function relicPopup(id: string, more: number) {
  if (id.startsWith("scroll:")) {
    const n = Number(id.split(":")[1]) || 1;
    const hidden = run ? [...EQUIP_SLOTS.map(s => run!.hero.equip[s]), ...run.hero.backpack].filter(it => it && !it.revealed).length : 0;
    return `<div class="overlay popup-wrap"><div class="popup relic-pop scroll-pop r-legendary">
    <div class="center relic-gem">📜</div>
    <div class="center relic-kicker scroll-kicker">${n > 1 ? `${n} SCROLLS` : "NEW SCROLL"}</div>
    <h1 class="center bigname nm">Scroll of Revelation</h1>
    <p class="center">Reveals a hidden Legendary's true power. You have <b>${run?.hero.scrolls ?? n}</b>.</p>
    <p class="center sub">${hidden ? `You're carrying ${hidden} unrevealed item${hidden > 1 ? "s" : ""}: open 🎒 Inventory to read one.` : "Keep it for when you find a Legendary: use it from 🎒 Inventory."}</p>
    <div class="row" style="justify-content:center;margin-top:12px"><button class="primary" data-relicok>${more ? `Next (${more} more)` : "Got it"}</button></div>
  </div></div>`;
  }
  const it = getItem(id);
  const rar = it.rarity ?? "common";
  const n = run?.hero.relics[id] ?? 1;
  return `<div class="overlay popup-wrap"><div class="popup relic-pop r-${rar}">
    <div class="center relic-gem">💎</div>
    <div class="center relic-kicker">NEW RELIC</div>
    <h1 class="center bigname nm">${esc(it.name)}${n > 1 ? ` ×${n}` : ""}</h1>
    <p class="center sub" style="text-transform:capitalize">${esc(rar)} relic · always active</p>
    <p class="center">${esc(fillText(it.text, n))}</p>
    ${FUSABLE_RELICS.has(id) ? `<p class="center fusable-tag">🔗 Can be fused with another relic at a Jeweller</p>` : ""}
    <div class="row" style="justify-content:center;margin-top:12px"><button class="primary" data-relicok>${more ? `Next relic (${more} more)` : "Got it"}</button></div>
  </div></div>`;
}
const celebratedRelic = new Set<string>();
const celebratedPopup = new WeakSet<object>();

const celebratedLevel = new WeakSet<object>();
function levelUpPopup(r: Run) {
  return `<div class="overlay popup-wrap"><div class="popup levelup">
    <h1 class="center bigname">You have levelled up!</h1>
    <p class="center">Level <b>${r.hero.level}</b> · +3 Max HP</p>
    <div class="row" style="justify-content:center;margin-top:12px"><button class="primary" data-choosetalent>Choose talent</button></div>
  </div></div>`;
}

const ACTION_INFO: Record<Action, { label: (p: Fighter) => string; tip: string }> = {
  ...Object.fromEntries(THROWS.map(t => [t, { label: (p: Fighter) => `${THROW_INFO[t].icon} ${THROW_INFO[t].name} ×${p.persist[THROW_INFO[t].key] ?? 0}`, tip: `Uses your turn. ${THROW_INFO[t].text}.` }])) as Record<Throw, { label: (p: Fighter) => string; tip: string }>,
  attack: { label: () => "Attack", tip: "Roll your die and strike." },
  guard: { label: () => "Guard", tip: "Double your Armor this round; Armor can stop a whole hit. Needs a shield (a Warrior can Guard with a two-hander)." },
  counter: { label: () => "Counter", tip: "Costs 1 Mana. Uses your turn. +35% Dodge this round; if you Dodge an attack, you strike back at once with a Crit (no roll needed). If you're hit, you're a little off-balance for your next attack." },
  barrier: { label: () => "Elemental Barrier", tip: "Costs 1 Mana. Uses your turn. Roll: 5–6 blocks every hit this round and gives attackers 4 stacks of your off-hand's element; 3–4 halves them and gives 2; 1–2 blocks nothing but still gives 2." },
  penance: { label: p => `Penance${p.flags["penanceStore"] ? ` (${p.flags["penanceStore"]})` : ""}`, tip: "Costs 1 Mana. Uses your turn. You take a quarter less this round, and the damage and negative statuses you take are stored; your next attack adds half as much again. A kill with it heals you." },
  warcry: { label: () => "War Cry", tip: "Costs 1 Mana. Uses your turn: gain a lot of Might (half as much for each cry after the first this fight), and leave the enemy Weak and Exposed." },
  flee: { label: p => (p.flags["smoke"] ? "Flee 💨" : "Flee"), tip: "Leave the fight (not Elites or bosses). The foe gets a free hit as you go, unless smoke covers you. It stays where it was, and its wounds close." },
  crush: { label: () => "Crushing Blow", tip: "Costs 1 Mana. Attack for 60% more damage and Fracture the foe." },
  shieldwall: { label: () => "Shield Wall", tip: "Costs 1 Mana. Guard this round (no shield needed) and gain Barrier of twice your Armor." },
  envenom: { label: () => "Envenom", tip: "Costs 1 Mana. Poison the foe (more on deeper layers), then attack." },
  smokebomb: { label: () => "Smoke Bomb", tip: "Costs 1 Mana. Uses your turn: Evade the next 2 hits and Blind the foe for 2 rounds." },
  frostnova: { label: () => "Frost Nova", tip: "Costs 1 Mana. Uses your turn: Chill the foe 3 and Stun it for its next turn." },
  arcanebolt: { label: () => "Arcane Bolt", tip: "Costs 1 Mana. Deal twice your Damage (more on deeper layers) straight through Armor." },
  smite: { label: () => "Smite", tip: "Costs 1 Mana. Burn the foe 3, attack, and heal 8% of your Max HP." },
  sanctuary: { label: () => "Sanctuary", tip: "Costs 1 Mana. Uses your turn: heal a quarter of your Max HP and gain a Ward." }
};

// ---------- Render ----------

// ---------- Loot fanfare ----------
const celebrated = new Set<number>();
let fanfareEl: HTMLElement | null = null;
/** Fanfares waiting their turn: a level-up and a big drop play one after the other, never on top of each other. */
const fanfareQueue: [string, string | undefined, boolean][] = [];
/** While a relic popup is up, fanfares wait (they'd play behind it); they play in turn once it's closed. */
let fanfareHold = false;
function releaseFanfares() {
  if (fanfareHold || fanfareEl) return;
  const next = fanfareQueue.shift();
  if (next) playFanfare(...next);
}
/** DEATH arrives: a deep purple dark, and its name in red, fading in and out.
 *  Met early (the Crossroads' "future"), the screen first goes black and silent, and DEATH's floor fills it. */
function deathIntro(early: boolean) {
  const show = () => {
    const el = document.createElement("div");
    el.className = `death-intro${early ? " after80" : ""}`;
    el.innerHTML = `<div class="death-word">DEATH</div>`;
    document.body.appendChild(el);
    sfx("crimson");
    setTimeout(() => sfx("legendary"), 700);
    navigator.vibrate?.([300, 120, 300, 120, 600]);
    setTimeout(() => { el.remove(); holdMusic(false); }, 4200);
  };
  holdMusic(true);
  if (!early) { show(); return; }
  const dark = document.createElement("div");
  dark.className = "floor80-intro";
  dark.innerHTML = `<div class="floor80-word">Floor ${DEATH_FLOOR}</div>`;
  document.body.appendChild(dark);
  setTimeout(() => { dark.remove(); show(); }, 5200);
}

function celebrate(rarity: string, label?: string, banner = true) {
  if (!["rare", "epic", "legendary", "crimson", "epic_crimson", "legendary_crimson"].includes(rarity)) return;
  if (fanfareEl || fanfareHold) { fanfareQueue.push([rarity, label, banner]); return; }
  playFanfare(rarity, label, banner);
}
function playFanfare(rarity: string, label?: string, banner = true) {
  // The Abyss tiers ride on the Crimson fanfare, bigger and in their own colours.
  if (rarity.endsWith("_crimson")) { label ??= rarityLabel(rarity).toUpperCase(); rarity = `crimson ${rarity}`; }
  const el = document.createElement("div");
  el.className = `fanfare ${rarity}`;
  const isCrimson = rarity.startsWith("crimson");
  const abyss = rarity.includes("_crimson");
  const sparks = rarity === "legendary" || isCrimson
    ? Array.from({ length: abyss ? 48 : 22 }, () => {
        const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 220;
        return `<i class="spark" style="left:50%;top:38%;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;animation-delay:${Math.random() * 0.25}s"></i>`;
      }).join("")
    : "";
  el.innerHTML = rarity === "rare" ? "" : `${banner ? `<div class="banner">${esc(label ?? rarity.toUpperCase())}</div>` : ""}${sparks}`;
  document.body.appendChild(el);
  fanfareEl = el;
  if (rarity !== "epic") navigator.vibrate?.(abyss ? [120, 60, 120, 60, 120, 60, 400] : isCrimson ? [80, 50, 80, 50, 200] : [60, 40, 120]);
  sfx(isCrimson ? "crimson" : rarity === "legendary" ? "legendary" : rarity === "epic" ? "epic" : "chest");
  if (abyss) setTimeout(() => sfx("legendary"), 600);
  setTimeout(() => {
    el.remove();
    if (fanfareEl === el) fanfareEl = null;
    // Next in line, after a short breath.
    const next = fanfareQueue.shift();
    if (next) setTimeout(() => (fanfareEl || fanfareHold ? fanfareQueue.unshift(next) : playFanfare(...next)), 250);
  }, abyss ? 6500 : isCrimson ? 4300 : rarity === "rare" ? 1300 : 3500);
}
const RANK: Record<string, number> = { rare: 0.5, epic: 1, legendary: 2, crimson: 3, epic_crimson: 4, legendary_crimson: 5 };
/** Celebrate the best newly-seen Epic/Legendary in the current scene, once per item. */
function celebrateScene(r: Run) {
  const s = r.scene;
  const found: GearItem[] = s.t === "loot" || s.t === "pick" ? s.items
    : s.t === "resplendent" && s.picked !== null && s.cards[s.picked].kind === "item" ? [(s.cards[s.picked] as { item: GearItem }).item] : [];
  let best: GearItem | null = null;
  let special = "";
  for (const it of found) {
    if (celebrated.has(it.uid)) continue;
    // Overcharged and Mythic (✦✦✦) rolls get their own fanfare, whatever their rarity.
    if (it.gen?.broken) special = "⚡ OVERCHARGED";
    else if (!special && it.gen?.mods.some(m => m[2] >= 3)) special = "✦✦✦ MYTHIC ROLL";
    else if (!special && it.gen?.mods.some(m => m[2] >= 2) && !RANK[it.rarity]) special = "✦✦ GRAND ROLL";
    if (!RANK[it.rarity] && !special) continue;
    celebrated.add(it.uid);
    if (RANK[it.rarity] && (!best || RANK[it.rarity] > RANK[best.rarity])) best = it;
  }
  if (special) celebrate("legendary", special);
  else if (best) celebrate(best.rarity);
}

let lastSceneKey = "";
function render() {
  app.classList.toggle("with-side", !!run);
  if (!run) fanfareHold = false;
  // The floor's theme colours everything while you're in a run.
  const th = run ? themeOf(run) : undefined;
  if (th) document.body.dataset.theme = th.id; else delete document.body.dataset.theme;
  document.body.classList.toggle("dg-menu", !run && !camp);
  document.body.classList.toggle("crawl-on", !run && !!camp);
  // Shops, forges and encounters: the dungeon's stone buttons (in any floor theme).
  document.body.classList.toggle("dg-scene", !!run && !(run.gridMode && run.scene.t === "shop") && ["shop", "forge", "jeweller", "event", "smith", "alchemist", "tribute", "sanctum", "bounty", "rest", "confirm"].includes(run.scene.t));
  render2();
  // A foe with Ambush strikes before you can do anything.
  if (run && run.scene.t === "combat" && ambushPending(run.scene.battle) && !busy) { const r = run, b = run.scene.battle; setTimeout(() => void playAmbush(r, b), 0); }
  // A new scene (a room, a chest, a fight's rewards) starts at the top of the page, not wherever the last one was scrolled to.
  const key = run ? `${run.scene.t}:${run.floor}:${run.step}` : view;
  if (key !== lastSceneKey) { lastSceneKey = key; window.scrollTo(0, 0); }
  // Fanfares that waited for a relic popup play now, one after another.
  setTimeout(releaseFanfares, 200);
  // The offline notice sits on top of everything, wherever you are.
  if (offlineOpen) {
    app.insertAdjacentHTML("beforeend", offlinePopup());
    app.querySelectorAll<HTMLElement>("[data-closeoffline]").forEach(el => (el.onclick = () => { offlineOpen = false; render(); }));
  }
}

function render2() {
  // Not in a run: a new build can load straight away.
  if (!run && updateReady()) applyUpdate();
  playMusic(run ? "game" : "title");
  if (!run) {
    app.innerHTML = camp && view === "title" ? `${campScreen(camp)}${treeNode ? treeNodePopup(camp) : ""}${camp && kitPick ? kitPopup(camp, kitPick) : ""}${helpOpen ? helpPopup() : ""}` : view === "splash" && optionsOpen ? optionsPage() : view === "splash" ? `${splashScreen()}${resetPopup ? storyBeat({ icon: "🌅", title: "The Great Reset", text: "The loot rework is done, so every hero starts afresh. Your old progress has been cleared and the leaderboards are empty: the climb begins again, for everyone. Good luck!" }, "data-closereset") : ""}${helpOpen ? helpPopup() : ""}${lbOpen ? leaderboardPopup() : ""}` : view === "codex" ? codexScreen() : view === "changes" ? changesScreen() : `${titleScreen()}${abyssIntroOpen ? abyssIntro() : ""}${challengesOpen ? challengesPopup() : ""}${infoOpen && !helpOpen && !historyOpen && !achOpen ? infoPopup() : ""}${historyOpen ? historyPopup() : ""}${achOpen ? achievementsPopup() : ""}${pendingOrigin ? originPopup(pendingOrigin) : ""}${pendingOrigin && kitPick ? kitPopup(pendingOrigin, kitPick) : ""}${storyOpen ? storyPopup(storyOpen) : ""}${helpOpen ? helpPopup() : ""}${lbOpen ? leaderboardPopup() : ""}`;
    bind();
    if (camp) mountCampMap({ open: id => { campRoom = id as CampTab; campTab = id as CampTab; render(); }, origin: () => camp ?? "warrior", locked: id => id === "abyss" && !abyssUnlocked(meta), sfx: k => sfx(k as never) });
    return;
  }
  const r = run;
  const s = r.scene;
  // Autosave at every path choice; a finished run clears the save.
  if (s.t === "map") saveRun(r, banked);
  // A new build is out: install it now that the run is safely saved at a path choice. Never on the end-of-run screen:
  // that would skip the results, the leaderboard post and the chance to delve deeper (it installs back at the menu).
  if (updateReady() && s.t === "map") { applyUpdate(); }

  if (s.t === "combat" && s.battle !== currentBattle) {
    currentBattle = s.battle;
    lastRoll.player = lastRoll.enemy = null;
    shownDice = [];
    if ((s.battle.enemy.items["m_death"] ?? 0) > 0) deathIntro(r.floor !== DEATH_FLOOR);
    dispHp.player = dispHp.enemy = null;
  }
  trackGold(r);
  trackMarks(r);
  // Ruin Shards and Vanadium Plates go to the device (and the online backup) the moment they drop.
  if (bankRuin(meta, r)) backupVault(vaultOf(meta));
  // Crown Shards and Camp materials go to the Camp the moment they're found.
  if (bankCamp(meta, r)) saveMeta(meta);
  // The leaderboard server keeps its own record of how far this run has got.
  if (r.sid && r.floor !== r.reportedFloor && s.t !== "over") void reportFloor(r);
  if (s.t === "over" && !recorded && r.endRecord) recorded = r.endRecord;
  if (s.t === "over" && !recorded) {
    recorded = recordRun(meta, r, banked);
    r.endRecord = recorded;
    banked += recorded.earned;
    sfx(s.won ? "win" : "lose");
    if (playerName()) sendRun(r);
  }
  // A finished run stays saved on its results screen until a new run starts.
  if (s.t === "over") saveRun(r, banked);
  const body =
    s.t === "map" ? mapScene(r) : s.t === "combat" ? combatScene(r) : s.t === "loot" ? lootScene(r) : s.t === "pick" ? pickScene(r)
    : s.t === "resplendent" ? mapScene(r) : s.t === "talent" ? talentScene(r) : s.t === "shop" ? shopScene(r) : s.t === "forge" ? forgeScene(r) : s.t === "offering" ? forgeScene(r, true) : s.t === "fishing" ? `${fishingPanel("run")}<div class="fish-btns" style="margin:10px auto 0"><button class="plank-btn" data-leave>Leave the pool</button></div>` : s.t === "masterwork" ? masterworkScene(r)
    : s.t === "cleared" ? clearedScene(r)
    : s.t === "smith" ? smithScene(r)
    : s.t === "alchemist" ? alchemistScene(r)
    : s.t === "tribute" ? tributeScene(r)
    : s.t === "sanctum" ? sanctumScene(r)
    : s.t === "jeweller" ? jewellerScene(r)
    : s.t === "bounty" ? bountyScene(r)
    : s.t === "rest" ? restScene(r) : s.t === "confirm" ? confirmScene(r) : s.t === "event" ? eventScene(r) : overScene(r);
  // A relic popup is (or is about to be) up: hold every fanfare until it's closed.
  fanfareHold = s.t !== "combat" && !!r.relicNews?.length;
  celebrateScene(r);
  const msg = [r.message, note].filter(Boolean);
  // Level up: once the rewards are picked, a fanfare and a popup before the talent choice.
  const levelPopup = s.t === "talent" && ackedTalentScene !== s;
  if (levelPopup && !celebratedLevel.has(s)) { celebratedLevel.add(s); celebrate("legendary", "LEVEL UP!"); }
  const winPopup = s.t === "over" && s.won && r.mode === "campaign" && !winSeen;
  // Story popups can carry their own fanfare (DEATH, the End).
  if (r.popup?.fanfare && !celebratedPopup.has(r.popup)) { celebratedPopup.add(r.popup); celebrate(r.popup.fanfare, r.popup.title, false); }
  // A new relic gets its own popup and a little fanfare (after any level-up popup).
  const relicNow = !levelPopup && !winPopup && s.t !== "combat" && r.relicNews?.length ? r.relicNews[0] : undefined;
  if (relicNow) {
    const key = `${relicNow}:${r.hero.relics[relicNow]}:${r.relicNews!.length}:${r.floor}:${r.step}`;
    if (!celebratedRelic.has(key)) {
      celebratedRelic.add(key);
      if (relicNow.startsWith("scroll:")) celebrate("epic", "SCROLL OF REVELATION", false);
      else celebrate(["rare", "epic", "legendary"].includes(getItem(relicNow).rarity ?? "") ? (getItem(relicNow).rarity as string) : "rare", "NEW RELIC", false);
    }
  }
  // The Crawl: finds and encounters pop up over the map; every other scene sits in the dungeon's stone frame.
  const POPS = ["loot", "pick", "event", "confirm", "rest", "tribute"];
  // Something Strange: its event plays in a dark room of its own, not over the map.
  const strange = s.t === "event" && !!s.strange && !!r.gridMode;
  const crawlPop = !!r.gridMode && !!r.grid && POPS.includes(s.t) && !strange;
  const crawlView = (s.t === "map" || s.t === "resplendent" || crawlPop) && !!r.gridMode && !!r.grid;
  const FRAMED: Record<string, string> = { forge: "Forge", offering: "Offering Altar", fishing: "Still Pool", masterwork: "Masterwork", jeweller: "Jeweller", alchemist: "Alchemist", smith: "Blacksmith", sanctum: "Dragon Sanctum", bounty: "Bounty Board", talent: "Level Up", cleared: "Layer Cleared", over: r.scene.t === "over" && r.scene.won ? "Victory" : "Fallen" };
  const crawlFrame = !!r.gridMode && !!FRAMED[s.t];
  const crawlFight = s.t === "combat" && !!r.gridMode;
  const crawlShop = s.t === "shop" && !!r.gridMode;
  document.body.classList.toggle("crawl-on", crawlView || crawlFight || crawlShop || crawlFrame);
  app.innerHTML = `${lbOpen ? leaderboardPopup() : ""}${helpOpen ? helpPopup() : ""}${r.popup && !levelPopup ? storyBeat(r.popup) : ""}${winPopup ? storyBeat(r.gridMode ? { icon: "👑", title: "Victory!", text: "The last guardian lies still, and the dungeon's deepest door stands open behind it. Whatever was waiting down here has met its end. Take what it kept: it's yours now." } : { icon: "👑", title: "Victory!", text: "Your efforts have proven true! The gates of darkness have been shut. The kingdom has been saved!" }, "data-closewin") : ""}${levelPopup ? levelUpPopup(r) : ""}${relicNow ? relicPopup(relicNow, r.relicNews!.length - 1) : !levelPopup && !winPopup && s.t !== "combat" && r.relicChoice ? relicChoicePopup(r) : !levelPopup && !winPopup && s.t !== "combat" && nextLore(r) ? lorePopup(nextLore(r)!) : ""}${strange ? `<div class="strange-screen"><div class="strange-room"></div><div class="crawl-pop-wrap strange-wrap"><div class="crawl-pop">${msg.map((m, i) => `<div class="toast ${i === msg.length - 1 && noteBad && note ? "err" : ""}">${esc(m)}</div>`).join("")}${body}</div></div></div>` : crawlView ? crawlScreen(r, crawlPop ? [] : msg, noteBad && !!note) + (crawlPop ? `<div class="crawl-pop-wrap"><div class="crawl-pop">${msg.map((m, i) => `<div class="toast ${i === msg.length - 1 && noteBad && note ? "err" : ""}">${esc(m)}</div>`).join("")}${body}</div></div>` : "") : crawlFrame ? `<div class="cb-screen grit-screen"><div class="mer-inner grit-inner"><div class="mer-sign"><i class="chain l"></i><i class="chain r"></i><div class="plank">${FRAMED[s.t]}</div></div>${msg.map((m, i) => `<div class="toast ${i === msg.length - 1 && noteBad && note ? "err" : ""}">${esc(m)}</div>`).join("")}<div class="grit-body">${body}</div></div></div>` : crawlFight ? crawlCombat(r, msg, noteBad && !!note) : crawlShop ? merchantScreen(r, msg, noteBad && !!note) : `${sideEquip(r)}${hud(r)}${msg.map((m, i) => `<div class="toast ${i === msg.length - 1 && noteBad && note ? "err" : ""}">${esc(m)}</div>`).join("")}${body}<p class="version">${VERSION}</p>`}${s.t === "resplendent" ? resplendentScene(r) : ""}${bagOpen ? (r.gridMode ? crawlBag(r) : bag(r)) : ""}${bagOpen && r.gridMode ? `<button class="cz-circle big cz-bagx" data-closebag aria-label="Close the inventory">✕</button>` : ""}${compareOpen ? comparePopup(r) : ""}${bountyOpen && r.bounty ? bountyPopup(r) : ""}${menuOpen ? runMenu(r) : ""}${forgeAsk && (s.t === "forge" || s.t === "offering") ? forgeAskPopup(r) : ""}`;
  bind();
  // Bookmarks that scroll sideways: keep the open one in view.
  document.querySelectorAll<HTMLElement>(".bm-tabs > .on, .mer-tabs > .on").forEach(el => { const p = el.parentElement!; if (p.scrollWidth > p.clientWidth) p.scrollLeft = Math.max(0, el.offsetLeft - 24); });
  if (crawlView) { crawlKeys(); mountCrawl(r, { render, say: (t, bad) => say(t, bad), icon: room => thingInfo(r, room).icon, hero: () => ORIGIN_ICON[r.hero.origin], sfx: n => sfx(n as never), hurt: () => { const el = document.querySelector(".cz-tl"); if (el) el.innerHTML = czBars(r); } }); }
  else stopWalk();
}

// ---------- Combat playback ----------

function floater(who: "player" | "enemy", text: string, cls: string) {
  const el = document.getElementById(`fp-${who}`);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const f = document.createElement("div");
  f.className = `floater ${cls}`;
  f.textContent = text;
  f.style.left = `${r.left + r.width / 2 + (Math.random() * 60 - 30)}px`;
  f.style.top = `${r.top + window.scrollY + r.height * 0.35}px`;
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 1300);
}

function shake(who: "player" | "enemy", big = false) {
  const el = document.getElementById(`fp-${who}`);
  el?.classList.remove("shake");
  void el?.offsetWidth;
  el?.classList.add("shake");
  if (big) {
    // In a Crawl fight, a crit shakes the struck side's box too.
    const box = document.getElementById(`cbx-${who}`);
    box?.classList.remove("shake");
    void box?.offsetWidth;
    box?.classList.add("shake");
    // (There, the box shake replaces the whole-screen shake.)
    if (box) return;
    app.classList.remove("screen-shake");
    void app.offsetWidth;
    app.classList.add("screen-shake");
  }
}

async function playFx(b: Battle) {
  // A huge pile of effects (big stacking builds) would take minutes to play out: skip to the last few.
  if (b.fx.length > 40) b.fx.splice(0, b.fx.length - 12);
  fxBatch++;
  while (b.fx.length) {
    const e = b.fx.shift()!;
    buildMoment(b, e);
    await showFx(e);
  }
}

/** Build moments: a quick banner when something about your build clicks (each kind once a run, so it stays special). */
function buildMoment(b: Battle, e: Fx) {
  const r = run;
  if (!r) return;
  const seen = (r.moments ??= []);
  const once = (key: string, text: string, tone: string) => { if (seen.includes(key)) return; seen.push(key); momentToast(text, tone); };
  if (e.kind === "reaction" && e.src === "player") {
    if (/Smite/.test(e.text ?? "")) once("smite", "✝️ Smite! Your faith hits back", "holy");
    else once("reaction", `⚗️ First reaction: ${e.text ?? ""}`, "rx");
  }
  if (e.kind === "dmg" && e.who === "enemy" && e.src !== "enemy" && (e.value ?? 0) > 0) {
    const base = Math.max(3, b.player.damage);
    const v = e.value ?? 0;
    if (v >= base * 50 && v >= 300) once("hit50", `☄️ Colossal hit: ${fmtN(v)}!`, "legend");
    else if (v >= base * 10 && v >= 40) once("hit10", `💥 Massive hit: ${fmtN(v)}!`, "epic");
    const en = b.enemy;
    if ((en.boss || en.champion || en.elite) && v >= en.maxHp && en.hp <= 0) once(`oneshot-${en.boss ? "boss" : en.champion ? "champion" : "elite"}`, `⚡ One-shot ${en.boss ? "a boss" : en.champion ? "a Champion" : "an Elite"}!`, "legend");
  }
}
function momentToast(text: string, tone: string) {
  const el = document.createElement("div");
  el.className = `moment ${tone}`;
  el.textContent = text;
  document.body.appendChild(el);
  sfx("reaction");
  setTimeout(() => el.remove(), 2200);
}

async function showFx(e: Fx) {
  const who = e.who;
  // A status or reaction that came out of a die roll (and was caused by the roller) colours that die.
  if ((e.kind === "status" || e.kind === "reaction") && e.fromRoll && e.src === e.fromRoll && e.status && DIE_TINT[e.status]) {
    const d = lastRoll[e.fromRoll];
    if (d && !d.rolling && (e.kind === "reaction" || !d.tint)) d.tint = DIE_TINT[e.status];
  }
  switch (e.kind) {
    case "roll": {
      const side = e.who;
      const sides = e.sides ?? 6;
      const die = { face: 1, name: "", kind: "hit", rolling: true } as NonNullable<(typeof lastRoll)["player"]>;
      lastRoll[side] = die;
      const prev = shownDice[shownDice.length - 1];
      if (prev && prev.who === side && prev.batch === fxBatch && shownDice.length < 2) shownDice.push({ who: side, d: die, batch: fxBatch });
      else shownDice = [{ who: side, d: die, batch: fxBatch }];
      for (let i = 0; i < 6; i++) {
        die.face = 1 + Math.floor(Math.random() * sides);
        render();
        sfx("roll");
        await sleep(60);
      }
      Object.assign(die, { face: e.face!, name: `${e.faceName}${e.offhand ? " (off-hand)" : ""}`, kind: e.faceKind ?? "hit", rolling: false });
      render();
      await sleep(380);
      return;
    }
    case "dmg":
      dispHp[who] = (dispHp[who] ?? hpOf(who) + (e.value ?? 0)) - (e.value ?? 0);
      render();
      floater(who, `-${e.value}`, "dmg");
      shake(who);
      sfx("hit");
      await sleep(420);
      return;
    case "heal":
      dispHp[who] = (dispHp[who] ?? hpOf(who) - (e.value ?? 0)) + (e.value ?? 0);
      render();
      floater(who, `+${e.value}`, "heal");
      sfx("heal");
      await sleep(320);
      return;
    case "crit": floater(who, "CRIT!", "crit"); shake(who, true); sfx("crit"); await sleep(260); return;
    case "miss": floater(who, e.text ?? "Miss", "miss"); sfx("miss"); await sleep(420); return;
    case "block": floater(who, `${e.icon ?? "🛡️"} ${e.text ?? "Blocked"}`, "block"); sfx("block"); await sleep(380); return;
    case "status": render(); floater(who, `${e.icon ?? ""} ${e.text ?? ""}`, (e.value ?? 0) < 0 ? "status-neg" : "status-pos"); sfx("status"); await sleep(330); return;
    case "reaction": render(); floater(who, `💥 ${e.text}`, "reaction"); shake(who, true); sfx("reaction"); await sleep(520); return;
    case "text": floater(who, `${e.icon ?? ""} ${e.text ?? ""}`, "text"); await sleep(380); return;
  }
}

function hpOf(who: "player" | "enemy") {
  if (!run || run.scene.t !== "combat") return 0;
  return who === "player" ? run.scene.battle.player.hp : run.scene.battle.enemy.hp;
}

/** Play one round beat by beat: you, then the monster, then the end of the round. */
/** An ambush: the foe strikes the moment the fight opens; your buttons wait (dimmed) until it's done. */
let ambushing = false;
async function playAmbush(r: Run, b: Battle) {
  if (ambushing || busy) return;
  ambushing = true; busy = true;
  dispHp.player = b.player.hp; dispHp.enemy = b.enemy.hp;
  render();
  await sleep(450);
  try {
    ambushStrike(b);
    await playFx(b);
  } catch (err) { console.error(err); }
  dispHp.player = dispHp.enemy = null;
  busy = false; ambushing = false;
  if (b.over) { await sleep(700); settleCombat(r); }
  render();
}

async function playTurn(action: Action) {
  if (!run || run.scene.t !== "combat" || busy) return;
  const r = run;
  if (!availableActions(r).includes(action)) return;
  const b = (r.scene as { battle: Battle }).battle;
  busy = true;
  try { await playTurnInner(r, b, action); } catch (err) { console.error(err); busy = false; say("Something went wrong in that turn: it has been skipped.", true); render(); }
}
async function playTurnInner(r: Run, b: Battle, action: Action) {
  const startEnemyHp = b.enemy.hp;
  const syncHp = () => { dispHp.player = b.player.hp; dispHp.enemy = b.enemy.hp; };
  syncHp();
  render();
  for (const side of ["player", "enemy"] as const) { const d = lastRoll[side]; if (d) d.tint = undefined; }
  const first = beginRound(b);
  await playFx(b);
  const phase = async (fn: () => void) => {
    if (b.over) return;
    syncHp();
    fn();
    // Start displayed HP from where it was before this phase, then let the effects move it.
    await playFx(b);
    syncHp();
    render();
  };
  if (first) await phase(() => enemyPhase(b));
  await phase(() => heroPhase(b, action));
  if (!first && !b.over) {
    await sleep(350);
    await phase(() => enemyPhase(b));
  }
  if (!b.over) await phase(() => endRound(b));
  r.stats.bestHit = Math.max(r.stats.bestHit, startEnemyHp - Math.max(0, b.enemy.hp));
  busy = false;
  if (b.over) {
    if (b.over === "won") floater("enemy", "Defeated!", "crit");
    await sleep(b.over === "won" ? 650 : 900);
    dispHp.player = dispHp.enemy = null;
    settleCombat(r);
  }
  render();
}

// ---------- Input ----------

function on(sel: string, fn: (el: HTMLElement) => void) {
  app.querySelectorAll<HTMLElement>(sel).forEach(el => (el.onclick = ev => { ev.stopPropagation(); say(null); sfx("click"); fn(el); render(); }));
}

function bind() {
  on("[data-mute]", () => toggleMute());
  on("[data-togglemusic]", () => toggleMusic());
  on("[data-startmusic]", () => playMusic(run ? "game" : "title"));
  // Leaderboards (title screen and end of run).
  on("[data-lb]", () => { lbOpen = true; if (run?.scene.t === "over" && (run.daily || run.mode === "abyss")) { lbScope = run.daily ? "daily" : "abyss"; lbBoard = "floor"; } loadBoard(lbBoard); });
  on("[data-lbclose]", () => { lbOpen = false; });
  on("[data-lbboard]", el => { loadBoard(el.dataset.lbboard as Board); });
  on("[data-lbscope]", el => { lbScope = el.dataset.lbscope as Scope; loadBoard("floor"); });
  on("[data-lborigin]", el => { lbOrigin = el.dataset.lborigin ?? ""; loadBoard(lbBoard); });
  on("[data-lbrename]", () => { lbNaming = true; });
  on("[data-lbsend]", () => { if (run) sendRun(run); });
  on("[data-lbsubmit]", () => {
    const input = app.querySelector<HTMLInputElement>("#lb-name");
    const name = setPlayerName(input?.value ?? "");
    if (!name) { say("Pick a name first (letters and numbers, up to 16)."); return; }
    lbNaming = false;
    if (run && !run.submitted) sendRun(run);
  });
  app.querySelector<HTMLInputElement>("#lb-name")?.addEventListener("click", ev => ev.stopPropagation());
  app.querySelector<HTMLInputElement>("#restore-code")?.addEventListener("click", ev => ev.stopPropagation());
  app.querySelectorAll<HTMLInputElement>("[data-music]").forEach(el => {
    el.oninput = () => {
      const k = el.dataset.music as Track;
      setMusicVolume(k, Number(el.value) / 100);
      const lab = app.querySelector(`[data-musicval="${k}"]`);
      if (lab) lab.textContent = `${el.value}%`;
    };
    el.onclick = ev => ev.stopPropagation();
  });
  on("[data-restoreopen]", () => { restoreOpen = true; restoreMsg = ""; });
  on("[data-restoreclose]", () => { restoreOpen = false; });
  on("[data-restore]", () => {
    const code = app.querySelector<HTMLInputElement>("#restore-code")?.value ?? "";
    const prevCode = backupCode();
    if (!useBackupCode(code)) { restoreMsg = "That isn't a valid backup code."; return; }
    restoreMsg = "Restoring…";
    fetchVault().then(v => {
      if (!v) { useBackupCode(prevCode); restoreMsg = "Nothing is backed up under that code. (Codes from before the Great Reset don't restore anything: everyone started afresh.)"; render(); return; }
      if (v.save && applySave(v.save)) { restoreMsg = "Restored everything. Reloading…"; render(); setTimeout(() => location.reload(), 600); return; }
      meta.ruinShards = v.shards; meta.plates = v.plates; meta.classPlates = v.classPlates; saveMeta(meta);
      restoreOpen = false; restoreMsg = `Restored: ${v.shards} Ruin Shard${v.shards === 1 ? "" : "s"}, ${v.plates + Object.values(v.classPlates).reduce((a: number, n) => a + (n ?? 0), 0)} Vanadium Plate(s).`;
      render();
    }).catch(() => { useBackupCode(prevCode); restoreMsg = "Couldn't reach the server. Try again when you're online."; render(); });
  });
  if (!run) {
    on("[data-mode]", el => { mode = el.dataset.mode as Mode; });
    on("[data-story]", el => { storyOpen = el.dataset.story as Mode; });
    on("[data-closestory]", () => { storyOpen = null; });
    on("[data-codex]", () => { view = "codex"; infoOpen = false; });
    on("[data-changes]", () => { changesFrom = view === "splash" ? "splash" : "title"; view = "changes"; infoOpen = false; optionsOpen = false; });
    on("[data-changesback]", () => { view = changesFrom; });
    on("[data-info]", () => { infoOpen = true; });
    on("[data-closeinfo]", () => { infoOpen = false; });
    on("[data-history]", () => { historyOpen = true; });
    on("[data-challenges]", () => { challengesOpen = true; });
    on("[data-closechallenges]", () => { challengesOpen = false; });
    on("[data-achievements]", () => { achOpen = true; });
    on("[data-closeach]", () => { achOpen = false; });
    on("[data-achtab]", el => { achTab = el.dataset.achtab as typeof achTab; });
    on("[data-title]", el => { meta.title = el.dataset.title || undefined; saveMeta(meta); setPlayerTitle(meta.title ?? ""); });
    on("[data-heat]", el => { meta.heat = Number(el.dataset.heat) || 0; saveMeta(meta); });
    on("[data-kitpick]", el => { kitPick = el.dataset.kitpick as KitSlot; });
    on("[data-kitclose]", () => { kitPick = null; });
    on("[data-kitset]", el => {
      const o = pendingOrigin ?? camp; if (!o) return;
      const [slot, id] = (el.dataset.kitset ?? "").split("|") as [KitSlot, string];
      const k = { ...(meta.kits?.[o] ?? {}) };
      if (id) k[slot] = id; else delete k[slot];
      meta.kits = { ...(meta.kits ?? {}), [o]: k }; saveMeta(meta);
      kitPick = null;
    });
    on("[data-closehistory]", () => { historyOpen = false; });
    on("[data-back]", () => { view = "title"; });
    on("[data-play]", () => { view = "title"; });
    on("[data-home]", () => { view = "splash"; });
    on("[data-closereset]", () => { resetPopup = false; });
    on("[data-options]", () => { optionsOpen = true; resetArmed = false; });
    on("[data-closeoptions]", () => { optionsOpen = false; resetArmed = false; });
    on("[data-quick]", el => { quickOn = el.dataset.quick === "1"; try { localStorage.setItem("dd2-quick", quickOn ? "1" : "0"); } catch { /* ignore */ } });
    on("[data-speed]", el => { speed = Number(el.dataset.speed); try { localStorage.setItem("dd2-speed", String(speed)); } catch { /* ignore */ } });
    on("[data-reset]", () => {
      if (!resetArmed) { resetArmed = true; return; }
      try { localStorage.removeItem("dd2-meta-v1"); } catch { /* ignore */ }
      clearSave();
      meta = loadMeta();
      meta.ruinShards = 0; meta.plates = 0; meta.classPlates = {}; saveMeta(meta);
      backupVault(vaultOf(meta));
      resetArmed = false;
      optionsOpen = false;
      say("All progress has been reset.", false);
    });
    on("[data-origin]", el => { const o = el.dataset.origin as OriginId; if (!classOpen(meta, o)) return; pendingOrigin = o; plateArmed = false; });
    on("[data-menutab]", el => {
      menuTab = el.dataset.menutab as typeof menuTab; restoreOpen = false; restoreMsg = "";
      // The first visit to the Abyss tab explains it.
      if (menuTab === "abyss" && abyssUnlocked(meta)) { try { if (!localStorage.getItem("dd2-abyss-intro")) abyssIntroOpen = true; } catch { /* ignore */ } }
    });
    on("[data-abyssintro]", () => { abyssIntroOpen = true; });
    on("[data-closeabyssintro]", () => { abyssIntroOpen = false; try { localStorage.setItem("dd2-abyss-intro", "1"); } catch { /* ignore */ } });
    on("[data-addgem]", el => { if (addGem(meta, el.dataset.addgem!)) { backupVault(vaultOf(meta)); sfx("chest"); } });
    on("[data-removegem]", el => { if (removeGem(meta, el.dataset.removegem!)) backupVault(vaultOf(meta)); });
    on("[data-addplate]", el => {
      if (!plateArmed) { plateArmed = true; return; }
      plateArmed = false;
      if (applyPlate(meta, el.dataset.addplate!)) { backupVault(vaultOf(meta)); sfx("chest"); }
    });
    on("[data-daily]", () => {
      const today = utcDay();
      if (meta.daily?.day === today) return;
      if (liveSave() && !dailyArmed) { dailyArmed = true; return; }
      dailyArmed = false; challengesOpen = false;
      meta.daily = { day: today, floor: 1, won: false };
      saveMeta(meta);
      mode = "campaign"; lbResult = null; lbNaming = false; pendingOrigin = null; recorded = null; celebrated.clear(); banked = 0; ackedTalentScene = null; winSeen = false;
      const nr = newDailyRun(today); // (no Ruin Gems or Camp upgrades: the Daily stays a level field)
      startCrawl(nr);
      run = nr; void startSession(nr);
    });
    on("[data-startabyss]", () => { if (pendingOrigin) startAbyss();    });
    on("[data-closeorigin]", () => { pendingOrigin = null; });
    on("[data-help]", () => { helpOpen = true; });
    on("[data-closehelp]", () => { helpOpen = false; });
    on("[data-continue]", () => { const l = loadRun(); if (!l) { say("That saved run couldn't be loaded."); clearSave(); return; } run = l.run; banked = l.banked; recorded = null; celebrated.clear(); winSeen = false; ackedTalentScene = null; mode = run.mode;
      // A finished run that never reached the leaderboard is sent now.
      if (run.scene.t === "over" && !run.lbDone) { run.submitted = false; lbResult = null; if (playerName()) sendRun(run); } });
    on("[data-tocamp]", () => { const o = pendingOrigin; if (!o) return; pendingOrigin = null; camp = o; campTab = "expedition"; campRoom = null; resetCampWalk(); campOffers = null; campQuest = null; });
    on("[data-closeroom]", () => { campRoom = null; expPop = null; fishCaught = null; fishNote = ""; if (fishLine) { for (const t of fishLine.timers) clearTimeout(t); fishLine = null; } });
    on("[data-fishcast]", () => fishStart());
    on("[data-fishstrike]", () => fishStrike());
    on("[data-exppop]", el => { expPop = (el.dataset.exppop || null) as typeof expPop; });
    on("[data-campback]", () => { camp = null; kitPick = null; });
    on("[data-camptab]", el => { campTab = el.dataset.camptab as CampTab; plateArmed = false; });
    on("[data-learn]", el => { const err = learn(meta, el.dataset.learn!); if (err) say(err); else { saveMeta(meta); sfx("chest"); } });
    on("[data-sow]", el => { const k = el.dataset.sow as Plant; sowing = sowing === k ? null : k; });
    on("[data-plot]", el => {
      const i = Number(el.dataset.plot), p = gardenPlots(meta)[i];
      if (!p && sowing) { const err = sow(meta, i, sowing); if (err) say(err); else { saveMeta(meta); sfx("status"); if (!(campOf(meta).seeds?.[sowing] ?? 0)) sowing = null; } return; }
      if (p) { const msg = harvest(meta, i); if (msg) { say(msg, p.left > 0); if (!p.left) { saveMeta(meta); sfx("chest"); } } }
    });
    on("[data-brew]", el => { const b = startBrew(meta, el.dataset.brew as Plant); if (typeof b === "string") say(b); else { brew = b; saveMeta(meta); } });
    on("[data-stir]", () => { if (!brew) return; stir(meta, brew); sfx(brew.done ? "miss" : "roll"); if (brew.done) saveMeta(meta); });
    on("[data-bottle]", () => { if (!brew) return; bottle(meta, brew); saveMeta(meta); sfx(brew.made ? "chest" : "miss"); });
    on("[data-skillpick]", el => { if (!camp) return; meta.skillPick = { ...(meta.skillPick ?? {}), [camp]: el.dataset.skillpick! }; saveMeta(meta); sfx("status"); });
    on("[data-node]", el => { if (!camp) return; const err = spendNode(meta, camp, el.dataset.node!); if (err) say(err); else { saveMeta(meta); sfx("equip"); } });
    on("[data-nodeinfo]", el => { treeNode = el.dataset.nodeinfo!; });
    on("[data-closenode]", () => { treeNode = null; });
    on("[data-treereset]", () => { if (!camp) return; resetTree(meta, camp); saveMeta(meta); });
    on("[data-totem]", el => { const id = el.dataset.totem!; meta.totemSet = meta.totemSet === id ? undefined : id; saveMeta(meta); });
    on("[data-hallbuy]", el => { const err = buyHall(meta, el.dataset.hallbuy!); if (err) say(err); else { saveMeta(meta); sfx("chest"); } });
    on("[data-cquest]", el => { const i = Number(el.dataset.cquest); campQuest = i < 0 || campQuest === i ? null : i; });
    on("[data-campabyss]", () => { pendingOrigin = camp; startAbyss(); });
    on("[data-descend]", () => { if (!camp) return; pendingOrigin = camp; startCampaign(); });
    on("[data-start]", () => startCampaign());
    function startAbyss() {
      const o = pendingOrigin; if (!o) return;
      if (!spendShard(meta)) { say(`You need ${ABYSS_SHARD_COST} Ruin Shards.`); pendingOrigin = null; return; }
      backupVault(vaultOf(meta));
      mode = "abyss"; lbResult = null; lbNaming = false; pendingOrigin = null; camp = null; recorded = null; celebrated.clear(); banked = 0; ackedTalentScene = null; winSeen = false;
      const nr = newRun(o, Date.now() & 0x7fffffff, "abyss", lockedIds(meta));
      nr.abyssMod = currentAbyssMod().id;
      applyKit(nr, meta.kits?.[o], masteryLevel(meta.mastery?.[o] ?? 0), lockedIds(meta));
      // The Abyss is walked too: ten depths, each a layer of floors with an Uber boss at the bottom.
      startCrawl(nr);
      applyHall(meta, nr);
      nr.hero.plates = meta.classPlates?.[o] ?? 0;
      withGems(nr);
      run = nr; void startSession(nr);
    }
    function startCampaign() { mode = "campaign"; lbResult = null; lbNaming = false; const o = pendingOrigin; if (!o) return; pendingOrigin = null; recorded = null; celebrated.clear(); banked = 0; ackedTalentScene = null; winSeen = false; const nr = newRun(o, Date.now() & 0x7fffffff, mode, lockedIds(meta)); nr.nemesis = meta.nemesis; nr.heat = meta.heat || undefined; nr.hero.heat = nr.heat; recompute(nr.hero); applyKit(nr, meta.kits?.[o], masteryLevel(meta.mastery?.[o] ?? 0), lockedIds(meta)); withGems(nr); nr.legendaryDue = (meta.dryRuns ?? 0) >= 4;
      // The Crawl is the game now; it sets out with the Hall's upgrades.
      startCrawl(nr);
      applyHall(meta, nr);
      // The ability picked at the Camp's Skills (if it's still open to this class).
      const sk = meta.skillPick?.[o];
      if (sk && CLASS_SKILLS[o].some(k => k.id === sk && masteryLevel(meta.mastery?.[o] ?? 0) >= k.level) && sk !== CLASS_SKILLS[o][0].id) nr.hero.skill = sk;
      // A contract taken at the Camp's Quest Board comes along.
      const q = campQuest !== null ? campOffers?.[campQuest] : undefined;
      if (q) nr.bounty = { ...q, base: 0, roomsLeft: q.roomsLeft * CAMP_QUEST_ROOMS };
      camp = null; campOffers = null; campQuest = null;
      run = nr; void startSession(nr); }
    return;
  }
  const r = run;
  on("[data-room]", el => {
    r.message = "";
    chooseRoom(r, el.dataset.room as never);
    if (["wooden", "iron"].includes(el.dataset.room!)) sfx("chest");
  });
  app.querySelectorAll<HTMLElement>("[data-act]").forEach(el => (el.onclick = () => { if (!busy) void playTurn(el.dataset.act as Action); }));
  on("[data-potion]", () => { say(drinkPotion(r)); if (r.scene.t === "combat") void playFx(r.scene.battle).then(render); });
  on("[data-bag]", () => { bagOpen = true; bagTab = "gear"; gearSub = "equipped"; });
  on("[data-closebag]", () => { bagOpen = false; });
  on("[data-attr]", el => { const err = spendAttr(r.hero, el.dataset.attr as Attr); if (err) say(err, true); else sfx("equip"); });
  on("[data-bagtab]", el => { bulkArmed = null; bagTab = el.dataset.bagtab as BagTab; talentSub = "talents"; spoilsSub = "relics"; statsSub = "attributes"; });
  on("[data-statssub]", el => { statsSub = el.dataset.statssub as typeof statsSub; });
  on("[data-speedcycle]", () => { speed = speed >= 1 ? 0.5 : speed >= 0.5 ? 0.2 : 1; try { localStorage.setItem("dd2-speed", String(speed)); } catch { /* ignore */ } });
  on("[data-bulkscrap]", el => {
    const upTo = el.dataset.bulkscrap as "common" | "uncommon";
    const list = bulkScrapList(r.hero, upTo);
    if (bulkArmed !== upTo) { bulkArmed = upTo; return; }
    bulkArmed = null;
    let n = 0;
    const before = materials(r.hero);
    for (const it of list) n += salvage(r.hero, it.uid);
    say(`Scrapped ${list.length} item${list.length === 1 ? "" : "s"}: +${n} ⚙️ Scrap${salvageNote(before, r.hero)}`, false); sfx("hit");
  });
  on("[data-gearsub]", el => { gearSub = el.dataset.gearsub as typeof gearSub; });
  on("[data-scrapscroll]", el => { const v = scrapScroll(r.hero, Number(el.dataset.scrapscroll)); if (v) { if (mwScroll === Number(el.dataset.scrapscroll)) { mwScroll = null; mwKeep.clear(); } say(`Scroll scrapped: +${costText(v)}`, false); sfx("hit"); } });
  on("[data-mwtab]", el => { mwTab = el.dataset.mwtab as typeof mwTab; });
  on("[data-mwrework]", el => {
    const [u, line] = el.dataset.mwrework!.split("|");
    const out = rework(r.hero, Number(u), line, r.rng);
    if (typeof out === "string") { say(out); return; }
    if (r.scene.t === "masterwork") r.scene.pending = { uid: Number(u), line, options: out.options };
  });
  on("[data-mwpick]", el => { if (r.scene.t !== "masterwork" || !r.scene.pending) return; const p = r.scene.pending; applyRework(r.hero, p.uid, p.line, p.options[Number(el.dataset.mwpick)] ?? null); r.scene.pending = undefined; say("Reworked.", false); sfx("chest"); });
  on("[data-mwkeep]", () => { if (r.scene.t === "masterwork") r.scene.pending = undefined; say("You keep the line as it was.", false); });
  on("[data-mwextract]", el => { const out = extract(r.hero, Number(el.dataset.mwextract)); if (typeof out === "string") say(out); else { say(`📜 ${scrollName(out)} made.`, false); sfx("chest"); } });
  on("[data-mwscroll]", el => { const u = Number(el.dataset.mwscroll); mwScroll = mwScroll === u ? null : u; const s = r.hero.powerScrolls?.find(x => x.uid === u); mwKeep = new Set(s ? Object.keys(s.lines) : []); });
  app.querySelectorAll<HTMLInputElement>("[data-mwline]").forEach(el => (el.onchange = () => { const id = el.dataset.mwline!; if (el.checked) mwKeep.add(id); else mwKeep.delete(id); render(); }));
  on("[data-mwempower]", el => { if (mwScroll == null) return; const err = empower(r.hero, mwScroll, Number(el.dataset.mwempower), [...mwKeep]); if (err) say(err); else { mwScroll = null; mwKeep.clear(); say("✨ Empowered.", false); sfx("chest"); } });
  on("[data-mwrefine]", el => { const err = refine(r.hero, Number(el.dataset.mwrefine), shopMult(r)); if (err) say(err); else { say("💎 Refined.", false); sfx("chest"); } });
  on("[data-sigon]", el => say(wearSigil(r, Number(el.dataset.sigon))));
  on("[data-sigoff]", el => say(removeSigil(r, Number(el.dataset.sigoff))));
  on("[data-sigscrap]", el => { const n = scrapSigil(r, Number(el.dataset.sigscrap)); if (n) say(`+${n} Scrap`, false); });
  on("[data-spoilsub]", el => { spoilsSub = el.dataset.spoilsub as typeof spoilsSub; });
  on("[data-talentsub]", el => { talentSub = el.dataset.talentsub as "talents" | "curses"; });
  // The Crawl: once the only find is taken (or left), the popup just closes — no "Continue" step.
  // The Crawl: once the last item is dealt with, the rest (Gold, potions, scrolls) is simply pocketed: no Continue.
  const lootDone = () => { const sc = r.scene; if (r.gridMode && sc.t === "loot" && !sc.items.length && !sc.then) finishLoot(r); };
  on("[data-fishcast]", () => fishStart());
  on("[data-fishstrike]", () => fishStrike());
  on("[data-fisheat]", el => { const t = eatFish(r, el.dataset.fisheat!); fishCaught = null; if (t) { fishNote = t; sfx("heal"); } });
  on("[data-fishsell]", el => { const t = sellFish(r, el.dataset.fishsell!); fishCaught = null; if (t) { fishNote = t; sfx("coins"); } });
  on("[data-fishkeep]", () => { fishCaught = null; fishNote = "You wrap it up and stow it. It'll go home with you."; });
  on("[data-take]", el => { compareOpen = null; const err = takeItem(r, Number(el.dataset.take), el.dataset.how as "equip" | "pack", el.dataset.slot as EquipSlot | undefined); say(err); if (!err) lootDone(); });
  on("[data-compare]", el => { compareOpen = { uid: Number(el.dataset.compare), slot: el.dataset.slot as EquipSlot | undefined }; });
  on("[data-compareclose]", () => { compareOpen = null; });
  on("[data-scrapfound]", el => { compareOpen = null; scrapFound(r, Number(el.dataset.scrapfound)); lootDone(); });
  on("[data-finish]", () => { r.message = ""; finishLoot(r); });
  on("[data-card]", el => {
    pickResplendent(r, Number(el.dataset.card));
    const s = r.scene;
    if (s.t === "resplendent" && s.picked !== null) {
      const c = s.cards[s.picked];
      if (!(c.kind === "item" && RANK[c.item.rarity])) sfx("chest");
    }
  });
  on("[data-claim]", () => say(claimResplendent(r)));
  on("[data-mana]", () => { say(drinkMana(r)); if (r.scene.t === "combat") void playFx(r.scene.battle).then(render); });
  on("[data-keepsake]", () => { say(takeKeepsake(r), false); sfx("legendary"); });
  on("[data-choosetalent]", () => { ackedTalentScene = r.scene; });
  on("[data-closepopup]", () => { r.popup = undefined; });
  on("[data-relicok]", () => { r.relicNews?.shift(); });
  on("[data-loreok]", el => { meta.loreSeen = [...(meta.loreSeen ?? []), el.dataset.loreok!]; saveMeta(meta); });
  on("[data-relicpick]", el => { chooseRelic(r, el.dataset.relicpick!); sfx("chest"); });
  on("[data-menu]", () => { if (!busy) { menuOpen = true; endArmed = false; } });
  on("[data-closemenu]", () => { menuOpen = false; endArmed = false; });
  on("[data-mainmenu]", () => { menuOpen = false; endArmed = false; bagOpen = false; helpOpen = false; run = null; view = "title"; meta = loadMeta(); });
  on("[data-endrun]", () => {
    if (!endArmed) { endArmed = true; return; }
    endArmed = false; menuOpen = false; bagOpen = false;
    abandonRun(r);
  });
  on("[data-unify]", () => { say(unifyHeart(r)); celebrate("legendary_crimson", "Unified with the Dragon Heart", false); });
  on("[data-jpick]", el => { const [k, v] = el.dataset.jpick!.split(":"); say(jewelPlace(r, k === "relic" ? { kind: "relic", id: v } : { kind: "item", uid: Number(v) })); sfx("status"); });
  on("[data-jmode]", el => { jewelMode(r, el.dataset.jmode as "fuse" | "infuse"); });
  on("[data-jclear]", el => { jewelClear(r, el.dataset.jclear as "left" | "right"); });
  on("[data-jfuse]", () => { const res = jewelFuse(r); say(res.msg, !res.ok); if (res.ok) celebrate("epic", res.made, true); else sfx("miss"); });
  on("[data-gwalk]", el => { walkToThing(Number(el.dataset.gwalk)); });
  on("[data-gunsel]", () => { if (r.grid) r.grid.sel = undefined; });
  on("[data-potdrawer]", () => { potDrawer = !potDrawer; });
  on("[data-revealpick]", el => { revealSel = Number(el.dataset.revealpick); });
  on("[data-revealgo]", () => { if (revealSel === null) return; const err = reveal(r.hero, revealSel); say(err ?? "The Legendary reveals its true power!", !!err); if (!err) { revealSel = null; celebrate("legendary", "REVEALED"); } });
  on("[data-invpick]", el => { const [k, v] = el.dataset.invpick!.split(":"); invPick = k === "eq" ? { k: "eq", slot: v as EquipSlot } : { k: "bp", uid: Number(v) }; });
  on("[data-mpick]", el => { const [k, v] = el.dataset.mpick!.split(":"); merPick = k === "s" ? { k: "stock", i: Number(v) } : { k: "own", uid: Number(v) }; sellArmed = null; });
  on("[data-minv]", el => { merInv = el.dataset.minv as typeof merInv; merPick = merPick?.k === "own" ? null : merPick; sellArmed = null; });
  on("[data-potnote]", el => { say(el.dataset.potnote!, false); });
  on("[data-autoroom]", el => {
    r.message = "";
    chooseRoom(r, el.dataset.autoroom as never);
    if (r.scene.t !== "combat") return;
    if (canAutoBattle(r)) { const note = autoBattle(r); sfx("crit"); if (note) say(note, false); }
    else say("⚠️ Too dangerous for a Quick Battle: this one's yours to fight.", true);
  });
  on("[data-auto]", () => { const note = autoBattle(r); sfx("crit"); if (note) say(note, false); });
  on("[data-takebounty]", el => { takeBounty(r, Number(el.dataset.takebounty)); sfx("chest"); });
  on("[data-bounty]", () => { bountyOpen = true; });
  on("[data-closebounty]", () => { bountyOpen = false; });
  on("[data-tribute]", el => { say(payTribute(r, el.dataset.tribute!)); sfx("heal"); });
  on("[data-tonicbuy]", el => { say(buyTonic(r, Number(el.dataset.tonicbuy))); });
  on("[data-tonic]", el => { say(useTonic(r, el.dataset.tonic!)); sfx("status"); if (r.scene.t === "combat") void playFx(r.scene.battle).then(render); });
  on("[data-smith]", el => { smithUpgrade(r, Number(el.dataset.smith)); sfx("chest"); });
  on("[data-descend]", () => { r.message = ""; advance(r); });
  on("[data-help]", () => { helpOpen = true; });
  on("[data-closehelp]", () => { helpOpen = false; });
  on("[data-closewin]", () => { winSeen = true; });
  on("[data-talent]", el => chooseTalent(r, el.dataset.talent!));
  on("[data-skiptalent]", () => skipTalent(r));
  on("[data-buy]", el => say(buy(r, Number(el.dataset.buy))));
  on("[data-reroll]", () => say(rerollShop(r)));
  on("[data-sell]", el => {
    const u = Number(el.dataset.sell);
    const w = findItem(r.hero, u)?.where;
    if (w && w !== "backpack" && sellArmed !== u) { sellArmed = u; return; }
    sellArmed = null;
    const err = sellItem(r, u); say(err); if (!err) sfx("chest");
  });
  on("[data-bulksell]", el => {
    const k = el.dataset.bulksell as "common" | "uncommon";
    if (bulkSellArmed !== k) { bulkSellArmed = k; return; }
    bulkSellArmed = null;
    const list = bulkScrapList(r.hero, k);
    const before = r.hero.f.gold;
    for (const it of list) sellItem(r, it.uid);
    say(`Sold ${list.length} item${list.length === 1 ? "" : "s"} for ${r.hero.f.gold - before} 🪙`, false); sfx("chest");
  });
  on("[data-leave]", () => { r.message = ""; forgeTab = "upgrade"; fishCaught = null; fishNote = ""; if (fishLine) { for (const t of fishLine.timers) clearTimeout(t); fishLine = null; } offerSel.clear(); advance(r); });
  on("[data-up]", el => say(forgeUpgrade(r, Number(el.dataset.up))));
  on("[data-rr]", el => say(forgeReroll(r, Number(el.dataset.rr))));
  on("[data-forgetab]", el => { forgeTab = el.dataset.forgetab as typeof forgeTab; offerSel.clear(); combineSel = []; forgeAsk = null; });
  on("[data-shoptab]", el => { shopTab = el.dataset.shoptab as typeof shopTab; sellArmed = null; bulkSellArmed = null; });
  on("[data-shopside]", el => { shopSide = el.dataset.shopside as typeof shopSide; sellArmed = null; bulkSellArmed = null; });
  on("[data-forgeside]", el => { forgeSide = el.dataset.forgeside as typeof forgeSide; });
  on("[data-combinesel]", el => { const u = Number(el.dataset.combinesel); combineSel = combineSel.includes(u) ? combineSel.filter(x => x !== u) : [...combineSel, u].slice(0, 2); });
  on("[data-offersel]", el => { const u = Number(el.dataset.offersel); if (offerSel.has(u)) offerSel.delete(u); else offerSel.add(u); });
  const doOffer = () => { const out = forgeOffer(r, [...offerSel]); offerSel.clear(); if (typeof out === "string") { say(out); sfx("lose"); } else { say(`The Forge gives you: ${itemName(out)} (${out.rarity})`, false); if (RANK[out.rarity]) { celebrated.add(out.uid); celebrate(out.rarity); } else sfx("chest"); } };
  const doScrap = (uid: number) => { const before = materials(r.hero); const n = salvage(r.hero, uid); say(`+${n} Scrap${salvageNote(before, r.hero)}`, false); sfx("hit"); };
  const worn = (uid: number) => { const w = findItem(r.hero, uid)?.where; return !!w && w !== "backpack"; };
  on("[data-offer]", () => { if ([...offerSel].some(worn)) forgeAsk = { kind: "offer" }; else doOffer(); });
  on("[data-askyes]", () => { const a = forgeAsk; forgeAsk = null; if (a?.kind === "offer") doOffer(); else if (a) doScrap(a.uid); });
  on("[data-askno]", () => { forgeAsk = null; });
  on("[data-combine]", el => { const [a, b] = el.dataset.combine!.split(",").map(Number); combineSel = []; const out = forgeCombine(r, a, b); if (typeof out === "string") say(out); else { say(`Combined into ${itemName(out)} (${out.rarity}, lv ${out.level})`, false); if (RANK[out.rarity]) { celebrated.add(out.uid); celebrate(out.rarity, out.rarity === "epic" ? "EPIC FORGED" : undefined); } else sfx("chest"); } });
  on("[data-transmute]", el => { const out = forgeTransmute(r, Number(el.dataset.transmute)); if (typeof out === "string") say(out); else { say("The anvil rings out. A Legendary takes shape…", false); celebrate("legendary", "TRANSMUTED"); } });
  on("[data-fuse]", el => { const err = fuse(r, el.dataset.fuse!); say(err ?? `Fused: ${getItem(el.dataset.fuse!).name}!`, !!err); if (!err) sfx("legendary"); });
  on("[data-rest]", () => say(rest(r, "heal")));
  on("[data-risk]", el => confirmRisk(r, el.dataset.risk === "yes"));
  on("[data-event]", el => chooseEvent(r, Number(el.dataset.event)));
  on("[data-newrun]", () => { clearSave(); camp = r.mode === "campaign" || r.mode === "endless" ? r.hero.origin : null; campTab = "expedition"; campRoom = null; resetCampWalk(); campOffers = null; campQuest = null; view = "title"; run = null; bagOpen = false; meta = loadMeta(); lbResult = null; lbNaming = false; });
  on("[data-endless]", () => { if (run) { run.submitted = false; run.lbDone = false; run.endRecord = undefined; } lbResult = null; continueEndless(r); recorded = null; });
  on("[data-unequip]", el => { const sl = el.dataset.unequip as EquipSlot, uid = r.hero.equip[sl]?.uid; const err = unequip(r.hero, sl); say(err); if (!err && uid !== undefined) { invPick = { k: "bp", uid }; sfx("equip"); } });
  on("[data-equip]", el => { const uid = Number(el.dataset.equip); const it = r.hero.backpack.find(i => i.uid === uid); if (!it) return; const err = equipItem(r.hero, it, el.dataset.slot as EquipSlot); say(err); if (!err) { const sl = EQUIP_SLOTS.find(k => r.hero.equip[k]?.uid === uid); if (sl) invPick = { k: "eq", slot: sl }; sfx("equip"); } });
  on("[data-forgescrap]", el => { const u = Number(el.dataset.forgescrap); if (worn(u)) forgeAsk = { kind: "scrap", uid: u }; else doScrap(u); });
  on("[data-salvage]", el => { const before = materials(r.hero); const n = salvage(r.hero, Number(el.dataset.salvage)); say(`+${n} Scrap${salvageNote(before, r.hero)}`, false); });
  on("[data-reveal]", el => { const err = reveal(r.hero, Number(el.dataset.reveal)); say(err ?? "The Legendary reveals its true power!", !!err); if (!err) celebrate("legendary", "REVEALED"); });
}

render();

// Show or hide the "Tap for music" hint as the browser blocks or allows the music.
onMusicBlockChange(() => render());

// Check for new builds; reload at the next safe moment, and say so if that has to wait.
watchForUpdates(() => { if (run && run.scene.t !== "map" && run.scene.t !== "over") say("✨ An update is ready. It will load at your next path choice (your run is saved).", false); render(); });

// Going offline: tell the player what that means. Coming back: a quick note.
// Sounds start decoding on the first tap (browsers only allow audio after one), so the first blow already sounds right.
window.addEventListener("pointerdown", () => warmClips(), { once: true });
window.addEventListener("offline", () => { offlineOpen = true; render(); });
window.addEventListener("online", () => { offlineOpen = false; say("📶 You're back online.", false); void flushQueue(); if (vaultDirty()) backupVault(vaultOf(meta)); render(); });

setPlayerTitle(meta.title ?? "");

// Backup: resend one that didn't make it, keep the online copy fresh; on a device that has never held any Shards, adopt the online copy.
watchBackup(() => vaultOf(meta));
if (vaultDirty()) backupVault(vaultOf(meta));
else if (meta.ruinShards === undefined && meta.plates === undefined && meta.classPlates === undefined) {
  fetchVault().then(v => {
    if (!v || (meta.ruinShards ?? 0) + (meta.plates ?? 0) > 0) return;
    meta.ruinShards = v.shards; meta.plates = v.plates; meta.classPlates = v.classPlates; saveMeta(meta); render();
  }).catch(() => { /* offline: try again next time */ });
}
if (typeof navigator !== "undefined" && navigator.onLine === false) { offlineOpen = true; render(); }

// Play time: while a run is open and the page is visible, tell the server once a minute.
setInterval(() => { if (run && run.scene.t !== "over" && typeof document !== "undefined" && document.visibilityState === "visible") pingSession(run); }, 60000);
