// Flavour text for Legendary items, shown in a popup the first time a player
// ever finds each one. Keyed by gear base id. Pure lore: no mechanics here.

export const LEGENDARY_LORE: Record<string, string> = {
  // --- affixes.ts ---
  l_kingsbane: "Forged to end a single tyrant. It found it liked the work, and kept going.",
  l_starfall: "Its maker begged the heavens for a sign. The heavens answered, and took the village with it.",
  l_aegis_dawn: "Every blow it ever turned is remembered. It is waiting for the right moment to return them.",
  l_mantle: "A thousand stitched eyes, none of them blind to your enemies' weaknesses. Some of them still blink.",
  l_chronoglass: "The sand falls upward when no one is watching. Its last owner died twice, the second time for good.",
  l_hollow_crown: "Worn by a king who traded his heart for a wall of light. He was very safe, and very hollow.",
  l_tempest_maul: "Struck from a thunderhead by a smith who did not live to see it cool.",
  l_gravecaller: "Its pale flame shows the hour of every death nearby. It is always a little early.",
  l_ouroboros: "A serpent eating its own tail, forever. Its wizard owner called this a balanced diet.",
  l_sanguine_regalia: "Robes of a blood-prince of the Crimson vaults. They drink so you don't have to.",
  l_crown_endless: "Each king who wore it added a tooth from a fallen rival. It has run out of room twice.",
  l_loaded_fate: "Carved from the knucklebone of a cheat the gods themselves could never catch.",
  l_midas: "The old king died starving on a golden floor, still smiling at the sound of coin.",
  l_mirrorblade: "It shows your reflection on every swing, and asks the same price of you each time.",
  l_d20: "Lost by a damned soul in a game against the dungeon itself. Neither side admits who won.",
  l_bottomless: "A tavern keeper's flask, blessed by a drunk saint. Nobody has ever reached the bottom, though many tried.",
  l_mountain: "Hewn from the stone heart of a mountain that refused to kneel. Neither will you.",
  l_echo_mask: "Whatever you whisper behind it, the deep whispers back. Louder.",
  l_codex_ruin: "Its pages list every empire that will fall. Several entries have already been crossed out.",
  l_phoenix: "Plucked from a firebird mid-rebirth. It was very annoyed, briefly, and then again.",
  l_thousand_hands: "Belonged to a monk who swore to strike every foe at once. He nearly managed it.",
  l_gnasher_fang: "Pried from the jaw of Gnasher, the Pack Lord. It still hungers, and it still bites.",
  l_rot_heart: "Torn from the Mother of Rot in her sewer throne. It beats slow, and it smells worse.",
  l_cinder_censer: "Brother Cinder swung it through every sermon. The congregation never sat in the front row twice.",
  l_varkas_wall: "Varkas the Iron Warden held the gate with this for a century. It remembers every one who tried.",
  l_morwen_tear: "The single tear Morwen the Frost Queen ever shed. It froze before it reached the floor.",
  l_skarn_horn: "Skarn the Storm Herald blew it to announce the end of the world. The world was not ready.",
  l_hollow_decree: "Written in the Hollow King's own hand: a law that all things must end. Most do.",
  l_worldsplitter: "Legend says the dungeon's first fissure was a practice swing.",
  l_bastion_ages: "Older than the dungeon, older than the kings who dug it. It has outlasted all of them.",
  l_wyrmscale: "Cut from a dragon that bathed in fire, venom and blood, and found all three boring.",
  l_bloodletter: "A barber-surgeon's blade, long retired from medicine. It never lost the taste.",
  l_twinfang: "Forged as one dagger and split by a jealous smith. Each half still goes looking for the other, through whoever is in the way.",
  l_eclipse_pair: "Two blades made for a pair of sisters who never fought apart. When one fell, the other kept both swords, and both promises.",
  l_stormbreaker: "Its wielder rode the lightning down from the peaks, then did it again for the applause.",
  l_gamblers_ruin: "Every bet is all or nothing. Its owners tend to leave the table one way or the other.",
  l_wardens_oath: "Sworn by the wardens of the gate to the netherworld: hold the line, and strike from it.",
  l_lich_phylactery: "A lich hid its soul inside for safekeeping. It has been quietly snacking ever since.",
  l_dawnbringer: "Carried by the saint who lit the first lamp in the deep. The dark has not forgiven her.",
  l_font_absolution: "A holy font hammered into a weapon by a priest who found prayer too slow.",
  l_confessional: "Every sin spoken into it is returned to the sender, with interest.",
  l_anointed_plate: "Oiled with the tears of a hundred saints. It shines, and it smoulders.",
  l_storm_rod: "Conductor's baton of the Storm Choir. They sang one perfect chord, and were never seen again.",
  l_elemental_codex: "An archmage tried to write the four elements into one book. They have been arguing ever since.",
  l_thunderhead: "Cut from the heart of a storm that circled one valley for a thousand years.",
  l_tidecaller: "Woven by a sea witch who drowned a navy out of spite. The hem is always damp.",
  l_cinderheart: "Quenched in a dying volcano. The volcano is still dying; the sword is not.",
  l_furnace_heart: "Brother Cinder's flock once kept this burning in their chapel. They kept it fed, too.",
  l_hydra_lash: "Braided from the necks of a hydra. Cut one strand and two more opinions grow back.",

  // --- treasury.ts ---
  lx_sunblade: "Forged at noon on the longest day. Vampires in the Crimson vaults still speak of it in whispers.",
  lx_winters_grasp: "A frost giant's grip, taken whole. It never quite let go of its last handshake.",
  lx_void_staff: "Carved from nothing, by someone who had nothing left to lose.",
  lx_regicide: "Seven kings died by this dagger. The eighth bought it, and slept poorly.",
  lx_hammer_judgement: "The saints' verdict, delivered in person. Appeals are not heard.",
  lx_bulwark_kings: "Every old king of the realm hid behind it at least once. None of them told anyone.",
  lx_inferno_heart: "The beating core of a fire elemental. It is warm, and it is not friendly.",
  lx_seraph_wing: "A single feather of a fallen seraph. She wants it back, but she can wait.",
  lx_book_dead: "Every name written in it is a promise. The ink is never quite dry.",
  lx_windwall: "A buckler with a gale trapped behind it. Arrows go somewhere else, usually somewhere rude.",
  lx_dragonlord_plate: "Worn by the last rider of the dragons. Her mount was buried in the rest of the set.",
  lx_shadow_mantle: "Stitched from the shadow of an assassin who outlived his own name.",
  lx_archmage_regalia: "The archmage left these robes behind when he ascended. He left the stains, too.",
  lx_titan_hide: "The titan did not give it willingly. The titan also did not survive asking.",
  lx_saint_shroud: "The shroud of a saint who refused to stay buried. Out of kindness, mostly.",
  lx_tempest_eye: "Plucked from the still centre of a hurricane. The storm around it still looks for it.",
  lx_ring_titans: "Sized for a titan's little finger. On you, it makes a fine belt for the soul.",
  lx_coin_fate: "Two faces, one fate. It has never landed on its edge, though it has thought about it.",
  lx_heart_world: "Chipped from the root of the world, deep below the dungeon. The world misses it.",
  lx_thorn_king: "The Thorn King wore it to bed. He was never once stabbed in his sleep, though many tried.",

  // --- charms.ts ---
  lx_four_winds: "Each wind was bound by a different hermit. None of the four ever agreed on a direction.",
  lx_sunfire_charm: "A shard of dawn kept in a locket. Do not open it near your eyebrows.",

  // --- shields.ts / robes.ts / streak.ts / brutes.ts ---
  lx_last_wall: "When every other wall fell, this one stood. It has been insufferable about it since.",
  lx_mantle_unmaking: "Woven from threads pulled out of the world's seams. Things come apart near it.",
  lx_hourglass: "A duelist's timepiece. He never stopped moving long enough to read it.",
  lx_berserker_mask: "No one remembers the face beneath it. Neither did its owner, after the first battle.",

  // --- trinkets2.ts ---
  lx_ruinous_eye: "It sees the crack in everything. Then it widens it, a little at a time.",
  lx_gilded_skull: "A miser had his own skull gilded before death. He insists it was worth the investment.",
  lx_vanity_mirror: "A queen asked it who was fairest. It told her the truth, and then where to stab.",
  lx_heart_thorns: "A heart that loved once and was wounded. It made sure it would never be the only one hurt.",

  // --- consecrate.ts / blessings.ts ---
  lx_saint_halo: "The last saint took it off only once, to bless the Abyss. The Abyss did not thank her.",
  lx_forgiving_saint: "She forgave every wrong done to her, twice. Her enemies found this deeply unsettling.",

  // --- depths.ts ---
  lx_tenfold_edge: "Its smith struck it ten times ten thousand times. It likes to return the favour.",
  lx_lantern_deep: "Its flame was lit in the deepest dark the dungeon holds. It has never once flickered.",
  lx_skin_of_the_deep: "Shed by something that lives on the twentieth floor down. It has grown a new one.",
  lx_choir_below: "A hymnal for a choir that sings at the gate to the netherworld. Do not hum along.",

  // --- iceforge.ts ---
  lx_winters_verdict: "Quenched in the Ice Forge's coldest vat. Its judgement is final, and very slow to thaw.",
  lx_nevermelt: "A splinter of the Ice Forge's anvil. Summer has tried for an age to melt it.",
  lx_avalanche: "The Ice Forge's smiths shaped it from a mountain's worth of falling snow, still falling.",
  lx_polar_scepter: "Sceptre of a court that ruled the frozen north until it simply stopped moving.",
  lx_heart_of_winter: "The Ice Forge burns on this. It was not pleased to be borrowed.",
  lx_long_winter: "Made in the Ice Forge to end a war by freezing both armies. It worked splendidly.",
  lx_ice_crown: "The smith-king of the Ice Forge wore it until his beard froze to his throne.",
  lx_endless_winter_mirror: "Look into it and see the Ice Forge's endless winter. It is looking back at you.",

  // --- builds.ts ---
  lx_red_tithe: "The Crimson vaults collect what they are owed. This ring makes sure the payments never stop.",
  lx_subjugation: "Old kings wore it to make rivals kneel. Most of them kneeled in the end anyway.",
  lx_titan_heart: "It still beats, slow as a mountain's pulse. Each beat makes you feel taller.",
  lx_mountainbreaker: "Dwarves forged it to dig. They stopped when the mountain started to apologise.",
  lx_worldsunder: "Its first swing split a kingdom. Its second split the historians arguing about it.",

  // --- hammers.ts ---
  lx_mountain_king: "The Mountain King kept order with this and nothing else. Order was very well kept.",
  lx_self_given_pyre: "A martyr's flame, kindled from her own life. She would like you to share the cost.",

  // --- potions.ts ---
  lx_endless_alembic: "An alchemist's still that never stops dripping. He drowned, oddly happy, in his own work.",
  la_flaskwarden: "The Flaskwarden kept the apothecary of a besieged keep. The siege ran out before she did.",
  lo_chalice_plenty: "Poured from at a saint's last feast. Somehow, there was always one more cup.",
  // --- newer Legendaries ---
  lx_thunderclap: "A hammer forged in a thunderhead's heart. On quiet nights you can hear it grumbling about the weather.",
  lx_bloodmoon_scythe: "Its reaper only worked when the moon ran red. He kept very strange hours.",
  lx_oathkeeper: "A knight swore to hold the gate forever. He did. The shield kept the promise after he couldn't.",
  lx_eclipse_robes: "Woven in the minute the sun went dark. The seamstress has not been seen in daylight since.",
  lx_fortunes_favour: "A gambler's last charm, won from the dungeon in a game it still insists was rigged.",
  lx_endless_hunger: "A ring that eats. Nobody remembers who fed it first, and nobody has managed to stop.",
};
