/**
 * Character Ledger — Hero Points (HP) and Experience (XP) accounts, with an append-only journal.
 *
 * Stored on the actor in flags.seventh-sea-1e.ledger:
 *   entries: [{id, t, dir: "credit"|"debit", cur: "HP"|"XP", amount (>= 0), reason, kind, group}]
 *   journal: [{id, t, user, userId, op: "add"|"edit"|"delete", entryId, entry, before}]
 *
 * - Amounts are always positive; `dir` says which way the money moves.
 * - The ledger (entries) can be added to, edited and deleted from the sheet. Every such change also
 *   appends a journal line in the SAME update, and journal lines are never changed or removed. So
 *   replaying the journal must reproduce the ledger (see replay()).
 * - Totals are always calculated from the entries, never stored.
 * - A GM-only copy of every journal line is kept on the Campaign Sheet (see campaign.mjs).
 */

export const SYS = "seventh-sea-1e";
export const LEDGER = "ledger";
export const CURRENCIES = ["HP", "XP"];

/** Entry kinds. "story" is a zero-amount marker line (Story End). */
export const KINDS = { manual: "manual", startingHP: "startingHP", awardXP: "awardXP", storyXP: "storyXP", dramaXP: "dramaXP", story: "story", migrated: "migrated" };

const blank = () => ({ entries: [], journal: [] });

export function getLedger(actor) {
  const l = actor?.getFlag?.(SYS, LEDGER) ?? actor?.flags?.[SYS]?.[LEDGER];
  return l ? { entries: l.entries ?? [], journal: l.journal ?? [] } : blank();
}

/** True once a character has any ledger entries (before that the old XP fields stay in charge). */
export function hasLedger(actor) {
  return getLedger(actor).entries.length > 0 || getLedger(actor).journal.length > 0;
}

/** Balances from the entries. */
export function totals(entries) {
  const t = { HP: { credit: 0, debit: 0 }, XP: { credit: 0, debit: 0 } };
  for (const e of entries) {
    if (!t[e.cur]) continue;
    t[e.cur][e.dir === "credit" ? "credit" : "debit"] += Math.max(0, Number(e.amount) || 0);
  }
  return {
    hpLeft: t.HP.credit - t.HP.debit, hpStart: t.HP.credit, hpSpent: t.HP.debit,
    xpCurrent: t.XP.credit - t.XP.debit, xpEarned: t.XP.credit, xpSpent: t.XP.debit
  };
}

/** Rebuild the ledger from the journal. Should equal the stored entries. */
export function replay(journal) {
  const map = new Map();
  for (const j of journal) {
    if (j.op === "add" || j.op === "edit") map.set(j.entryId, { ...j.entry });
    else if (j.op === "delete") map.delete(j.entryId);
  }
  return [...map.values()];
}

/** Clean an entry the user typed. */
function normalise(e) {
  return {
    id: e.id ?? foundry.utils.randomID(),
    t: e.t ?? Date.now(),
    dir: e.dir === "credit" ? "credit" : "debit",
    cur: CURRENCIES.includes(e.cur) ? e.cur : "XP",
    amount: Math.max(0, Math.round(Number(e.amount) || 0)),
    reason: String(e.reason ?? "").trim(),
    kind: e.kind ?? KINDS.manual,
    group: e.group ?? null
  };
}

function line(op, entry, before = null) {
  return {
    id: foundry.utils.randomID(), t: Date.now(), user: game.user.name, userId: game.user.id,
    op, entryId: entry.id, entry: entry ? { ...entry } : null, before: before ? { ...before } : null
  };
}

/**
 * Opening entries that carry a character's pre-ledger XP over, so starting the ledger never loses
 * anything: each old XP Log line becomes a credit or debit, then one balancing line makes "current
 * XP" equal the number that was in the sheet's XP box. The old XP Log data is left untouched.
 */
