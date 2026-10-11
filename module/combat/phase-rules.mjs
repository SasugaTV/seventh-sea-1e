/**
 * 7th Sea 1e Action Dice rules (Players' Guide pp.183-184), with no Foundry dependencies.
 *
 * Works on plain combatant entries: {id, name, defeated, panache, rank, rolledAt, dice, passed}
 *   dice:   [{v, spent, spentPhase, exchanged, interrupt, release}]
 *   passed: the Phase in which this combatant chose to Hold (sits out the rest of that Phase)
 *
 * A Round is ten Phases. A die showing the current Phase lets its owner act. An unspent die from
 * an earlier Phase is a Held Action. Within a Phase the highest Initiative Total (sum of current,
 * unspent dice, held ones included) acts first; ties go to higher Panache.
 *
 * House rule for Held Actions: a held die doesn't bring its owner up in every later Phase. They
 * come up when one of their own dice' Phases arrives (acting spends that die and keeps the held
 * one), when they choose to use the held die now (`release`, valid for that Phase only; it puts
 * them at the top of that Phase's order, ahead of Initiative Total, unlike the book), and in
 * a hidden Phase 11 ("Held Actions") that only happens if someone is still holding after Phase 10:
 * use the held die then, or lose it.
 *
 * House rule, instead of the book's coin flip: if Panache is level too, Heroes act before
 * Villains, Villains before Henchmen, Henchmen before Brutes and Monsters (`rank`, lower first),
 * and after that whoever rolled their Action Dice first (`rolledAt`).
 */

export const PHASES = 10;

/** Hidden step after Phase 10, only reached when someone still holds a die. */
export const HELD_PHASE = PHASES + 1;

/** House-rule tie-break order after Panache (lower acts first). */
export const RANK = { hero: 0, villain: 1, henchman: 2, brute: 3, monster: 3, other: 3 };

export function newDie(v, extra = {}) {
  return { v: Number(v), spent: false, spentPhase: null, exchanged: false, interrupt: false, ...extra };
}

/** Initiative Total: unspent dice only. */
export function unspentTotal(dice) {
  return dice.reduce((a, d) => a + (d.spent ? 0 : d.v), 0);
}

/**
 * Total used to order actors inside `phase`. Dice spent in earlier Phases don't count; dice spent
 * during this Phase still do, so the order doesn't reshuffle mid-Phase. Dice traded away for an
 * Interrupt stop counting at once.
 */
export function orderTotal(dice, phase) {
  return dice.reduce((a, d) => {
    const counts = !d.spent || (!d.exchanged && (d.spentPhase ?? 0) >= phase);
    return a + (counts ? d.v : 0);
  }, 0);
}

/** A held die: unspent, from an earlier Phase. */
export function isHeld(d, phase) {
  return !d.spent && phase > 0 && d.v < phase;
}

/** Usable right now: shows this Phase, or is held and either released this Phase or it's Phase 10. */
function usableNow(d, phase) {
  if (d.spent) return false;
  if (d.v === phase) return true;
  return d.v < phase && (phase === HELD_PHASE || d.release === phase);
}

export function canAct(e, phase) {
  return phase > 0 && !e.defeated && e.passed !== phase && e.dice.some(d => usableNow(d, phase));
}

/** Chose Use Held this Phase and hasn't spent it yet: goes to the top of the order. */
export function isReleased(e, phase) {
  return phase < HELD_PHASE && e.dice.some(d => !d.spent && d.v < phase && d.release === phase);
}

export function hasHeld(e, phase) {
  return e.dice.some(d => isHeld(d, phase));
}

/** Use a held action now: the lowest held die becomes usable in this Phase. */
export function release(e, phase) {
  const d = e.dice.filter(x => isHeld(x, phase) && x.release !== phase).sort((a, b) => a.v - b.v)[0];
  if (!d) return false;
  d.release = phase;
  if (e.passed === phase) e.passed = null;
  return true;
}

