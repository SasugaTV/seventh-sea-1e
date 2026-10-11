/**
 * Campaign Sheet — a GM-only actor (type "campaign") that, for now, holds:
 *   - the GM copy of every character's ledger journal (flags.seventh-sea-1e.gmJournal), kept in
 *     step by the active GM's client and caught up on login, so lines a player removes from their
 *     own sheet survive here;
 *   - the list of Stories ended (flags.seventh-sea-1e.stories);
 *   - End Story, and CSV export of all journals and ledgers.
 * Built to grow later (notes, clocks, Brute/Henchman roster).
 */

import {
  SYS, LEDGER, KINDS, getLedger, addEntries, totals, csv, download, fileSafe,
  journalRows, JOURNAL_HEADER, ledgerRows, LEDGER_HEADER
} from "./ledger.mjs";

const GMJ = "gmJournal";
const STORIES = "stories";
const keyOf = uuid => uuid.replace(/\./g, "_");

export function campaignActor() {
  return game.actors.find(a => a.type === "campaign") ?? null;
}

/** The GM's Campaign actor, created (GM-only) the first time it's needed. */
async function ensureCampaign() {
  if (!game.user.isGM) return null;
  return campaignActor() ?? Actor.implementation.create({
    name: game.i18n.localize("SS1E.Campaign.DefaultName"), type: "campaign",
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE }
  });
}

/** Every actor that may carry a ledger: world actors plus token-only (unlinked) copies. */
function ledgerActors() {
  const out = [...game.actors.filter(a => a.type !== "campaign")];
  for (const s of game.scenes) for (const t of s.tokens) if (!t.actorLink && t.actor) out.push(t.actor);
  return out.filter(a => getLedger(a).journal.length);
}

/* -------------------------------------------- */
/*  GM journal copy                             */
/* -------------------------------------------- */

let queue = Promise.resolve();
/** Copy any journal lines the GM copy doesn't have yet. Serialised so concurrent updates can't race. */
export function mirror(actors) {
  queue = queue.then(async () => {
    if (!game.users.activeGM?.isSelf) return;
    const list = actors.filter(a => getLedger(a).journal.length);
    if (!list.length) return;
    const camp = await ensureCampaign();
    if (!camp) return;
    const store = foundry.utils.deepClone(camp.getFlag(SYS, GMJ) ?? {});
    let changed = false;
    for (const a of list) {
      const k = keyOf(a.uuid);
      const have = new Set((store[k]?.lines ?? []).map(l => l.id));
      const add = getLedger(a).journal.filter(l => !have.has(l.id));
      if (!add.length && store[k]?.name === a.name) continue;
      store[k] = { uuid: a.uuid, name: a.name, lines: [...(store[k]?.lines ?? []), ...add] };
      changed = true;
    }
    if (changed) await camp.update({ [`flags.${SYS}.${GMJ}`]: store }, { ss1eNoLog: true });
  }).catch(err => console.error("7th Sea | GM journal copy failed", err));
  return queue;
}

/** GM copy entries, for the sheet and exports. */
export function gmJournal() {
  return Object.values(campaignActor()?.getFlag(SYS, GMJ) ?? {});
}

/* -------------------------------------------- */
/*  End Story                                   */
/* -------------------------------------------- */

const lowestTrait = a => Math.min(...Object.values(a.system.traits ?? {}).map(t => Number(t?.value) || 0));

