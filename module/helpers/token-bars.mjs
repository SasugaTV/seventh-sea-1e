/**
 * Token resource bars for 7th Sea.
 *
 * Dramatic Wounds are stored as two columns of dots, each as long as Resolve. A full first column
 * is Crippled; both full is Knocked Out. Actors derive `system.wounds.dramatic.track`
 * ({value, max, taken, crippled}) so Foundry can draw it as a bar, and SeventhSeaToken draws that
 * bar its own way: red, with a box mark per wound and a gold Crippled tick halfway.
 *
 * World setting `dramaticBarMode`: "fill" (bar fills as wounds are taken, the default, like the
 * sheet's dots) or "drain" (full = unhurt, like a health bar).
 */

const SYS = "seventh-sea-1e";
export const DRAMATIC_BAR = "wounds.dramatic.track";

export function dramaticBarMode() {
  try { return game.settings.get(SYS, "dramaticBarMode"); } catch { return "fill"; }
}

/** Derive the bar data from the dots. Called from the actor's prepareDerivedData. */
export function prepareDramaticTrack(sys) {
  const dramatic = sys.wounds?.dramatic;
  if (!dramatic) return;
  const resolve = Number(sys.traits?.resolve?.value) || 0;
  dramatic.max = resolve;
  const taken = (dramatic.cols ?? []).slice(0, 2)
    .reduce((a, c) => a + Math.min(Math.max(Number(c) || 0, 0), resolve), 0);
  const max = resolve * 2;
  dramatic.track = {
    value: dramaticBarMode() === "drain" ? max - taken : taken,
    max, taken, crippled: resolve
  };
}

/** Wound colours by how hurt they are (not by bar direction). */
const HURT = { light: 0xd98a1e, crippled: 0xa01818, out: 0x4a0606 };

export class SeventhSeaToken extends foundry.canvas.placeables.Token {
  _drawBar(index, bar, data) {
    const track = this.actor?.system?.wounds?.dramatic?.track;
    if (data.attribute !== DRAMATIC_BAR || !track?.max) return super._drawBar(index, bar, data);

    const { width, height } = this.document.getSize();
    const s = canvas.dimensions.uiScale;
    const bw = width;
    const bh = 8 * (this.document.height >= 2 ? 1.5 : 1) * s;
    const pct = Math.clamp(Number(data.value), 0, track.max) / track.max;
    const color = track.taken >= track.max ? HURT.out
      : track.taken >= track.crippled ? HURT.crippled : HURT.light;

    bar.clear();
    // Background, and the filled part (from the left in both modes).
    bar.lineStyle(s, 0x000000, 1.0);
    bar.beginFill(0x000000, 0.55).drawRoundedRect(0, 0, bw, bh, 3 * s);
    bar.lineStyle(0);
    if (pct > 0) bar.beginFill(color, 1.0).drawRoundedRect(0, 0, pct * bw, bh, 2 * s);
    bar.endFill();

    // A thin divider per wound box, so the bar reads like the sheet's dots.
    if (track.max <= 24) {
      bar.lineStyle(Math.max(1, 0.75 * s), 0x000000, 0.45);
      for (let i = 1; i < track.max; i++) {
        const x = (i / track.max) * bw;
        bar.moveTo(x, 1 * s).lineTo(x, bh - 1 * s);
      }
    }

    // Crippled: a gold tick where the first column ends (the halfway point).
    const cx = (track.crippled / track.max) * bw;
    bar.lineStyle(2 * s, 0xf2d27a, 1.0);
    bar.moveTo(cx, -2 * s).lineTo(cx, bh + 2 * s);
    bar.lineStyle(0);

    bar.position.set(0, index === 0 ? height - bh : 0);
  }
}

/** Default bars for new actors of each type. */
export const DEFAULT_BARS = {
  hero:    { bar1: DRAMATIC_BAR, bar2: "resources.dramaDice" },
  villain: { bar1: DRAMATIC_BAR, bar2: "resources.dramaDice" },
  monster: { bar1: DRAMATIC_BAR, bar2: null },
  brute:   { bar1: "brutes",     bar2: null }
};

export function registerTokenBars() {
  CONFIG.Token.objectClass = SeventhSeaToken;

  const people = {
    bar: [DRAMATIC_BAR, "resources.dramaDice"],
    value: ["wounds.flesh.value", "composure.embarrassment.value", "initiative.value"]
  };
  CONFIG.Actor.trackableAttributes = {
    hero: people,
    villain: people,
    monster: { bar: [DRAMATIC_BAR], value: ["wounds.flesh.value", "initiative.value"] },
    brute: { bar: ["brutes"], value: ["threat"] }
  };

  game.settings.register(SYS, "dramaticBarMode", {
    name: "SS1E.Settings.DramaticBarMode.Name",
    hint: "SS1E.Settings.DramaticBarMode.Hint",
    scope: "world", config: true, type: String, default: "fill",
    choices: { fill: "SS1E.Settings.DramaticBarMode.Fill", drain: "SS1E.Settings.DramaticBarMode.Drain" },
    onChange: () => {
      // Re-derive every actor (including token-only ones on the canvas) and redraw the bars.
      for (const a of game.actors) a.prepareData();
      for (const t of canvas.tokens?.placeables ?? []) {
        t.document.reset();
        t.renderFlags.set({ refreshBars: true });
      }
    }
  });
}
