import { SS1E } from "../helpers/config.mjs";
import { rollAndKeep, promptRollAndKeep } from "../dice/roll-and-keep.mjs";

/**
 * Unified Actor Sheet for Heroes, Villains, Brute Squads, and Monsters.
 * The Hero/Villain sheet mirrors the HTML reference layout: single page,
 * trait dot trackers, 5-col seed row, weapons/defense/wounds row, dynamic
 * skill grid. Clicking the rollable elements fires Foundry rolls.
 */
export class SeventhSeaActorSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["seventh-sea-1e", "sheet", "actor"],
      width: 1100,
      height: 820,
      scrollY: [".sheet"]
    });
  }

  get template() {
    return `systems/seventh-sea-1e/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  async getData() {
    const ctx = super.getData();
    ctx.system  = ctx.data.system;
    ctx.config  = SS1E;
    ctx.isHero    = this.actor.type === "hero";
    ctx.isVillain = this.actor.type === "villain";
    ctx.isBrute   = this.actor.type === "brute";
    ctx.isMonster = this.actor.type === "monster";

    // Item buckets
    const items     = Array.from(this.actor.items);
    ctx.skills      = items.filter(i => i.type === "skill");
    ctx.knacks      = items.filter(i => i.type === "knack");
    ctx.advantages  = items.filter(i => i.type === "advantage" && !i.system.isFlaw);
    ctx.flaws       = items.filter(i => i.type === "advantage" &&  i.system.isFlaw);
    ctx.backgrounds = items.filter(i => i.type === "background");
    ctx.stories     = items.filter(i => i.type === "story");
    ctx.weapons     = items.filter(i => i.type === "weapon");
    ctx.armor       = items.filter(i => i.type === "armor");
    ctx.gear        = items.filter(i => i.type === "gear");
    ctx.schools     = items.filter(i => i.type === "school");
    ctx.sorceries   = items.filter(i => i.type === "sorcery");

    // Build skill cells (3-per-row grid)
    const cells = ctx.skills.map(skill => ({
      skillId:   skill.id,
      skillName: skill.name,
      knacks:    ctx.knacks
        .filter(k => k.system.skillId === skill.id || k.system.skill === skill.name)
        .sort((a, b) => a.name.localeCompare(b.name))
    }));
    // Group into rows of 3
    const cellsPerRow = 3;
    ctx.skillCellRows = [];
    for (let i = 0; i < cells.length; i += cellsPerRow) {
      ctx.skillCellRows.push(cells.slice(i, i + cellsPerRow));
    }
    // Optional empty-cell padding so the last row is left-aligned (no padding cells)
    // — we render only real cells; that's fine.

    // Enriched biography
    ctx.enriched = {
      biography: await TextEditor.enrichHTML(ctx.system.biography ?? "", { async: true })
    };
    return ctx;
  }

  /* ------------------------------------------------------------------ */
  /*  Listeners                                                          */
  /* ------------------------------------------------------------------ */
  activateListeners(html) {
    super.activateListeners(html);
    // Always build the dot trackers, even if not editable, so the dots are visible.
    this._renderDotTrackers(html);

    if (!this.isEditable) return;

    // Dot tracker clicks
    html.find(".ss1e-dot-tracker").each((_, tr) => {
      tr.querySelectorAll(".dot").forEach(dot => {
        dot.addEventListener("click", (ev) => this._onDotClick(ev, tr));
      });
    });

    // Single delegated click handler for [data-action]
    html.on("click", "[data-action]", (event) => this._onAction(event));

    // Income formatting (mirror the HTML sheet's behavior)
    html.find(".income-num").each((_, input) => {
      input.addEventListener("focus", () => { input.value = input.value.replace(/,/g, ""); });
      input.addEventListener("blur",  () => {
        const v = input.value.replace(/[^\d\-]/g, "");
        if (v === "" || v === "-") return;
        input.value = parseInt(v, 10).toLocaleString("en-US");
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Dot Trackers                                                       */
  /* ------------------------------------------------------------------ */
  _renderDotTrackers(html) {
    html.find(".ss1e-dot-tracker").each((_, tr) => {
      if (tr.dataset.rendered === "true") return;
      tr.dataset.rendered = "true";
      const max = parseInt(tr.dataset.max) || 0;
      const gap = tr.dataset.gap ? parseInt(tr.dataset.gap) : null;
      const current = parseInt(tr.dataset.current || "0") || 0;
      tr.innerHTML = "";
      for (let i = 1; i <= max; i++) {
        const d = document.createElement("span");
        d.className = "dot";
        d.dataset.value = i;
        if (gap && i === gap + 1) d.style.marginLeft = "6px";
        if (i <= current) d.classList.add("filled");
        tr.appendChild(d);
      }
    });
  }

  async _onDotClick(event, tracker) {
    event.preventDefault();
    const path    = tracker.dataset.path;
    if (!path) return;
    const itemId  = tracker.dataset.itemId || null;
    const value   = parseInt(event.currentTarget.dataset.value) || 0;
    const current = parseInt(tracker.dataset.current || "0") || 0;
    const next    = (current === value) ? 0 : value;

    if (itemId) {
      const item = this.actor.items.get(itemId);
      if (item) await item.update({ [path]: next });
    } else {
      await this.actor.update({ [path]: next });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Dispatcher for [data-action] elements                              */
  /* ------------------------------------------------------------------ */
  async _onAction(event) {
    const el = event.currentTarget;
    const action = el.dataset.action;
    event.preventDefault();
    event.stopPropagation();
    switch (action) {
      case "roll-trait":             return this._onRollTrait(el);
      case "roll-knack":             return this._onRollKnack(el);
      case "roll-weapon":            return this._onRollWeapon(el);
      case "roll-wound-check":       return this._onRollWoundCheck(el);
      case "roll-composure-check":   return this._onRollComposureCheck(el);
      case "generic-roll":           return promptRollAndKeep({ actor: this.actor });
      case "roll-initiative":        return this._onRollInitiative();
      case "create-skill":           return this._create("skill",     game.i18n.localize("SS1E.ItemType.Skill"));
      case "create-knack":           return this._createKnack(el);
      case "create-advantage":       return this._create("advantage", game.i18n.localize("SS1E.ItemType.Advantage"));
      case "create-flaw":            return this._createFlaw();
      case "create-school":          return this._create("school",    game.i18n.localize("SS1E.ItemType.School"));
      case "create-sorcery":         return this._create("sorcery",   game.i18n.localize("SS1E.ItemType.Sorcery"));
      case "create-story":           return this._create("story",     game.i18n.localize("SS1E.ItemType.Story"));
      case "edit-item":              return this._editItem(el);
      case "delete-item":            return this._deleteItem(el);
      case "rename-skill":           return; // handled by input blur
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Rolls                                                              */
  /* ------------------------------------------------------------------ */
  async _onRollTrait(el) {
    const key = el.dataset.trait;
    const v   = this.actor.getTrait(key);
    return promptRollAndKeep({
      actor: this.actor,
      defaultRoll: v,
      defaultKeep: v,
      title: game.i18n.format("SS1E.Dialog.TraitRollTitle",
        { trait: game.i18n.localize(SS1E.traits[key]) })
    });
  }

  async _onRollKnack(el) {
    const item = this.actor.items.get(el.dataset.itemId);
    if (!item) return;
    const r = item.getKnackRoll();
    if (!r) return;
    return promptRollAndKeep({
      actor: this.actor,
      defaultRoll: r.roll,
      defaultKeep: r.keep,
      knack: item.name,
      title: game.i18n.format("SS1E.Dialog.KnackRollTitle", { knack: item.name })
    });
  }

  async _onRollWeapon(el) {
    const rowIdx = parseInt(el.dataset.row || "0");
    const which  = el.dataset.which || "atk1";
    const row    = this.actor.system.weapons?.rows?.[rowIdx];
    if (!row) return;
    const data = row[which] || { roll: 0, keep: 0 };
    const roll = Number(data.roll) || 0;
    const keep = Number(data.keep) || 0;
    if (!roll || !keep) {
      ui.notifications.warn(game.i18n.localize("SS1E.Notif.EmptyFormula"));
      return;
    }
    const flavor = which.startsWith("atk")
      ? game.i18n.format("SS1E.Chat.WeaponAttack", { weapon: row.name || "?" })
      : game.i18n.format("SS1E.Chat.WeaponDamage", { weapon: row.name || "?" });
    return rollAndKeep({ actor: this.actor, roll, keep, flavor });
  }

  async _onRollWoundCheck() {
    const sys = this.actor.system;
    const roll = Number(sys.wounds?.check?.roll) || 0;
    const keep = Number(sys.wounds?.check?.keep) || this.actor.getTrait("brawn");
    return rollAndKeep({
      actor: this.actor, roll, keep,
      flavor: game.i18n.format("SS1E.Chat.WoundCheckFor", { name: this.actor.name })
    });
  }

  async _onRollComposureCheck() {
    const sys = this.actor.system;
    const roll = Number(sys.composure?.check?.roll) || 0;
    const keep = Number(sys.composure?.check?.keep) || this.actor.getTrait("panache");
    return rollAndKeep({
      actor: this.actor, roll, keep,
      flavor: game.i18n.format("SS1E.Chat.ComposureCheckFor", { name: this.actor.name })
    });
  }

  async _onRollInitiative() {
    const sys = this.actor.system;
    return rollAndKeep({
      actor: this.actor,
      roll: sys.initiative?.dice ?? 0,
      keep: sys.initiative?.keep ?? 0,
      flavor: game.i18n.format("SS1E.Chat.InitiativeFor", { name: this.actor.name })
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Item helpers                                                       */
  /* ------------------------------------------------------------------ */
  async _create(type, displayName) {
    const name = game.i18n.format("SS1E.UI.NewItem", { type: displayName });
    const [item] = await Item.create([{ name, type }], { parent: this.actor });
    item?.sheet?.render(true);
  }
  async _createKnack(el) {
    const skillName = el.dataset.skill || "";
    const skillId   = el.dataset.skillId || "";
    const name = game.i18n.format("SS1E.UI.NewItem", { type: game.i18n.localize("SS1E.ItemType.Knack") });
    const [item] = await Item.create([{
      name, type: "knack",
      system: { skill: skillName, skillId, trait: "finesse", rank: 0 }
    }], { parent: this.actor });
    item?.sheet?.render(true);
  }
  async _createFlaw() {
    const name = game.i18n.format("SS1E.UI.NewItem", { type: game.i18n.localize("SS1E.UI.IsFlaw") });
    const [item] = await Item.create([{
      name, type: "advantage", system: { isFlaw: true }
    }], { parent: this.actor });
    item?.sheet?.render(true);
  }
  _editItem(el) {
    const li = el.closest("[data-item-id]");
    this.actor.items.get(li?.dataset.itemId)?.sheet?.render(true);
  }
  async _deleteItem(el) {
    const li = el.closest("[data-item-id]");
    return this.actor.items.get(li?.dataset.itemId)?.delete();
  }

  /* ------------------------------------------------------------------ */
  /*  Form submission — auto-sync renamed skills back to their knacks    */
  /* ------------------------------------------------------------------ */
  async _updateObject(event, formData) {
    // If the user typed a new skill name into a .skill-title-input, propagate
    // to the underlying Skill item before the actor save.
    const renames = [];
    this.element.find(".skill-title-input[data-item-id]").each((_, input) => {
      const id = input.dataset.itemId;
      const item = this.actor.items.get(id);
      if (item && item.name !== input.value && input.value.trim()) {
        renames.push(item.update({ name: input.value }));
      }
    });
    if (renames.length) await Promise.all(renames);
    return super._updateObject(event, formData);
  }
}
