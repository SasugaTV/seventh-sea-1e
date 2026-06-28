/**
 * 7th Sea 1e — Global settings.
 */

/**
 * Register the GM Dashboard SidebarApp (sidebar-app) and the "Open GM Dashboard" button
 * on the GM control bar.
 */
export function registerSettings() {
  /* ── GM Dashboard (SidebarApp) ───────────── */

  const appClass = game.seventhSea?.GMDashboard;
  if (appClass) {
    // Register the SidebarApp class
    Sidebars.registerApp("ss1e-gm-dashboard", {
      name: "ss1e-gm-dashboard",
      title: game.i18n.localize("SS1E.Dashboard.Title"),
      icon: "fas fa-chess-board",
      type: "div",
      appClass: appClass,
      default: false,
      restricted: true,
      rank: 10,
    });

    // Add a button to the GM control bar
    const orig = game.settings.settings.get("core").options?.default;
    // Insert button via the control bar hook below
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
                const app = Sidebars.get("ss1e-gm-dashboard");
                if (app?.isOpened) app.close();
                else app?.open({ autoOpen: true });
              },
              visible: true,
            },
          ],
        };
      });
    });
  }
}
