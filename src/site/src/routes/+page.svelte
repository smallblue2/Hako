<script>
  import Terminal from "../components/Terminal.svelte";
  import Editor from "../components/Editor.svelte";
  import TaskBar from "../components/TaskBar.svelte";

  import * as lib from "$lib/windows.svelte.js";
  import { onMount } from "svelte";

  onMount(async () => {
    let { initialiseAPI, Filesystem } = await import("/api.js?url");
    window.isFilesystemInitialised = false;

    // Define a promise for loading the Emscripten module
    const LoadFilesystem = (async () => {
      try {
        // Dynamically load the emscripten module
        const { default: initEmscripten } = await import("/filesystem.js?url");

        // Initialise the emscripten module
        const Module = await initEmscripten({
          onRuntimeInitialized: () => {
            console.log("Filesystem Emscripten module loaded.");
          }
        });

        return Module
      } catch (err) {
        console.error("Filesystem Emscripten module failed to load:", err);
        throw err;
      }
    })();

    LoadFilesystem.then((Module) => {
      // Initialised the Filesystem API
      initialiseAPI(Module);
      // Attach to the global scope
      window.isFilesystemInitialised = true;
      window.Filesystem = Filesystem;
      window._FSM = Module;

      window.Filesystem.initialiseFS();
    }).catch((err) => {
      console.error("Failed to define filesystem API:", err);
    });
    
    let { default: ProcessManager } = await import("/processManager.js?url");
    window.ProcessManager = new ProcessManager();
    console.log("Created process manager");
  })

  let root = $state();

  $effect(() => lib.setRootSfc(root));
</script>

<div id="root" bind:this={root}>
  <button onclick={() => {
    // lib.openWindow(Terminal, { props: { wasmModule: "/lua.mjs?url" }});
    lib.openWindow(Terminal, { props: { wasmModule: "/runtime.js?url" }});
  }}>Create Terminal</button>
  <button onclick={() => {
    lib.openWindow(Editor);
  }}>Create Editor</button>
  <TaskBar classList={["fixed-right"]}></TaskBar>
</div>
<div id="event-overlay"></div>

<style>
:global(html) {
  height: 100%;
}

:global(body) {
  margin: 0;
  padding: 0;
  position: fixed;
  top: 0; right: 0; bottom: 0; left: 0;
  overflow: hidden;
}

:global(#event-overlay) {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: none;
  z-index: 1000;
}

:global(#root) {
  position: fixed;
  width: 100%;
  height: 100%;
  z-index: -2;
}

:global(.fixed-right) {
  overflow: hidden;
  position: fixed;
  right: 0;
  height: 100%;
}
</style>
