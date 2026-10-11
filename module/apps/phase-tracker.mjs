/**
 * Phase Tracker — a 1-10 grid of every combatant's Action Dice for the viewed Combat encounter,
 * plus the 7th Sea additions to Foundry's Combat sidebar (Phase label, dice, Hold button).
 *
 * All rules and state live in SeventhSeaCombat; this file only displays them and forwards clicks.
 * The GM can show the grid to players or keep it private (world setting).
 */

import { SeventhSeaCombat, SYS, entryOf } from "../combat/seventh-sea-combat.mjs";
import * as R from "../combat/phase-rules.mjs";

const VISIBLE = "phaseTrackerVisible";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function playersCanSee() { return !!game.settings.get(SYS, VISIBLE); }

/** The encounter shown in the Combat sidebar, if it runs on 7th Sea Phases. */
function viewedCombat() {
  const c = game.combat;
  return c instanceof SeventhSeaCombat ? c : null;
}

/** Display data for one combatant's dice in `phase`. */
function diceView(e, phase) {
  return e.dice.map((d, i) => ({
    i, v: d.v, spent: d.spent, interrupt: d.interrupt,
    held: !d.spent && phase > 0 && d.v < phase,
    now: !d.spent && d.v === phase
  }));
}

export class PhaseTracker extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "ss1e-phase-tracker",
    classes: ["seventh-sea-1e", "ss1e-phase-tracker"],
    window: { title: "SS1E.PhaseTracker.Title", icon: "fa-solid fa-hourglass-half", resizable: true },
    position: { width: 760, height: "auto" },
    actions: {
      undo:          PhaseTracker.#undo,
      act:           PhaseTracker.#act,
      hold:          PhaseTracker.#hold,
      newRound:      PhaseTracker.#newRound,
      toggleVisible: PhaseTracker.#toggleVisible,
      rollNPCs:      PhaseTracker.#rollNPCs,
      rollAll:       PhaseTracker.#rollAll,
      rollOne:       PhaseTracker.#rollOne,
      toggleDie:     PhaseTracker.#toggleDie,
      interrupt:     PhaseTracker.#interrupt
    }
  };

  static PARTS = {
    body: { template: "systems/seventh-sea-1e/templates/apps/phase-tracker.hbs" }
  };

  static #instance = null;

  static open() {
    if (!game.user.isGM && !playersCanSee()) {
      return ui.notifications.info(game.i18n.localize("SS1E.PhaseTracker.HiddenFromPlayers"));
    }
    this.#instance ??= new this();
    return this.#instance.render({ force: true });
  }

  static refresh() {
    if (this.#instance?.rendered) this.#instance.render();
  }

  /** Visibility setting changed: update the toolbar and open/close the grid for players. */
  static onVisibilityChange(visible) {
    ui.controls?.render();
    if (game.user.isGM) return this.refresh();
    return visible ? this.open() : this.#instance?.close();
  }

  async _prepareContext() {
    const combat = viewedCombat();
    const isGM = game.user.isGM;
    const base = { isGM, visible: playersCanSee(), hasCombat: !!combat };
    if (!combat) return base;

    const phase = combat.phase;
    const turns = combat.turns.filter(c => c.visible);
    const entries = turns.map(entryOf);
    const sorted = R.sortEntries(entries, phase);
    const current = combat.started && phase > 0 ? combat.combatant : null;
    const ownsCurrent = !!current?.isOwner;

    const rows = sorted.map(e => {
      const cb = combat.combatants.get(e.id);
      const dice = diceView(e, phase);
      const mine = isGM || cb.isOwner;
      return {
        id: e.id, name: cb.name, img: cb.img ?? cb.token?.texture?.src,
        hasDice: e.dice.length > 0, total: R.unspentTotal(e.dice),
        acting: R.canAct(e, phase), current: cb === current,
        tie: R.isTied(e, sorted, phase), defeated: e.defeated,
        canEdit: mine, canRoll: cb.isOwner && !e.dice.length,
        canInterrupt: mine && phase > 0 && e.dice.filter(d => !d.spent && d.v > phase).length >= 2,
        cells: Array.from({ length: R.PHASES }, (_, k) => ({
          n: k + 1, current: k + 1 === phase, dice: dice.filter(d => d.v === k + 1)
        }))
      };
    });

    return {
      ...base,
      round: combat.round, phase, started: combat.started,
      canAct: combat.started && phase > 0 && (isGM || ownsCurrent),
      cols: R.PHASES + 3,
      phases: Array.from({ length: R.PHASES }, (_, k) => ({ n: k + 1, current: k + 1 === phase, past: k + 1 < phase })),
      rows
    };
  }

  static #combat() { return viewedCombat(); }
  static #rowId(target) { return target.closest("[data-id]")?.dataset.id; }

  static #undo()     { return PhaseTracker.#combat()?.previousTurn(); }
  static #act()      { return PhaseTracker.#combat()?.nextTurn(); }
  static #hold()     { return PhaseTracker.#combat()?.holdTurn(); }
  static #newRound() { return PhaseTracker.#combat()?.nextRound(); }
  static #rollNPCs() { return PhaseTracker.#combat()?.rollNPC(); }
  static #rollAll()  { return PhaseTracker.#combat()?.rollAll(); }

  static #toggleVisible() { return game.settings.set(SYS, VISIBLE, !playersCanSee()); }

  static #rollOne(event, target) {
    return PhaseTracker.#combat()?.rollInitiative([PhaseTracker.#rowId(target)]);
  }
  static #toggleDie(event, target) {
    return PhaseTracker.#combat()?.toggleDie(PhaseTracker.#rowId(target), Number(target.dataset.die));
  }
  static #interrupt(event, target) {
    return PhaseTracker.#combat()?.interrupt(PhaseTracker.#rowId(target));
  }
}

