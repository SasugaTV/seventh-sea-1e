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
