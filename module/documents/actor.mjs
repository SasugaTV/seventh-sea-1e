/**
 * 7th Sea 1e Actor document
 * Extends the base Foundry Actor with derived data for Heroes, Villains,
 * Brute Squads, and Monsters.
 *
 * Derived fields mirror the HTML character sheet:
 *   - Wound Check keep    = Brawn
 *   - Composure Check keep= Panache
 *   - Dramatic Wound col max  = Resolve
 *   - Humiliation col max     = Panache
 *   - Drama Dice max      = Panache  (default; configurable)
 *   - Reputation total    = floor(|sum of reputation entries| / 10)
 *   - Defense passive/active row TN reflects defense.rows[].passive/active
 */
export class SeventhSeaActor extends Actor {

  /** @override */
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

  /* -------------------------------------------- */
  /*  Heroes / Villains                           */
  /* -------------------------------------------- */
  _prepareCharacterDerived(sys) {
    const brawn   = sys.traits?.brawn?.value   ?? 0;
    const panache = sys.traits?.panache?.value ?? 0;
    const resolve = sys.traits?.resolve?.value ?? 0;

    // Drama Dice cap = Panache
    if (sys.resources?.dramaDice) {
      sys.resources.dramaDice.max = panache;
      if ((sys.resources.dramaDice.value ?? 0) > panache) {
        sys.resources.dramaDice.value = panache;
      }
    }

    // Wounds — keep = Brawn
    if (sys.wounds?.check) sys.wounds.check.keep = brawn;
    if (sys.wounds?.dramatic) sys.wounds.dramatic.max = resolve;

    // Composure — keep = Panache
    if (sys.composure?.check) sys.composure.check.keep = panache;
    if (sys.composure?.humiliations) sys.composure.humiliations.max = panache;

    // Reputation total = floor(|sum| / 10)
    if (sys.reputation?.entries) {
      const sum = sys.reputation.entries.reduce((acc, e) => acc + (Number(e?.value) || 0), 0);
      sys.reputation.total = Math.floor(Math.abs(sum) / 10);
    }

    // Defense fallback (kept for token bars)
    sys.defense = sys.defense ?? { rows: [] };
    let bestPassive = 5;
    let bestActive  = 5;
    for (const r of sys.defense.rows ?? []) {
      bestPassive = Math.max(bestPassive, Number(r?.passive) || 0);
      bestActive  = Math.max(bestActive,  Number(r?.active)  || 0);
    }
    sys.defense.bestPassive = bestPassive;
    sys.defense.bestActive  = bestActive;

    // Initiative: Wits + Panache, keep Panache
    sys.initiative = sys.initiative ?? { bonus: 0 };
    sys.initiative.dice = (sys.traits?.wits?.value ?? 0) + panache;
    sys.initiative.keep = panache;
  }

  /* -------------------------------------------- */
  /*  Brute Squads                                */
  /* -------------------------------------------- */
  _prepareBruteDerived(sys) {
    sys.brutes = sys.brutes ?? { value: 6, max: 6 };
    if (sys.brutes.value < 0) sys.brutes.value = 0;
    if (!sys.tn) sys.tn = 5;
  }

  /* -------------------------------------------- */
  /*  Monsters                                    */
  /* -------------------------------------------- */
  _prepareMonsterDerived(sys) {
    sys.defense = sys.defense ?? { rows: [], bestPassive: 5, bestActive: 5 };
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** Knack lookup by name. */
  findKnack(name) {
    const lower = String(name || "").toLowerCase();
    return this.items.find(i => i.type === "knack" && i.name.toLowerCase() === lower);
  }

  /** Trait getter. */
  getTrait(key) {
    return this.system.traits?.[key]?.value ?? 0;
  }

  /** Apply flesh wounds, escalating to a Dramatic Wound at each Resolve×2 step. */
  async applyFleshWounds(amount) {
    const sys = this.system;
    if (!sys.wounds) return;
    let flesh = (sys.wounds.flesh?.value || 0) + amount;
    const dramaticArr = [...(sys.wounds.dramatic?.cols ?? [0, 0])];
    const threshold = (sys.traits?.resolve?.value ?? 0) * 2;
    if (threshold > 0) {
      while (flesh >= threshold) {
        flesh -= threshold;
        // Fill the lowest column first
        const idx = dramaticArr[0] <= dramaticArr[1] ? 0 : 1;
        dramaticArr[idx] = Math.min((sys.traits?.resolve?.value ?? 0), dramaticArr[idx] + 1);
      }
    }
    return this.update({
      "system.wounds.flesh.value": flesh,
      "system.wounds.dramatic.cols": dramaticArr
    });
  }
}
