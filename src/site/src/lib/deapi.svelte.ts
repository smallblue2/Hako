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
    windowFocus(id: number) {
      windows.focusWindow(id);
    },
    windowGetX(id: number) {
      const win = windows.getWindowByID(id);
      return win.state.ctx.position.x;
    },
    windowGetY(id: number) {
      const win = windows.getWindowByID(id);
      return win.state.ctx.position.y;
    },
    windowMove(id: number, x: number, y: number) {
      let win = windows.getWindowByID(id);
      win.state.ctx.position.x = x;
      win.state.ctx.position.y = y;
      win.state.vtable.syncPosition();
    },
    windowGetWidth(id: number) {
      const win = windows.getWindowByID(id);
      return win.state.ctx.dimensions.width;
    },
    windowGetHeight(id: number) {
      const win = windows.getWindowByID(id);
      return win.state.ctx.dimensions.height;
    },
    windowResize(id: number, width: number, height: number) {
      let win = windows.getWindowByID(id);
      win.state.ctx.dimensions.width = width;
      win.state.ctx.dimensions.height = height;
      win.state.vtable.syncSize();
    },
    windowList(): OpenWindowRestricted[] {
      return windows._windows.map((win) => {
        return { id: win.id, type: win.type, show: win.state.show };
      })
    }
  };
}
