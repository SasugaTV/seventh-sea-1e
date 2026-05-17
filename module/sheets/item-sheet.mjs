import { SS1E } from "../helpers/config.mjs";

export class SeventhSeaItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["seventh-sea-1e", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    return `systems/seventh-sea-1e/templates/item/item-${this.item.type}-sheet.hbs`;
  }

  /** @override */
  async getData() {
    const context = super.getData();
    context.system = context.data.system;
    context.config = SS1E;
    context.enriched = {
      description: await TextEditor.enrichHTML(context.system.description ?? "", { async: true })
    };
    return context;
  }
}
