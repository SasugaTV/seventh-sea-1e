/**
 * Change History — a record of every saved change to a character sheet.
 *
 * Kept on the actor in flags.seventh-sea-1e.changeLog (newest last, capped at MAX), so it travels
 * with the character. Each entry: {t: epoch ms, user, what, changes: [{label, before, after}]}.
 *
 * - Actor field changes are diffed in preUpdateActor and written in the same update, so the
 *   record can never disagree with what was saved.
 * - Item changes (skills, knacks, advantages...) are recorded after they succeed, by the user who
 *   made them, as one extra flag update.
 * - Noise is skipped: sheet UI prefs, initiative rolls, and Foundry bookkeeping.
 *
 * Opened from the "Change History" button in the sheet's XP Log box.
 */

const SYS = "seventh-sea-1e";
const KEY = "changeLog";
const MAX = 500;
const NO_LOG = "ss1eNoLog";
const LOGGED_TYPES = new Set(["hero", "villain", "brute", "monster", "ship"]);

/** Paths (relative to the document) that are never worth recording. */
const IGNORE = [
  /^flags\./, /^_stats/, /^_id$/, /^sort$/, /^ownership/, /^folder$/,
  /^system\.uiPrefs/, /^system\.initiative/, /^prototypeToken\./
];

const ignored = path => IGNORE.some(r => r.test(path));
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Short, readable form of a value for the log. */
function show(v) {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "object") return Array.isArray(v) ? `[${v.length} items]` : "{…}";
  const s = String(v).replace(/<[^>]+>/g, "").trim();
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
}

/**
 * Recursively diff `before` against the update `after`, collecting leaf changes by path.
 * Only keys present in the update are walked (absent keys aren't being changed).
 */
function diff(before, after, path, out) {
  if (path && ignored(path)) return;
  const isObj = v => v !== null && typeof v === "object";
  if (isObj(after)) {
    const base = isObj(before) ? before : {};
    for (const k of Object.keys(after)) diff(base[k], after[k], path ? `${path}.${k}` : k, out);
    // An array that got shorter lost its tail entries.
    if (Array.isArray(after) && Array.isArray(before)) {
      for (let i = after.length; i < before.length; i++) diff(before[i], undefined, `${path}.${i}`, out);
    }
    return;
  }
  if (isObj(before)) {
    // Something removed: record its leaves as cleared.
    for (const k of Object.keys(before)) diff(before[k], undefined, `${path}.${k}`, out);
    return;
  }
  if (!same(before, after)) out.push({ path, before, after });
}

/* -------------------------------------------- */
/*  Labels                                      */
/* -------------------------------------------- */

const loc = k => game.i18n.localize(k);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const words = s => cap(String(s).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[._]/g, " "));

/** Turn a document path into something a person can read. */
function labelFor(path, doc) {
  const p = path.replace(/^system\./, "");
  const m = (re) => p.match(re);
  let r;
  if (p === "name") return loc("SS1E.ChangeLog.Name");
  if (p === "img") return loc("SS1E.ChangeLog.Portrait");
  if ((r = m(/^traits\.(\w+)\.value$/))) return words(r[1]);
  if (p === "wounds.flesh.value") return loc("SS1E.UI.FleshWounds");
  if ((r = m(/^wounds\.dramatic\.cols\.(\d+)$/))) return `${loc("SS1E.UI.DramaticWounds")} (${Number(r[1]) + 1})`;
  if (p === "resources.dramaDice.value") return loc("SS1E.ChangeLog.DramaDice");
  if ((r = m(/^xpLog\.entries\.(\d+)(?:\.(\w+))?$/))) {
    const what = r[2] === "amount" ? "XP" : r[2] === "label" ? loc("SS1E.UI.XPLogLabel") : r[2] ? words(r[2]) : "";
    return `${loc("SS1E.UI.XPLog")} #${Number(r[1]) + 1}${what ? ` ${what}` : ""}`;
  }
  // Generic: "reputation.entries.2.text" -> "Reputation 3 Text", "charInfo.nationality" -> "Nationality"
  return p.split(".").filter(s => !["value", "entries", "charInfo", "rows"].includes(s))
    .map(s => /^\d+$/.test(s) ? String(Number(s) + 1) : words(s)).join(" ") || p;
}

function itemLabel(item) {
  const key = `SS1E.ItemType.${cap(item.type)}`;
  const type = item.system?.isFlaw ? loc("SS1E.ChangeLog.Flaw") : game.i18n.has(key) ? loc(key) : words(item.type);
  return `${type} "${item.name}"`;
}

