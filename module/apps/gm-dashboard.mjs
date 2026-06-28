/**
 * 7th Sea 1e — GM Dashboard SidebarApp
 * Port of My7thSeaGMScreen.html → FoundryVTT SidebarApp.
 * All layout / button behavior identical to the original.
 * Rolls use FoundryVTT Roll class → chat messages.
 */
import { rollAndKeep } from "../dice/roll-and-keep.mjs";

const SAVE_KEY = "seventhSea1eGMState";

const DEFAULT_STATE = {
  dramaDice: 3,
  xp: 0,
  players: [{ id: "p_1", name: "Player 1", diceString: "" }],
  tiles: []
};

function loadState() {
  const raw = game.settings.get("seventh-sea-1e", SAVE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (_) { /* fall through */ }
  }
  return structuredClone(DEFAULT_STATE);
}

function saveState(state) {
  game.settings.set("seventh-sea-1e", SAVE_KEY, JSON.stringify(state));
}

/* ─────────────────────────────────────────────
   SidebarApp
   ───────────────────────────────────────────── */
export class SeventhSeaGMDashboard extends Application {
  static get defaultOptions() {
    return {
      id: "seventh-sea-gm-dashboard",
      title: "7th Sea GM Dashboard",
      template: "systems/seventh-sea-1e/templates/apps/gm-dashboard.html",
      width: 960,
      height: "auto",
      scale: 1,
      minimizable: true,
      resizable: true,
      dragDrop: [],
      popOut: true,
      closeOtherSiblings: false,
      tabs: { flavor: "nav-tabs", navigation: false },
      window: {
        startMaximized: false
      }
    };
  }

  state;

  async getData() {
    this.state = loadState();
    return {
      state: this.state,
      characterNames: this._getCharacterNames()
    };
  }

  _getCharacterNames() {
    const names = [];
    for (const actor of game.actors.filter(a => a.type === "hero" && a.permission >= CONST.DOCUMENT_OWNERSHIP_LIMIT.NONE)) {
      names.push({ id: actor.id, name: actor.name });
    }
    return names;
  }

  /* ── Rendering hooks ─────────────────────── */

  activateListeners(html) {
    super.activateListeners(html);
    html[0].querySelectorAll(".ss1e-dot-tracker").forEach(el => {
      el.querySelectorAll(".dot").forEach(dot => {
        dot.addEventListener("click", (ev) => this._onDotClick(ev, el));
      });
    });
    html[0].querySelectorAll(".ss1e-rollable").forEach(el => {
      el.addEventListener("click", (ev) => this._onRollableClick(ev));
    });
    html[0].querySelectorAll("[data-action]").forEach(el => {
      el.addEventListener("click", (ev) => this._onAction(ev));
    });
    html[0].querySelectorAll("[data-action='toggle-clock-note']")
      .forEach(el => el.addEventListener("click", (ev) => this._onAction(ev)));
    html[0].querySelectorAll(".clock-slice").forEach(el => {
      el.addEventListener("click", (ev) => this._onClockSliceClick(ev));
    });
    html[0].querySelectorAll(".init-die").forEach(el => {
      el.addEventListener("click", (ev) => this._onDieRemove(ev));
    });
  }

  _onDotClick(event, tracker) {
    event.preventDefault();
    const path = tracker.dataset.path;
    if (!path) return;
    const itemId = tracker.dataset.itemId ?? null;
    const value = parseInt(event.currentTarget.dataset.value) ?? 0;
    const current = parseInt(tracker.dataset.current ?? "0") ?? 0;
    const next = (current === value) ? 0 : value;

    if (itemId) {
      const item = game.actors.get(itemId.split("|")[0])?.items.get(itemId.split("|")[1]);
      if (item) {
        item.update({ [path]: next }).then(() => { this._render(); });
      }
    } else {
      // Not supported in dashboard context (dot-trackers for actor items only)
    }
  }

