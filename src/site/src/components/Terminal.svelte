<script>
  import Window from "../components/Window.svelte";
  import * as lib from "$lib";

  import * as xterm from "@xterm/xterm";
  const { Terminal } = xterm;

  import { FitAddon } from "@xterm/addon-fit";

  import { openpty } from "xterm-pty";

  let { id, onWindowFocus, wasmModule, layerFromId } = $props();

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

  function onMaximise() {
    width = window.innerWidth;
    height = window.innerHeight;
    root.style.width = width.toString() + "px";
    root.style.height = height.toString() + "px";
    fitAddon.fit();
  }

  let master;
  let slave;

  $effect(async () => {
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

<Window title="Terminal" {layerFromId} {id} {onWindowFocus} {onMaximise} {onResize} dataRef={root}>
  {#snippet data()}
    <div bind:this={root} class="contents"></div>
  {/snippet}
</Window>

<style>
.contents {
  background-color: red;
  width: 320px;
  height: 260px;
}
</style>