export async function endStoryDialog() {
  if (!game.user.isGM) return;
  const L = k => game.i18n.localize(k);
  const heroes = game.actors.filter(a => ["hero", "villain"].includes(a.type))
    .sort((a, b) => (b.type === "hero") - (a.type === "hero") || a.name.localeCompare(b.name));
  const rows = heroes.map(a => {
    const dd = Number(a.system.resources?.dramaDice?.value) || 0;
    const checked = a.type === "hero" && a.hasPlayerOwner ? "checked" : "";
    return `<label class="es-row"><input type="checkbox" name="who" value="${a.id}" ${checked}>
      <span class="es-name">${foundry.utils.escapeHTML(a.name)}</span>
      <span class="es-dd">${game.i18n.format("SS1E.Campaign.DramaToXP", { n: dd })}</span></label>`;
  }).join("");
  const content = `<div class="ss1e-end-story">
    <label>${L("SS1E.Campaign.StoryTitle")} <input type="text" name="title" required autofocus></label>
    <label>${L("SS1E.Campaign.StoryXP")} <input type="number" name="xp" min="0" value="0"></label>
    <label class="es-reset"><input type="checkbox" name="reset"> ${L("SS1E.Campaign.ResetDrama")}</label>
    <fieldset><legend>${L("SS1E.Campaign.WhoTookPart")}</legend>${rows}</fieldset></div>`;

  const data = await foundry.applications.api.DialogV2.prompt({
    window: { title: L("SS1E.Campaign.EndStory"), icon: "fa-solid fa-book-bookmark" },
    content,
    ok: {
      label: L("SS1E.Campaign.EndStory"), icon: "fa-solid fa-book-bookmark",
      callback: (event, button) => {
        const f = button.form;
        return {
          title: f.elements.title.value.trim(), xp: Math.max(0, Number(f.elements.xp.value) || 0),
          reset: f.elements.reset.checked,
          who: [...f.querySelectorAll('input[name="who"]:checked')].map(i => i.value)
        };
      }
    },
    rejectClose: false
  });
  if (!data) return;
  if (!data.title) return ui.notifications.warn(L("SS1E.Campaign.NeedTitle"));
  return endStory(data);
}

/** Credit Story XP and unspent Drama Dice as XP, and stamp a Story End line, for each actor. */
export async function endStory({ title, xp, reset, who }) {
  const group = foundry.utils.randomID();
  const stamp = game.i18n.format("SS1E.Campaign.StoryEndLine", { title });
  for (const id of who) {
    const a = game.actors.get(id);
    if (!a) continue;
    const dd = Number(a.system.resources?.dramaDice?.value) || 0;
    const entries = [];
    if (xp > 0) entries.push({ dir: "credit", cur: "XP", amount: xp, reason: game.i18n.format("SS1E.Campaign.StoryXPLine", { title }), kind: KINDS.storyXP, group });
    if (dd > 0) entries.push({ dir: "credit", cur: "XP", amount: dd, reason: game.i18n.format("SS1E.Campaign.DramaXPLine", { title }), kind: KINDS.dramaXP, group });
    entries.push({ dir: "credit", cur: "XP", amount: 0, reason: stamp, kind: KINDS.story, group });
    const extra = a.system.resources?.dramaDice ? { "system.resources.dramaDice.value": reset ? lowestTrait(a) : 0 } : {};
    await addEntries(a, entries, extra);
  }
  const camp = await ensureCampaign();
  if (camp) {
    const stories = [...(camp.getFlag(SYS, STORIES) ?? []), { title, xp, t: Date.now(), who: who.length }];
    await camp.update({ [`flags.${SYS}.${STORIES}`]: stories }, { ss1eNoLog: true });
  }
  ui.notifications.info(game.i18n.format("SS1E.Campaign.StoryEnded", { title, n: who.length }));
}

/* -------------------------------------------- */
/*  Exports                                     */
/* -------------------------------------------- */

const today = () => new Date().toISOString().slice(0, 10);

/** Every journal line in the GM copy, all characters, one CSV. */
export function exportAllJournals() {
  const rows = [JOURNAL_HEADER];
  for (const j of gmJournal()) rows.push(...journalRows(j.name, j.lines));
  download(csv(rows), `campaign-journals-${today()}.csv`);
}

/** Every character's current ledger, one CSV. */
export function exportAllLedgers() {
  const rows = [LEDGER_HEADER];
  for (const a of game.actors.filter(x => x.type !== "campaign")) rows.push(...ledgerRows(a.name, getLedger(a).entries));
  download(csv(rows), `campaign-ledgers-${today()}.csv`);
}

export function exportActor(actor) {
  const l = getLedger(actor);
  download(csv([LEDGER_HEADER, ...ledgerRows(actor.name, l.entries)]), `${fileSafe(actor.name)}-ledger-${today()}.csv`);
  download(csv([JOURNAL_HEADER, ...journalRows(actor.name, l.journal)]), `${fileSafe(actor.name)}-journal-${today()}.csv`);
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

export function registerCampaign() {
  // Copy new journal lines whenever a ledger changes...
  Hooks.on("updateActor", (actor, changes) => {
    if (foundry.utils.hasProperty(changes, `flags.${SYS}.${LEDGER}`)) mirror([actor]);
  });
  // ...and catch up on login (lines added while no GM was online).
  Hooks.once("ready", () => { if (game.users.activeGM?.isSelf) mirror(ledgerActors()); });
}

export { totals };
