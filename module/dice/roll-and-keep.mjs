/**
 * 7th Sea 1e Roll & Keep dice engine.
 *
 * Mechanic:
 *  - Roll X d10s, keep the best Y of them.
 *  - 10s explode (reroll and add).
 *  - Sum kept dice. Compare to a Target Number (TN).
 *  - Each Raise = +5 to the TN; success on Raises grants extra effects.
 *  - Max dice rolled before unkept is 10; per house rule, overflow becomes
 *    extra kept dice at 2:1 (the engine respects whatever roll/keep you pass).
 */

import { SS1E } from "../helpers/config.mjs";

/**
 * Build the Foundry Roll formula for an XkY exploding pool.
 * Uses `{n}d10x10kh{k}` — kh = keep highest, x10 = explode on 10.
 *
 * @param {number} roll      Number of dice to roll.
 * @param {number} keep      Number of dice to keep.
 * @param {number} bonus     Flat modifier added to the kept total.
 * @returns {string} Foundry roll formula
 */
export function buildRollAndKeepFormula(roll, keep, bonus = 0) {
  const r = Math.max(0, Math.min(SS1E.maxDiceRolled, Math.floor(roll)));
  const k = Math.max(0, Math.min(r, Math.floor(keep)));
  let formula = `${r}d10x10kh${k}`;
  if (bonus) formula += (bonus >= 0 ? ` + ${bonus}` : ` - ${Math.abs(bonus)}`);
  return formula;
}

/**
 * Execute a Roll & Keep and post the chat card.
 *
 * @param {object} options
 * @param {Actor}  [options.actor]    Source actor (for speaker + Drama Dice).
 * @param {number} [options.roll=1]   Dice to roll.
 * @param {number} [options.keep=1]   Dice to keep.
 * @param {number} [options.bonus=0]  Flat bonus.
 * @param {number} [options.tn]       Target number (5 default).
 * @param {number} [options.raises=0] Called raises (TN += 5 × raises).
 * @param {string} [options.flavor]   Chat-card flavor.
 * @returns {Promise<Roll>}
 */
export async function rollAndKeep({
  actor    = null,
  roll     = 1,
  keep     = 1,
  bonus    = 0,
  tn       = SS1E.defaultTN,
  raises   = 0,
  flavor   = ""
} = {}) {

  const finalTN = Number(tn) + Number(raises) * SS1E.raiseIncrement;
  const formula = buildRollAndKeepFormula(roll, keep, bonus);
  const r = new Roll(formula);
  await r.evaluate();

  const total = r.total;
  const success = total >= finalTN;
  const raisesEarned = Math.max(0, Math.floor((total - SS1E.defaultTN) / SS1E.raiseIncrement));
  const raisesMet    = success && raises > 0;

  const tooltip = await r.getTooltip();

  const flavorText = flavor
    || (actor ? game.i18n.format("SS1E.Chat.RollFor", { name: actor.name }) : game.i18n.localize("SS1E.Chat.Roll"));

  const content = `
    <div class="ss1e-roll-card">
      <header><h3>${flavorText}</h3></header>
      <div class="ss1e-roll-line">
        <span class="ss1e-formula">${roll}k${keep}${bonus ? (bonus >= 0 ? ` + ${bonus}` : ` − ${Math.abs(bonus)}`) : ""}</span>
        <span class="ss1e-vs">vs</span>
        <span class="ss1e-tn">TN ${finalTN}${raises ? ` (${raises} raise${raises === 1 ? "" : "s"})` : ""}</span>
      </div>
      <div class="ss1e-roll-result ${success ? "ss1e-success" : "ss1e-failure"}">
        <strong>${total}</strong> — ${success ? game.i18n.localize("SS1E.Chat.Success") : game.i18n.localize("SS1E.Chat.Failure")}
        ${raises && success ? `<span class="ss1e-raises-met"> · ${game.i18n.format("SS1E.Chat.RaisesEarned", { n: raisesEarned })}</span>` : ""}
      </div>
      <div class="ss1e-tooltip">${tooltip}</div>
      ${actor ? `<footer class="ss1e-actions">
        <button class="ss1e-chat-button" data-action="spend-drama">
          ${game.i18n.localize("SS1E.Chat.SpendDramaDie")}
        </button>
      </footer>` : ""}
    </div>
  `;

  const msg = await r.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: content,
    flags: {
      "seventh-sea-1e": {
        actorId: actor?.id ?? null,
        rollData: { roll, keep, bonus, tn: finalTN, raises }
      }
    }
  });

  return { roll: r, message: msg, total, success, raisesEarned };
}

/**
 * Open a dialog to prompt for a Roll & Keep.
 */
export async function promptRollAndKeep({
  actor      = null,
  defaultRoll = 1,
  defaultKeep = 1,
  defaultBonus = 0,
  title      = game.i18n.localize("SS1E.Dialog.RollAndKeep"),
  knack      = null,
  trait      = null
} = {}) {

  const content = `
    <form class="ss1e-roll-dialog">
      <div class="form-group">
        <label>${game.i18n.localize("SS1E.Dialog.Roll")}</label>
        <input type="number" name="roll" value="${defaultRoll}" min="0" max="20" />
      </div>
      <div class="form-group">
        <label>${game.i18n.localize("SS1E.Dialog.Keep")}</label>
        <input type="number" name="keep" value="${defaultKeep}" min="0" max="10" />
      </div>
      <div class="form-group">
        <label>${game.i18n.localize("SS1E.Dialog.Bonus")}</label>
        <input type="number" name="bonus" value="${defaultBonus}" />
      </div>
      <div class="form-group">
        <label>${game.i18n.localize("SS1E.Dialog.TN")}</label>
        <input type="number" name="tn" value="${SS1E.defaultTN}" min="5" step="5" />
      </div>
      <div class="form-group">
        <label>${game.i18n.localize("SS1E.Dialog.Raises")}</label>
        <input type="number" name="raises" value="0" min="0" max="10" />
      </div>
    </form>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title,
      content,
      buttons: {
        roll: {
          label: game.i18n.localize("SS1E.Dialog.Roll"),
          callback: async (html) => {
            const fd = new FormDataExtended(html[0].querySelector("form")).object;
            const result = await rollAndKeep({
              actor,
              roll:  Number(fd.roll),
              keep:  Number(fd.keep),
              bonus: Number(fd.bonus),
              tn:    Number(fd.tn),
              raises: Number(fd.raises),
              flavor: knack ? game.i18n.format("SS1E.Chat.KnackRoll", { knack }) : ""
            });
            resolve(result);
          }
        },
        cancel: {
          label: game.i18n.localize("SS1E.Dialog.Cancel"),
          callback: () => resolve(null)
        }
      },
      default: "roll"
    }).render(true);
  });
}