  _onRollableClick(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const action = el.dataset.action;

    if (action === "roll-trait") {
      const trait = el.dataset.trait;
      this._rollTrait(el);
    }
    if (action === "roll-knack") {
      this._rollKnack(el);
    }
    if (action === "roll-initiative") {
      this._rollInitiative();
    }
  }

  async _onAction(event) {
    const el = event.currentTarget;
    const action = el.dataset.action;
    event.preventDefault();
    event.stopPropagation();

    switch (action) {
      // Global
      case "drama-adjust":      return this._dramaAdjust(el.dataset.delta);
      case "xp-adjust":         return this._xpAdjust(el.dataset.delta);
      // Player rows
      case "add-player":        return this._addPlayer();
      case "remove-player":     return this._removePlayer();
      case "update-player":     return this._updatePlayer(el);
      case "update-player-init": return this._updatePlayerInit(el);
      // Tiles
      case "add-tile":          return this._addTile(el.dataset.tileType);
      case "delete-tile":       return this._deleteTile(el.dataset.tileId);
      case "update-tile-title": return this._updateTileField(el.dataset.tileId, "title", el.value);
      case "update-tile-field": return this._updateTileField(el.dataset.tileId, el.dataset.field, el.value ?? el.checked);
      case "fill-clock":        return this._fillClock(el.dataset.tileId, el.dataset.amount);
      case "change-clock-slices": return this._changeClockSlices(el.dataset.tileId, el.dataset.amount);
      case "roll-brute":        return this._rollBrute(el.dataset.tileId);
      case "roll-henchman-init":return => this._rollHenchmanInit(el.dataset.tileId);
      case "update-henchman-stat": return this._updateHenchmanStat(el.dataset.tileId, el.dataset.stat, el.value);
      case "adjust-brute-count": return this._adjustBruteCount(el.dataset.tileId, el.dataset.amount);
      case "toggle-note":       return this._toggleNoteBox(el.dataset.tileId);
      // Misc
      case "import-characters": return this._importCharacters();
      case "reset-dashboard":   return this._resetDashboard();
    }
  }

  /* ── Global Trackers ─────────────────────── */

  _dramaAdjust(delta) {
    this.state.dramaDice = Math.max(0, this.state.dramaDice + parseInt(delta));
    saveState(this.state);
    this._render();
  }

  _xpAdjust(delta) {
    this.state.xp = Math.max(0, this.state.xp + parseInt(delta));
    saveState(this.state);
    this._render();
  }

  /* ── Player Rows ─────────────────────────── */

  _addPlayer() {
    const id = "p_" + Date.now();
    const next = this.state.players.length + 1;
    this.state.players.push({ id, name: `Player ${next}`, diceString: "" });
    saveState(this.state);
    this._render();
  }

  _removePlayer() {
    if (this.state.players.length <= 1) return;
    this.state.players.pop();
    saveState(this.state);
    this._render();
  }

  _updatePlayer(el) {
    const id = el.dataset.playerId;
    const field = el.dataset.field;
    const player = this.state.players.find(p => p.id === id);
    if (!player) return;
    player[field] = el.value;
    saveState(this.state);
    this._renderPhaseBoard();
  }

  _updatePlayerInit(el) {
    const id = el.dataset.playerId;
    const player = this.state.players.find(p => p.id === id);
    if (!player) return;
    player.diceString = el.value;
    saveState(this.state);
    const feedback = el.closest(".player-row")?.querySelector(".parsed-feedback");
    if (feedback) {
      const phases = this._parseMagicDiceString(player.diceString);
      feedback.textContent = phases.length ? `Phases: ${phases.join(", ")}` : "Phases: -";
    }
    this._renderPhaseBoard();
  }

  _parseMagicDiceString(str) {
    if (!str) return [];
    const clean = str.replace(/[^0-9]/g, "");
    return [...clean].map(c => { const n = parseInt(c); return n === 0 ? 10 : n; });
  }

  /* ── Phase Board ─────────────────────────── */

