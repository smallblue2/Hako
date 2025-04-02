<script module>
  /** @type {HTMLDivElement | undefined} */
  let overlay = $state();

  export function toggleDim() {
    overlay?.classList.toggle("overlay-dim");
  }

  export function toggleGrab() {
    overlay?.classList.toggle("overlay-grab");
  }

  export function toggleLoaded() {
    toggleDim();
    toggleGrab();
  }

  export function setCursor(type) {
    overlay.style.cursor = type;
  }
</script>

<div bind:this={overlay} class="overlay overlay-grab overlay-dim"></div>

<style>
:global(.overlay-dim) {
  opacity: 0.5;
  background-color: black;
}

:global(.overlay-grab) {
  display: block !important;
  user-select: all;
  pointer-events: all;
}

:global(.overlay) {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: none;
  z-index: 1000;
}
</style>
