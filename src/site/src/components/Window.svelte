<script>
  import * as lib from "$lib";
  import * as windows from "$lib/windows.svelte.js";
    import { onMount } from "svelte";

  let { id, onMaximise, onResize, onWindowFocus, data, dataRef, layerFromId, title } = $props();

  /** @type {HTMLDivElement | undefined} */
  let root = $state();

  /** @type {HTMLDivElement | undefined} */
  let evWrap = $state();

  let visibleAreaOff = undefined; // The size of the resize areas margin

  let min = 100;
  let resizing = false;

  let maxY = undefined;
  let maxX = undefined;

  /**
   * @param {MouseEvent} ev
   */
  function onDragWindow(ev) {
    const rect = root.getBoundingClientRect();
    root.style.top = Math.max(-visibleAreaOff, rect.top + ev.movementY).toString() + "px";
    root.style.left = Math.max(-visibleAreaOff, rect.left + ev.movementX).toString() + "px";
  }

  function onHoldDecorations(ev) {
    document.addEventListener("mousemove", onDragWindow);
    document.addEventListener("mouseup", onReleaseDecorations);
    let overlay = document.getElementById("event-overlay");
    overlay.style.display = "block";
  }

  function onReleaseDecorations() {
    document.removeEventListener("mousemove", onDragWindow);
    document.removeEventListener("mouseup", onReleaseDecorations);
    let overlay = document.getElementById("event-overlay");
    overlay.style.display = "none";
  }

  /**
   * @param {number} ox
   * @param {number} oy
   * @param {number} cx
   * @param {number} cy
   * @param {number} m
   * @returns {number}
   */
  function getSection(ox, oy, cx, cy, m) {
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

  /**
   * @param {MouseEvent} ev
   */
  function onMoveResizeArea(ev) {
    if (ev.target === root && !resizing) { // make sure hovering child element does not trigger this
      let { offsetX, offsetY } = ev;
      const sect = getSection(offsetX, offsetY, root.clientWidth, root.clientHeight, 10);
      document.documentElement.style.cursor = lib.SECTION_CURSORS[sect];
    }
  }

  /** @type {number} */
  let globalSect;

  /**
   * @param {MouseEvent} ev
   */
  function onDragResize(ev) {
    // if (onResize(globalSect, ev.movementX, ev.movementY)) {

    onResize(globalSect, ev.movementX, ev.movementY);

    const dataRect = dataRef.getBoundingClientRect(); // we need to look at the child itself (so as to exclude margin etc).
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

  /**
   * @param {MouseEvent} ev
   */
  async function onHoldResizeArea(ev) {
    if (ev.target === root) { // make sure hovering child element does not trigger this
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

      let overlay = document.getElementById("event-overlay");
      overlay.style.display = "block";
      overlay.style.cursor = lib.SECTION_CURSORS[globalSect];
    }
  }

  function onReleaseResizeArea() {
    let overlay = document.getElementById("event-overlay");
    overlay.style.display = "none";
    root.classList.toggle(lib.SECTION_STYLE[globalSect]);
    resizing = false;
    document.removeEventListener("mousemove", onDragResize);
    document.removeEventListener("mouseup", onReleaseResizeArea);
    onExitResizeArea();
  }

  function onExitResizeArea() {
    if (!resizing) {
      document.documentElement.style.cursor = "revert";
      let overlay = document.getElementById("event-overlay");
      overlay.style.cursor = "auto";
    }
  }

  /**
   * @param {MouseEvent} ev
   */
  function noProp(ev) {
    ev.stopPropagation();
  }

  $effect(() => {
    root.style.zIndex = layerFromId[id];
  })

  onMount(() => {
    visibleAreaOff = parseInt(window.getComputedStyle(evWrap).margin, 10);
  })
</script>

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div bind:this={root} class="window" tabindex="-1" onfocusin={(ev) => onWindowFocus(id, ev)}

  onmousemove={onMoveResizeArea}
  onmouseout={onExitResizeArea}
  onmousedown={onHoldResizeArea}>

  <div bind:this={evWrap} class="ev-wrapper">
    <div class="decorations" onmousedown={onHoldDecorations}>
      <!-- <div></div> -->
      <p class="title">{title}</p>
      <div class="btns">
        <button title="Hide" class="btn">
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M217-86v-126h526v126H217Z"/></svg>
        </button>
        <button title="Maximize" class="btn">
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M480-152 152-480l328-328 328 328-328 328Zm0-179 149-149-149-149-149 149 149 149Zm0-149Z"/></svg>
        </button>
        <button title="Close" class="btn" onmousedown={noProp} onclick={() => windows.closeWindow(id)}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
        </button>
      </div>
      <!-- <button class="maximise-btn" onmousedown={noProp} onclick={() => { -->
      <!--   onMaximise(); -->
      <!-- }}></button> -->
    </div>
    {@render data()}
  </div>
</div>

<style>
.window {
  position: absolute;
  background-color: rgba(0,0,0,0);
  outline: none;
	background-repeat: no-repeat;
  border-radius: 0.3rem;
}

.ev-wrapper {
  margin: var(--resize-area);
  box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 50px;
  outline: var(--window-outline) solid var(--window-outline-area);
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

/* .maximise-btn { */
/*   height: 10px; */
/*   width: 10px; */
/*   background-color: green; */
/* } */
</style>
