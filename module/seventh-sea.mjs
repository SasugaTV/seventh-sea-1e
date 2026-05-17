/**
 * 7th Sea 1st Edition — Foundry VTT v12 Game System
 * Entry point.
 */

import { SS1E } from "./helpers/config.mjs";
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { registerHandlebarsHelpers } from "./helpers/handlebars.mjs";

import { SeventhSeaActor }      from "./documents/actor.mjs";
import { SeventhSeaItem }       from "./documents/item.mjs";
import { SeventhSeaActorSheet } from "./sheets/actor-sheet.mjs";
import { SeventhSeaItemSheet }  from "./sheets/item-sheet.mjs";
import { rollAndKeep, promptRollAndKeep } from "./dice/roll-and-keep.mjs";

/* -------------------------------------------- */
/*  Init Hook                                    */
/* -------------------------------------------- */

Hooks.once("init", function () {
  console.log("7th Sea 1e | Initializing system");

  // Expose system globals
  game.seventhSea = {
    SeventhSeaActor,
    SeventhSeaItem,
    rollAndKeep,
    promptRollAndKeep,
    config: SS1E
  };

  CONFIG.SS1E = SS1E;

  // Custom Initiative formula: Panache + Wits keep Panache
  CONFIG.Combat.initiative = {
    formula: "1d10",
    decimals: 2
  };

  // Custom Document classes
  CONFIG.Actor.documentClass = SeventhSeaActor;
  CONFIG.Item.documentClass  = SeventhSeaItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("seventh-sea-1e", SeventhSeaActorSheet, {
    makeDefault: true,
    label: "SS1E.SheetLabels.Actor"
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("seventh-sea-1e", SeventhSeaItemSheet, {
    makeDefault: true,
    label: "SS1E.SheetLabels.Item"
  });

  // Preload templates & register helpers
  registerHandlebarsHelpers();
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Ready Hook                                   */
/* -------------------------------------------- */

Hooks.once("ready", function () {
  console.log("7th Sea 1e | Ready");
  // Register chat-card click handler for re-rolls / Drama Dice
  $(document).on("click", ".ss1e-chat-button", _onChatButton);
});

/* -------------------------------------------- */
/*  Chat Card Buttons                            */
/* -------------------------------------------- */

async function _onChatButton(event) {
  event.preventDefault();
  const btn = event.currentTarget;
  const action = btn.dataset.action;
  const messageId = btn.closest("[data-message-id]")?.dataset.messageId;
  const message = game.messages.get(messageId);
  if (!message) return;

  switch (action) {
    case "spend-drama":
      return _spendDramaDie(message);
    default:
      console.warn("7th Sea 1e | Unknown chat button action:", action);
  }
}

async function _spendDramaDie(message) {
  const actorId = message.getFlag("seventh-sea-1e", "actorId");
  const actor = game.actors.get(actorId);
  if (!actor) return ui.notifications.warn(game.i18n.localize("SS1E.Notif.NoActor"));
  const drama = actor.system.dramaDice?.value ?? 0;
  if (drama <= 0) return ui.notifications.warn(game.i18n.localize("SS1E.Notif.NoDrama"));

  await actor.update({ "system.dramaDice.value": drama - 1 });

  // Roll one extra exploding d10 and add to original total
  const original = message.getFlag("seventh-sea-1e", "rollData");
  if (!original) return;

  const extraRoll = await new Roll("1d10x10").evaluate();
  await extraRoll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: game.i18n.format("SS1E.Chat.DramaDieAdded", { name: actor.name })
  });
}
