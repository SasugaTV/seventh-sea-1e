/**
 * 7th Sea 1e — Global settings.
 * Registers the GM Dashboard as a sidebar panel (v14 compatible).
 */
import { SeventhSeaGMDashboard } from "./apps/gm-dashboard.mjs";

export function registerSettings() {
  // Register the GM Dashboard as a sidebar panel (v14 compatible).
  Hooks.on("getSidebarTabs", (tabs) => {
    tabs.push({
      id: "gm-dashboard",
      name: game.i18n.localize("SS1E.Dashboard.Title"),
      icon: "fas fa-chess-board",
      content: SeventhSeaGMDashboard,
      visible: game.user.isGM,
    });
  });
}