/* -------------------------------------------- */
/*  Combat sidebar additions                    */
/* -------------------------------------------- */

function decorateCombatTracker(app, element) {
  const combat = app.viewed;
  if (!(combat instanceof SeventhSeaCombat)) return;
  const phase = combat.phase;
  const loc = k => game.i18n.localize(k);

  // "Round 2 · Phase 4" (or "· Roll Action Dice" before Phase 1)
  const title = element.querySelector(".encounter-title");
  if (title && combat.round) {
    title.querySelector(".ss1e-phase")?.remove();
    const span = document.createElement("span");
    span.className = "ss1e-phase";
    span.textContent = phase > 0 ? ` · ${loc("SS1E.PhaseTracker.Phase")} ${phase}` : ` · ${loc("SS1E.PhaseTracker.Rolling")}`;
    title.append(span);
  }

  // Dice under each name; dim whoever can't act this Phase. Initiative is derived, so not typed in.
  for (const li of element.querySelectorAll("li.combatant[data-combatant-id]")) {
    const cb = combat.combatants.get(li.dataset.combatantId);
    if (!cb) continue;
    const e = entryOf(cb);
    li.classList.toggle("ss1e-waiting", phase > 0 && !R.canAct(e, phase));
    li.querySelector(".ss1e-dice")?.remove();
    if (e.dice.length) {
      const wrap = document.createElement("div");
      wrap.className = "ss1e-dice";
      for (const d of diceView(e, phase)) {
        const s = document.createElement("span");
        s.className = ["pt-die", d.spent && "spent", d.held && "held", d.now && "now", d.interrupt && "interrupt"]
          .filter(Boolean).join(" ");
        s.textContent = d.v;
        wrap.append(s);
      }
      li.querySelector(".token-name")?.append(wrap);
    }
    const input = li.querySelector(".initiative-input");
    if (input) {
      input.readOnly = true;
      input.dataset.tooltip = loc("SS1E.PhaseTracker.TotalHint");
    }
  }

  // Hold beside Next Turn, and a button to open the Phase grid.
  const nav = element.querySelector("nav.combat-controls");
  if (nav && combat.started) {
    nav.querySelectorAll(".ss1e-control").forEach(b => b.remove());
    const canControl = game.user.isGM || combat.combatant?.isOwner;
    const make = (icon, label, onClick) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "inline-control combat-control icon ss1e-control " + icon;
      b.dataset.tooltip = label;
      b.setAttribute("aria-label", label);
      b.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); onClick(); });
      return b;
    };
    if (canControl && phase > 0) {
      const next = nav.querySelector('[data-action="nextTurn"]');
      const hold = make("fa-solid fa-hand", loc("SS1E.PhaseTracker.Hold"), () => combat.holdTurn());
      next ? next.before(hold) : nav.append(hold);
    }
    if (game.user.isGM || playersCanSee()) {
      nav.prepend(make("fa-solid fa-hourglass-half", loc("SS1E.PhaseTracker.Title"), () => PhaseTracker.open()));
    }
  }
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

