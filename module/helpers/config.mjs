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