export function openingEntries(actor) {
  const src = actor._source?.system ?? {};
  const t0 = Date.now() - 1000;
  const out = [];
  let sum = 0;
  for (const e of src.xpLog?.entries ?? []) {
    const n = Math.round(Number(e?.amount) || 0);
    if (!n) continue;
    sum += n;
    out.push({ dir: n > 0 ? "credit" : "debit", cur: "XP", amount: Math.abs(n), t: t0,
      reason: `${e.label || game.i18n.localize("SS1E.Ledger.OldLogLine")} (${game.i18n.localize("SS1E.Ledger.CarriedOver")})`, kind: KINDS.migrated });
  }
  const box = Math.round(Number(src.resources?.xp?.value) || 0);
  if (box !== sum && src.resources?.xp) {
    const gap = box - sum;
    out.push({ dir: gap > 0 ? "credit" : "debit", cur: "XP", amount: Math.abs(gap), t: t0, kind: KINDS.migrated,
      reason: game.i18n.localize(gap > 0 ? "SS1E.Ledger.CarriedOverCredit" : "SS1E.Ledger.CarriedOverDebit") });
  }
  return out;
}

/**
 * Apply ledger changes in ONE actor update, so entries and journal can't drift apart.
 * `extra` is merged into the same update (e.g. resetting Drama Dice at Story End).
 * The first change to a character with no ledger also carries their old XP over (openingEntries).
 */
async function commit(actor, { add = [], edit = [], remove = [] }, extra = {}) {
  const { entries, journal } = getLedger(actor);
  if (!entries.length && !journal.length) add = [...openingEntries(actor), ...add];
  const next = entries.map(e => ({ ...e }));
  const lines = [];
  for (const raw of add) {
    const e = normalise(raw);
    next.push(e);
    lines.push(line("add", e));
  }
  for (const { id, changes } of edit) {
    const i = next.findIndex(e => e.id === id);
    if (i < 0) continue;
    const before = next[i];
    const after = normalise({ ...before, ...changes, id: before.id, t: before.t });
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    next[i] = after;
    lines.push(line("edit", after, before));
  }
  for (const id of remove) {
    const i = next.findIndex(e => e.id === id);
    if (i < 0) continue;
    const [gone] = next.splice(i, 1);
    lines.push({ ...line("delete", gone, gone), entry: null });
  }
  if (!lines.length && foundry.utils.isEmpty(extra)) return null;
  return actor.update({ ...extra, [`flags.${SYS}.${LEDGER}`]: { entries: next, journal: [...journal, ...lines] } });
}

export const addEntries = (actor, entries, extra) => commit(actor, { add: entries }, extra);
export const editEntry = (actor, id, changes) => commit(actor, { edit: [{ id, changes }] });
export const deleteEntry = (actor, id) => commit(actor, { remove: [id] });

/* -------------------------------------------- */
/*  Derived values for the sheet                */
/* -------------------------------------------- */

/**
 * Called from the actor's prepareDerivedData. Once a character has a ledger, the XP box shows
 * current / earned from it (both read-only) and HP left is available.
 */
export function prepareLedgerTotals(actor, sys) {
  if (!hasLedger(actor)) return;
  const t = totals(getLedger(actor).entries);
  sys.ledger = t;
  if (sys.resources?.xp) {
    sys.resources.xp.value = t.xpCurrent;
    sys.resources.xp.total = t.xpEarned;
  }
}

/* -------------------------------------------- */
/*  CSV                                         */
/* -------------------------------------------- */

const iso = t => new Date(t).toISOString().replace("T", " ").slice(0, 19);
const cell = v => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const csv = rows => rows.map(r => r.map(cell).join(",")).join("\r\n") + "\r\n";

export function ledgerRows(name, entries) {
  return entries.map(e => [name, iso(e.t), e.cur, e.dir, e.dir === "credit" ? e.amount : -e.amount, e.reason, e.kind, e.group ?? "", e.id]);
}
export const LEDGER_HEADER = ["Character", "Date (UTC)", "Currency", "Direction", "Amount", "Reason", "Kind", "Group", "Entry ID"];

export function journalRows(name, journal) {
  return journal.map(j => {
    const e = j.entry ?? j.before ?? {};
    const before = j.op === "edit" && j.before ? `${j.before.dir} ${j.before.amount} ${j.before.cur} "${j.before.reason}"` : "";
    return [name, iso(j.t), j.user, j.op, e.cur ?? "", e.dir ?? "", e.amount ?? "", e.reason ?? "", before, j.entryId ?? "", j.id];
  });
}
export const JOURNAL_HEADER = ["Character", "Date (UTC)", "User", "Action", "Currency", "Direction", "Amount", "Reason", "Was (for edits)", "Entry ID", "Journal ID"];

export function download(text, filename) {
  foundry.utils.saveDataToFile(text, "text/csv", filename);
}

export const fileSafe = s => String(s).replace(/[^\w.-]+/g, "_").slice(0, 60);
