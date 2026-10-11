/**
 * Foundry Combat driven by 7th Sea 1e Phases (a "Shadowrun pass" loop that counts up 1 -> 10).
 *
 * - combat.round is the Round; the Phase lives in flags.seventh-sea-1e.phase (0 = rolling Action Dice).
 * - Each Combatant keeps its Action Dice in flags.seventh-sea-1e.dice; its initiative is the
 *   Initiative Total, so Foundry's tracker shows the right number.
 * - Turn order is re-sorted for the current Phase, and whoever acts now is always at the top
 *   (turn 0). Next Turn spends their die; when nobody is left in a Phase, the next Phase in
 *   which anyone can act starts; after Phase 10 a new Round begins and everyone re-rolls.
 * - Every step snapshots the dice into flags.seventh-sea-1e.history so Previous Turn can undo it.
 * - All state changes run on the active GM; players' clients ask through a user query.
 */

import * as R from "./phase-rules.mjs";

export const SYS = "seventh-sea-1e";
const HISTORY = 30;
const QUERY = `${SYS}.phase`;

/** Panache drives the number of Action Dice and tie-breaks. Brute Squads use Threat Rating (GMG). */
export function actorPanache(actor) {
  if (!actor) return 0;
  if (actor.type === "brute") return Number(actor.system.threat) || 0;
  return Number(actor.getTrait?.("panache")) || 0;
}

/** Tie-break rank (house rule): Hero, Villain, Henchman (a Villain with the Henchman box ticked), Brute/Monster. */
export function actorRank(actor) {
  if (!actor) return R.RANK.other;
  if (actor.type === "villain") return actor.system.henchman ? R.RANK.henchman : R.RANK.villain;
  return R.RANK[actor.type] ?? R.RANK.other;
}

/** Plain rules entry for a Combatant. */
export function entryOf(c) {
  const f = c.flags?.[SYS] ?? {};
  return {
    id: c.id, name: c.name, defeated: c.isDefeated,
    panache: f.panache ?? actorPanache(c.actor),
    rank: actorRank(c.actor),
    rolledAt: f.rolledAt ?? null,
    dice: foundry.utils.deepClone(f.dice ?? []),
    passed: f.passed ?? null
  };
}

export class SeventhSeaCombat extends Combat {

  /** Current Phase: 0 while Action Dice are being rolled, then 1-10. */
  get phase() {
    return Number(this.flags?.[SYS]?.phase) || 0;
  }

  /** Sort for the current Phase so whoever acts now is first. */
  setupTurns() {
    this.turns ||= [];
    const phase = this.phase;
    const byId = new Map(this.combatants.contents.map(c => [c.id, c]));
    const turns = R.sortEntries(this.combatants.contents.map(entryOf), phase).map(e => byId.get(e.id));
    if (this.turn !== null) {
      if ((this.turn < 0) || (this.turn >= turns.length)) this.turn = 0;
      turns.forEach((c, i) => c.turnNumber = i);
    }
    this.current = this._getCurrentState(turns[this.turn]);
    if (!this.previous) this.previous = this.current;
    return this.turns = turns;
  }

  /* -------------------------------------------- */
  /*  State commit / undo                         */
  /* -------------------------------------------- */

