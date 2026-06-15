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
    formula: "",
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
  trait      = null,
  baseRank   = null,
  defaultAdvKept = 0,
  defaultAdvUnkept = 0,
  defaultAdvPips = 0,
  defaultFreeRaises = 0
} = {}) {

  const traits = actor ? [
    { key: "brawn", label: game.i18n.localize("SS1E.Trait.Brawn") },
    { key: "finesse", label: game.i18n.localize("SS1E.Trait.Finesse") },
    { key: "resolve", label: game.i18n.localize("SS1E.Trait.Resolve") },
    { key: "wits", label: game.i18n.localize("SS1E.Trait.Wits") },
    { key: "panache", label: game.i18n.localize("SS1E.Trait.Panache") }
  ] : [];

  let traitDropdown = "";
  if (actor && trait !== null && baseRank !== null) {
    const initialTraitVal = actor.getTrait(trait) || 0;
    const options = traits.map(t => `<option value="${t.key}" ${t.key === trait ? 'selected' : ''}>${t.label}</option>`).join("");
    traitDropdown = `
      <div class="form-group">
        <label>Trait <span class="trait-value-display" style="font-weight: bold; margin: 0 4px;">(${initialTraitVal})</span></label>
        <select name="trait_select">${options}</select>
      </div>
    `;
  }

  let dramaDiceDropdown = "";
  if (actor) {
    const availableDD = Math.min(10, Math.max(0, actor.system?.resources?.dramaDice?.value || actor.system?.dramaDice?.value || 0));
    let ddOptions = "";
    for(let i=0; i<=availableDD; i++) {
      ddOptions += `<option value="${i}">${i}</option>`;
    }
    dramaDiceDropdown = `
      <div class="form-group">
        <label>Use Drama Dice</label>
        <select name="drama_dice">${ddOptions}</select>
      </div>
    `;
  }

  const content = `
    <form class="ss1e-roll-dialog">
      ${traitDropdown}
      ${dramaDiceDropdown}
      <div class="form-group">
        <label>Advantage Kept</label>
        <input type="number" name="adv_kept" value="${defaultAdvKept}" min="0" max="20" />
      </div>
      <div class="form-group">
        <label>Advantage Unkept</label>
        <input type="number" name="adv_unkept" value="${defaultAdvUnkept}" min="0" max="20" />
      </div>
      <div class="form-group">
        <label>Advantage Pips</label>
        <input type="number" name="adv_pips" value="${defaultAdvPips}" min="-20" max="20" />
      </div>
      <div class="form-group">
        <label>Free Raises</label>
        <input type="number" name="free_raises" value="${defaultFreeRaises}" min="0" max="20" />
      </div>
      <div class="form-group">
        <label>${game.i18n.localize("SS1E.Dialog.Roll")}</label>
        <input type="number" name="roll" value="${defaultRoll}" min="0" max="20" />
      </div>
      <div class="form-group">
        <label>${game.i18n.localize("SS1E.Dialog.Keep")}</label>
        <input type="number" name="keep" value="${defaultKeep}" min="0" max="10" />
      </div>
      <div class="form-group">
        <label>${game.i18n.localize("SS1E.Dialog.TN")}</label>
        <select name="tn">
          <option value="5">5 Mundane</option>
          <option value="10">10 Easy</option>
          <option value="15" selected>15 Average</option>
          <option value="20">20 Hard</option>
          <option value="25">25 Very Hard</option>
          <option value="30">30 Heroic</option>
          <option value="35">35 Never Done Before</option>
          <option value="40">40 Never To Be Done Again</option>
        </select>
      </div>
      <div class="form-group">
        <label>Called Raises</label>
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
            const selectedTrait = html.find('[name="trait_select"]').val() || null;
            const spentDD = Number(fd.drama_dice) || 0;
            const advK = Number(fd.adv_kept) || 0;
            const advU = Number(fd.adv_unkept) || 0;
            const advP = Number(fd.adv_pips) || 0;
            const freeR = Number(fd.free_raises) || 0;
            
            if (actor && spentDD > 0) {
              const currentDD = actor.system?.resources?.dramaDice?.value ?? actor.system?.dramaDice?.value ?? 0;
              const propPath = (actor.system?.resources?.dramaDice !== undefined) 
                  ? "system.resources.dramaDice.value" 
                  : "system.dramaDice.value";
              await actor.update({[propPath]: Math.max(0, currentDD - spentDD)});
            }

            const result = await rollAndKeep({
              actor,
              roll:  Number(fd.roll),
              keep:  Number(fd.keep),
              bonus: advP + (freeR * 5),
              tn:    Number(fd.tn),
              raises: Number(fd.raises),
              flavor: knack ? game.i18n.format("SS1E.Chat.KnackRoll", { knack }) : ""
            });
            resolve({ ...result, trait: selectedTrait, advKept: advK, advUnkept: advU, advPips: advP, freeRaises: freeR });
          }
        },
        cancel: {
          label: game.i18n.localize("SS1E.Dialog.Cancel"),
          callback: () => resolve(null)
        }
      },
      render: (html) => {
        const updateDice = () => {
          let currentRoll = defaultRoll;
          let currentKeep = defaultKeep;
          let newTraitVal = 0;

          if (actor && baseRank !== null) {
            const newTraitKey = html.find('[name="trait_select"]').val() || trait;
            newTraitVal = actor.getTrait(newTraitKey) || 0;
            html.find('.trait-value-display').text(`(${newTraitVal})`);
            currentRoll = newTraitVal + baseRank;
            currentKeep = newTraitVal;
          }

          const ddUsed = Number(html.find('[name="drama_dice"]').val() || 0);
          const advK = Number(html.find('[name="adv_kept"]').val() || 0);
          const advU = Number(html.find('[name="adv_unkept"]').val() || 0);
          
          let finalRoll = currentRoll + ddUsed + advK + advU;
          let finalKeep = currentKeep + ddUsed + advK;

          if (finalRoll > 10) {
             const overflow = finalRoll - 10;
             finalRoll = 10;
             finalKeep = Math.min(finalKeep + Math.floor(overflow / 2), 10);
          }

          html.find('[name="roll"]').val(finalRoll);
          html.find('[name="keep"]').val(finalKeep);
        };

        html.find('[name="trait_select"], [name="drama_dice"], [name="adv_kept"], [name="adv_unkept"]').change(updateDice);
        html.find('[name="adv_kept"], [name="adv_unkept"]').keyup(updateDice);
        updateDice(); // Initialize immediately to ensure default advantages are applied to roll inputs
      },
      default: "roll"
    }).render(true);
  });
}
