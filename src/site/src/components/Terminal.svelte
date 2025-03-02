<script>
  import Window from "../components/Window.svelte";
  import * as lib from "$lib";

  import * as xterm from "@xterm/xterm";
  const { Terminal } = xterm;

  import { FitAddon } from "@xterm/addon-fit";

  import { openpty } from "xterm-pty";
  import { onMount } from "svelte";

  let { id, wasmModule, layerFromId } = $props();

  let min = 100;

  /** @type {HTMLDivElement | undefined} */
  let root = $state();

  let width = 320;
  let height = 260;

  let terminal;

  // PID attached to terminal
  let pid = -1;

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
    terminal = new Terminal({ fontFamily: "JetBrainsMono-Regular" });
    terminal.open(root);

    const pty = openpty();
    master = pty.master;
    slave = pty.slave;

    fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.loadAddon(master);
    fitAddon.fit();

    // Create a process which will start straight away and wont have its streams piped
    // INFO: This will be the shell when it's created
    pid = await window.ProcessManager.createProcess({slave, pipeStdin: false, pipeStdout: false, start: true});
  })

  function onClose() {
    console.log(`Terminal with PID ${pid} is closing.`);
    window.ProcessManager.killProcess(pid);
  }

  onMount(() => {
    let { initWidth, initHeight } = lib.getInitWindowSize();
    width = initWidth;
    height = initHeight;
    root.style.width = initWidth.toString() + "px";
    root.style.height = initHeight.toString() + "px";

    window.addEventListener("resize", () => {
      if (maximized) {
        fitAddon.fit();
      }
    })
  })
</script>

<Window title="Terminal" bind:maximized {layerFromId} {id} {onResize} dataRef={root} {onClose}>
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