  _renderPhaseBoard() {
    const slots = {};
    for (let i = 0; i <= 10; i++) slots[i] = [];

    // NPCs
    this.state.tiles.forEach(tile => {
      if (tile.type === "brute" || tile.type === "henchman") {
        if (!tile.initRolls || tile.initRolls.length === 0 || tile.initValue === 0
            || (tile.type === "brute" && tile.count === 0)) {
          slots[0].push({ name: tile.title, sum: 0, isPlayer: false });
        } else {
          tile.initRolls.forEach(val => {
            if (val >= 1 && val <= 10) {
              const totalPoolSum = tile.initRolls.reduce((a, b) => a + b, 0);
              slots[val].push({ name: tile.title, sum: totalPoolSum, isPlayer: false });
            }
          });
        }
      }
    });

    // Players
    this.state.players.forEach(player => {
      const phases = this._parseMagicDiceString(player.diceString);
      if (phases.length === 0) {
        slots[0].push({ name: player.name, sum: 0, isPlayer: true });
      } else {
        const total = phases.reduce((a, b) => a + b, 0);
        phases.forEach(val => {
          if (val >= 1 && val <= 10) {
            slots[val].push({ name: player.name, sum: total, isPlayer: true });
          }
        });
      }
    });

    // Sort each slot by total descending
    for (const i of Object.keys(slots)) {
      slots[i].sort((a, b) => b.sum - a.sum);
    }

    const el = this.element?.[0]?.querySelector("#top-phase-board");
    if (!el) return;

    let gridHTML = "";
    for (let i = 0; i <= 10; i++) {
      const blocks = slots[i].map(ent =>
        `<span class="slot-entity-tag ${ent.isPlayer ? "player-tag" : ""}">${ent.name}</span>`
      ).join("");
      gridHTML += `<div class="init-column"><div class="column-header">${i}</div><div class="column-body">${blocks}</div></div>`;
    }
    el.innerHTML = `<div class="master-init-header">Round Timeline Matrix (0 - 10)</div><div class="master-init-grid">${gridHTML}</div>`;
  }

  /* ── Tiles ───────────────────────────────── */

  _addTile(type) {
    let displayTitle = type.charAt(0).toUpperCase() + type.slice(1);
    let numericIndex = null;

    if (type === "brute") {
      numericIndex = this._getLowestAvailableIndex("brute");
      displayTitle = `Brute Squad ${numericIndex}`;
    } else if (type === "henchman") {
      numericIndex = this._getLowestAvailableIndex("henchman");
      displayTitle = `Henchman ${numericIndex}`;
    }

    const newTile = {
      id: "tile_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      type, title: displayTitle, numericIndex,
      notes: "", hasNoteBox: type === "notepad"
    };

    if (type === "clock") {
      newTile.slices = 4;
      newTile.filled = 0;
    } else if (type === "brute") {
      newTile.count = 6;
      newTile.threat = 4;
      newTile.weaponDamage = 6;
      newTile.targetTn = 15;
      newTile.explode = false;
      newTile.rollResult = null;
      newTile.initValue = 4;
      newTile.initRolls = [];
    } else if (type === "henchman") {
      newTile.stats = { Brawn: 2, Finesse: 2, Wits: 2, Resolve: 2, Panache: 2 };
      newTile.flesh = 0;
      newTile.dramatic = 0;
      newTile.hasNoteBox = true;
      newTile.initValue = 2;
      newTile.initRolls = [];
    }

    this.state.tiles.push(newTile);
    saveState(this.state);
    this._render();
  }

  _deleteTile(id) {
    this.state.tiles = this.state.tiles.filter(t => t.id !== id);
    saveState(this.state);
    this._render();
  }

