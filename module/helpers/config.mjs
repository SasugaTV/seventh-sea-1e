/**
 * 7th Sea 1st Edition - System Configuration
 * Constants for Traits, Nations, Sorceries, default Skills/Knacks, etc.
 */

export const SS1E = {};

SS1E.systemName = "7th Sea 1st Edition";
SS1E.systemId = "seventh-sea-1e";

/* -------------------------------------------- */
/*  Traits                                      */
/* -------------------------------------------- */

SS1E.traits = {
  brawn:   "SS1E.Trait.Brawn",
  finesse: "SS1E.Trait.Finesse",
  resolve: "SS1E.Trait.Resolve",
  wits:    "SS1E.Trait.Wits",
  panache: "SS1E.Trait.Panache"
};

SS1E.traitAbbreviations = {
  brawn:   "SS1E.Trait.BrawnAbbr",
  finesse: "SS1E.Trait.FinesseAbbr",
  resolve: "SS1E.Trait.ResolveAbbr",
  wits:    "SS1E.Trait.WitsAbbr",
  panache: "SS1E.Trait.PanacheAbbr"
};

/* -------------------------------------------- */
/*  Nations of Théah                            */
/* -------------------------------------------- */

SS1E.nations = {
  avalon:    "SS1E.Nation.Avalon",
  inismore:  "SS1E.Nation.Inismore",
  marches:   "SS1E.Nation.HighlandMarches",
  castille:  "SS1E.Nation.Castille",
  eisen:     "SS1E.Nation.Eisen",
  montaigne: "SS1E.Nation.Montaigne",
  ussura:    "SS1E.Nation.Ussura",
  vendel:    "SS1E.Nation.Vendel",
  vesten:    "SS1E.Nation.Vesten",
  vodacce:   "SS1E.Nation.Vodacce",
  cathay:    "SS1E.Nation.Cathay",
  crescent:  "SS1E.Nation.Crescent",
  other:     "SS1E.Nation.Other"
};

/* -------------------------------------------- */
/*  Sorcery Traditions                          */
/* -------------------------------------------- */

SS1E.sorceries = {
  porte:        "SS1E.Sorcery.Porte",
  glamour:      "SS1E.Sorcery.Glamour",
  sorte:        "SS1E.Sorcery.Sorte",
  fuegoAdentro: "SS1E.Sorcery.ElFuegoAdentro",
  pyeryem:      "SS1E.Sorcery.Pyeryem",
  laerdom:      "SS1E.Sorcery.Laerdom",
  zerstorung:   "SS1E.Sorcery.Zerstorung",
  senzavoce:    "SS1E.Sorcery.Senzavoce",
  mantis:       "SS1E.Sorcery.Mantis",
  tzaddik:      "SS1E.Sorcery.Tzaddik",
  scrying:      "SS1E.Sorcery.Scrying"
};

/* -------------------------------------------- */
/*  Skill Categories                            */
/* -------------------------------------------- */

SS1E.skillCategories = {
  civil:    "SS1E.SkillCategory.Civil",
  martial:  "SS1E.SkillCategory.Martial",
  performer:"SS1E.SkillCategory.Performer",
  professional: "SS1E.SkillCategory.Professional",
  sailor:   "SS1E.SkillCategory.Sailor"
};

/* -------------------------------------------- */
/*  Item Types                                  */
/* -------------------------------------------- */

SS1E.itemTypes = {
  skill:      "SS1E.ItemType.Skill",
  knack:      "SS1E.ItemType.Knack",
  advantage:  "SS1E.ItemType.Advantage",
  background: "SS1E.ItemType.Background",
  story:      "SS1E.ItemType.Story",
  weapon:     "SS1E.ItemType.Weapon",
  armor:      "SS1E.ItemType.Armor",
  gear:       "SS1E.ItemType.Gear",
  school:     "SS1E.ItemType.School",
  sorcery:    "SS1E.ItemType.Sorcery"
};

/* -------------------------------------------- */
/*  Weapon Types                                */
/* -------------------------------------------- */

SS1E.weaponTypes = {
  melee:    "SS1E.WeaponType.Melee",
  fencing:  "SS1E.WeaponType.Fencing",
  heavy:    "SS1E.WeaponType.HeavyWeapon",
  polearm:  "SS1E.WeaponType.Polearm",
  pistol:   "SS1E.WeaponType.Pistol",
  bow:      "SS1E.WeaponType.Bow",
  thrown:   "SS1E.WeaponType.Thrown",
  improvised:"SS1E.WeaponType.Improvised"
};

/* -------------------------------------------- */
/*  School Ranks                                */
/* -------------------------------------------- */

