<script lang="ts">
  import * as lib from "$lib";
  import * as windows from "$lib/windows.svelte.js";
  import _, * as overlay from "./Overlay.svelte";
  import { scale } from "svelte/transition";
  import { onMount } from "svelte";
  import { cubicInOut } from "svelte/easing";

  interface Props {
    id: number,
    onMaximize?: Function,
    onUnMaximize?: Function,
    onResize?: Function,
    onClose?: Function,
    onMove?: Function,
    onStop?: Function,
    data: any,
    dataRef: HTMLElement,
    layerFromId: number[],
    title: string,
    initOffset?: { x: number, y: number },
  };

  let { id, onMaximize, onUnMaximize, onResize, onClose, onMove, onStop, data, dataRef, layerFromId, title, initOffset = {x: 0, y: 0} }: Props = $props();

  // This is used to expose state to outside of the component
  let ctx: WindowContext = {
    position: { x: 0, y: 0 },
    dimensions: { width: 0, height: 0 },
  };

  let vtable: WindowVTable = {
    syncSize,
    syncPosition,
  };

  let root: HTMLDivElement = $state();
  let evWrap: HTMLDivElement = $state();

  let resizing = false;

  let maxX: number = undefined;
  let maxY: number = undefined;

  let maximized = false;
  let eventBorder: number = undefined;

  let innerMin = 200;

  function syncSize() {
    updateInnerSize(0, 0);
  }

  function syncPosition() {
    updatePosition();
  }

  function updateInnerSize(dw: number, dh: number) {
    ctx.dimensions.width = Math.max(innerMin, ctx.dimensions.width + dw);
    ctx.dimensions.height = Math.max(innerMin, ctx.dimensions.height + dh);
    requestAnimationFrame(() => {
      dataRef.style.width = `max(${innerMin}px, ${ctx.dimensions.width}px)`;
      dataRef.style.height = `max(${innerMin}px, ${ctx.dimensions.height}px)`;
      onResize?.();
    });
  }

  function updatePosition() {
    root.style.top = `clamp(-10vh, ${ctx.position.y}px, 90vh)`;
    root.style.left = `clamp(-10vw, ${ctx.position.x}px, 90vw)`;
  }

  // https://nolanlawson.com/2019/08/11/high-performance-input-handling-on-the-web/
  function throttle(timer: Function) {
    let queuedCallback: Function;
    return (callback: Function) => {
      if (!queuedCallback) {
        timer(() => {
          const cb = queuedCallback
          queuedCallback = null
          cb()
        })
      }
      queuedCallback = callback
    }
  }

  const throttleWrite = throttle(requestAnimationFrame);

  let lastX: number | undefined = undefined;
  let lastY: number | undefined = undefined;

  let deltaX: number = 0;
  let deltaY: number = 0;

  function onDragWindow(ev: PointerEvent) {
    deltaX += ev.screenX - (lastX ?? ev.screenX);
    deltaY += ev.screenY - (lastY ?? ev.screenY);
    throttleWrite(() => {
      ctx.position.x += deltaX;
      ctx.position.y += deltaY;
      deltaX = 0;
      deltaY = 0;
      updatePosition();
    })
    lastX = ev.screenX;
    lastY = ev.screenY;
  }

  function onHoldDecorations() {
    if (!maximized) {
      document.addEventListener("pointermove", onDragWindow);
      document.addEventListener("pointerup", onReleaseDecorations);
      overlay.toggleGrab();
      onMove?.();
    }
  }

  function onReleaseDecorations() {
    document.removeEventListener("pointermove", onDragWindow);
    document.removeEventListener("pointerup", onReleaseDecorations);
    overlay.toggleGrab();
    onStop?.();
    lastX = undefined;
    lastY = undefined;
  }

  function getSection(ox: number, oy: number, cx: number, cy: number, m: number) {
    if (ox <= m && oy <= m) { return lib.TOP_LEFT_CORNER; }
    if (ox >= (cx - m) && oy <= m) { return lib.TOP_RIGHT_CORNER; }
    if (ox <= m && oy >= (cy - m)) { return lib.BOTTOM_LEFT_CORNER; }
    if (ox >= (cx - m) && oy >= (cy - m)) { return lib.BOTTOM_RIGHT_CORNER; }
    if (ox <= m) { return lib.LEFT; }
    if (oy <= m) { return lib.TOP; }
    if (ox >= (cx - m)) { return lib.RIGHT; }
    if (oy >= (cy - m)) { return lib.BOTTOM; }
    return -1;
  }

  function onMoveResizeArea(ev: MouseEvent) {
    if (ev.target === root && !resizing) { // make sure hovering child element does not trigger this
      let { offsetX, offsetY } = ev;
      const sect = getSection(offsetX, offsetY, root.clientWidth, root.clientHeight, 10);
      document.documentElement.style.cursor = lib.SECTION_CURSORS[sect];
    }
  }

  let globalSect: number;

  function onDragResize(ev: MouseEvent) {
    const moveX = ev.screenX - (lastX ?? ev.screenX);
    const moveY = ev.screenY - (lastY ?? ev.screenY);

    const [ dw, dh ] = lib.getResizeFromSect(globalSect, moveX, moveY);
    updateInnerSize(dw, dh);

    let dy = 0;
    let dx = 0;

    switch (globalSect) {
      case lib.TOP_LEFT_CORNER:
        dy = moveY;
        dx = moveX;
      case lib.TOP:
      case lib.TOP_RIGHT_CORNER:
        dy = moveY;
        break;
      case lib.LEFT:
      case lib.BOTTOM_LEFT_CORNER:
        dx = moveX;
        break;
    }

    ctx.position.y = Math.max(-eventBorder, Math.min(ctx.position.y + dy, maxY));
    ctx.position.x = Math.max(-eventBorder, Math.min(ctx.position.x + dx, maxX));
    requestAnimationFrame(() => {
      updatePosition();
    })

    lastX = ev.screenX;
    lastY = ev.screenY;
  }

  async function onHoldResizeArea(ev: MouseEvent) {
    if (ev.target === root && !maximized) { // make sure hovering child element does not trigger this
      let { offsetX, offsetY } = ev;
      globalSect = getSection(offsetX, offsetY, root.clientWidth, root.clientHeight, 10);

      root.classList.toggle(lib.SECTION_STYLE[globalSect]);

      // Get target minimum x and y for clamping purposes
      // Basically the issue is that we are clamping the positions and width
      // based on the child contents div, so we need to calculate the position for
      // the parent based on that
      const dataRect = dataRef.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      maxX = (dataRect.x + dataRect.width) - innerMin - (dataRect.x - rootRect.x);
      maxY = (dataRect.y + dataRect.height) - innerMin - (dataRect.y - rootRect.y);

      resizing = true;
      document.addEventListener("pointermove", onDragResize);
      document.addEventListener("pointerup", onReleaseResizeArea);

      overlay.toggleGrab();
      overlay.setCursor(lib.SECTION_CURSORS[globalSect])
    }
  }

  function onReleaseResizeArea() {
    overlay.toggleGrab();
    root.classList.toggle(lib.SECTION_STYLE[globalSect]);
    resizing = false;
    document.removeEventListener("pointermove", onDragResize);
    document.removeEventListener("pointerup", onReleaseResizeArea);
    onExitResizeArea();
    lastX = undefined;
    lastY = undefined;
  }

  function onExitResizeArea() {
    if (!resizing) {
      document.documentElement.style.cursor = "revert";
      overlay.setCursor("auto");
    }
  }

  function noProp(ev: PointerEvent) {
    ev.stopPropagation();
  }

  function closeWindow() {
    if (onClose !== undefined) onClose();
    windows.closeWindow(id);
  }

  $effect(() => {
    root.style.zIndex = layerFromId[id].toString();
  })

  let decoRef: HTMLElement = $state();

  onMount(async () => {
    let win = windows.getWindowByID(id);
    win.state.ctx = ctx;
    win.state.vtable = vtable;

    let { initWidth, initHeight } = lib.getInitWindowSize();
    ctx.dimensions.width = initWidth;
    ctx.dimensions.height = initHeight;
    updateInnerSize(0, 0);
    // We need to calculate the expected size of the window based on the dimensions
    // of what we know and the initial width and height
    eventBorder = parseInt(window.getComputedStyle(evWrap).margin, 10);
    const { height: decoHeight } = decoRef.getBoundingClientRect();
    const expectedWidth = 2 * eventBorder + initWidth;
    const expectedHeight = 2 * eventBorder + initHeight + decoHeight;
    ctx.position.x = Math.floor((window.innerWidth - expectedWidth) / 2) + (initOffset.x ?? 0);
    ctx.position.y = Math.floor((window.innerHeight - expectedHeight) / 2) + (initOffset.y ?? 0);
    updatePosition();
  })
