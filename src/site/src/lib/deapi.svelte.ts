import * as windows from "$lib/windows.svelte";
import * as creflect from "/creflect.mjs?url";

// Exposes desktop environment api functions to the window object
export function expose() {
  window.deapi = {
    creflect, 
    windowOpen(type: WindowType): number {
      return windows.applications[type as number].create();
    },
    windowHide(id: number) {
      windows.hideWindow(id);
    },
    windowShow(id: number) {
      windows.showWindow(id);
    },
    windowClose(id: number) {
      windows.closeWindow(id);
    },
    windowList(): OpenWindowRestricted[] {
      return windows._windows.map((win) => {
        return { id: win.id, type: win.type, show: win.state.show };
      })
    }
  };
}
