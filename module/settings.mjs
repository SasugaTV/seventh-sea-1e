/**
 * 7th Sea 1e — Global settings.
 * Registers the GM Dashboard as a sidebar panel (v14 compatible).
 */

export function registerSettings() {
  // Add GM Dashboard as a persistent sidebar panel (v14 compatible).
  // This adds a tab to the left sidebar that renders the GM Dashboard template.
  Hooks.on("getSidebarTabs", (tabs) => {
    tabs.push({
      id: "gm-dashboard",
      name: game.i18n.localize("SS1E.Dashboard.Title"),
      icon: "fas fa-chess-board",
      content: "systems/seventh-sea-1e/templates/apps/gm-dashboard.html",
      active: false,
      visible: game.user.isGM,
    });
  });

  // Also add a button to the scene controls for quick toggle access.
  Hooks.on("getSceneControlButtons", (controls) => {
    const sceneControls = controls.find(c => c.group === "sceneControls");
    if (!sceneControls) return controls;

    sceneControls.tools = [
      ...sceneControls.tools,
      {
        name: "ss1e-gm-dashboard",
        title: game.i18n.localize("SS1E.Dashboard.Title"),
        icon: "fas fa-chess-board",
        button: true,
        visible: game.user.isGM,
        onClick: () => {
          const sidebar = game.ui.sidebar;
          if (!sidebar) {
            ui.notifications.error("Sidebar not available.");
            return;
          }
          const tab = sidebar.tabs.find(t => t.id === "gm-dashboard");
          if (tab) {
            tab.render();
          } else {
            ui.notifications.warn("GM Dashboard tab not found.");
          }
        },
      },
    ];

    return controls;
  });
}
