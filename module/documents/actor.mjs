import { SS1E } from "../helpers/config.mjs";
import { prepareDramaticTrack, DEFAULT_BARS } from "../helpers/token-bars.mjs";

/**
 * 7th Sea 1e Actor document
 * Derived stats:
 *   - Drama Dice max  = 10
 *   - Wound Check keep = Brawn
 *   - Composure Check keep = Panache
 *   - Dramatic Wound col max = Resolve; wounds.dramatic.track = token bar (see helpers/token-bars.mjs)
 *   - Humiliation col max     = Panache
 *   - XP total = sum of system.xpLog.entries[].amount (entries auto-sum)
 *   - Reputation total = floor(|sum of entries| / 10)
 *   - Ships: see _prepareShipDerived
 */
export class SeventhSeaActor extends Actor {

  /** New actors get token bars that suit their type (Dramatic Wounds, Drama Dice, Brutes left). */
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;
    const bars = DEFAULT_BARS[this.type];
    if (bars && !foundry.utils.hasProperty(data, "prototypeToken.bar1.attribute")) {
      this.updateSource({
        "prototypeToken.bar1.attribute": bars.bar1,
        "prototypeToken.bar2.attribute": bars.bar2
      });
    }
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
      case "ship":
        this._prepareShipDerived(sys);
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
    // Dramatic Wound column max = Resolve, plus the token-bar total across both columns.
    prepareDramaticTrack(sys);

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
    prepareDramaticTrack(sys);
  }

  /**
   * Ship design + combat values (Players' Guide pp. 194-199, GMG Naval Battles).
   *   - traits.X.value  = rank bought with ship points
   *   - traits.X.bonus  = +1 per matching Modification (may exceed the max)
   *   - traits.X.lost   = dice lost to Critical Hits
   *   - traits.X.effective = value + bonus - lost (what gets rolled)
   *   - Draft = Cargo = Resolve, Crew = Finesse (built values), then mods/flaws
   *   - Drama Dice = lowest current Trait, +Lucky / -Unlucky
   *   - Critical Hits = sum of lost dice; sinks at 2 x Hull, 20 - Hull Actions
   */
  _prepareShipDerived(sys) {
    const keys = Object.keys(SS1E.traits);
    const mods  = (sys.modifications?.rows ?? []).filter(r => r);
    const flaws = (sys.flaws?.rows ?? []).filter(r => r);
    const catMod  = r => SS1E.shipModifications[r.key] ?? {};
    const catFlaw = r => SS1E.shipFlaws[r.key] ?? {};
    const sumOf = (rows, field, cat) => rows.reduce((a, r) => a + (Number(cat(r)[field]) || 0), 0);

    sys.traits = sys.traits ?? {};
    for (const k of keys) {
      const t = sys.traits[k] = sys.traits[k] ?? { value: 0, lost: 0 };
      t.value = Number(t.value) || 0;
      t.bonus = mods.filter(r => catMod(r).trait === k).length;
      t.built = t.value + t.bonus;
      t.lost  = Math.max(0, Math.min(Number(t.lost) || 0, t.built));
      t.effective = t.built - t.lost;
    }
    const hull = sys.traits.resolve.built;

    // Ship Maximums chart
    const points = Number(sys.points) || 0;
    const row = [...SS1E.shipMaximums].reverse().find(m => points >= m.points) ?? SS1E.shipMaximums[0];
    const modPts  = mods.reduce((a, r) => a + (Number(r.cost) || 0), 0);
    const flawPts = flaws.reduce((a, r) => a + (Number(r.cost) || 0), 0);
    const traitPts = keys.reduce((a, k) => a + sys.traits[k].value, 0);
    const design = sys.design = {
      maxTrait: row.trait, maxMods: row.mods, maxFlaws: row.flaws,
      modPts, flawPts, traitPts,
      budget: points + flawPts,
      spent: traitPts + modPts
    };
    design.remaining = design.budget - design.spent;

    // Draft / Cargo / Crew
    const delta = field => sumOf(mods, field, catMod) + sumOf(flaws, field, catFlaw);
    sys.draft = Math.max(1, hull + delta("draft"));
    sys.cargoCap = Math.max(0, hull + delta("cargo"));
    sys.crewSize = Math.max(0, sys.traits.finesse.built + delta("crew"));

    // Drama Dice
    const lowest = Math.min(...keys.map(k => sys.traits[k].effective));
    sys.dramaDice = sys.dramaDice ?? { value: 0 };
    sys.dramaDice.max = Math.max(0, lowest + delta("drama"));
    if ((sys.dramaDice.value ?? 0) > sys.dramaDice.max) sys.dramaDice.value = sys.dramaDice.max;

    // Combat
    const sluggish = flaws.some(r => r.key === "sluggish") ? 1 : 0;
    sys.combat = {
      tnToHit: sys.traits.wits.effective * 5,
      speed: Math.max(0, sys.traits.wits.effective - sluggish),
      turnCost: hull,
      criticalHits: keys.reduce((a, k) => a + sys.traits[k].lost, 0),
      sinkAt: hull * 2,
      sinkActions: Math.max(0, 20 - hull)
    };
    sys.combat.sinking = hull > 0 && sys.combat.criticalHits >= sys.combat.sinkAt;

    // Trait rolls whose dice may not explode
    sys.noExplode = {};
    for (const r of flaws) for (const k of catFlaw(r).noExplode ?? []) sys.noExplode[k] = true;
  }

  findKnack(name) {
    const lower = String(name || "").toLowerCase();
    return this.items.find(i => i.type === "knack" && i.name.toLowerCase() === lower);
  }

  getTrait(key) {
    if (this.type === "ship") return this.system.traits?.[key]?.effective ?? 0;
    return this.system.traits?.[key]?.value ?? 0;
  }
}
