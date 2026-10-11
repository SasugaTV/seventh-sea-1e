import { SS1E } from "../helpers/config.mjs";
import { rollAndKeep, promptRollAndKeep } from "../dice/roll-and-keep.mjs";
import { SeventhSeaActorSheet } from "./actor-sheet.mjs";

/**
 * Ship sheet (Players' Guide "Ship Design", GMG "Naval Battles").
 * Reuses the hero sheet's look, dot trackers, font scale and roll dialog.
 */
export class SeventhSeaShipSheet extends SeventhSeaActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["seventh-sea-1e", "sheet", "actor", "ship"]
    });
  }

  get arrayPaths() {
    return ["system.modifications.rows", "system.flaws.rows", "system.crew.rows"];
  }

  async getData() {
    const ctx = await super.getData();
    const sys = ctx.system;
    const L = k => game.i18n.localize(k);
    const shipName = this.actor.name;

    ctx.traitRows = Object.keys(SS1E.traits).map(key => {
      const t = sys.traits[key];
      const lead = SS1E.shipDutyLeads[key];
      return {
        key, ...t,
        label: L(SS1E.traits[key]),
        role: L(SS1E.shipTraitRoles[key]),
        overMax: t.value > sys.design.maxTrait,
        noExplode: !!sys.noExplode?.[key],
        leadRank: lead ? Number(sys.dutyLeads?.[key]?.rank) || 0 : 0
      };
    });

    ctx.dutyRows = Object.entries(SS1E.shipDutyLeads).map(([key, d]) => ({
      key, role: L(d.role), knack: L(d.knack), trait: L(SS1E.traits[key]),
      name: sys.dutyLeads?.[key]?.name ?? "", rank: sys.dutyLeads?.[key]?.rank ?? 0
    }));

    // Modification / Flaw rows with their catalog entries
    const decorate = (rows, catalog, prefix) => (rows ?? []).map((r, i) => {
      const cat = catalog[r.key];
      return {
        ...r, idx: i, custom: !cat,
        label: cat ? L(`${prefix}.${r.key}`) + (cat.fixed ? "*" : "") : r.name,
        desc:  cat ? L(`${prefix}.${r.key}Desc`) : ""
      };
    });
    const options = (catalog, prefix) => Object.entries(catalog)
      .map(([key, c]) => ({ key, cost: c.cost, label: `${L(`${prefix}.${key}`)}${c.fixed ? "*" : ""} (${c.cost})` }));
    ctx.modRows  = decorate(sys.modifications?.rows, SS1E.shipModifications, "SS1E.Ship.Mod");
    ctx.flawRows = decorate(sys.flaws?.rows, SS1E.shipFlaws, "SS1E.Ship.Flaw");
    ctx.modOptions  = options(SS1E.shipModifications, "SS1E.Ship.Mod");
    ctx.flawOptions = options(SS1E.shipFlaws, "SS1E.Ship.Flaw");
    ctx.pointOptions = SS1E.shipMaximums.map(m => m.points);
    ctx.isOld = (sys.flaws?.rows ?? []).some(r => r?.key === "old");

    ctx.warnings = this._designWarnings(sys);
    ctx.sinkAtText = game.i18n.format("SS1E.Ship.SinkAt", { n: sys.combat.sinkAt });
    ctx.sinkingText = game.i18n.format("SS1E.Ship.Sinking", { n: sys.combat.sinkActions });
    ctx.shipName = shipName;
    return ctx;
  }

  /** Every way the current build breaks the Ship Design rules. */
  _designWarnings(sys) {
    const F = (k, d) => game.i18n.format(k, d);
    const L = k => game.i18n.localize(k);
    const w = [];
    const d = sys.design;
    for (const key of Object.keys(SS1E.traits)) {
      const t = sys.traits[key];
      const trait = L(SS1E.traits[key]);
      if (t.value > d.maxTrait) w.push(F("SS1E.Ship.Warn.TraitOverMax", { trait, value: t.value, max: d.maxTrait, points: sys.points }));
      if (t.built > 10) w.push(F("SS1E.Ship.Warn.TraitOverTen", { trait }));
    }
    const mods  = (sys.modifications?.rows ?? []).filter(r => r);
    const flaws = (sys.flaws?.rows ?? []).filter(r => r);
    if (d.modPts > d.maxMods && mods.length > 1)   w.push(F("SS1E.Ship.Warn.ModsOverMax",  { value: d.modPts,  max: d.maxMods }));
    if (d.flawPts > d.maxFlaws && flaws.length > 1) w.push(F("SS1E.Ship.Warn.FlawsOverMax", { value: d.flawPts, max: d.maxFlaws }));
    if (d.remaining < 0) w.push(F("SS1E.Ship.Warn.Overspent", { n: -d.remaining }));
    if (d.remaining > 0) w.push(F("SS1E.Ship.Warn.Unspent",   { n: d.remaining }));

    const label = key => SS1E.shipModifications[key] ? L(`SS1E.Ship.Mod.${key}`) : L(`SS1E.Ship.Flaw.${key}`);
    const keys = [...mods, ...flaws].map(r => r.key).filter(k => k);
    for (const k of new Set(keys.filter((k, i) => keys.indexOf(k) !== i))) {
      w.push(F("SS1E.Ship.Warn.Duplicate", { name: label(k) }));
    }
    for (const [a, b] of SS1E.shipOpposed) {
      if (keys.includes(a) && keys.includes(b)) w.push(F("SS1E.Ship.Warn.Opposed", { a: label(a), b: label(b) }));
    }
    const guns = (Number(sys.cannons?.port) || 0) + (Number(sys.cannons?.starboard) || 0);
    if (guns !== sys.traits.brawn.effective) w.push(F("SS1E.Ship.Warn.Cannons", { value: guns, brawn: sys.traits.brawn.effective }));
    return w;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
    // Picking a catalog entry fills in its cost; "(custom)" keeps a free-text row.
    html.find("select.ship-row-key").on("change", ev => this._onRowKeyChange(ev));
  }

  async _onRowKeyChange(event) {
    const el = event.currentTarget;
    const field = el.dataset.field;                    // "modifications" | "flaws"
    const idx = Number(el.dataset.row);
    const catalog = field === "flaws" ? SS1E.shipFlaws : SS1E.shipModifications;
    await this.submit({ preventClose: true, preventRender: true }).catch(() => {});
    const rows = foundry.utils.deepClone(this.actor.system[field]?.rows ?? []);
    if (!rows[idx]) return;
    const key = el.value;
    rows[idx] = { ...rows[idx], key, cost: catalog[key]?.cost ?? rows[idx].cost ?? 0 };
    return this.actor.update({ [`system.${field}.rows`]: rows });
  }

  async _onAction(event) {
    const el = event.currentTarget;
    const action = el.dataset.action;
    const shipActions = {
      "roll-ship-trait": () => this._rollShipTrait(el.dataset.trait),
      "fire-broadside":  () => this._fireBroadside(el.dataset.side),
      "roll-hit-check":  () => this._rollHitCheck(),
      "roll-phases":     () => this._rollPhases(),
      "drama-adjust":    () => this._shipDramaAdjust(Number(el.dataset.delta || 0)),
      "ship-row-add":    () => this._rowAdd(el.dataset.field),
      "ship-row-delete": () => this._rowDelete(el.dataset.field, Number(el.dataset.row))
    };
    if (!shipActions[action]) return super._onAction(event);
    event.preventDefault();
    event.stopPropagation();
    if (action.startsWith("ship-row")) {
      await this.submit({ preventClose: true, preventRender: true }).catch(() => {});
    }
    return shipActions[action]();
  }

  /* ------------------------------------------------------------------ */
  /*  Rolls                                                              */
  /* ------------------------------------------------------------------ */

  /** Trait roll; the Duty Lead's Knack adds unkept dice. */
  _traitPrompt(key, title) {
    const sys = this.actor.system;
    return promptRollAndKeep({
      actor: this.actor,
      trait: key,
      baseRank: SS1E.shipDutyLeads[key] ? Number(sys.dutyLeads?.[key]?.rank) || 0 : 0,
      defaultExplode: !sys.noExplode?.[key],
      title
    });
  }

  _rollShipTrait(key) {
    if (!SS1E.traits[key]) return;
    return this._traitPrompt(key, game.i18n.format("SS1E.Ship.TraitRoll", {
      ship: this.actor.name,
      trait: game.i18n.localize(SS1E.traits[key]),
      role: game.i18n.localize(SS1E.shipTraitRoles[key])
    }));
  }

  /**
   * Fire one side's cannons: Finesse (+ Master Gunner) to hit against the
   * target's Wits x 5, then roll that side's cannon dice for Hits.
   */
  async _fireBroadside(side) {
    const sys = this.actor.system;
    const guns = Number(sys.cannons?.[side]) || 0;
    if (guns <= 0) return ui.notifications.warn(game.i18n.localize("SS1E.Ship.NoCannons"));
    const sideLabel = game.i18n.localize(side === "port" ? "SS1E.Ship.Port" : "SS1E.Ship.Starboard");
    const attack = await this._traitPrompt("finesse",
      game.i18n.format("SS1E.Ship.FireTitle", { ship: this.actor.name, side: sideLabel }));
    if (!attack) return;
    const damage = await rollAndKeep({
      actor: this.actor,
      roll: guns, keep: guns, tn: null,
      exploding: !sys.noExplode?.brawn,
      flavor: game.i18n.format("SS1E.Ship.Damage", { ship: this.actor.name, side: sideLabel })
    });
    return { attack, damage };
  }

  /**
   * Hit Check (the ship's Wound Check). Brawn by default, as for Heroes: the
   * Undergunned flaw exempts Wound Checks from its Brawn penalty, and Brittle
   * Hull exists separately from Leaky Hull's Resolve penalty. The dialog's
   * Trait dropdown can switch it to Resolve (Hull) for tables that prefer it.
   */
  _rollHitCheck() {
    const sys = this.actor.system;
    return promptRollAndKeep({
      actor: this.actor,
      trait: "brawn",
      baseRank: 0,
      defaultExplode: !sys.noExplode?.wound,
      title: game.i18n.format("SS1E.Ship.HitCheckTitle", { ship: this.actor.name })
    });
  }

  /** Roll Panache dice (no explode): each die is a Phase the ship acts in. */
  async _rollPhases() {
    const n = this.actor.system.traits.panache.effective;
    if (n <= 0) return;
    const roll = await new Roll(`${n}d10`).evaluate();
    const phases = roll.dice[0].results.map(r => r.result).sort((a, b) => a - b);
    await this.actor.update({ "system.phases": phases });
    return roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: game.i18n.format("SS1E.Ship.PhasesChat", { ship: this.actor.name, phases: phases.join(", ") })
    });
  }

  async _shipDramaAdjust(delta) {
    const cur = this.actor.system.dramaDice?.value ?? 0;
    const max = this.actor.system.dramaDice?.max ?? 0;
    const next = Math.max(0, Math.min(max, cur + delta));
    if (next !== cur) await this.actor.update({ "system.dramaDice.value": next });
  }

  /* ------------------------------------------------------------------ */
  /*  Modification / Flaw / Crew rows                                    */
  /* ------------------------------------------------------------------ */
  async _rowAdd(field) {
    const blank = field === "crew" ? { role: "", name: "", notes: "" } : { key: "", name: "", cost: 0, notes: "" };
    const rows = foundry.utils.deepClone(this.actor.system[field]?.rows ?? []);
    rows.push(blank);
    return this.actor.update({ [`system.${field}.rows`]: rows });
  }

  async _rowDelete(field, idx) {
    const rows = foundry.utils.deepClone(this.actor.system[field]?.rows ?? []);
    if (!rows[idx]) return;
    rows.splice(idx, 1);
    return this.actor.update({ [`system.${field}.rows`]: rows });
  }
}
