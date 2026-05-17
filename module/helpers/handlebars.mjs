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
}