  _updateTileField(id, field, value) {
    const tile = this.state.tiles.find(t => t.id === id);
    if (!tile) return;
    if (tile.type === "brute") {
      if (field === "threat") {
        tile.threat = parseInt(value) || 0;
        tile.initValue = tile.threat;
        if (tile.threat > tile.count) tile.count = tile.threat;
      }
      if (field === "count") {
        tile.count = parseInt(value) || 0;
        if (tile.count < tile.threat) {
          tile.threat = tile.count;
          tile.initValue = tile.threat;
        }
      }
      if (["title", "initValue", "explode", "weaponDamage", "targetTn"].includes(field)) {
        tile[field] = value;
      }
    } else {
      tile[field] = value;
    }
    saveState(this.state);
    this._render();
  }

  _getLowestAvailableIndex(type) {
    const active = this.state.tiles
      .filter(t => t.type === type)
      .map(t => t.numericIndex)
      .filter(i => i !== null);
    let check = 1;
    while (active.includes(check)) check++;
    return check;
  }

  _adjustBruteCount(id, delta) {
    const tile = this.state.tiles.find(t => t.id === id);
    if (!tile || tile.type !== "brute") return;
    tile.count = Math.max(0, (tile.count || 0) + parseInt(delta));
    if (tile.count < tile.threat) {
      tile.threat = tile.count;
      tile.initValue = tile.threat;
    }
    saveState(this.state);
    this._render();
  }

  _changeClockSlices(id, delta) {
    const tile = this.state.tiles.find(t => t.id === id);
    if (!tile || tile.type !== "clock") return;
    tile.slices = Math.max(2, Math.min(12, tile.slices + parseInt(delta)));
    if (tile.filled > tile.slices) tile.filled = tile.slices;
    saveState(this.state);
    this._render();
  }

  _fillClock(id, delta) {
    const tile = this.state.tiles.find(t => t.id === id);
    if (!tile || tile.type !== "clock") return;
    tile.filled = Math.max(0, Math.min(tile.slices, tile.filled + parseInt(delta)));
    saveState(this.state);
    this._render();
  }

  _toggleNoteBox(id) {
    const tile = this.state.tiles.find(t => t.id === id);
    if (!tile) return;
    tile.hasNoteBox = !tile.hasNoteBox;
    saveState(this.state);
    this._render();
  }

  _updateHenchmanStat(id, stat, value) {
    const tile = this.state.tiles.find(t => t.id === id);
    if (!tile || !tile.stats) return;
    tile.stats[stat] = parseInt(value) || 0;
    saveState(this.state);
    this._render();
  }

  _rollHenchmanInit(id) {
    const tile = this.state.tiles.find(t => t.id === id);
    if (!tile) return;
    const count = parseInt(tile.initValue) || 0;
    const results = [];
    for (let i = 0; i < count; i++) results.push(Math.floor(Math.random() * 10) + 1);
    results.sort((a, b) => a - b);
    tile.initRolls = results;
    saveState(this.state);
    this._render();
  }

  /* ── Roll Helpers (FoundryVTT integration) ─ */

