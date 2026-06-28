/**
 * Custom Handlebars helpers for the 7th Sea 1e system.
 */
export function registerHandlebarsHelpers() {

  Handlebars.registerHelper("ss1e-concat", function (...args) {
    return args.slice(0, -1).join("");
  });

  Handlebars.registerHelper("ss1e-times", function (n, block) {
    let result = "";
    for (let i = 0; i < (Number(n) || 0); i++) {
      result += block.fn(i);
    }
    return result;
  });

  Handlebars.registerHelper("ss1e-eq", (a, b) => a === b);
  Handlebars.registerHelper("ss1e-neq", (a, b) => a !== b);
  Handlebars.registerHelper("ss1e-gt", (a, b) => Number(a) > Number(b));
  Handlebars.registerHelper("ss1e-gte", (a, b) => Number(a) >= Number(b));
  Handlebars.registerHelper("ss1e-lt", (a, b) => Number(a) < Number(b));
  Handlebars.registerHelper("ss1e-lte", (a, b) => Number(a) <= Number(b));

  Handlebars.registerHelper("ss1e-add", (a, b) => Number(a) + Number(b));
  Handlebars.registerHelper("ss1e-sub", (a, b) => Number(a) - Number(b));
  Handlebars.registerHelper("ss1e-min", (a, b) => Math.min(Number(a), Number(b)));
  Handlebars.registerHelper("ss1e-max", (a, b) => Math.max(Number(a), Number(b)));

  Handlebars.registerHelper("ss1e-capitalize", function (str) {
    if (typeof str !== "string" || !str.length) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  Handlebars.registerHelper("ss1e-rollAndKeep", function (roll, keep) {
    return `${Number(roll) || 0}k${Number(keep) || 0}`;
  });

  /* ── Dashboard-specific helpers ──────────── */

  Handlebars.registerHelper("range", function (n) {
    if (typeof n !== "number" || n < 0) return [];
    return Array.from({ length: n + 1 }, (_, i) => i);
  });

  Handlebars.registerHelper("parse-dice", function (str) {
    if (!str) return "-";
    const clean = str.replace(/[^0-9]/g, "");
    if (!clean.length) return "-";
    return [...clean].map(c => { const n = parseInt(c); return n === 0 ? 10 : n; }).join(", ");
  });

  Handlebars.registerHelper("keys", function (obj) {
    return Object.keys(obj || {});
  });

  Handlebars.registerHelper("power-level", function (stats) {
    if (!stats) return 0;
    return Object.values(stats).reduce((a, b) => a + (Number(b) || 0), 0);
  });

  Handlebars.registerHelper("clock-svg", function (tile) {
    const total = tile.slices || 4;
    let svgContent = "";
    for (let i = 0; i < total; i++) {
      const isFilled = i < (tile.filled || 0);
      const startAngle = (i * 360) / total;
      const endAngle = ((i + 1) * 360) / total;
      const rad1 = (startAngle * Math.PI) / 180;
      const rad2 = (endAngle * Math.PI) / 180;
      const x1 = 60 + 50 * Math.cos(rad1);
      const y1 = 60 + 50 * Math.sin(rad1);
      const x2 = 60 + 50 * Math.cos(rad2);
      const y2 = 60 + 50 * Math.sin(rad2);
      const longArc = (endAngle - startAngle) > 180 ? 1 : 0;
      const pathData = `M 60 60 L ${x1} ${y1} A 50 50 0 ${longArc} 1 ${x2} ${y2} Z`;
      svgContent += `<path d="${pathData}" class="clock-slice ${isFilled ? 'filled' : ''}" data-slice-index="${i}"></path>`;
    }
    return new Handlebars.SafeString(`<svg class="clock-svg" viewBox="0 0 120 120">${svgContent}</svg>`);
  });

  Handlebars.registerHelper("tileTemplate", function (type) {
    return `tile-${type}`;
  });

  Handlebars.registerHelper("math", function (a, op, b) {
    const numA = Number(a) || 0;
    const numB = Number(b) || 0;
    switch (op) {
      case "add":       return numA + numB;
      case "subtract":  return numA - numB;
      case "multiply":  return numA * numB;
      case "divide":    return numB !== 0 ? numA / numB : 0;
      default: return numA;
    }
  });

  Handlebars.registerHelper("if", function (condition, a, b) {
    if (condition) return a;
    return b;
  });

  Handlebars.registerHelper("lookup", function (obj, key) {
    return obj?.[key];
  });
}
