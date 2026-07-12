/**
 * 7th Sea 1e Roll & Keep dice engine.
 *
 * Mechanic:
 *  - Roll X d10s, keep the best Y of them.
 *  - 10s explode: the reroll adds to the SAME die (a 10 that rerolls a 2 is
 *    one kept die worth 12), chaining on further 10s.
 *  - Sum kept dice. Compare to a Target Number (TN).
 *  - Each Raise = +5 to the TN; success on Raises grants extra effects.
 *  - Neither side of the STARTING XkY may exceed 10: rolled dice over 10
 *    convert 1:1 into kept dice, and each kept die beyond 10 leaves the
 *    pool as a single flat +10. 11k3 → 10k4; 15k1 → 10k6; 11k10, 10k11
 *    and 11k11 → 10k10+10; 12k10 and 10k12 → 10k10+20.
 *  - Below the cap, keeps that exceed the rolled dice just clamp (3k4
 *    rolls as 3k3): they're placeholders that called-raise dice fill
 *    (3k4 + 1 raise = 4k4, + 2 raises = 5k4).
 *  - The cap is applied before rolling only — explosions during the roll
 *    freely take the result past it (a 10k10 with one explosion is
 *    effectively 11 kept dice, each at face value).
 */

import { SS1E } from "../helpers/config.mjs";

/**
 * Apply the dice-cap rule to an XkY pool. Returns the capped roll/keep and
 * the flat bonus produced by kept-dice overflow.
 *
 * @param {number} roll  Requested dice to roll.
 * @param {number} keep  Requested dice to keep.
 * @returns {{roll: number, keep: number, bonus: number}}
 */
export function normalizeRollAndKeep(roll, keep) {
  let r = Math.max(0, Math.floor(roll || 0));
  let k = Math.max(0, Math.floor(keep || 0));
  let bonus = 0;
  // Kept dice beyond the 10 cap exit as +10 each, taking their rolled die
  // with them when it exists beyond the roll cap: 11k11 and 10k11 are both
  // 10k10+10.
  if (k > 10) {
    const excess = k - 10;
    bonus += excess * 10;
    r -= Math.min(excess, Math.max(0, r - 10));
    k = 10;
  }
  // Keeps beyond the dice actually rolled, below the cap, simply clamp —
  // no bonus. 3k4 rolls as 3k3; called raises are what back those keeps
  // with real dice (3k4 + 1 raise die = 4k4).
  if (k > r) k = r;
  // Rolled dice beyond 10 promote to kept 1:1; if that overflows the kept
  // cap, the excess becomes +10s.
  if (r > 10) {
    k += r - 10;
    r = 10;
    if (k > 10) {
      bonus += (k - 10) * 10;
      k = 10;
    }
  }
  return { roll: r, keep: k, bonus };
}

/**
 * Build the Foundry Roll formula for an XkY exploding pool.
 * Uses `{n}d10x10kh{k}` — kh = keep highest, x10 = explode on 10.
 *
 * LEGACY: no longer used by rollAndKeep. Foundry's kh treats explosion
 * rerolls as separate dice, so it drops the reroll a kept 10 spawned;
 * rollAndKeep now keeps chains manually via keepHighestExplodedChains.
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
 * Apply keep-highest to an exploding d10 term where each explosion stays
 * attached to the die that spawned it (1e rule: a 10 rerolls and adds to the
 * same die, so 10 → 2 is one die worth 12).
 *
 * Foundry's `kh` modifier treats each exploded reroll as a separate die in
 * the pool, so the 2 spawned by a kept 10 would usually be discarded. Instead
 * we rebuild each die's explosion chain, rank dice by chain total, and
 * keep/discard whole chains.
 *
 * Relies on Foundry's Die#explode appending rerolls to the end of `results`
 * in the order the exploding results are scanned (array order), so the j-th
 * result flagged `exploded` owns the appended result at index `number + j`.
 *
 * @param {Die} die     An evaluated d10 Die term with the x10 modifier.
 * @param {number} keep How many dice (chains) to keep.
 */
export function keepHighestExplodedChains(die, keep) {
  const results = die.results;
  const base = Math.min(die.number ?? results.length, results.length);
  const chains = [];
  const chainOf = [];
  for (let i = 0; i < base; i++) {
    chainOf[i] = i;
    chains.push({ indices: [i], total: results[i].result });
  }
  let child = base;
  for (let i = 0; i < results.length && child < results.length; i++) {
    if (!results[i].exploded) continue;
    const c = chainOf[i];
    chainOf[child] = c;
    chains[c].indices.push(child);
    chains[c].total += results[child].result;
    child++;
  }
  const kept = new Set(
    [...chains]
      .sort((a, b) => b.total - a.total)
      .slice(0, Math.max(0, keep))
      .flatMap(ch => ch.indices)
  );
  results.forEach((r, i) => {
    r.active = kept.has(i);
    r.discarded = !r.active;
  });
}

