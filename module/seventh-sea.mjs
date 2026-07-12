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

Hooks.once("init", function () {
  console.log("7th Sea 1e | Initializing");

  game.seventhSea = {
    SeventhSeaActor, SeventhSeaItem,
    rollAndKeep, promptRollAndKeep,
    config: SS1E,
    migrateActor: _migrateActor
  };
  CONFIG.SS1E = SS1E;
  CONFIG.Combat.initiative = { formula: "1d10", decimals: 2 };
  CONFIG.Actor.documentClass = SeventhSeaActor;
  CONFIG.Item.documentClass  = SeventhSeaItem;

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("seventh-sea-1e", SeventhSeaActorSheet, {
    makeDefault: true, label: "SS1E.SheetLabels.Actor"
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("seventh-sea-1e", SeventhSeaItemSheet, {
    makeDefault: true, label: "SS1E.SheetLabels.Item"
  });

  registerHandlebarsHelpers();
  return preloadHandlebarsTemplates();
});

Hooks.once("ready", async function () {
  console.log("7th Sea 1e | Ready");
  $(document).on("click", ".ss1e-chat-button", _onChatButton);

  // Auto-migrate Hero / Villain actors that pre-date the latest schema.
  // Only the GM runs this so we don't fight over writes.
  if (game.user.isGM) {
    for (const actor of game.actors) {
      if (actor.type !== "hero" && actor.type !== "villain") continue;
      const patch = _migrateActor(actor);
      if (Object.keys(patch).length) {
        console.log(`7th Sea 1e | Migrating ${actor.name}:`, patch);
        await actor.update(patch);
      }
    }
  }
});

/* -------------------------------------------- */
/*  Schema migration                             */
/* -------------------------------------------- */

/**
 * Build the minimal patch that backfills missing data structures on an
 * existing hero/villain actor without overwriting anything the user has typed.
 */
function _migrateActor(actor) {
  const sys = actor.system || {};
  const patch = {};

  // resources.dramaDice / xp
  if (!sys.resources)              patch["system.resources"] = { income: "", xp: { value: 0, total: 0 }, dramaDice: { value: 0, max: 0 } };
  else {
    if (!sys.resources.dramaDice) patch["system.resources.dramaDice"] = { value: 0, max: 0 };
    if (!sys.resources.xp)        patch["system.resources.xp"]        = { value: 0, total: 0 };
  }

  // XP Log
  if (!sys.xpLog || !Array.isArray(sys.xpLog.entries)) {
    patch["system.xpLog"] = { entries: [] };
  }

  // UI prefs (font scale)
  if (!sys.uiPrefs || typeof sys.uiPrefs.fontScale !== "number") {
    patch["system.uiPrefs"] = { fontScale: 1.0 };
  }

  // Initiative tracked value
  if (!sys.initiative || !(typeof sys.initiative.value === "number")) {
    patch["system.initiative"] = { bonus: sys.initiative?.bonus ?? 0, value: 0 };
  }

  // Defense rows
  if (!sys.defense || !Array.isArray(sys.defense.rows)) {
    patch["system.defense"] = {
      rows: [
        { label: "Footwork",  passive: 5, active: 0 },
        { label: "Parry",     passive: 5, active: 0 },
        { label: "Balance",   passive: 5, active: 0 },
        { label: "Climbing",  passive: 5, active: 0 },
        { label: "Riding",    passive: 5, active: 0 },
        { label: "Leaping",   passive: 5, active: 0 },
        { label: "Sprinting", passive: 5, active: 0 },
        { label: "Swinging",  passive: 5, active: 0 }
      ]
    };
  }

  // Composure: full sub-tree if missing
  if (!sys.composure || !sys.composure.check) {
    patch["system.composure"] = {
      check: { roll: 0, keep: 0 },
      embarrassment: { value: 0 },
      humiliations:  { cols: [0, 0], max: 0 }
    };
  } else if (!sys.composure.embarrassment) {
    patch["system.composure.embarrassment"] = { value: 0 };
  }

  // Wounds: cols shape
  if (!sys.wounds || !sys.wounds.dramatic || !Array.isArray(sys.wounds.dramatic.cols)) {
    patch["system.wounds"] = {
      check:    { roll: 0, keep: 0 },
      flesh:    { value: sys.wounds?.flesh?.value ?? 0 },
      dramatic: { cols: [0, 0], max: 0 }
    };
  }

  // Other heroic arrays (in case actor predates them entirely)
  if (!sys.reputation || !Array.isArray(sys.reputation.entries) || sys.reputation.entries.length === 0)   patch["system.reputation"]   = { cap: 0, total: 0, entries: Array.from({length: 5}, () => ({ text: "", value: 0 })) };
  if (!sys.backgrounds || !Array.isArray(sys.backgrounds.rows) || sys.backgrounds.rows.length === 0)    patch["system.backgrounds"]  = { rows: Array.from({length: 5}, () => ({ text: "", value: 0 })) };
  if (!sys.accoutrements || !Array.isArray(sys.accoutrements.rows) || sys.accoutrements.rows.length === 0)patch["system.accoutrements"]= { rows: Array.from({length: 10}, () => ({ text: "", value: 0 })) };
  if (!sys.contacts || !Array.isArray(sys.contacts.rows) || sys.contacts.rows.length === 0)          patch["system.contacts"]     = { rows: Array.from({length: 5}, () => ({ name: "", favor: 0, role: "" })) };
  if (!sys.languages || !Array.isArray(sys.languages.rows) || sys.languages.rows.length === 0)        patch["system.languages"]    = { extraLabel: "", rows: Array.from({length: 5}, () => ({ name: "", rank: 0, rw: 0 })) };
  if (!sys.wealth || !Array.isArray(sys.wealth.rows) || sys.wealth.rows.length === 0)                  patch["system.wealth"]       = { rows: Array.from({length: 10}, () => ({ text: "", value: 0 })) };
  if (!sys.weapons || !Array.isArray(sys.weapons.rows) || sys.weapons.rows.length === 0)              patch["system.weapons"]      = {
    rows: Array.from({length: 4}, () => ({ name: "", knack: "", atk1: { roll: 0, keep: 0 }, atk2: { roll: 0, keep: 0 }, dmg1: { roll: 0, keep: 0, bonus: 0 }, dmg2: { roll: 0, keep: 0 }, notes: "", range: "", shtMod: "", lngMod: "", reload: "" }))
  };
  // Weapons list shrank from 8 default rows to 4 (two lines per weapon):
  // trim trailing rows that hold no data, but never below 4 and never a row
  // the player has filled in.
  else if (sys.weapons.rows.length > 4) {
    const rows = sys.weapons.rows;
    const isEmptyRow = r => !r?.name && !r?.notes && !r?.range && !r?.shtMod && !r?.lngMod && !r?.reload
      && !r?.knack && !(Number(r?.dmg1?.roll) || 0) && !(Number(r?.dmg1?.keep) || 0) && !(Number(r?.dmg1?.bonus) || 0)
      && !(Number(r?.atk1?.roll) || 0) && !(Number(r?.atk1?.keep) || 0);
    let keep = rows.length;
    while (keep > 4 && isEmptyRow(rows[keep - 1])) keep--;
    if (keep < rows.length) patch["system.weapons.rows"] = rows.slice(0, keep);
  }

  return patch;
}

/* -------------------------------------------- */
/*  Chat-card buttons                            */
/* -------------------------------------------- */

async function _onChatButton(event) {
  event.preventDefault();
  const btn = event.currentTarget;
  const action = btn.dataset.action;
  const messageId = btn.closest("[data-message-id]")?.dataset.messageId;
  const message = game.messages.get(messageId);
  if (!message) return;
  switch (action) {
    case "spend-drama":  return _spendDramaDie(message);
    default: console.warn("7th Sea 1e | Unknown chat button:", action);
  }
}

async function _spendDramaDie(message) {
  const actorId = message.getFlag("seventh-sea-1e", "actorId");
  const actor = game.actors.get(actorId);
  if (!actor) return ui.notifications.warn(game.i18n.localize("SS1E.Notif.NoActor"));
  const drama = actor.system.resources?.dramaDice?.value ?? 0;
  if (drama <= 0) return ui.notifications.warn(game.i18n.localize("SS1E.Notif.NoDrama"));
  await actor.update({ "system.resources.dramaDice.value": drama - 1 });
  const extraRoll = await new Roll("1d10x990=10").evaluate();
  await extraRoll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: game.i18n.format("SS1E.Chat.DramaDieAdded", { name: actor.name })
  });
}