  /**
   * Brute squad attack roll — ported from the original.
   * Rolls count dice with roll-and-keep, explodes 10s, applies weapon damage.
   * Posts result to Foundry chat as a roll message.
   */
  async _rollBrute(id) {
    const tile = this.state.tiles.find(t => t.id === id);
    if (!tile || tile.type !== "brute") return;

    const count = parseInt(tile.count) || 0;
    const kept = parseInt(tile.threat) || 0;
    const weaponDmg = parseInt(tile.weaponDamage) || 6;
    const targetTn = parseInt(tile.targetTn) || 15;
    const explode = !!tile.explode;

    if (count === 0) {
      ui.notifications.warn("No Brutes left to roll!");
      return;
    }

    // Simulate the original's roll logic using Foundry's Roll class
    let initialRolls = [];
    let pool = [];

    for (let i = 0; i < count; i++) {
      const die = new Roll("1d10");
      await die.evaluate({ async: true });
      let r = die.results[0].result;
      let totalForDie = r;
      let steps = [r];

      if (explode && r === 10) {
        while (r === 10) {
          const extra = new Roll("1d10");
          await extra.evaluate({ async: true });
          r = extra.results[0].result;
          totalForDie += r;
          steps.push(r);
        }
      }

      initialRolls.push({ total: totalForDie, display: steps.length > 1 ? `(${steps.join("+")})` : `${totalForDie}` });
      pool.push(totalForDie);
    }

    pool.sort((a, b) => b - a);
    const keptDice = pool.slice(0, Math.min(kept, pool.length));
    const finalRollTotal = keptDice.reduce((a, b) => a + b, 0);

    let totalHits = 0;
    if (finalRollTotal >= targetTn) {
      const roundedRoll = Math.floor(finalRollTotal / 10) * 10;
      const netMargin = roundedRoll - targetTn;
      totalHits = Math.floor(netMargin / 5);
    }
    const totalDamage = totalHits * weaponDmg;

    // Post to Foundry chat
    const formula = this._buildBruteFormula(initialRolls, kept);
    const roll = new Roll(formula);
    await roll.evaluate({ async: true });

    await roll.toMessage({
      user: game.user.id,
      flavor: `⚔️ ${tile.title} Attack Roll`,
      speaker: ChatMessage.getSpeaker({ actor: null })
    });

    // Also show the detailed breakdown as a follow-up message
    const diceDisplay = initialRolls.map(d => d.display).join(", ");
    const resultHTML = `
      <strong>Dice Pool:</strong> ${diceDisplay}<br>
      <strong>Kept Total:</strong> ${finalRollTotal} (Kept top ${kept})<br>
      <strong>Hits Generated:</strong> ${totalHits} <span style="color:#48bb78;">(Beats TN by ${finalRollTotal >= targetTn ? finalRollTotal - targetTn : 0})</span><br>
      <strong style="color:#f6e05e;">Total Damage Inflicted: ${totalDamage}</strong>
    `;

    await ChatMessage.create({
      user: game.user.id,
      content: resultHTML,
      speaker: ChatMessage.getSpeaker({ actor: null }),
      flavor: `${tile.title} — Attack Breakdown`
    });

    tile.rollResult = resultHTML;
    saveState(this.state);
    this._render();
  }

  _buildBruteFormula(rolls, kept) {
    // Build a single formula string like "1d10+3d10 k<kept>" for Foundry
    const parts = rolls.map((_, i) => `1d10`);
    return `${parts.join("+")} k<${Math.min(kept, rolls.length)}>`;
  }

  async _rollTrait(el) {
    const trait = el.dataset.trait;
    const traitName = game.i18n.localize(CONFIG.SS1E?.traits?.[trait] || trait);
    const value = parseInt(el.dataset.value) || 0;
    const formula = `${value}d10k${value}`;

    const roll = new Roll(formula);
    await roll.evaluate({ async: true });

    await roll.toMessage({
      user: game.user.id,
      flavor: `Rolling ${traitName}: ${formula}`,
      speaker: ChatMessage.getSpeaker({ actor: null })
    });
  }

  async _rollKnack(el) {
    const knackName = el.dataset.knack || "Knack";
    const trait = el.dataset.trait || "Finesse";
    const rank = parseInt(el.dataset.rank) || 0;
    const advKept = parseInt(el.dataset.advKept) || 0;
    const advUnkept = parseInt(el.dataset.advUnkept) || 0;
    const advPips = parseInt(el.dataset.advPips) || 0;
    const freeRaises = parseInt(el.dataset.freeRaises) || 0;

    // Build formula: base + advKept + advPips + freeRaises
    const total = rank + advKept + advPips + freeRaises;
    const formula = total > 0 ? `${total}d10k${advKept}` : "0d10";

    const roll = new Roll(formula);
    await roll.evaluate({ async: true });

    await roll.toMessage({
      user: game.user.id,
      flavor: `Rolling ${knackName} (${trait}): ${formula}`,
      speaker: ChatMessage.getSpeaker({ actor: null })
    });
  }

