/**
 * 7th Sea 1e — Global settings.
 */

/**
 * Register the GM Dashboard control-bar button.
 * Works on FoundryVTT v12–v14 (Sidebars.registerApp is v15+).
 */
export function registerSettings() {
  // Register a button on the scene control bar to open the GM Dashboard.
  // This works across v12–v14 without needing Sidebars.registerApp (v15+ only).
  Hooks.on("getSceneControlButtons", (controls) => {
    return controls.map((group) => {
      if (group.group !== "sceneControls") return group;
      return {
        ...group,
        tools: [
          ...group.tools,
          {
            name: "ss1e-gm-dashboard",
            title: game.i18n.localize("SS1E.Dashboard.Title"),
            icon: "fas fa-chess-board",
            onClick: () => {
              const appClass = game.seventhSea?.GMDashboard;
              if (!appClass) {
                ui.notifications.error("GM Dashboard not loaded.");
                return;
              }
              let app = appClass.instances.find((a) => a instanceof appClass);
              if (app && app.app && !app.app.isClose) {
                app.app.close();
              } else {
                app = new appClass();
                app.app?.render(true);
              }
            },
            visible: game.user.isGM,
          },
        ],
      };
    });
  });
}