  #snapshot() {
    const c = {};
    for (const cb of this.combatants) {
      const f = cb.flags?.[SYS] ?? {};
      c[cb.id] = { dice: f.dice ?? [], passed: f.passed ?? null, panache: f.panache ?? null, rolledAt: f.rolledAt ?? null };
    }
    return { round: this.round, phase: this.phase, c };
  }

  /**
   * Write Round, Phase and every Combatant's dice in one update, so Foundry re-sorts once and fires
   * its turn events (marker, sounds, hooks) for the new top of the order.
   */
  async #commit(round, phase, entries, { history = true } = {}) {
    if (!game.user.isGM) throw new Error("7th Sea | Phase changes must run on a GM client");
    const byId = new Map(entries.map(e => [e.id, e]));
    const combatants = this.combatants.map(cb => {
      const o = cb.toObject();
      const e = byId.get(cb.id);
      if (e) {
        o.flags ??= {};
        o.flags[SYS] = { ...(o.flags[SYS] ?? {}), dice: e.dice, passed: e.passed, panache: e.panache, rolledAt: e.rolledAt };
        o.initiative = e.dice.length ? R.unspentTotal(e.dice) : null;
      }
      return o;
    });
    const flags = { phase };
    if (history) flags.history = [...(this.flags?.[SYS]?.history ?? []), this.#snapshot()].slice(-HISTORY);
    return this.update({ round, turn: phase > 0 ? 0 : null, combatants, flags: { [SYS]: flags } }, { diff: false });
  }

  #entries() { return this.combatants.contents.map(entryOf); }

  /* -------------------------------------------- */
  /*  Turn flow (GM runs these; players are routed through the query)  */
  /* -------------------------------------------- */

  /** Begin: Round 1. If everyone already has dice, go straight to the first Phase. */
  async startCombat() {
    if (!game.user.isGM) return this;
    this._playCombatSound("startEncounter");
    Hooks.callAll("combatStart", this, { round: 1, turn: 0 });
    const entries = this.#entries();
    const allRolled = entries.length && entries.every(e => e.dice.length || e.defeated);
    const phase = allRolled ? (R.nextActivePhase(entries, 1) ?? 0) : 0;
    await this.#commit(1, phase, entries);
    return this;
  }

  /** The active actor acts: spend their die and move on. */
  async nextTurn() { return this.#endTurn("act"); }

  /** The active actor Holds: keep the die, sit out the rest of this Phase. */
  async holdTurn() { return this.#endTurn("hold"); }

  async #endTurn(mode) {
    if (!game.user.isGM) return this.#ask({ op: mode });
    if (this.round === 0) return this.startCombat();
    const entries = this.#entries();
    const phase = R.endTurn(entries, this.phase, mode);
    if (phase === null) return this.nextRound();
    await this.#commit(this.round, phase, entries);
    return this;
  }

  /** New Round: unspent dice are forfeited; everyone rolls again. */
  async nextRound() {
    if (!game.user.isGM) return this.#ask({ op: "nextRound" });
    const entries = this.#entries().map(e => ({ ...e, dice: [], passed: null, rolledAt: null }));
    await this.#commit(this.round + 1, 0, entries);
    // Clear the dice shown on Hero/Villain sheets so last Round's roll doesn't linger.
    for (const cb of this.combatants) {
      const a = cb.actor;
      if (a?.system.initiative?.keptDice?.length) await a.update({ "system.initiative.keptDice": [] });
    }
    return this;
  }

  /** Previous Turn / Previous Round: undo the last step. */
  async previousTurn() {
    if (!game.user.isGM) return this.#ask({ op: "undo" });
    const history = [...(this.flags?.[SYS]?.history ?? [])];
    const snap = history.pop();
    if (!snap) {
      ui.notifications.info(game.i18n.localize("SS1E.Combat.NothingToUndo"));
      return this;
    }
    const entries = this.combatants.contents.map(cb => {
      const e = entryOf(cb);
      const s = snap.c[cb.id];
      return s ? { ...e, dice: s.dice, passed: s.passed, panache: s.panache ?? e.panache, rolledAt: s.rolledAt ?? null } : e;
    });
    await this.#commit(snap.round, snap.phase, entries, { history: false });
    await this.setFlag(SYS, "history", history);
    return this;
  }
  async previousRound() { return this.previousTurn(); }

  /* -------------------------------------------- */
  /*  Dice                                        */
  /* -------------------------------------------- */

  /** Roll Action Dice (Panache, or Threat for Brute Squads), non-exploding d10s. */
  async rollInitiative(ids, { messageMode } = {}) {
    ids = typeof ids === "string" ? [ids] : ids;
    for (const id of ids) {
      const cb = this.combatants.get(id);
      if (!cb?.isOwner) continue;
      const actor = cb.actor;
      const n = actorPanache(actor);
      if (n < 1) {
        ui.notifications.warn(game.i18n.format("SS1E.Combat.NoPanache", { name: cb.name }));
        continue;
      }
      const roll = await new Roll(`${n}d10`).evaluate();
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor, token: cb.token, alias: cb.name }),
        flavor: game.i18n.format("SS1E.Combat.ActionDiceFor", { name: foundry.utils.escapeHTML(cb.name) }),
        flags: { "core.initiativeRoll": true }
      }, { messageMode: messageMode ?? (cb.hidden ? "gm" : undefined) });
      const values = roll.dice[0].results.map(r => r.result).sort((a, b) => a - b);
      await this.setDice(cb.id, values, n);
      if (actor?.system.initiative && actor.isOwner) await actor.update({ "system.initiative.keptDice": values });
    }
    return this;
  }

  /** Replace a Combatant's Action Dice. Owners may do this directly. */
  async setDice(combatantId, values, panache, rolledAt = Date.now()) {
    const cb = this.combatants.get(combatantId);
    if (!cb) return;
    const dice = (values ?? []).map(v => R.newDie(v));
    return cb.update({
      initiative: dice.length ? R.unspentTotal(dice) : null,
      // rolledAt is the last tie-breaker: whoever rolled first acts first.
      flags: { [SYS]: { dice, passed: null, panache: panache ?? actorPanache(cb.actor), rolledAt: dice.length ? rolledAt : null } }
    });
  }

  /** Spend or un-spend one die (a correction; Next Turn spends dice on its own). */
  async toggleDie(combatantId, index) {
    if (!game.user.isGM) return this.#ask({ op: "toggleDie", combatantId, index });
    return this.#editEntry(combatantId, e => {
      const d = e.dice[index];
      if (!d) return false;
      d.spent = !d.spent;
      d.spentPhase = d.spent ? this.phase : null;
      if (!d.spent) d.exchanged = false;
      return true;
    });
  }

  /** Interrupt: trade two later dice for one in the current Phase. */
  async interrupt(combatantId) {
    if (!game.user.isGM) return this.#ask({ op: "interrupt", combatantId });
    return this.#editEntry(combatantId, e => R.interrupt(e, this.phase));
  }

  async #editEntry(combatantId, fn) {
    const entries = this.#entries();
    const e = entries.find(x => x.id === combatantId);
    if (!e || !fn(e)) return this;
    // The Phase may have emptied out; if so move on to the next one with someone in it.
    const phase = this.phase > 0 ? R.nextActivePhase(entries, this.phase) : 0;
    if (phase === null) return this.#commit(this.round, this.phase, entries);
    return this.#commit(this.round, phase, entries);
  }

  /* -------------------------------------------- */
  /*  Player requests                             */
  /* -------------------------------------------- */

  async #ask(data) {
    const gm = game.users.activeGM;
    if (!gm) {
      ui.notifications.warn(game.i18n.localize("SS1E.Combat.NeedGM"));
      return this;
    }
    await gm.query(QUERY, { combatId: this.id, ...data });
    return this;
  }

  /** GM side of #ask. Players may end or hold their own turn and adjust their own dice. */
  static async _handleQuery({ combatId, op, combatantId, index }, { user }) {
    const combat = game.combats.get(combatId);
    if (!combat) return false;
    const owns = id => !!combat.combatants.get(id)?.testUserPermission(user, "OWNER");
    switch (op) {
      case "act":
      case "hold":
        if (!owns(combat.combatant?.id)) return false;
        await combat.#endTurn(op);
        return true;
      case "toggleDie":
        if (!owns(combatantId)) return false;
        await combat.toggleDie(combatantId, index);
        return true;
      case "interrupt":
        if (!owns(combatantId)) return false;
        await combat.interrupt(combatantId);
        return true;
      default:
        return false; // nextRound / undo stay GM-only
    }
  }

  static registerQuery() {
    CONFIG.queries[QUERY] = SeventhSeaCombat._handleQuery;
  }
}
