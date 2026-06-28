/**
 * 7th Sea 1e — Global settings.
 * Registers the GM Dashboard button on the scene controls (left toolbar),
 * matching how Dice Oracles adds its button.
 */
import { SeventhSeaGMDashboard } from "./apps/gm-dashboard.mjs";

export function registerSettings() {
  // Add GM Dashboard button to the scene controls (left toolbar), same as Dice Oracles.
  Hooks.on("getSceneControlButtons", (controls) => {
    // Only show to GM
    if (!game.user.isGM) return controls;

    // Find the sceneControls group
    const sceneControls = controls.find(c => c.group === "sceneControls");
    if (!sceneControls) return controls;

    // Add our button to the tools
    sceneControls.tools["seventh-sea-gm-dashboard"] = {
      name: "seventh-sea-gm-dashboard",
      title: game.i18n.localize("SS1E.Dashboard.Title"),
      icon: "fas fa-chess-board",
      button: true,
      visible: true,
      onClick: () => {
        // Open the GM Dashboard as a pop-out window
        const dashboard = new SeventhSeaGMDashboard();
        dashboard.render(true);
      },
    };

    return controls;
  });
}