/**
 * Tag explosion rerolls in a rendered roll tooltip with `ss1e-explosion` so
 * the extra dice spawned by 10s can be styled distinctly in the chat card.
 *
 * Explosion rerolls are always appended after a term's `number` base results,
 * and the tooltip renders one `.tooltip-part` per die term with one `.roll`
 * per result in results order.
 *
 * @param {Roll} roll      The evaluated roll.
 * @param {string} tooltip HTML from Roll#getTooltip.
 * @returns {string} The tooltip HTML with explosion rerolls tagged.
 */
function markExplosionRerolls(roll, tooltip) {
  const div = document.createElement("div");
  div.innerHTML = tooltip;
  const parts = div.querySelectorAll(".tooltip-part");
  roll.dice.forEach((die, i) => {
    const rolls = parts[i]?.querySelectorAll(".dice-rolls > .roll");
    if (!rolls) return;
    const base = Math.min(die.number ?? die.results.length, die.results.length);
    for (let j = base; j < rolls.length; j++) rolls[j].classList.add("ss1e-explosion");
  });
  return div.innerHTML;
}

/**
 * Execute a Roll & Keep and post the chat card.
 *
 * @param {object} options
 * @param {Actor}  [options.actor]    Source actor (for speaker + Drama Dice).
 * @param {number} [options.roll=1]   Dice to roll.
 * @param {number} [options.keep=1]   Dice to keep.
 * @param {number} [options.bonus=0]  Flat bonus.
 * @param {number|null} [options.tn]  Target number. Pass null for rolls with
 *                                    no TN (e.g. damage): the card shows only
 *                                    the total, no success/failure line.
 * @param {number} [options.raises=0] Called raises (TN += 5 × raises).
 * @param {string} [options.flavor]   Chat-card flavor.
 * @returns {Promise<Roll>}
 */