export function registerPhaseTracker() {
  CONFIG.Combat.documentClass = SeventhSeaCombat;
  SeventhSeaCombat.registerQuery();

  game.settings.register(SYS, VISIBLE, {
    scope: "world", config: false, type: Boolean, default: false,
    onChange: v => PhaseTracker.onVisibilityChange(v)
  });

  Hooks.on("getSceneControlButtons", controls => {
    const tokens = controls.tokens;
    if (!tokens) return;
    tokens.tools.ss1ePhaseTracker = {
      name: "ss1ePhaseTracker",
      order: Object.keys(tokens.tools).length,
      title: "SS1E.PhaseTracker.Title",
      icon: "fa-solid fa-hourglass-half",
      button: true,
      visible: game.user.isGM || playersCanSee(),
      onChange: () => PhaseTracker.open()
    };
  });

  Hooks.on("renderCombatTracker", decorateCombatTracker);
  for (const h of ["updateCombat", "createCombat", "deleteCombat", "createCombatant", "updateCombatant", "deleteCombatant"]) {
    Hooks.on(h, () => PhaseTracker.refresh());
  }

  // Open sheets show the encounter's dice and total, so redraw them when a Combatant changes.
  for (const h of ["createCombatant", "updateCombatant", "deleteCombatant"]) {
    Hooks.on(h, cb => { if (cb.actor?.sheet?.rendered) cb.actor.sheet.render(false); });
  }

  // A sheet roll from an actor that isn't fighting yet: if its token is on the active encounter's
  // scene, the GM adds it. (Actors already in an encounter write their dice there themselves.)
  Hooks.on("updateActor", async (actor, changes) => {
    if (!game.users.activeGM?.isSelf) return;
    if (!foundry.utils.hasProperty(changes, "system.initiative.rolledAt")) return;
    if (game.combats.some(c => c instanceof SeventhSeaCombat && c.getCombatantsByActor(actor).length)) return;
    const combat = game.combats.active;
    if (!(combat instanceof SeventhSeaCombat)) return;
    const token = actor.isToken ? actor.token : combat.scene?.tokens.find(t => t.actorId === actor.id);
    if (!token || (combat.scene && token.parent !== combat.scene)) return;
    const [cb] = await combat.createEmbeddedDocuments("Combatant", [{ tokenId: token.id, sceneId: token.parent.id, actorId: actor.id }]);
    const init = actor.system.initiative ?? {};
    if (cb) await combat.setDice(cb.id, init.keptDice ?? [], undefined, init.rolledAt ?? Date.now());
  });

  // Ending an encounter clears the initiative shown on its actors' sheets.
  Hooks.on("deleteCombat", async combat => {
    if (!(combat instanceof SeventhSeaCombat)) return;
    for (const cb of combat.combatants) if (cb.actor?.sheet?.rendered) cb.actor.sheet.render(false);
    if (!game.users.activeGM?.isSelf) return;
    const seen = new Set();
    for (const cb of combat.combatants) {
      const a = cb.actor;
      if (!a?.system.initiative || seen.has(a.uuid)) continue;
      seen.add(a.uuid);
      // An actor still fighting in another encounter keeps its dice.
      if (game.combats.some(c => c !== combat && c.getCombatantsByActor(a).length)) continue;
      await a.update({ "system.initiative.keptDice": [], "system.initiative.value": 0 });
    }
  });
}