/** Can act now: by order total, Panache, name. Then everyone else by Initiative Total; unrolled last. */
export function compareEntries(a, b, phase) {
  const ea = canAct(a, phase), eb = canAct(b, phase);
  if (ea !== eb) return ea ? -1 : 1;
  if (ea) {
    const ha = isReleased(a, phase), hb = isReleased(b, phase);
    if (ha !== hb) return ha ? -1 : 1;
  }
  const ra = a.dice.length > 0, rb = b.dice.length > 0;
  if (ra !== rb) return ra ? -1 : 1;
  const ta = ea ? orderTotal(a.dice, phase) : unspentTotal(a.dice);
  const tb = eb ? orderTotal(b.dice, phase) : unspentTotal(b.dice);
  return (tb - ta) || ((b.panache ?? 0) - (a.panache ?? 0))
    || ((a.rank ?? RANK.other) - (b.rank ?? RANK.other))
    || ((a.rolledAt ?? Infinity) - (b.rolledAt ?? Infinity))
    || String(a.name).localeCompare(String(b.name)) || (a.id > b.id ? 1 : -1);
}

export function sortEntries(entries, phase) {
  return [...entries].sort((a, b) => compareEntries(a, b, phase));
}

/** Two adjacent actors still level after every tie-breaker (only possible if neither has a roll time). */
export function isTied(e, sorted, phase) {
  if (!canAct(e, phase)) return false;
  const k = sorted.indexOf(e);
  const level = x => x && canAct(x, phase) && x.panache === e.panache
    && orderTotal(x.dice, phase) === orderTotal(e.dice, phase)
    && (x.rank ?? RANK.other) === (e.rank ?? RANK.other)
    && (x.rolledAt ?? null) === (e.rolledAt ?? null);
  return level(sorted[k - 1]) || level(sorted[k + 1]);
}

/**
 * Spend one die for an action in `phase`: a held die they chose to use this Phase first, then the
 * die showing this Phase (any other held die is kept), else the lowest held die usable now.
 */
export function spendOne(e, phase) {
  const released = e.dice.find(d => !d.spent && d.v < phase && d.release === phase);
  const now = e.dice.find(d => !d.spent && d.v === phase);
  const held = e.dice.filter(d => usableNow(d, phase) && d.v < phase).sort((a, b) => a.v - b.v)[0];
  const d = released ?? now ?? held;
  if (d) Object.assign(d, { spent: true, spentPhase: phase });
  return d ?? null;
}

/** Interrupt: trade the two highest later dice for one die showing `phase` (cannot be used to attack). */
export function interrupt(e, phase) {
  if (phase < 1) return false;
  const later = e.dice.filter(d => !d.spent && d.v > phase).sort((a, b) => b.v - a.v).slice(0, 2);
  if (later.length < 2) return false;
  for (const d of later) Object.assign(d, { spent: true, spentPhase: phase, exchanged: true });
  e.dice.push(newDie(phase, { interrupt: true }));
  if (e.passed === phase) e.passed = null;
  return true;
}

/**
 * The first Phase at or after `from` in which anyone can act, or null if the Round is over.
 * A Hold only lasts for the Phase it was declared in.
 */
export function nextActivePhase(entries, from) {
  for (let p = Math.max(1, from); p <= HELD_PHASE; p++) {
    if (entries.some(e => canAct(e, p))) return p;
  }
  return null;
}

/**
 * End the active actor's turn. `mode` is "act" (spend a die) or "hold" (keep the die, sit out
 * the rest of this Phase). Mutates `entries`; returns the new Phase, or null when the Round ends.
 */
export function endTurn(entries, phase, mode = "act") {
  if (phase > 0) {
    const current = sortEntries(entries, phase)[0];
    if (current && canAct(current, phase)) {
      if (mode === "hold") current.passed = phase;
      else spendOne(current, phase);
    }
  }
  return nextActivePhase(entries, phase);
}