</script>

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div transition:scale={{ easing: cubicInOut, duration: 100, start: 0.5 }} id="window-{id}" bind:this={root} class="window" tabindex="-1" onfocusin={() => windows.focusWindow(id)}

  onpointermove={onMoveResizeArea}
  onpointerout={onExitResizeArea}
  onpointerdown={(ev) => {
    const middleClick = ev.buttons === 4;
    if (middleClick) {
      ev.preventDefault();
      closeWindow();
      return;
    }
    onHoldResizeArea(ev);
  }}>

  <div bind:this={evWrap} class="ev-wrapper">
    <div bind:this={decoRef} class="decorations" onpointerdown={onHoldDecorations}>
      <p class="title">{title}</p>
      <div class="btns">
        <button aria-label="Hide" title="Hide" class="btn" onpointerdown={noProp} onclick={() => windows.hideWindow(id)}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M217-86v-126h526v126H217Z"/></svg>
        </button>
        <button aria-label="Maximize" title="Maximize" class="btn" onpointerdown={noProp} onclick={() => {
          root.classList.toggle("window-maximized");
          maximized = !maximized;
          if (maximized) { onMaximize?.(); } else { onUnMaximize?.(); }
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M480-152 152-480l328-328 328 328-328 328Zm0-179 149-149-149-149-149 149 149 149Zm0-149Z"/></svg>
        </button>
        <button aria-label="Close" title="Close" class="btn" onpointerdown={noProp} onclick={() => closeWindow()}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
        </button>
      </div>
    </div>
    {@render data()}
  </div>
</div>

<style>
.window {
  position: absolute;
  top: 0;
  left: 0;
  background-color: rgba(0,0,0,0);
  outline: none;
  border-radius: 0.3rem;
  will-change: top, left;
  backface-visibility: hidden;
  /* TODO(improve performance - blocker: child context menu being clipped by contain property): contain: content strict; */
}

:global(.window-maximized) {
  display: grid;
  position: relative !important;
  top: 0px !important;
  left: 0px !important;
  width: 100% !important;
  height: 100% !important;
}

.ev-wrapper {
  display: flex;
  flex-direction: column;
  margin: var(--resize-area);
  outline: var(--window-outline) solid var(--window-outline-area);
  overflow: hidden;
}

.decorations {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--window-decorations);
  padding: 0.2rem;
}

.btns {
  display: flex;
  align-items: center;
}

.btn {
  display: block;
  border: none;
  margin: 0;
  padding: 0;
  width: fit-content;
  height: fit-content;
  padding: 0.11rem;
  border-radius: 100%;
  text-decoration: none;
  background-color: var(--window-btn);
}

.btn:hover {
  background-color: var(--window-btn-hover);
}

.btn:hover {
  background-color: var(--window-btn-hover);
}

.btn > svg {
  display: block;
  width: 1rem;
  height: 1rem;
  fill: var(--window-btn-fill);
}

.title {
  display: block;
  padding: 0;
  margin: 0;
  user-select: none;
  color: var(--window-title-fg);
}
</style>
