/**
 * 7th Sea 1e Actor document
 * Derived stats:
 *   - Drama Dice max  = 10
 *   - Wound Check keep = Brawn
 *   - Composure Check keep = Panache
 *   - Dramatic Wound col max = Resolve
 *   - Humiliation col max     = Panache
 *   - XP total = sum of system.xpLog.entries[].amount (entries auto-sum)
 *   - Reputation total = floor(|sum of entries| / 10)
 */
export class SeventhSeaActor extends Actor {

  /**
   * Define the dataSchema so Foundry V12 knows which system.* paths are valid.
   * Without this, unknown paths like system.wealth are stripped during actor.update()
   * and never persist to the database (survives in-memory within a session but
   * vanishes on server restart).
   */
  static get dataSchema() {
    const arr = foundry.data.fields.ArrayField;
    const obj = foundry.data.fields.ObjectField;
    const str = foundry.data.fields.StringField;
    const num = foundry.data.fields.NumberField;
    const bool = foundry.data.fields.BooleanField;

    const wealthRow = new obj({
      text: new str(),
      value: new num({ min: 0, nullable: true })
    });
    const wealth = new arr(wealthRow, { required: false, nullable: true });

    const reputationEntry = new obj({
      text: new str(),
      value: new num({ min: -999, max: 999, nullable: true })
    });
    const reputation = new obj({
      cap: new num({ min: 0, max: 999, nullable: true }),
      total: new num({ nullable: true }),
      entries: new arr(reputationEntry, { required: false, nullable: true })
    });

    const backgroundRow = new obj({
      text: new str(),
      value: new num({ min: 0, max: 9, nullable: true })
    });
    const backgrounds = new obj({
      rows: new arr(backgroundRow, { required: false, nullable: true })
    });

    const accoutrements = new obj({
      rows: new arr(wealthRow, { required: false, nullable: true })
    });

    const contactRow = new obj({
      name: new str(),
      favor: new num({ min: 0, max: 9, nullable: true }),
      role: new str()
    });
    const contacts = new obj({
      rows: new arr(contactRow, { required: false, nullable: true })
    });

    const languageRow = new obj({
      name: new str(),
      rank: new num({ nullable: true }),
      rw: new num({ nullable: true })
    });
    const languages = new obj({
      extraLabel: new str(),
      rows: new arr(languageRow, { required: false, nullable: true })
    });

    const xpEntry = new obj({
      label: new str(),
      amount: new num({ nullable: true })
    });
    const xpLog = new obj({
      entries: new arr(xpEntry, { required: false, nullable: true })
    });

    const dramaDice = new obj({
      value: new num({ min: 0, max: 10, nullable: true }),
      max: new num({ nullable: true })
    });
    const xpResource = new obj({
      value: new num({ nullable: true }),
      total: new num({ nullable: true })
    });
    const resources = new obj({
      income: new str(),
      xp: xpResource,
      dramaDice: dramaDice
    });

    const traitVal = new obj({ value: new num({ nullable: true }) });
    const traits = new obj({
      brawn: traitVal, finesse: traitVal, wits: traitVal,
      resolve: traitVal, panache: traitVal
    });

    const defenseRow = new obj({
      label: new str(),
      passive: new num({ nullable: true }),
      active: new num({ nullable: true }),
      bestPassive: new num({ nullable: true }),
      bestActive: new num({ nullable: true })
    });
    const defense = new obj({
      rows: new arr(defenseRow, { required: false, nullable: true })
    });

    const composureCheck = new obj({
      roll: new num({ nullable: true }),
      keep: new num({ nullable: true })
    });
    const composureEmbarrassment = new obj({
      value: new num({ nullable: true })
    });
    const composureHumiliations = new obj({
      cols: new arr(new num(), { required: false, nullable: true }),
      max: new num({ nullable: true })
    });
    const composure = new obj({
      check: composureCheck,
      embarrassment: composureEmbarrassment,
      humiliations: composureHumiliations
    });

    const woundsCheck = new obj({
      roll: new num({ nullable: true }),
      keep: new num({ nullable: true })
    });
    const woundsFlesh = new obj({
      value: new num({ nullable: true })
    });
    const woundsDramatic = new obj({
      cols: new arr(new num(), { required: false, nullable: true }),
      max: new num({ nullable: true })
    });
    const wounds = new obj({
      check: woundsCheck,
      flesh: woundsFlesh,
      dramatic: woundsDramatic
    });

    const initiative = new obj({
      bonus: new num({ nullable: true }),
      value: new num({ nullable: true }),
      dice: new num({ nullable: true }),
      keep: new num({ nullable: true }),
      trait: new str({ nullable: true }),
      advKept: new num({ nullable: true }),
      advUnkept: new num({ nullable: true }),
      advPips: new num({ nullable: true })
    });

    const charInfo = new obj({
      nationality: new str(),
      arcana: new str(),
      membership: new str(),
      profession: new str()
    });

    const weaponAtk = new obj({
      roll: new num({ nullable: true }),
      keep: new num({ nullable: true })
    });
    const weaponDmg = new obj({
      roll: new num({ nullable: true }),
      keep: new num({ nullable: true }),
      bonus: new num({ nullable: true })
    });
    const weaponRow = new obj({
      name: new str(),
      knack: new str(),
      atk1: weaponAtk, atk2: weaponAtk,
      dmg1: weaponDmg, dmg2: weaponAtk,
      notes: new str(),
      range: new str(),
      shtMod: new str(),
      lngMod: new str(),
      reload: new str()
    });

    return new obj({
      traits: traits,
      resources: resources,
      xpLog: xpLog,
      uiPrefs: new obj({ fontScale: new num({ nullable: true }) }),
      initiative: initiative,
      defense: defense,
      composure: composure,
      wounds: wounds,
      reputation: reputation,
      backgrounds: backgrounds,
      accoutrements: accoutrements,
      contacts: contacts,
      languages: languages,
      wealth: new obj({ rows: new arr(wealthRow, { required: false, nullable: true }) }),
      weapons: new obj({ rows: new arr(weaponRow, { required: false, nullable: true }) }),
      charInfo: charInfo,
      biography: new str(),
      notes: new str(),
      brutes: new obj({ value: new num({ nullable: true }), max: new num({ nullable: true }) }),
      tn: new num({ nullable: true })
    });
  }

