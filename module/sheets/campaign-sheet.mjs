import { gmJournal, endStoryDialog, exportAllJournals, exportAllLedgers, mirror, campaignActor } from "../ledger/campaign.mjs";
import { JournalViewer } from "../ledger/journal-viewer.mjs";

/**
 * Campaign Sheet (GM only). Holds the GM copy of every ledger journal, the Story list, and the
 * campaign-wide buttons: End Story, Export all journals / ledgers.
 */
export class SeventhSeaCampaignSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["seventh-sea-1e", "sheet", "actor", "campaign"],
      template: "systems/seventh-sea-1e/templates/actor/actor-campaign-sheet.hbs",
      width: 640, height: 640, resizable: true
    });
  }

  async getData() {
    const ctx = await super.getData();
    const fmt = t => t ? new Intl.DateTimeFormat(game.i18n.lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(t)) : "—";
    ctx.journals = gmJournal()
      .map(j => ({ key: j.uuid, name: j.name, count: j.lines.length, last: fmt(j.lines.at(-1)?.t) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    ctx.stories = [...(this.actor.getFlag("seventh-sea-1e", "stories") ?? [])].reverse()
      .map(s => ({ ...s, when: fmt(s.t) }));
    ctx.isGM = game.user.isGM;
    return ctx;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!game.user.isGM) return;
    html.on("click", "[data-action]", ev => {
      ev.preventDefault();
      const el = ev.currentTarget;
      switch (el.dataset.action) {
        case "end-story":      return endStoryDialog();
        case "export-journals": return exportAllJournals();
        case "export-ledgers": return exportAllLedgers();
        case "catch-up":       return mirror(game.actors.contents).then(() => this.render(false));
        case "view-journal": {
          const j = gmJournal().find(x => x.uuid === el.dataset.uuid);
          if (j) return JournalViewer.open({ title: j.name, lines: j.lines, gmCopy: true });
        }
      }
    });
  }
}

/** Redraw an open Campaign Sheet when its copy changes. */
Hooks.on("updateActor", actor => {
  if (actor.type === "campaign" && actor.sheet?.rendered) actor.sheet.render(false);
});

export { campaignActor };