  async _rollInitiative() {
    const formula = "2d10k1";
    const roll = new Roll(formula);
    await roll.evaluate({ async: true });

    await roll.toMessage({
      user: game.user.id,
      flavor: "General Initiative Roll",
      speaker: ChatMessage.getSpeaker({ actor: null })
    });
  }

  /* ── Clock SVG ───────────────────────────── */

  _getClockSVG(tile) {
    const total = tile.slices;
    let svgContent = "";

    for (let i = 0; i < total; i++) {
      const isFilled = i < tile.filled;
      const startAngle = (i * 360) / total;
      const endAngle = ((i + 1) * 360) / total;

      const rad1 = (startAngle * Math.PI) / 180;
      const rad2 = (endAngle * Math.PI) / 180;
      const x1 = 60 + 50 * Math.cos(rad1);
      const y1 = 60 + 50 * Math.sin(rad1);
      const x2 = 60 + 50 * Math.cos(rad2);
      const y2 = 60 + 50 * Math.sin(rad2);

      const longArc = (endAngle - startAngle) > 180 ? 1 : 0;
      const pathData = `M 60 60 L ${x1} ${y1} A 50 50 0 ${longArc} 1 ${x2} ${y2} Z`;

      svgContent += `<path d="${pathData}" class="clock-slice ${isFilled ? "filled" : ""}"></path>`;
    }
    return `<svg class="clock-svg" viewBox="0 0 120 120">${svgContent}</svg>`;
  }

  _onClockSliceClick(event) {
    const path = event.currentTarget;
    const tileEl = path.closest(".tile");
    if (!tileEl) return;
    const tile = this.state.tiles.find(t => t.id === tileEl.dataset.tileId);
    if (!tile || tile.type !== "clock") return;

    // Determine which slice was clicked by position
    const rect = path.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Check if this slice is currently filled
    const sliceIndex = parseInt(path.dataset.sliceIndex);
    if (isNaN(sliceIndex)) return;

    if (sliceIndex < tile.filled) {
      // Unfill this slice and all after it
      tile.filled = sliceIndex;
    } else {
      // Fill this slice and all before it
      tile.filled = sliceIndex + 1;
    }

    saveState(this.state);
    this._render();
  }

  _onDieRemove(event) {
    const dieEl = event.currentTarget;
    const tileEl = dieEl.closest(".tile");
    if (!tileEl) return;
    const tile = this.state.tiles.find(t => t.id === tileEl.dataset.tileId);
    if (!tile) return;

    const idx = parseInt(dieEl.dataset.dieIndex);
    if (isNaN(idx) || !tile.initRolls) return;
    tile.initRolls.splice(idx, 1);
    saveState(this.state);
    this._render();
  }

  /* ── Import Characters ───────────────────── */

  _importCharacters() {
    const heroes = game.actors.filter(a => a.type === "hero" && a.permission >= CONST.DOCUMENT_OWNERSHIP_LIMIT.NONE);
    if (heroes.length === 0) {
      ui.notifications.warn("No hero actors found to import.");
      return;
    }
    const existingNames = this.state.players.map(p => p.name);
    let added = 0;
    for (const actor of heroes) {
      if (!existingNames.includes(actor.name)) {
        const id = "p_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
        this.state.players.push({ id, name: actor.name, diceString: "" });
        existingNames.push(actor.name);
        added++;
      }
    }
    saveState(this.state);
    this._render();
    if (added > 0) {
      ui.notifications.info(`Imported ${added} character(s).`);
    }
  }

  _resetDashboard() {
    if (!confirm("Reset the entire GM Dashboard to defaults? This cannot be undone.")) return;
    this.state = structuredClone(DEFAULT_STATE);
    saveState(this.state);
    this._render();
  }

  /* ── Override render to hook phase board ─── */

  render(force = false, options = {}) {
    const result = super.render(force, options);
    if (result && !force) {
      // Render phase board after DOM is ready
      setTimeout(() => this._renderPhaseBoard(), 50);
    }
    return result;
  }
}
