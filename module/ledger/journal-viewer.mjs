/**
 * Read-only window listing ledger journal lines, newest first. Used for a character's own journal
 * (from the sheet) and for the GM copy (from the Campaign Sheet).
 */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class JournalViewer extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["seventh-sea-1e", "ss1e-change-log", "ss1e-journal-viewer"],
    window: { icon: "fa-solid fa-book", resizable: true },
    position: { width: 680, height: 560 }
  };

  static PARTS = {
    body: { template: "systems/seventh-sea-1e/templates/apps/ledger-journal.hbs", scrollable: [".cl-list"] }
  };

  constructor({ title, lines, gmCopy = false }, options = {}) {
    super(options);
    this._title = title;
    this._lines = lines;
    this._gmCopy = gmCopy;
  }

  get title() {
    return game.i18n.format(this._gmCopy ? "SS1E.Ledger.GMJournalTitle" : "SS1E.Ledger.JournalTitle", { name: this._title });
  }

  async _prepareContext() {
    const fmt = new Intl.DateTimeFormat(game.i18n.lang, { dateStyle: "medium", timeStyle: "short" });
    const L = k => game.i18n.localize(k);
    const desc = e => e ? `${e.dir === "credit" ? "+" : "−"}${e.amount} ${e.cur} · ${e.reason || "—"}` : "";
    return {
      gmCopy: this._gmCopy,
      count: this._lines.length,
      lines: [...this._lines].reverse().map(j => ({
        when: fmt.format(new Date(j.t)), iso: new Date(j.t).toISOString(), user: j.user,
        op: L(`SS1E.Ledger.Op.${j.op}`),
        now: j.op === "delete" ? "" : desc(j.entry),
        was: j.op === "add" ? "" : desc(j.before)
      }))
    };
  }

  static open(data) {
    return new JournalViewer(data).render({ force: true });
  }
}
