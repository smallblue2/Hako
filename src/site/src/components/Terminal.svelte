<script>
  import Window from "../components/Window.svelte";
  import * as lib from "$lib";

  import * as xterm from "@xterm/xterm";
  const { Terminal } = xterm;

  import { FitAddon } from "@xterm/addon-fit";

  import { openpty } from "$lib/vendor/xterm-pty/out";
  import { onMount } from "svelte";

  let { id, wasmModule, layerFromId } = $props();

  let min = 100;

  /** @type {HTMLDivElement | undefined} */
  let root = $state();

  let width = 320;
  let height = 260;

  let terminal;

  /** @type {FitAddon} */
  let fitAddon;

  /**
   * @param {number} sect
   * @param {number} relX
   * @param {number} relY
   */
  function onResize(sect, relX, relY) {
    let dw = 0;
    let dh = 0;

    switch (sect) {
      case lib.BOTTOM_RIGHT_CORNER:
        dw = relX;
        dh = relY;
        break;
      case lib.RIGHT:
        dw = relX;
        break;
      case lib.BOTTOM:
        dh = relY;
        break;
      case lib.TOP_LEFT_CORNER:
        dw = -relX;
        dh = -relY;
        break;
      case lib.LEFT:
        dw = -relX;
        break;
      case lib.TOP:
        dh = -relY;
        break;
      case lib.TOP_RIGHT_CORNER:
        dw = relX;
        dh = -relY;
        break;
      case lib.BOTTOM_LEFT_CORNER:
        dw = -relX;
        dh = relY;
        break;
    }

    width = lib.clamp(width + dw, min);
    height = lib.clamp(height + dh, min);
    root.style.width = width.toString() + "px";
    root.style.height = height.toString() + "px";

    fitAddon.fit();

    return true; // you can return false to say you can't resize
  }

  let master;
  let slave;

  let maximized = $state(false);

  $effect(() => {
    if (maximized) {
      root.classList.add("window-root-maximized");
    } else {
      root.classList.remove("window-root-maximized");
    }
    if (fitAddon !== undefined) {
      fitAddon.fit();
    }
  });

  $effect(async () => {
    let { default: initEmscripten } = await import(wasmModule);

    terminal = new Terminal({ fontFamily: "JetBrainsMono-Regular" });
    terminal.open(root);

    const pty = openpty();
    master = pty.master;
    slave = pty.slave;

    fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.loadAddon(master);
    fitAddon.fit();

    await initEmscripten({
      pty: slave
    });
  })

  onMount(() => {
    window.addEventListener("resize", () => {
      if (maximized) {
        fitAddon.fit();
      }
    })
  })
</script>

<Window title="Terminal" bind:maximized {layerFromId} {id} {onResize} dataRef={root}>
  {#snippet data()}
    <div bind:this={root} class="contents"></div>
  {/snippet}
</Window>

<style>
.contents {
  background-color: black;
  width: 320px;
  height: 260px;
}

:global(.window-root-maximized) {
  width: 100% !important;
  height: 100% !important;
}

:global(.xterm-viewport) {
  scrollbar-width: none;
}
</style>