SS1E.schoolRanks = {
  student:    "SS1E.SchoolRank.Student",
  apprentice: "SS1E.SchoolRank.Apprentice",
  journeyman: "SS1E.SchoolRank.Journeyman",
  master:     "SS1E.SchoolRank.Master"
};

/* -------------------------------------------- */
/*  Default Civil Skills (Knacks listed)        */
/* -------------------------------------------- */

SS1E.defaultSkills = [
  { name: "Athlete",   category: "civil",
    basic: ["Climbing", "Footwork", "Sprinting", "Throwing", "Side-Step"],
    advanced: ["Break Fall", "Long Distance Running", "Lifting", "Pole Vault", "Rolling", "Swimming", "Swinging"] },
  { name: "Servant",   category: "civil",
    basic: ["Etiquette", "Fashion", "Menial Tasks", "Unobtrusive"],
    advanced: ["Drive", "Scribe", "Stealth"] },
  { name: "Streetwise",category: "civil",
    basic: ["Socializing", "Street Navigation", "Underworld Lore"],
    advanced: ["Scrounging", "Shopping"] },
  { name: "Acting",    category: "performer",
    basic: ["Acting", "Disguise", "Oratory"],
    advanced: ["Dancing", "Female Impersonation", "Memorization"] },
  { name: "Hunter",    category: "professional",
    basic: ["Stealth", "Survival", "Tracking", "Trail Signs"],
    basicAdv: ["Ambush", "Animal Training", "Fishing", "Skinning", "Traps"] },
  { name: "Sailor",    category: "sailor",
    basic: ["Balance", "Climbing", "Knotwork", "Rigging"],
    advanced: ["Cartography", "Leaping", "Navigation", "Pilot", "Sea Lore", "Swimming", "Weather"] },
  { name: "Fencing",   category: "martial",
    basic: ["Attack (Fencing)", "Parry (Fencing)"],
    advanced: [] },
  { name: "Firearms",  category: "martial",
    basic: ["Attack (Firearms)", "Reload (Firearms)"],
    advanced: [] },
  { name: "Heavy Weapon", category: "martial",
    basic: ["Attack (Heavy Weapon)", "Parry (Heavy Weapon)"],
    advanced: [] },
  { name: "Pugilism", category: "martial",
    basic: ["Attack (Pugilism)", "Footwork", "Jab"],
    advanced: ["Ear-Box", "Eye-Gouge", "Ground Fighting", "Kick", "Throat-Strike", "Uppercut"] }
];

/* -------------------------------------------- */
/*  Drama Dice & Raises                         */
/* -------------------------------------------- */

SS1E.maxDiceRolled = 10;       // 7th Sea caps at 10 dice rolled
SS1E.defaultTN = 5;
SS1E.raiseIncrement = 5;       // each Raise = +5 TN

/* -------------------------------------------- */
/*  Ships (Players' Guide pp. 194-199,           */
/*  Game Masters' Guide "Naval Battles")         */
/* -------------------------------------------- */

// What each ship Trait represents (GMG): label shown under the Trait name.
SS1E.shipTraitRoles = {
  brawn:   "SS1E.Ship.Role.Brawn",
  finesse: "SS1E.Ship.Role.Finesse",
  resolve: "SS1E.Ship.Role.Resolve",
  wits:    "SS1E.Ship.Role.Wits",
  panache: "SS1E.Ship.Role.Panache"
};

// Ship Maximums chart: total points -> max Trait / Modifications / Flaws.
// 50+ points caps everything at 10.
SS1E.shipMaximums = [
  { points: 10, trait: 3,  mods: 2,  flaws: 2 },
  { points: 15, trait: 4,  mods: 3,  flaws: 3 },
  { points: 20, trait: 5,  mods: 4,  flaws: 4 },
  { points: 25, trait: 6,  mods: 5,  flaws: 5 },
  { points: 30, trait: 7,  mods: 6,  flaws: 6 },
  { points: 35, trait: 8,  mods: 7,  flaws: 7 },
  { points: 40, trait: 9,  mods: 8,  flaws: 8 },
  { points: 45, trait: 10, mods: 9,  flaws: 9 },
  { points: 50, trait: 10, mods: 10, flaws: 10 }
];

