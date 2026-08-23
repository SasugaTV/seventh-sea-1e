import { SS1E } from "../helpers/config.mjs";
import { rollAndKeep, promptRollAndKeep } from "../dice/roll-and-keep.mjs";

/**
 * Unified Actor Sheet for Heroes, Villains, Brute Squads, and Monsters.
 */
export class SeventhSeaActorSheet extends ActorSheet {

  static get defaultOptions() {
    // Initial size fits within the current window
    const w = Math.min(1200, Math.max(720, Math.floor((window.innerWidth || 1200) * 0.86)));
    const h = Math.min(900, Math.max(560, Math.floor((window.innerHeight || 900) * 0.86)));
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["seventh-sea-1e", "sheet", "actor"],
      width: w,
      height: h,
      resizable: true,
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

    // Item buckets
    const items = Array.from(this.actor.items);
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

    // Build skill cells (strict skillId match — knacks no longer cross-pollinate by name)
    const cells = ctx.skills.map(skill => ({
      skillId:   skill.id,
      skillName: skill.name,
      knacks:    ctx.knacks
        .filter(k => k.system.skillId === skill.id)
        .sort((a, b) => a.name.localeCompare(b.name))
    }));
    const perRow = 3;
    ctx.skillCellRows = [];
    for (let i = 0; i < cells.length; i += perRow) {
      ctx.skillCellRows.push(cells.slice(i, i + perRow));
    }

    // Knack choices for the weapon rows' attack-knack dropdowns
    ctx.knackOptions = ctx.knacks
      .map(k => ({ id: k.id, name: k.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Weapons box mode: game mode shows names as clickable roll targets,
    // edit mode swaps them for text inputs. Sheet-local UI state.
    ctx.weaponsEdit = !!this._weaponsEdit;

    // Font scale for live ±
    ctx.fontScale = Number(ctx.system?.uiPrefs?.fontScale) || 1.0;
    return ctx;
  }

  /* ------------------------------------------------------------------ */
  /*  Listeners                                                          */
  /* ------------------------------------------------------------------ */
  activateListeners(html) {
    super.activateListeners(html);

    // Apply user's saved font scale to the sheet root
    const scale = Number(this.actor.system?.uiPrefs?.fontScale) || 1.0;
    html[0].style.setProperty("--ss1e-font-scale", String(scale));

    // Always build dot trackers (even when not editable)
    this._renderDotTrackers(html);

    if (!this.isEditable) return;

    // Dot clicks
    html.find(".ss1e-dot-tracker").each((_, tr) => {
      tr.querySelectorAll(".dot").forEach(dot => {
        dot.addEventListener("click", (ev) => this._onDotClick(ev, tr));
      });
    });

    // Single delegated [data-action] handler
    html.on("click", "[data-action]", (event) => this._onAction(event));

    // Income formatting
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
  /*  Dot trackers                                                       */
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
    const path   = tracker.dataset.path;
    if (!path) return;
    const itemId = tracker.dataset.itemId || null;
    const value  = parseInt(event.currentTarget.dataset.value) || 0;
    const cur    = parseInt(tracker.dataset.current || "0") || 0;
    const next   = (cur === value) ? 0 : value;

    // Helper to safely update array elements in v10+
    const performUpdate = async (doc) => {
      // Check if path contains array notation (e.g., .rows.0. or .cols.1)
      const arrayMatch = path.match(/(.*)\.(\d+)(?:\.(.*))?/);
      if (arrayMatch) {
        const arrayPath = arrayMatch[1];
        const idx = Number(arrayMatch[2]);
        const subPath = arrayMatch[3];

        const existingArray = foundry.utils.getProperty(doc, arrayPath);
        if (Array.isArray(existingArray)) {
          const newArray = foundry.utils.deepClone(existingArray);
          if (idx >= 0 && idx < newArray.length) {
            if (subPath) {
              foundry.utils.setProperty(newArray[idx], subPath, next);
            } else {
              newArray[idx] = next;
            }
            return doc.update({ [arrayPath]: newArray });
          }
        }
      }
      return doc.update({ [path]: next });
    };

    if (itemId) {
      const item = this.actor.items.get(itemId);
      if (item) await performUpdate(item);
    } else {
      await performUpdate(this.actor);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Action dispatcher                                                  */
  /* ------------------------------------------------------------------ */
  async _onAction(event) {
    const el = event.currentTarget;
    const action = el.dataset.action;
    event.preventDefault();
    event.stopPropagation();

    // Flush any pending input changes (e.g. the number the user just typed)
    // before mutating the actor's array fields, otherwise the click race
    // makes the button feel "stuck".
    const needsFlush = ["xp-add", "xp-delete", "defense-add", "defense-delete", "weapon-add", "weapons-toggle-mode", "weapon-notes"];
    if (needsFlush.includes(action)) {
      try { await this.submit({ preventClose: true, preventRender: true }); }
      catch (_) { /* nothing to submit */ }
    }

    switch (action) {
      // Rolls — all go through the same dialog
      case "roll-trait":             return this._rollTrait(el);
      case "roll-knack":             return this._rollKnack(el);
      case "roll-weapon-attack":     return this._rollWeaponAttack(el);
      case "weapon-add":             return this._weaponAdd();
      case "weapons-toggle-mode":    this._weaponsEdit = !this._weaponsEdit; return this.render(false);
      case "weapon-notes":           return this._weaponNotesEdit(el);
      case "roll-wound-check":       return this._rollWoundCheck();
      case "roll-composure-check":   return this._rollComposureCheck();
      case "roll-initiative":        return this._rollInitiative();
      case "roll-defense":           return this._rollDefense(el);
      case "generic-roll":           return promptRollAndKeep({ actor: this.actor });
      // Drama Dice +/-
      case "drama-adjust":           return this._dramaAdjust(el);
      // Font scale
      case "font-adjust":            return this._fontAdjust(el);
      // Item create/edit/delete
      case "create-skill":           return this._create("skill",     game.i18n.localize("SS1E.ItemType.Skill"));
      case "create-knack":           return this._createKnack(el);
      case "create-advantage":       return this._create("advantage", game.i18n.localize("SS1E.ItemType.Advantage"));
      case "create-flaw":            return this._createFlaw();
      case "create-school":          return this._create("school",    game.i18n.localize("SS1E.ItemType.School"));
      case "create-sorcery":         return this._create("sorcery",   game.i18n.localize("SS1E.ItemType.Sorcery"));
      case "create-story":           return this._create("story",     game.i18n.localize("SS1E.ItemType.Story"));
      case "edit-item":              return this._editItem(el);
      case "delete-item":            return this._deleteItem(el);
      case "delete-knack":           return this._confirmDeleteItem(el, "knack");
      case "delete-skill":           return this._confirmDeleteSkill(el);
      // Defense row management
      case "defense-add":            return this._defenseAdd();
      case "defense-delete":         return this._defenseDelete(el);
      case "defense-edit":           return this._defenseEdit(el);
      // XP Log management
      case "xp-add":                 return this._xpLogAdd();
      case "xp-delete":              return this._xpLogDelete(el);
      case "rename-skill":           return; // input blur handles it
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Rolls (every roll uses the same dialog)                            */
  /* ------------------------------------------------------------------ */
  async _rollTrait(el) {
    const key = el.dataset.trait;
    const v   = this.actor.getTrait(key);
    return promptRollAndKeep({
      actor: this.actor,
      defaultRoll: v, defaultKeep: v,
      title: game.i18n.format("SS1E.Dialog.TraitRollTitle",
              { trait: game.i18n.localize(SS1E.traits[key]) })
    });
  }
  async _rollKnack(el) {
    const item = this.actor.items.get(el.dataset.itemId);
    if (!item) return;
    return this._promptKnackRoll(item);
  }
  /**
   * Open the knack roll dialog for `item` (with its last-saved settings) and
   * persist whatever trait/advantage settings the user picked back to it.
   */
  async _promptKnackRoll(item, { title } = {}) {
    const r = item.getKnackRoll();
    if (!r) return;
    const result = await promptRollAndKeep({
      actor: this.actor,
      defaultRoll: r.roll, defaultKeep: r.keep,
      knack: item.name,
      trait: r.trait,
      baseRank: item.system.rank || 0,
      defaultAdvKept: item.system.advKept || 0,
      defaultAdvUnkept: item.system.advUnkept || 0,
      defaultAdvPips: item.system.advPips || 0,
      defaultFreeRaises: 0,
      title: title || game.i18n.format("SS1E.Dialog.KnackRollTitle", { knack: item.name })
    });

    // Save the selected trait and advantage dice back to the item so it remembers it for next time
    if (result) {
      const updates = {};
      if (result.trait && result.trait !== item.system.trait) updates["system.trait"] = result.trait;
      if (result.advKept !== undefined && result.advKept !== item.system.advKept) updates["system.advKept"] = result.advKept;
      if (result.advUnkept !== undefined && result.advUnkept !== item.system.advUnkept) updates["system.advUnkept"] = result.advUnkept;
      if (result.advPips !== undefined && result.advPips !== item.system.advPips) updates["system.advPips"] = result.advPips;

      if (!foundry.utils.isEmpty(updates)) {
        await item.update(updates);
      }
    }

    return result;
  }
  /**
   * Open a popup with a large textarea for a weapon row's notes. The row cell
   * only shows what fits; the full text lives here. Saving updates the row.
   */
  async _weaponNotesEdit(el) {
    const idx = parseInt(el.dataset.row || "0");
    const rows = this.actor.system.weapons?.rows;
    const row = rows?.[idx];
    if (!row) return;
    const current = foundry.utils.escapeHTML(row.notes || "");
    const title = game.i18n.format("SS1E.Dialog.WeaponNotesTitle", {
      weapon: row.name || game.i18n.localize("SS1E.UI.Weapons")
    });
    return new Promise((resolve) => {
      new Dialog({
        title,
        content: `<form><textarea name="notes" style="width: 100%; min-height: 220px; resize: vertical;">${current}</textarea></form>`,
        buttons: {
          save: {
            label: game.i18n.localize("SS1E.Dialog.Save"),
            callback: async (html) => {
              const val = html.find('textarea[name="notes"]').val() ?? "";
              const newRows = foundry.utils.deepClone(this.actor.system.weapons?.rows ?? []);
              if (!newRows[idx]) return resolve(null);
              newRows[idx].notes = val;
              await this.actor.update({ "system.weapons.rows": newRows });
              resolve(val);
            }
          },
          cancel: {
            label: game.i18n.localize("SS1E.Dialog.Cancel"),
            callback: () => resolve(null)
          }
        },
        default: "save"
      }).render(true);
    });
  }
  /** Append a blank weapon row (two-line block) to the weapons table. */
  async _weaponAdd() {
    const rows = foundry.utils.deepClone(this.actor.system.weapons?.rows ?? []);
    rows.push({
      name: "", knack: "",
      atk1: { roll: 0, keep: 0 }, atk2: { roll: 0, keep: 0 },
      dmg1: { roll: 0, keep: 0, bonus: 0 }, dmg2: { roll: 0, keep: 0 },
      notes: "", range: "", shtMod: "", lngMod: "", reload: ""
    });
    return this.actor.update({ "system.weapons.rows": rows });
  }
  /**
   * Weapon-name click: roll the weapon's selected knack (attack) with that
   * knack's last-saved dialog settings, then immediately roll the weapon's
   * damage (XkY + flat bonus) in the same click.
   */
  async _rollWeaponAttack(el) {
    const rowIdx = parseInt(el.dataset.row || "0");
    const row = this.actor.system.weapons?.rows?.[rowIdx];
    if (!row) return;
    const knack = this.actor.items.get(row.knack);
    if (!knack || knack.type !== "knack") {
      return ui.notifications.warn(game.i18n.localize("SS1E.Notif.NoWeaponKnack"));
    }
    const attack = await this._promptKnackRoll(knack, {
      title: game.i18n.format("SS1E.Chat.WeaponAttack", { weapon: row.name || knack.name })
    });
    if (!attack) return; // dialog cancelled — no damage roll either

    // Each raise called on the attack adds one unkept die to the damage
    // roll; the dice engine converts overflow past 10 dice into kept dice.
    const raiseDice = Number(attack.raises) || 0;
    const dmg = row.dmg1 || {};
    let flavor = game.i18n.format("SS1E.Chat.WeaponDamage", { weapon: row.name || knack.name });
    if (raiseDice > 0) flavor += ` (${game.i18n.format("SS1E.Chat.RaiseDice", { n: raiseDice })})`;
    const damage = await rollAndKeep({
      actor: this.actor,
      roll:  (Number(dmg.roll) || 0) + raiseDice,
      keep:  Number(dmg.keep) || 0,
      bonus: Number(dmg.bonus) || 0,
      tn:    null,
      flavor
    });
    return { attack, damage };
  }
  async _rollWoundCheck() {
    const brawn = this.actor.getTrait("brawn");
    return promptRollAndKeep({
      actor: this.actor,
      defaultRoll: brawn, defaultKeep: brawn,
      title: game.i18n.format("SS1E.Chat.WoundCheckFor", { name: this.actor.name })
    });
  }
  async _rollComposureCheck() {
    const panache = this.actor.getTrait("panache");
    return promptRollAndKeep({
      actor: this.actor,
      defaultRoll: panache, defaultKeep: panache,
      title: game.i18n.format("SS1E.Chat.ComposureCheckFor", { name: this.actor.name })
    });
  }
  async _rollInitiative() {
    const result = await promptRollAndKeep({
      actor: this.actor,
      trait: "panache",
      baseRank: 0,
      defaultAdvKept: this.actor.system.initiative?.advKept || 0,
      defaultAdvUnkept: this.actor.system.initiative?.advUnkept || 0,
      defaultAdvPips: this.actor.system.initiative?.advPips || 0,
      defaultFreeRaises: 0,
      defaultExplode: false,
      title: game.i18n.format("SS1E.Chat.InitiativeFor", { name: this.actor.name })
    });
    
    if (result) {
      // Extract kept dice from the roll result (filter out discarded dice)
      const keptDice = result.roll.dice
        .flatMap(d => d.results)
        .filter(r => !r.discarded)
        .map(r => r.result)
        .sort((a, b) => a - b);

      await this.actor.update({
        "system.initiative.dice": result.usedRoll,
        "system.initiative.keep": result.usedKeep,
        "system.initiative.trait": result.trait,
        "system.initiative.advKept": result.advKept,
        "system.initiative.advUnkept": result.advUnkept,
        "system.initiative.advPips": result.advPips,
        "system.initiative.keptDice": keptDice
      });
    }
  }
  async _rollDefense(el) {
    const idx = Number(el.dataset.row || "0");
    const def = this.actor.system.defense?.rows?.[idx];
    if (!def) return;
    const wits = this.actor.getTrait("wits");
    const act  = Number(def.active) || 0;
    return promptRollAndKeep({
      actor: this.actor,
      defaultRoll: wits + act, defaultKeep: wits,
      title: game.i18n.format("SS1E.Dialog.DefenseRollTitle", { defense: def.label || "?" })
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Drama Dice +/-                                                     */
  /* ------------------------------------------------------------------ */
  async _dramaAdjust(el) {
    const delta = Number(el.dataset.delta || 0);
    const cur   = this.actor.system.resources?.dramaDice?.value ?? 0;
    const max   = this.actor.system.resources?.dramaDice?.max   ?? 0;
    const next  = Math.max(0, Math.min(max, cur + delta));
    if (next !== cur) await this.actor.update({ "system.resources.dramaDice.value": next });
  }

  /* ------------------------------------------------------------------ */
  /*  Font scale +/-                                                     */
  /* ------------------------------------------------------------------ */
  async _fontAdjust(el) {
    const delta = Number(el.dataset.delta || 0);
    const cur   = Number(this.actor.system?.uiPrefs?.fontScale) || 1.0;
    const next  = Math.max(0.6, Math.min(2.0, +(cur + delta * 0.1).toFixed(2)));
    if (next === cur) return;
    this.element[0].style.setProperty("--ss1e-font-scale", String(next));
    await this.actor.update({ "system.uiPrefs.fontScale": next });
  }

  /* ------------------------------------------------------------------ */
  /*  Items                                                              */
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
    const [item] = await Item.create([{ name, type: "advantage", system: { isFlaw: true } }], { parent: this.actor });
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
  async _confirmDeleteItem(el, kindKey) {
    const itemId = el.dataset.itemId || el.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    const label = game.i18n.localize(`SS1E.ItemType.${kindKey[0].toUpperCase() + kindKey.slice(1)}`);
    const ok = await Dialog.confirm({
      title: game.i18n.localize("SS1E.UI.ConfirmDeleteTitle"),
      content: `<p>${game.i18n.format("SS1E.UI.ConfirmDeleteBody", { type: label, name: item.name })}</p>`,
      defaultYes: false
    });
    if (ok) return item.delete();
  }
  async _confirmDeleteSkill(el) {
    const skillId = el.dataset.itemId || el.closest("[data-item-id]")?.dataset.itemId;
    const skill = this.actor.items.get(skillId);
    if (!skill) return;
    const linked = this.actor.items.filter(i => i.type === "knack" && i.system.skillId === skillId);
    const list = linked.length
      ? `<p>${game.i18n.format("SS1E.UI.SkillDeleteKnacks", { n: linked.length })}</p>
         <ul>${linked.map(k => `<li>${k.name}</li>`).join("")}</ul>` : "";
    const ok = await Dialog.confirm({
      title: game.i18n.localize("SS1E.UI.ConfirmDeleteTitle"),
      content: `<p>${game.i18n.format("SS1E.UI.ConfirmDeleteBody",
                  { type: game.i18n.localize("SS1E.ItemType.Skill"), name: skill.name })}</p>${list}`,
      defaultYes: false
    });
    if (!ok) return;
    return this.actor.deleteEmbeddedDocuments("Item", [skillId, ...linked.map(k => k.id)]);
  }

  /* ------------------------------------------------------------------ */
  /*  Defense row management                                             */
  /* ------------------------------------------------------------------ */
  async _defenseAdd() {
    const rows = [...(this.actor.system.defense?.rows ?? [])];
    rows.push({ label: game.i18n.localize("SS1E.UI.NewDefense"), passive: 5, active: 0 });
    return this.actor.update({ "system.defense.rows": rows });
  }
  async _defenseDelete(el) {
    const idx = Number(el.dataset.row);
    if (idx < 8) return ui.notifications.warn(game.i18n.localize("SS1E.Notif.DefaultDefenseLocked"));
    const rows = [...(this.actor.system.defense?.rows ?? [])];
    const target = rows[idx];
    if (!target) return;
    const ok = await Dialog.confirm({
      title: game.i18n.localize("SS1E.UI.ConfirmDeleteTitle"),
      content: `<p>${game.i18n.format("SS1E.UI.ConfirmDeleteBody",
                  { type: game.i18n.localize("SS1E.UI.Defense"),
                    name: target.label || `#${idx + 1}` })}</p>`,
      defaultYes: false
    });
    if (!ok) return;
    rows.splice(idx, 1);
    return this.actor.update({ "system.defense.rows": rows });
  }
  async _defenseEdit(el) {
    const idx = Number(el.dataset.row);
    if (isNaN(idx)) return;
    
    // Fallback to finding the label directly next to the button if closest fails
    const container = el.closest('.defense-row-cell');
    if (!container) return;
    
    if (idx < 8) return ui.notifications.warn(game.i18n.localize("SS1E.Notif.DefaultDefenseLocked"));
    const label = container.querySelector(".defense-label");
    if (!label) return;
    const cur = this.actor.system.defense?.rows?.[idx]?.label ?? "";
    const input = document.createElement("input");
    input.type = "text";
    input.value = cur;
    input.className = "defense-label-input";
    label.replaceWith(input);
    input.focus();
    input.select();
    const commit = async () => {
      const rows = [...(this.actor.system.defense?.rows ?? [])];
      if (rows[idx]) {
        rows[idx] = { ...rows[idx], label: input.value };
        await this.actor.update({ "system.defense.rows": rows });
      }
    };
    input.addEventListener("blur", commit, { once: true });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); input.blur(); }
      if (e.key === "Escape"){ e.preventDefault(); input.value = cur; input.blur(); }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  XP Log                                                             */
  /* ------------------------------------------------------------------ */
  async _xpLogAdd() {
    const entries = [...(this.actor.system.xpLog?.entries ?? [])];
    entries.push({ label: "", amount: 0 });
    return this.actor.update({ "system.xpLog.entries": entries });
  }
  async _xpLogDelete(el) {
    const idx = Number(el.dataset.row);
    const entries = [...(this.actor.system.xpLog?.entries ?? [])];
    entries.splice(idx, 1);
    return this.actor.update({ "system.xpLog.entries": entries });
  }

  /* ------------------------------------------------------------------ */
  /*  Form submission — propagate skill renames to the underlying items  */
  /* ------------------------------------------------------------------ */
  async _updateObject(event, formData) {
    const renames = [];
    this.element.find(".skill-title-input[data-item-id]").each((_, input) => {
      const id = input.dataset.itemId;
      const item = this.actor.items.get(id);
      if (item && item.name !== input.value && input.value.trim()) {
        renames.push(item.update({ name: input.value }));
      }
    });
    if (renames.length) await Promise.all(renames);

    // Reconstruct arrays for Foundry V10+ compatibility
    const expanded = foundry.utils.expandObject(formData);
    const arrayPaths = [
      "system.defense.rows",
      "system.reputation.entries",
      "system.backgrounds.rows",
      "system.accoutrements.rows",
      "system.wealth.rows",
      "system.contacts.rows",
      "system.languages.rows",
      "system.weapons.rows",
      "system.xpLog.entries"
    ];

    for (const path of arrayPaths) {
      const formValue = foundry.utils.getProperty(expanded, path);
      // If the form has any data for this path, formValue will be an object with numeric keys
      if (formValue !== undefined && !Array.isArray(formValue)) {
        const existingArray = foundry.utils.getProperty(this.actor, path) || [];
        const newArray = foundry.utils.deepClone(existingArray);
        
        for (const [key, val] of Object.entries(formValue)) {
          const idx = Number(key);
          if (!isNaN(idx) && idx >= 0 && idx < newArray.length) {
            if (typeof val === 'object' && val !== null) {
              foundry.utils.mergeObject(newArray[idx], val);
            } else {
              newArray[idx] = val;
            }
          }
        }
        
        // Remove the dot-notation keys from formData so they don't override our array
        for (const key of Object.keys(formData)) {
          if (key.startsWith(path + ".") || key.startsWith(path + "[")) {
            delete formData[key];
          }
        }
        // Set the full array in formData
        formData[path] = newArray;
      }
    }

    return super._updateObject(event, formData);
  }
}
