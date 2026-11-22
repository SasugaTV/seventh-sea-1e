/**
 * Brute Squad roll (1e GM's Guide, Brute Squads): roll one die per Brute taking part,
 * keep the Squad's Threat Rating, or every die if fewer Brutes than that are rolling.
 * The dialog adds or removes dice (rolled or kept) and flat pips, and can take a TN.
 */
import { rollAndKeep } from "./roll-and-keep.mjs";

const L = k => game.i18n.localize(k);

/** Pure: the pool for `brutes` rolling at `threat`, plus modifiers. */
export function brutePool({ brutes, threat, extraRoll = 0, extraKeep = 0, pips = 0 }) {
  const n = Math.max(0, Math.floor(brutes) || 0);
  const roll = Math.max(0, n + (Math.floor(extraRoll) || 0));
  const keep = Math.max(0, Math.min(n, Math.floor(threat) || 0) + (Math.floor(extraKeep) || 0));
  return { roll, keep: Math.min(keep, roll), bonus: Math.floor(pips) || 0 };
}

function label(p) {
  const b = p.bonus ? (p.bonus > 0 ? ` + ${p.bonus}` : ` − ${Math.abs(p.bonus)}`) : "";
  return `${p.roll}k${p.keep}${b}`;
}

export async function promptBruteRoll(actor) {
  const sys = actor.system;
  const threat = Number(sys.threat) || 0;
  const left = Number(sys.brutes?.value) || 0;
  if (left < 1) return ui.notifications.warn(game.i18n.format("SS1E.BruteRoll.NoneLeft", { name: actor.name }));

  const num = (name, value, min, max) =>
    `<input type="number" name="${name}" value="${value}" ${min !== null ? `min="${min}"` : ""} ${max !== null ? `max="${max}"` : ""} step="1" />`;
  const content = `
    <div class="ss1e-roll-dialog ss1e-brute-roll">
      <p class="hint">${game.i18n.format("SS1E.BruteRoll.Rule", { threat })}</p>
      <div class="form-group"><label>${L("SS1E.BruteRoll.Brutes")}</label>${num("brutes", left, 1, left)}</div>
      <div class="form-group"><label>${L("SS1E.BruteRoll.ExtraRoll")}</label>${num("extraRoll", 0, -10, 10)}</div>
      <div class="form-group"><label>${L("SS1E.BruteRoll.ExtraKeep")}</label>${num("extraKeep", 0, -10, 10)}</div>
      <div class="form-group"><label>${L("SS1E.BruteRoll.Pips")}</label>${num("pips", 0, -50, 50)}</div>
      <div class="form-group"><label>${L("SS1E.BruteRoll.TN")}</label><input type="number" name="tn" value="" min="0" step="5" placeholder="—" /></div>
      <div class="form-group"><label>${L("SS1E.BruteRoll.Raises")}</label>${num("raises", 0, 0, 10)}</div>
      <p class="ss1e-brute-pool"><strong>${L("SS1E.BruteRoll.Pool")}:</strong> <span data-pool>${label(brutePool({ brutes: left, threat }))}</span></p>
    </div>`;

  const read = form => {
    const v = n => Number(form.elements[n]?.value) || 0;
    return {
      brutes: Math.min(left, Math.max(1, v("brutes"))), extraRoll: v("extraRoll"), extraKeep: v("extraKeep"),
      pips: v("pips"), raises: v("raises"), tn: form.elements.tn?.value === "" ? null : v("tn")
    };
  };

  const data = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.format("SS1E.BruteRoll.Title", { name: actor.name }) },
    content,
    rejectClose: false,
    ok: { label: L("SS1E.BruteRoll.Roll"), icon: "fa-solid fa-dice", callback: (ev, button) => read(button.form) },
    render: (ev, dialog) => {
      const el = dialog.element ?? ev?.target?.element;
      const form = el?.querySelector("form");
      const out = el?.querySelector("[data-pool]");
      if (!form || !out) return;
      form.addEventListener("input", () => out.textContent = label(brutePool({ threat, ...read(form) })));
    }
  });
  if (!data) return;

  const p = brutePool({ threat, ...data });
  const flavor = game.i18n.format("SS1E.BruteRoll.Flavor", { name: actor.name, n: data.brutes, threat });
  return rollAndKeep({ actor, roll: p.roll, keep: p.keep, bonus: p.bonus, tn: data.tn, raises: data.raises, flavor });
}