export async function rollAndKeep({
  actor      = null,
  roll       = 1,
  keep       = 1,
  bonus      = 0,
  tn         = SS1E.defaultTN,
  raises     = 0,
  flavor     = "",
  // For split dice pools (e.g., exploding drama vs non-exploding trait)
  exploding  = true,
  traitDice  = undefined,
  dramaDice  = undefined,
  advDice    = undefined,
  traitKeep  = undefined,
  dramaKeep  = undefined
} = {}) {

  const hasTN = tn !== null && tn !== undefined;
  const finalTN = hasTN ? Number(tn) + Number(raises) * SS1E.raiseIncrement : null;
  bonus = Number(bonus) || 0;
  let formula;
  // Keep count per Die term, aligned with Roll#dice order. A null entry means
  // the term already keeps natively (kh in the formula). Exploding terms get a
  // number and are kept manually so explosion rerolls stay with their die.
  const dieKeeps = [];
  if (traitDice !== undefined) {
    // Split dice pool (knack rolls) — trait dice don't explode, drama dice do
    const t = Math.max(0, Math.floor(traitDice));
    const d = Math.max(0, Math.floor(dramaDice));
    const a = advDice ? Math.max(0, Math.floor(advDice)) : 0;
    const tk = Math.max(0, Math.min(t + a, Math.floor(traitKeep || 0)));
    const dk = Math.max(0, Math.min(d, Math.floor(dramaKeep || 0)));

    if (exploding) {
      // One combined exploding pool — apply the dice cap to it as a whole.
      const norm = normalizeRollAndKeep(t + d + a, tk + dk);
      bonus += norm.bonus;
      formula = `${norm.roll}d10x10`;
      dieKeeps.push(norm.keep);
    } else {
      // Cap across the combined pool with the same semantics as
      // normalizeRollAndKeep, but pool-aware (trait dice don't explode):
      // 1) kept dice beyond 10 leave the pool entirely as +10 each
      //    (shaved from the trait side first, sparing exploding drama dice);
      // 2) rolled overflow promotes unkept dice into kept 1:1 (trait first);
      // 3) keeps that overflow the cap after promotion become +10s.
      let taDice = t + a, taKeep = tk, dDice = d, dKeep = dk;
      let overKeep = taKeep + dKeep - 10;
      if (overKeep > 0) {
        const cut = Math.min(overKeep, taKeep);
        taKeep -= cut; taDice -= cut; bonus += cut * 10; overKeep -= cut;
        if (overKeep > 0) { dKeep -= overKeep; dDice -= overKeep; bonus += overKeep * 10; }
      }
      let overRoll = taDice + dDice - 10;
      if (overRoll > 0) {
        const cutT = Math.min(overRoll, Math.max(0, taDice - taKeep));
        taDice -= cutT; taKeep += cutT; overRoll -= cutT;
        if (overRoll > 0) {
          const cutD = Math.min(overRoll, Math.max(0, dDice - dKeep));
          dDice -= cutD; dKeep += cutD;
        }
      }
      let extraKeep = taKeep + dKeep - 10;
      if (extraKeep > 0) {
        const cut = Math.min(extraKeep, taKeep);
        taKeep -= cut; bonus += cut * 10; extraKeep -= cut;
        if (extraKeep > 0) { dKeep -= extraKeep; bonus += extraKeep * 10; }
      }

      let splitFormula = "";
      if (taDice > 0) {
        splitFormula += `${taDice}d10kh${taKeep}`;
        dieKeeps.push(null);
      }
      if (dDice > 0) {
        if (splitFormula) splitFormula += " + ";
        splitFormula += `${dDice}d10x10`;
        dieKeeps.push(dKeep);
      }
      formula = splitFormula || "1d10";
      if (!splitFormula) dieKeeps.push(null);
    }
    if (bonus) formula += (bonus >= 0 ? ` + ${bonus}` : ` - ${Math.abs(bonus)}`);
  } else {
    // Simple pool — cap it, folding kept overflow into the flat bonus.
    // Reassigning roll/keep here also makes the chat card show the capped
    // formula (e.g. 11k3 displays as 10k4).
    const norm = normalizeRollAndKeep(roll, keep);
    bonus += norm.bonus;
    roll = norm.roll;
    keep = norm.keep;
    if (exploding) {
      formula = `${roll}d10x10`;
      dieKeeps.push(keep);
    } else {
      formula = `${roll}d10kh${keep}`;
      dieKeeps.push(null);
    }
    if (bonus) formula += (bonus >= 0 ? ` + ${bonus}` : ` - ${Math.abs(bonus)}`);
  }
  const r = new Roll(formula);
  await r.evaluate();

  if (dieKeeps.some(k => k !== null)) {
    r.dice.forEach((die, i) => {
      if (dieKeeps[i] != null) keepHighestExplodedChains(die, dieKeeps[i]);
    });
    const diceTotal = r.dice.reduce(
      (sum, die) => sum + die.results.reduce((s, x) => s + (x.active ? x.result : 0), 0),
      0
    );
    r._total = diceTotal + (Number(bonus) || 0);
  }

  const total = r.total;
  const success = hasTN ? total >= finalTN : true;
  const raisesEarned = hasTN ? Math.max(0, Math.floor((total - SS1E.defaultTN) / SS1E.raiseIncrement)) : 0;
  const raisesMet    = success && raises > 0;

  const tooltip = markExplosionRerolls(r, await r.getTooltip());

  const flavorText = flavor
    || (actor ? game.i18n.format("SS1E.Chat.RollFor", { name: actor.name }) : game.i18n.localize("SS1E.Chat.Roll"));

  const content = `
    <div class="ss1e-roll-card">
      <header><h3>${flavorText}</h3></header>
      <div class="ss1e-roll-line">
        <span class="ss1e-formula">${roll}k${keep}${bonus ? (bonus >= 0 ? ` + ${bonus}` : ` − ${Math.abs(bonus)}`) : ""}</span>
        ${hasTN ? `<span class="ss1e-vs">vs</span>
        <span class="ss1e-tn">TN ${finalTN}${raises ? ` (${raises} raise${raises === 1 ? "" : "s"})` : ""}</span>` : ""}
      </div>
      <div class="ss1e-roll-result ${hasTN ? (success ? "ss1e-success" : "ss1e-failure") : ""}">
        <strong>${total}</strong>${hasTN ? ` — ${success ? game.i18n.localize("SS1E.Chat.Success") : game.i18n.localize("SS1E.Chat.Failure")}` : ""}
        ${hasTN && raises && success ? `<span class="ss1e-raises-met"> · ${game.i18n.format("SS1E.Chat.RaisesEarned", { n: raisesEarned })}</span>` : ""}
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

  return { roll: r, message: msg, total, success, raisesEarned, raises: Number(raises) || 0 };
}

/**
 * Open a dialog to prompt for a Roll & Keep.
 */
export async function promptRollAndKeep({
  actor          = null,
  defaultRoll    = 1,
  defaultKeep    = 1,
  defaultBonus   = 0,
  title          = game.i18n.localize("SS1E.Dialog.RollAndKeep"),
  knack          = null,
  trait          = null,
  baseRank       = null,
  defaultAdvKept = 0,
  defaultAdvUnkept = 0,
  defaultAdvPips = 0,
  defaultFreeRaises = 0,
  defaultExplode = true
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
      <div class="form-group">
        <label>Explode</label>
        <input type="checkbox" name="explode" ${defaultExplode ? 'checked' : ''} />
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
            const ddUsed = Number(fd.drama_dice) || 0;
            const advK = Number(fd.adv_kept) || 0;
            const advU = Number(fd.adv_unkept) || 0;
            const advP = Number(fd.adv_pips) || 0;
            const freeR = Number(fd.free_raises) || 0;
            const exploding = html.find('[name="explode"]').prop('checked');
            const split = html[0]._splitDice;
            
            // Calculate final roll/keep for persistence to sheet
            const baseRoll = (actor && selectedTrait) ? (actor.getTrait(selectedTrait) || 0) + (baseRank || 0) : (defaultRoll || 0);
            const baseKeep = (actor && selectedTrait) ? actor.getTrait(selectedTrait) || 0 : (defaultKeep || 0);
            let finalRoll = baseRoll + ddUsed + advK + advU;
            let finalKeep = baseKeep + ddUsed + advK;

            if (actor && ddUsed > 0) {
              const currentDD = actor.system?.resources?.dramaDice?.value ?? actor.system?.dramaDice?.value ?? 0;
              const propPath = (actor.system?.resources?.dramaDice !== undefined) 
                  ? "system.resources.dramaDice.value" 
                  : "system.dramaDice.value";
              await actor.update({[propPath]: Math.max(0, currentDD - ddUsed)});
            }

            const rollOpts = {
              actor,
              roll:  Number(fd.roll),
              keep:  Number(fd.keep),
              bonus: advP + (freeR * 5) + (split ? 0 : (html[0]._capBonus || 0)),
              tn:    Number(fd.tn),
              raises: Number(fd.raises),
              flavor: knack ? game.i18n.format("SS1E.Chat.KnackRoll", { knack }) : "",
              exploding
            };
            if (split) {
              rollOpts.traitDice = split.traitDice;
              rollOpts.dramaDice = split.dramaDice;
              rollOpts.advDice = split.advDice;
              rollOpts.traitKeep = split.traitKeep;
              rollOpts.dramaKeep = split.dramaKeep;
            }
            const result = await rollAndKeep(rollOpts);
            resolve({ ...result, trait: selectedTrait, advKept: advK, advUnkept: advU, advPips: advP, freeRaises: freeR, usedRoll: finalRoll, usedKeep: finalKeep });
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
          let traitDice = 0, dramaDice = 0, advDice = 0, traitKeep = 0, dramaKeep = 0;

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
          
          traitDice = currentRoll;
          dramaDice = ddUsed;
          advDice = advK + advU;
          traitKeep = currentKeep + advK;
          dramaKeep = ddUsed + advK;

          let finalRoll = currentRoll + ddUsed + advK + advU;
          let finalKeep = currentKeep + ddUsed + advK;

          // Cap the displayed pool (inputs may never exceed 10k10); kept
          // overflow becomes a flat bonus stashed for roll time. Split knack
          // pools re-derive their own cap inside rollAndKeep.
          const norm = normalizeRollAndKeep(finalRoll, finalKeep);
          finalRoll = norm.roll;
          finalKeep = norm.keep;
          html[0]._capBonus = norm.bonus;

          html.find('[name="roll"]').val(finalRoll);
          html.find('[name="keep"]').val(finalKeep);
          
          // Only set split dice for knack rolls (when knack name is provided)
          if (knack) {
            html[0]._splitDice = { traitDice, dramaDice, advDice, traitKeep, dramaKeep };
          }
        };

        html.find('[name="trait_select"], [name="drama_dice"], [name="adv_kept"], [name="adv_unkept"]').change(updateDice);
        html.find('[name="adv_kept"], [name="adv_unkept"]').keyup(updateDice);
        updateDice(); // Initialize immediately to ensure default advantages are applied to roll inputs
      },
      default: "roll"
    }).render(true);
  });
}
