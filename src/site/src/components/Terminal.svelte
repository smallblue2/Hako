<script lang="ts">
  import Window from "../components/Window.svelte";
  import { closeWindow } from "$lib/windows.svelte.js";

  import * as xterm from "@xterm/xterm";
  const { Terminal } = xterm;

  import { FitAddon } from "@xterm/addon-fit";

  import { openpty } from "xterm-pty";
  import { onDestroy, onMount } from "svelte";

  let { id, layerFromId } = $props();

  let selfRef: HTMLDivElement = $state();

  let terminal: xterm.Terminal;

  // PID attached to terminal
  let pid = -1;

  let fitAddon: FitAddon;

  function onResize() {
    requestAnimationFrame(() => fitAddon?.fit());
    return true; // you can return false to say you can't resize
  }

  let master: any;
  let slave: any;

  let maximized = $state(false);

  $effect(() => {
    fitAddon?.fit();
  });

  let processChannel: BroadcastChannel;

  function onClose() {
    try {
      console.log(`Terminal with PID ${pid} is closing.`);
      window.ProcessManager.killProcess(pid);
    } catch (e) {
      console.error(e);
    }
    processChannel.close();
  }

  const onWindowResize = () => fitAddon?.fit();

  onMount(async () => {
    window.addEventListener("resize", onWindowResize);

    const styles = getComputedStyle(document.documentElement);
    const fg = styles.getPropertyValue("--md-sys-color-surface").trim();
    const bg = styles.getPropertyValue("--md-sys-color-on-surface").trim();

    terminal = new Terminal({ fontFamily: "monospace", fontSize: 20, theme: { foreground: fg, background: bg } });
    terminal.open(selfRef);

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

    processChannel = new BroadcastChannel("process");
    processChannel.onmessage = (ev) => {
      if ((ev.data.type === "kill" || ev.data.type === "exit") && ev.data.pid === pid) {
        closeWindow(id);
      }
    }
  })

  onDestroy(() => {
    window.removeEventListener("resize", onWindowResize);
  })

  function onMaximize() {
    selfRef.classList.add("window-root-maximized");
    fitAddon?.fit();
  }

  function onUnMaximize() {
    selfRef.classList.remove("window-root-maximized");
    fitAddon?.fit();
  }
</script>

<Window title="Terminal" {layerFromId} {id} dataRef={selfRef} {onResize} {onMaximize} {onUnMaximize} {onClose}>
  {#snippet data()}
    <div bind:this={selfRef} class="contents"></div>
  {/snippet}
</Window>

<style>
.contents {
  color: var(--md-sys-color-surface) !important;
  background-color: var(--md-sys-color-on-surface) !important;
}

:global(.xterm-viewport) {
  scrollbar-width: none;
}
</style>