  prepareDerivedData() {
    const sys = this.system;
    switch (this.type) {
      case "hero":
      case "villain":
        this._prepareCharacterDerived(sys);
        break;
      case "brute":
        this._prepareBruteDerived(sys);
        break;
      case "monster":
        this._prepareMonsterDerived(sys);
        break;
    }
  }

  _prepareCharacterDerived(sys) {
    const brawn   = sys.traits?.brawn?.value   ?? 0;
    const finesse = sys.traits?.finesse?.value ?? 0;
    const wits    = sys.traits?.wits?.value    ?? 0;
    const resolve = sys.traits?.resolve?.value ?? 0;
    const panache = sys.traits?.panache?.value ?? 0;

    // Drama Dice cap = 10
    if (sys.resources?.dramaDice) {
      sys.resources.dramaDice.max = 10;
      if ((sys.resources.dramaDice.value ?? 0) > 10) {
        sys.resources.dramaDice.value = 10;
      }
    }

    // XP total = sum of log entries
    if (sys.xpLog?.entries && sys.resources?.xp) {
      const sum = sys.xpLog.entries.reduce((acc, e) => acc + (Number(e?.amount) || 0), 0);
      sys.resources.xp.total = sum;
    }

    // Wounds — Brawn-driven
    if (sys.wounds?.check) sys.wounds.check.keep = brawn;
    if (sys.wounds?.dramatic) sys.wounds.dramatic.max = resolve;

    // Composure — Panache-driven
    if (sys.composure?.check) sys.composure.check.keep = panache;
    if (sys.composure?.humiliations) sys.composure.humiliations.max = panache;

    // Reputation total
    if (sys.reputation?.entries) {
      const sum = sys.reputation.entries.reduce((acc, e) => acc + (Number(e?.value) || 0), 0);
      sys.reputation.total = Math.floor(Math.abs(sum) / 10);
    }

    // Defense passive/active fallback
    sys.defense = sys.defense ?? { rows: [] };
    let bestPassive = 5, bestActive = 5;
    for (const r of sys.defense.rows ?? []) {
      bestPassive = Math.max(bestPassive, Number(r?.passive) || 0);
      bestActive  = Math.max(bestActive,  Number(r?.active)  || 0);
    }
    sys.defense.bestPassive = bestPassive;
    sys.defense.bestActive  = bestActive;

    // Initiative: use saved values if present, otherwise Wits + Panache k Panache
    sys.initiative = sys.initiative ?? { bonus: 0, value: 0 };
    if (sys.initiative.dice === undefined || sys.initiative.dice === null) sys.initiative.dice = wits + panache;
    if (sys.initiative.keep === undefined || sys.initiative.keep === null) sys.initiative.keep = panache;
  }

  _prepareBruteDerived(sys) {
    sys.brutes = sys.brutes ?? { value: 6, max: 6 };
    if (sys.brutes.value < 0) sys.brutes.value = 0;
    if (!sys.tn) sys.tn = 5;
  }

  _prepareMonsterDerived(sys) {
    sys.defense = sys.defense ?? { rows: [], bestPassive: 5, bestActive: 5 };
  }

  findKnack(name) {
    const lower = String(name || "").toLowerCase();
    return this.items.find(i => i.type === "knack" && i.name.toLowerCase() === lower);
  }

  getTrait(key) {
    return this.system.traits?.[key]?.value ?? 0;
  }
}
