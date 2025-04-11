<script lang="ts">
  import * as lib from "$lib";
  import * as windows from "$lib/windows.svelte.js";
  import _, * as overlay from "./Overlay.svelte";
  import { scale } from "svelte/transition";
  import { onMount, tick } from "svelte";

  interface Props {
    id: number,
    maximized: boolean,
    onResize: Function,
    data: any,
    dataRef: HTMLElement,
    onClose?: Function,
    layerFromId: number[],
    title: string,
    initOffset?: { x: number, y: number },
  };

  let { id, maximized = $bindable(), onResize, data, dataRef, onClose, layerFromId, title, initOffset = {x: 0, y: 0} }: Props = $props();

  let root: HTMLDivElement = $state();
  let evWrap: HTMLDivElement = $state();
  let visibleAreaOff: number = 0; // The size of the resize areas margin

  let min = 150;
  let resizing = false;

  let maxY: number = undefined;
  let maxX: number = undefined;

  function onDragWindow(ev: MouseEvent) {
    const rect = root.getBoundingClientRect();
    root.style.top = Math.max(-visibleAreaOff, rect.top + ev.movementY).toString() + "px";
    root.style.left = Math.max(-visibleAreaOff, rect.left + ev.movementX).toString() + "px";
  }

  function onHoldDecorations() {
    if (!maximized) {
      document.addEventListener("mousemove", onDragWindow);
      document.addEventListener("mouseup", onReleaseDecorations);
      overlay.toggleGrab();
    }
  }

  function onReleaseDecorations() {
    document.removeEventListener("mousemove", onDragWindow);
    document.removeEventListener("mouseup", onReleaseDecorations);
    overlay.toggleGrab();
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
    const [ dw, dh ] = lib.getResizeFromSect(globalSect, ev.movementX, ev.movementY);
    onResize(dw, dh);

    const rect = root.getBoundingClientRect();

    let dy = 0;
    let dx = 0;

    switch (globalSect) {
      case lib.TOP_LEFT_CORNER:
        dy = ev.movementY;
        dx = ev.movementX;
      case lib.TOP:
      case lib.TOP_RIGHT_CORNER:
        dy = ev.movementY;
        break;
      case lib.LEFT:
      case lib.BOTTOM_LEFT_CORNER:
        dx = ev.movementX;
        break;
    }

    const posY = Math.max(-visibleAreaOff, Math.min(rect.top + dy, maxY));
    const posX = Math.max(-visibleAreaOff, Math.min(rect.left + dx, maxX));
    root.style.top = posY.toString() + "px";
    root.style.left = posX.toString() + "px";
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
      maxX = (dataRect.x + dataRect.width) - min - (dataRect.x - rootRect.x);
      maxY = (dataRect.y + dataRect.height) - min - (dataRect.y - rootRect.y);

      resizing = true;
      document.addEventListener("mousemove", onDragResize);
      document.addEventListener("mouseup", onReleaseResizeArea);

      overlay.toggleGrab();
      overlay.setCursor(lib.SECTION_CURSORS[globalSect])
    }
  }

  function onReleaseResizeArea() {
    overlay.toggleGrab();
    root.classList.toggle(lib.SECTION_STYLE[globalSect]);
    resizing = false;
    document.removeEventListener("mousemove", onDragResize);
    document.removeEventListener("mouseup", onReleaseResizeArea);
    onExitResizeArea();
  }

  function onExitResizeArea() {
    if (!resizing) {
      document.documentElement.style.cursor = "revert";
      overlay.setCursor("auto");
    }
  }

  function noProp(ev: MouseEvent) {
    ev.stopPropagation();
  }

  function closeWindow() {
    if (onClose !== undefined) onClose();
    windows.closeWindow(id);
  }

  $effect(() => {
    root.style.zIndex = layerFromId[id].toString();
  })

  onMount(async () => {
    await tick(); // wait until size of component settles
    const rect = root?.getBoundingClientRect();
    let x = Math.floor((window.innerWidth - rect.width) / 2) + initOffset.x;
    let y = Math.floor((window.innerHeight - rect.height) / 2) + initOffset.y;
    root.style.top = y + "px";
    root.style.left = x + "px";
    visibleAreaOff = parseInt(window.getComputedStyle(evWrap).margin, 10);
  })
</script>

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div transition:scale={{ duration: 200, start: 0.5 }} id="window-{id}" bind:this={root} class="window" tabindex="-1" onfocusin={() => windows.focusWindow(id)}

  onmousemove={onMoveResizeArea}
  onmouseout={onExitResizeArea}
  onmousedown={onHoldResizeArea}>

  <div bind:this={evWrap} class="ev-wrapper">
    <div class="decorations" onmousedown={onHoldDecorations}>
      <!-- <div></div> -->
      <p class="title">{title}</p>
      <div class="btns">
        <button aria-label="Hide" title="Hide" class="btn" onmousedown={noProp} onclick={() => windows.hideWindow(id)}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M217-86v-126h526v126H217Z"/></svg>
        </button>
        <button aria-label="Maximize" title="Maximize" class="btn" onmousedown={noProp} onclick={() => {
          root.classList.toggle("window-maximized");
          maximized = !maximized;
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M480-152 152-480l328-328 328 328-328 328Zm0-179 149-149-149-149-149 149 149 149Zm0-149Z"/></svg>
        </button>
        <button aria-label="Close" title="Close" class="btn" onmousedown={noProp} onclick={() => closeWindow()}>
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
	background-repeat: no-repeat;
  border-radius: 0.3rem;
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
  box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 50px;
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
