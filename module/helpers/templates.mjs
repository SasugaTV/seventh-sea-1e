/**
 * Preload Handlebars templates so they can be referenced by partial name.
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates([
    // Actor sheet partials
    "systems/seventh-sea-1e/templates/actor/parts/actor-traits.hbs",
    "systems/seventh-sea-1e/templates/actor/parts/actor-skills.hbs",
    "systems/seventh-sea-1e/templates/actor/parts/actor-advantages.hbs",
    "systems/seventh-sea-1e/templates/actor/parts/actor-inventory.hbs",
    "systems/seventh-sea-1e/templates/actor/parts/actor-sorcery.hbs",
    "systems/seventh-sea-1e/templates/actor/parts/actor-biography.hbs",
    "systems/seventh-sea-1e/templates/actor/parts/actor-wounds.hbs",
    "systems/seventh-sea-1e/templates/actor/parts/actor-header.hbs"
  ]);
};
