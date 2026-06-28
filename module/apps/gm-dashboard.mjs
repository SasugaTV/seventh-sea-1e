/**
 * 7th Sea 1e — GM Dashboard Application
 * Port of My7thSeaGMScreen.html → FoundryVTT Application.
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

/**
 * Main GM Dashboard Application class.
 * Opens as a pop-out window (works on v12–v14).
 */
export class SeventhSeaGMDashboard extends Application {
  static get defaultOptions() {
    return {
      id: "seventh-sea-gm-dashboard",
      title: game.i18n.localize("SS1E.Dashboard.Title"),
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
    }
  }

  _onRollableClick(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const action = el.dataset.action;

    if (action === "roll-trait") {
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
      case "drama-adjust":      return this._dramaAdjust(el.dataset.delta);
      case "xp-adjust":         return this._xpAdjust(el.dataset.delta);
      case "add-player":        return this._addPlayer();
      case "remove-player":     return this._removePlayer();
      case "update-player":     return this._updatePlayer(el);
      case "update-player-init": return this._updatePlayerInit(el);
      case "add-tile":          return this._addTile(el.dataset.tileType);
      case "delete-tile":       return this._deleteTile(el.dataset.tileId);
      case "update-tile-title": return this._updateTileField(el.dataset.tileId, "title", el.value);
      case "update-tile-field": return this._updateTileField(el.dataset.tileId, el.dataset.field, el.value ?? el.checked);
      case "fill-clock":        return this._fillClock(el.dataset.tileId, el.dataset.amount);
      case "change-clock-slices": return this._changeClockSlices(el.dataset.tileId, el.dataset.amount);
      case "roll-brute":        return this._rollBrute(el.dataset.tileId);
      case "roll-henchman-init": return this._rollHenchmanInit(el.dataset.tileId);
      case "update-henchman-stat": return this._updateHenchmanStat(el.dataset.tileId, el.dataset.stat, el.value);
      case "adjust-brute-count": return this._adjustBruteCount(el.dataset.tileId, el.dataset.amount);
      case "toggle-note":       return this._toggleNoteBox(el.dataset.tileId);
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

  async _rollBrute(id) {
    const tile = this.state.tiles.find(t => t.id === id);
    if (!tile || tile.type !== "brute") return;

    const count = parseInt(tile.count) || 0;
    const kept = parseInt(tile.threat) || 0;
    const weaponDmg = parseInt(tile.weaponDamage) || 6;
    const targetTn = parseInt(tile.targetTn) || 15;
    const explode = !!tile.explode;

    if (count === 0) {
      ui.notifications.warn(game.i18n.localize("SS1E.Dashboard.NoBrutesLeft"));
      return;
    }

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
      <div style="padding:8px;background:#333333;border:1px solid #555;border-radius:4px;font-size:13px;color:#ccc;">
        <strong>Attack Results:</strong><br>
        Dice: ${diceDisplay}<br>
        Kept (top ${kept}): ${keptDice.join(", ")} → Total: <strong>${finalRollTotal}</strong><br>
        TN: ${targetTn} | Hits: <strong>${totalHits}</strong> | Damage: <strong>${totalDamage}</strong>
      </div>
    `;

    await ChatMessage.create({
      user: game.user.id,
      content: resultHTML,
      whisper: [game.user.id],
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });

    // Update state with roll result
    tile.rollResult = {
      hits: totalHits,
      damage: totalDamage,
      totalRoll: finalRollTotal,
      dice: initialRolls
    };
    saveState(this.state);
  }

  _buildBruteFormula(initialRolls, kept) {
    let formula = "";
    const keptDice = initialRolls.slice(-Math.min(kept, initialRolls.length));
    for (const die of keptDice) {
      formula += `${die.total}d10k0 + `;
    }
    return formula.replace(/ \+ $/, "") || "0";
  }

  async _rollTrait(el) {
    const trait = el.dataset.trait;
    const formula = `2d10kh`;
    const roll = new Roll(formula);
    await roll.evaluate({ async: true });
    await roll.toMessage({
      user: game.user.id,
      flavor: `Rolling ${trait} trait`,
      speaker: ChatMessage.getSpeaker({ actor: null })
    });
  }

  async _rollKnack(el) {
    const knack = el.dataset.knack;
    const formula = `3d10kh`;
    const roll = new Roll(formula);
    await roll.evaluate({ async: true });
    await roll.toMessage({
      user: game.user.id,
      flavor: `Rolling ${knack} knack`,
      speaker: ChatMessage.getSpeaker({ actor: null })
    });
  }

  async _rollInitiative() {
    const roll = new Roll("1d10");
    await roll.evaluate({ async: true });
    const result = roll.results[0].result;
    await roll.toMessage({
      user: game.user.id,
      flavor: `Rolling Initiative`,
      speaker: ChatMessage.getSpeaker({ actor: null })
    });
  }

  _onClockSliceClick(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const sliceIndex = parseInt(el.dataset.sliceIndex);
    const tileId = el.closest(".clock-container")?.dataset.tileId;
    if (!tileId) return;
    const tile = this.state.tiles.find(t => t.id === tileId);
    if (!tile) return;
    if (sliceIndex < (tile.filled || 0)) {
      tile.filled = sliceIndex;
    } else {
      tile.filled = sliceIndex + 1;
    }
    saveState(this.state);
    this._render();
  }

  _onDieRemove(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const tileId = el.dataset.tileId;
    const dieIndex = parseInt(el.dataset.dieIndex);
    const tile = this.state.tiles.find(t => t.id === tileId);
    if (!tile) return;
    if (tile.initRolls && tile.initRolls.length > 0) {
      tile.initRolls.splice(dieIndex, 1);
      saveState(this.state);
      this._renderPhaseBoard();
    }
  }

  /* ── Import / Reset ──────────────────────── */

  async _importCharacters() {
    const heroes = game.actors.filter(a => a.type === "hero" && a.permission >= CONST.DOCUMENT_OWNERSHIP_LIMIT.NONE);
    if (heroes.length === 0) {
      ui.notifications.warn(game.i18n.localize("SS1E.Dashboard.NoHeroes"));
      return;
    }
    for (const hero of heroes) {
      const exists = this.state.players.find(p => p.id === hero.id);
      if (!exists) {
        this.state.players.push({
          id: hero.id,
          name: hero.name,
          diceString: String(hero.system.initiative?.value ?? 0)
        });
      }
    }
    saveState(this.state);
    this._renderPhaseBoard();
    ui.notifications.info(game.i18n.format("SS1E.Dashboard.ImportedChars", { n: heroes.length }));
  }

  _resetDashboard() {
    if (!ui.dialogs?.first) {
      // Fallback for older Foundry versions
      if (confirm(game.i18n.localize("SS1E.Dashboard.ResetConfirm"))) {
        this.state = structuredClone(DEFAULT_STATE);
        saveState(this.state);
        this._render();
      }
      return;
    }
    ui.dialogs.prompt({
      title: game.i18n.localize("SS1E.Dashboard.ResetConfirm"),
      content: `<p>${game.i18n.localize("SS1E.Dashboard.ResetConfirm")}</p>`,
      buttons: {
        yes: {
          label: "Yes",
          callback: () => {
            this.state = structuredClone(DEFAULT_STATE);
            saveState(this.state);
            this._render();
          }
        },
        no: { label: "No" }
      },
      default: "no"
    });
  }
}