/* -------------------------------------------- */
/*  Writing                                     */
/* -------------------------------------------- */

function newEntry(what, changes) {
  return { t: Date.now(), user: game.user.name, what, changes };
}

function appended(actor, entry) {
  return [...(actor.getFlag(SYS, KEY) ?? []), entry].slice(-MAX);
}

/** Append an entry with its own small update (used for item changes). */
function writeEntry(actor, entry) {
  if (!actor?.isOwner) return;
  return actor.update({ [`flags.${SYS}.${KEY}`]: appended(actor, entry) }, { [NO_LOG]: true, render: false });
}

export function registerChangeLog() {
  // Actor fields: diff now and ride along in the same update.
  Hooks.on("preUpdateActor", (actor, changes, options, userId) => {
    if (options[NO_LOG] || userId !== game.user.id || !LOGGED_TYPES.has(actor.type)) return;
    const found = [];
    diff(actor._source, changes, "", found);
    const lines = found.filter(c => !ignored(c.path))
      .map(c => ({ label: labelFor(c.path, actor), before: show(c.before), after: show(c.after) }))
      .filter(c => c.before !== c.after);
    if (!lines.length) return;
    foundry.utils.setProperty(changes, `flags.${SYS}.${KEY}`, appended(actor, newEntry("", lines)));
  });

  // Items: record after success, by the user who made the change.
  const owner = item => (item.parent instanceof Actor && LOGGED_TYPES.has(item.parent.type)) ? item.parent : null;

  Hooks.on("createItem", (item, options, userId) => {
    const actor = owner(item);
    if (!actor || userId !== game.user.id || options[NO_LOG]) return;
    writeEntry(actor, newEntry(game.i18n.format("SS1E.ChangeLog.Added", { item: itemLabel(item) }), []));
  });

  Hooks.on("deleteItem", (item, options, userId) => {
    const actor = owner(item);
    if (!actor || userId !== game.user.id || options[NO_LOG]) return;
    writeEntry(actor, newEntry(game.i18n.format("SS1E.ChangeLog.Removed", { item: itemLabel(item) }), []));
  });

  Hooks.on("preUpdateItem", (item, changes, options, userId) => {
    if (!owner(item) || userId !== game.user.id || options[NO_LOG]) return;
    const found = [];
    diff(item._source, changes, "", found);
    options.ss1eItemChanges = found.filter(c => !ignored(c.path))
      .map(c => ({ label: labelFor(c.path, item), before: show(c.before), after: show(c.after) }))
      .filter(c => c.before !== c.after);
    options.ss1eItemLabel = itemLabel(item);
  });

  Hooks.on("updateItem", (item, changes, options, userId) => {
    const actor = owner(item);
    if (!actor || userId !== game.user.id || !options.ss1eItemChanges?.length) return;
    writeEntry(actor, newEntry(options.ss1eItemLabel, options.ss1eItemChanges));
  });
}

/* -------------------------------------------- */
/*  Viewer                                      */
/* -------------------------------------------- */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ChangeLogViewer extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["seventh-sea-1e", "ss1e-change-log"],
    window: { icon: "fa-solid fa-scroll", resizable: true },
    position: { width: 640, height: 560 }
  };

  static PARTS = {
    body: { template: "systems/seventh-sea-1e/templates/apps/change-log.hbs", scrollable: [".cl-list"] }
  };

  constructor(actor, options = {}) {
    super({ id: `ss1e-change-log-${actor.id}${actor.isToken ? "-" + actor.token.id : ""}`, ...options });
    this.actor = actor;
  }

  get title() {
    return game.i18n.format("SS1E.ChangeLog.Title", { name: this.actor.name });
  }

  async _prepareContext() {
    const fmt = new Intl.DateTimeFormat(game.i18n.lang, { dateStyle: "medium", timeStyle: "short" });
    const log = [...(this.actor.getFlag(SYS, KEY) ?? [])].reverse();
    return {
      count: log.length, max: MAX,
      entries: log.map(e => ({ when: fmt.format(new Date(e.t)), iso: new Date(e.t).toISOString(), user: e.user, what: e.what, changes: e.changes }))
    };
  }

  _onFirstRender() {
    // Keep the window current while it's open.
    this._hook = Hooks.on("updateActor", a => { if (a === this.actor) this.render(); });
  }

  _onClose() {
    if (this._hook) Hooks.off("updateActor", this._hook);
  }

  static open(actor) {
    return new ChangeLogViewer(actor).render({ force: true });
  }
}
