/**
 * 7th Sea 1e Item document
 * Extends the base Foundry Item with derived data for Knacks, Skills, etc.
 */
export class SeventhSeaItem extends Item {

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    const sys = this.system;

    if (this.type === "knack") {
      sys.label = `${this.name} (${this.system.rank ?? 0})`;
    }

    if (this.type === "weapon") {
      sys.damageFormula = `${sys.damage?.roll ?? 0}k${sys.damage?.keep ?? 1}`;
    }
  }

  /**
   * Build the Roll & Keep formula for using this knack on its parent actor.
   * Returns { roll, keep, formula, trait } or null if not applicable.
   */
  getKnackRoll(traitOverride = null) {
    if (this.type !== "knack") return null;
    const actor = this.actor;
    if (!actor) return null;
    const traitKey = traitOverride ?? this.system.trait ?? "finesse";
    const trait = actor.getTrait(traitKey);
    const rank = this.system.rank ?? 0;
    let roll = trait + rank;
    let keep = trait;
    // 7th Sea caps roll at 10 dice; extra dice convert at 2:1 into kept dice (house option).
    if (roll > 10) {
      const overflow = roll - 10;
      roll = 10;
      keep = Math.min(keep + Math.floor(overflow / 2), 10);
    }
    return {
      roll,
      keep,
      trait: traitKey,
      formula: `${roll}k${keep}`
    };
  }
}