// Duty Leads (GMG): the officer whose Knack adds unkept dice to a Trait roll.
// Brawn has no Duty Lead.
SS1E.shipDutyLeads = {
  finesse: { role: "SS1E.Ship.Duty.MasterGunner",   knack: "SS1E.Ship.Duty.Gunnery" },
  resolve: { role: "SS1E.Ship.Duty.Carpenter",      knack: "SS1E.Ship.Duty.Carpentry" },
  wits:    { role: "SS1E.Ship.Duty.Pilot",          knack: "SS1E.Ship.Duty.Piloting" },
  panache: { role: "SS1E.Ship.Duty.MasterOfTops",   knack: "SS1E.Ship.Duty.Rigging" }
};

/**
 * Ship Modifications. `cost` = Difficulty. `fixed` = only at creation (*).
 * Effects: trait (+1 to a Trait, may exceed the max), draft / cargo / crew /
 * drama deltas. Rule text is in the lang file under SS1E.Ship.Mod.<key>Desc.
 */
SS1E.shipModifications = {
  hiddenTowline:     { cost: 1, draft: 1 },
  oars:              { cost: 1 },
  prowRam:           { cost: 1, fixed: true },
  reinforcedMasts:   { cost: 1 },
  concealedGunports: { cost: 2 },
  overgunned:        { cost: 2, trait: "brawn" },
  silkSails:         { cost: 2, trait: "panache" },
  sturdyHull:        { cost: 2, trait: "resolve", fixed: true },
  wellTrainedCrew:   { cost: 2, trait: "finesse" },
  wideRudder:        { cost: 2, trait: "wits" },
  decoration:        { cost: 3 },
  extendedKeel:      { cost: 3, draft: 1, fixed: true },
  lucky:             { cost: 3, drama: 1, fixed: true },
  smugglingCompartments: { cost: 3 },
  swivelCannon:      { cost: 3 },
  extraCargoSpace:   { cost: 4, cargo: 1, fixed: true },
  extraCrewQuarters: { cost: 4, crew: 1, fixed: true },
  goodCaptain:       { cost: 4 },
  narrowHull:        { cost: 4, fixed: true },
  boardingParty:     { cost: 5 },
  extraBoardingGuns: { cost: 5 },
  friendlySpirit:    { cost: 5 },
  slightDraft:       { cost: 5, draft: -1, fixed: true },
  retractableKeel:   { cost: 6, fixed: true }
};

/**
 * Ship Flaws. `cost` = points refunded. `noExplode` = the Trait rolls whose
 * dice may not explode ("wound" = Hit/Wound Checks).
 */
SS1E.shipFlaws = {
  flimsyMasts:       { cost: 1 },
  old:               { cost: 1, fixed: true },
  sluggish:          { cost: 1 },
  brittleHull:       { cost: 2, noExplode: ["wound"] },
  leakyHull:         { cost: 2, noExplode: ["resolve"] },
  poorlyTrainedCrew: { cost: 2, noExplode: ["brawn"] },
  smallKeel:         { cost: 2 },
  smallRudder:       { cost: 2, noExplode: ["wits"] },
  tatteredSails:     { cost: 2, noExplode: ["panache"] },
  undergunned:       { cost: 2, noExplode: ["brawn"] },
  gaudy:             { cost: 3 },
  incompetentBosun:  { cost: 3 },
  unlucky:           { cost: 3, drama: -1, fixed: true },
  vermin:            { cost: 3 },
  awkwardCargoSpace: { cost: 4, cargo: -1 },
  badCaptain:        { cost: 4 },
  cramped:           { cost: 4, crew: -1 },
  disgruntledCrew:   { cost: 4 },
  deepDraft:         { cost: 5, draft: 1 },
  haunted:           { cost: 5, fixed: true },
  warpedRudder:      { cost: 5 }
};

// Modifications/Flaws that may not be taken together on one ship.
SS1E.shipOpposed = [
  ["goodCaptain", "badCaptain"],
  ["friendlySpirit", "haunted"],
  ["lucky", "unlucky"],
  ["wellTrainedCrew", "poorlyTrainedCrew"],
  ["overgunned", "undergunned"],
  ["slightDraft", "deepDraft"],
  ["extraCargoSpace", "awkwardCargoSpace"],
  ["extraCrewQuarters", "cramped"],
  ["decoration", "gaudy"],
  ["reinforcedMasts", "flimsyMasts"],
  ["extendedKeel", "smallKeel"],
  ["wideRudder", "smallRudder"],
  ["silkSails", "tatteredSails"],
  ["sturdyHull", "brittleHull"]
];

// Default crew roster positions (Players' Guide, "The Ship's Crew").
SS1E.shipDefaultCrew = [
  "Captain", "Lieutenant", "Ship's Master", "Quartermaster", "Boatswain",
  "Purser", "Surgeon", "Master Gunner", "Ship's Carpenter", "Master of the Tops"
];
