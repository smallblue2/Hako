<script>
  import * as lib from "$lib";
  import * as windows from "$lib/windows.svelte.js";

  let { id, onMaximise, onResize, onWindowFocus, data, dataRef, layerFromId, title } = $props();

  /** @type {HTMLDivElement | undefined} */
  let root = $state();

  let min = 100;
  let resizing = false;

  /**
   * @param {MouseEvent} ev
   */
  function onDragWindow(ev) {
    const rect = root.getBoundingClientRect();
    root.style.top = (rect.top + ev.movementY).toString() + "px";
    root.style.left = (rect.left + ev.movementX).toString() + "px";
  }

  function onHoldDecorations(ev) {
    document.addEventListener("mousemove", onDragWindow);
    document.addEventListener("mouseup", onReleaseDecorations);
    root.style.pointerEvents = "none";
  }

  function onReleaseDecorations() {
    document.removeEventListener("mousemove", onDragWindow);
    document.removeEventListener("mouseup", onReleaseDecorations);
    root.style.pointerEvents = "all";
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
      document.body.style.cursor = lib.SECTION_CURSORS[sect];
    }
  }

  /** @type {number} */
  let globalSect;

  /**
   * @param {MouseEvent} ev
   */
  function onDragResize(ev) {
    if (onResize(globalSect, ev.movementX, ev.movementY)) {
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

      if (dataRect.height > min) {
        root.style.top = (rect.top + dy).toString() + "px";
      }
      if (dataRect.width > min) {
        root.style.left = (rect.left + dx).toString() + "px";
      }
    }
  }

  /**
   * @param {MouseEvent} ev
   */
  function onHoldResizeArea(ev) {
    if (ev.target === root) { // make sure hovering child element does not trigger this
      let { offsetX, offsetY } = ev;
      globalSect = getSection(offsetX, offsetY, root.clientWidth, root.clientHeight, 10);
      resizing = true;
      document.addEventListener("mousemove", onDragResize);
      document.addEventListener("mouseup", onReleaseResizeArea);
      root.style.pointerEvents = "none";
    }
  }

  function onReleaseResizeArea() {
    resizing = false;
    document.removeEventListener("mousemove", onDragResize);
    document.removeEventListener("mouseup", onReleaseResizeArea);
    root.style.pointerEvents = "all";
  }

  function onExitResizeArea() {
    if (!resizing) {
      document.body.style.cursor = "revert";
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
</script>

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div bind:this={root} class="window" tabindex="-1" onfocusin={(ev) => onWindowFocus(id, ev)}

  onmousemove={onMoveResizeArea}
  onmouseout={onExitResizeArea}
  onmousedown={onHoldResizeArea}>

  <div class="ev-wrapper">
    <div class="decorations" onmousedown={onHoldDecorations}>
      <div></div>
      <p class="title">{title}</p>
      <button class="close-btn" onmousedown={noProp} onclick={() => windows.closeWindow(id)}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>
      </button>
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
}

.ev-wrapper {
  margin: 10px;
  box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 50px;
}

.decorations {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px;
  background-color: skyblue;
  border-radius: 0.2rem 0.2rem 0 0;
}

.close-btn {
  border: none;
  margin: 0;
  padding: 0;
  width: fit-content;
  height: fit-content;
}

.close-btn > svg {
  display: block;
  width: 1rem;
  height: 1rem;
}

.title {
  display: block;
  padding: 0;
  margin: 0;
  user-select: none;
}

/* .maximise-btn { */
/*   height: 10px; */
/*   width: 10px; */
/*   background-color: green; */
/* } */
</style>
