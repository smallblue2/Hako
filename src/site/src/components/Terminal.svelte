<script>
  import Window from "../components/Window.svelte";
  import * as lib from "$lib";
  import { onMount } from "svelte";

  import * as xterm from "@xterm/xterm";
  const { Terminal } = xterm;

  import { FitAddon } from "@xterm/addon-fit";

  import { openpty } from "xterm-pty";

  let { wasmModule, windowID } = $props();

  let min = 100;

  /** @type {HTMLDivElement | undefined} */
  let root = $state();

  let width = 320;
  let height = 260;

  /**
   * @param {number} n
   * @param {number} min
   */
  function clamp(n, min) {
    if (n < min) {
      return min;
    }
    return n;
  }


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

    width = clamp(width + dw, min);
    height = clamp(height + dh, min);
    root.style.width = width.toString() + "px";
    root.style.height = height.toString() + "px";

    fitAddon.fit();

    return true; // you can return false to say you can't resize
  }

  let master;
  let slave;

  onMount(async () => {
    let { default: initEmscripten } = await import(wasmModule);

    terminal = new Terminal();
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
</script>

<Window id={windowID} {onResize} dataRef={root}>
  {#snippet data()}
    <div bind:this={root} class="contents"></div>
  {/snippet}
</Window>

<style>
:global(body) {
  margin: 0;
  padding: 0;
  position: fixed;
  top: 0; right: 0; bottom: 0; left: 0;
  overflow: hidden;
}

.contents {
  background-color: red;
  width: 320px;
  height: 260px;
}
</style>
